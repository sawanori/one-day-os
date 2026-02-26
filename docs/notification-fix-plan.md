# iOS 実機通知修正 実装計画

**作成日:** 2026-02-26
**優先度:** Critical
**対象ファイル:** `app/_layout.tsx`, `src/notifications/JudgmentNotificationScheduler.ts`

---

## 問題の概要

実機 iOS デバイスで通知が一切届かない。原因は4つ特定済みで、H1・H2 は Critical（これが未修正だとすべての通知がブロックされる）。

---

## 根本原因分析

### H1 [Critical] — `setNotificationHandler()` が呼ばれていない

**何が起きているか:**

iOS は `Notifications.setNotificationHandler()` がセットされていない場合、アプリがフォアグラウンド状態のときに通知を**サイレント抑制**する。バックグラウンドでも、ハンドラー不在はシステム側の挙動に依存する不安定な状態になる。

**現在のコード状態:**

```ts
// src/notifications/NotificationScheduler.ts (デッドコード — 呼ばれていない)
async initialize(): Promise<void> {
  Notifications.setNotificationHandler({  // ← ここには正しい実装がある
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
```

```ts
// src/notifications/JudgmentNotificationScheduler.ts (実際に使われているクラス)
static async initialize(): Promise<void> {
  // setNotificationHandler が存在しない ← ここが問題
  await Notifications.setNotificationCategoryAsync(
    JUDGMENT_CATEGORY_IDENTIFIER,
    []
  );
}
```

**影響:** `setNotificationHandler` が呼ばれないと、iOS はすべての通知を無音・非表示で処理する。

---

### H2 [Critical] — `requestPermissionsAsync()` が呼ばれていない

**何が起きているか:**

新規インストール時、iOS の通知権限は `undetermined`（未決定）状態。`requestPermissionsAsync()` を明示的に呼ばない限り、OS が通知を配信しない。

**現在のコード状態:**

```ts
// app/_layout.tsx — 権限リクエストが存在しない
databaseInit().then(async () => {
  setDbReady(true);
  // ... DailyManager, JudgmentEngine の初期化 ...
  await JudgmentNotificationScheduler.initialize();  // ← 権限チェックなし
  await JudgmentNotificationScheduler.scheduleNotifications(schedule);
  // ...
});
```

```ts
// src/notifications/NotificationScheduler.ts (デッドコード)
async requestPermissions(): Promise<{ granted: boolean; status: string }> {
  const { status } = await Notifications.requestPermissionsAsync();  // ← あるが呼ばれない
  return { granted: status === 'granted', status };
}
```

**影響:** 新規ユーザーは通知ダイアログが表示されないまま、通知権限が `undetermined` のまま放置される。

---

### H3 [Medium] — 過去時刻エントリがサイレントにスキップされる

**現在のコード:**

```ts
// src/notifications/JudgmentNotificationScheduler.ts — line 56
if (scheduledDate <= now) continue;  // ← ログなしでスキップ
```

**影響:** アプリを昼以降に起動した場合、今日のすべての Judgment 時刻が過去になっており、通知がゼロ件スケジュールされる可能性がある。デバッグが困難。

---

### H4 [Low] — `timeSensitive` entitlement が未設定

**現在のコード:**

```ts
// src/notifications/JudgmentNotificationScheduler.ts — line 68
interruptionLevel: 'timeSensitive',  // ← Entitlement なしで使用
```

**app.json の entitlements:**

```json
// app.json — com.apple.developer.usernotifications.time-sensitive が存在しない
"ios": {
  "bundleIdentifier": "com.nonturn.onedayos",
  "supportsTablet": false,
  "infoPlist": { ... }
  // entitlements フィールドなし
}
```

**影響:** Apple の審査で拒否されるリスク、または実機で警告ログが出力される。

---

## 修正内容

### Fix 1 — `setNotificationHandler()` を `_layout.tsx` のモジュールレベルに追加

**ファイル:** `app/_layout.tsx`

**変更箇所:** ファイル先頭のインポート直後、コンポーネント定義より前にモジュールレベルで呼ぶ。

**理由:** Expo 公式ドキュメントでは、`setNotificationHandler` はモジュールレベル（コンポーネント外）で呼ぶことを推奨している。`useEffect` 内では非推奨。

**変更前:**

```tsx
import { JudgmentInvasionOverlay } from '../src/ui/effects/JudgmentInvasionOverlay';
import { PaidIdentityWatermark } from '../src/ui/effects/PaidIdentityWatermark';
import { IAPService } from '../src/core/insurance';

// Web Not Supported Component
const WebNotSupported = () => {
```

**変更後:**

```tsx
import * as Notifications from 'expo-notifications';
import { JudgmentInvasionOverlay } from '../src/ui/effects/JudgmentInvasionOverlay';
import { PaidIdentityWatermark } from '../src/ui/effects/PaidIdentityWatermark';
import { IAPService } from '../src/core/insurance';

// ─── 通知ハンドラー — モジュールレベルで設定 (Expo 推奨) ───────────────────
// setNotificationHandler がない場合、iOS はすべての通知をサイレント抑制する
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Web Not Supported Component
const WebNotSupported = () => {
```

**注意:** `expo-notifications` は既に `JudgmentNotificationScheduler` 経由でインポートされているが、`_layout.tsx` 本体には直接インポートがないため、新たに追加が必要。

---

### Fix 2 — `requestPermissionsAsync()` を初期化フローに追加

**ファイル:** `app/_layout.tsx`

**変更箇所:** `databaseInit().then()` チェーン内、`JudgmentNotificationScheduler.initialize()` の**前**に権限リクエストを挿入する。

**変更前:**

```tsx
databaseInit()
  .then(async () => {
    setDbReady(true);

    dailyManager = await DailyManager.getInstance();
    dailyManager.onDateChange((event) => {
      console.log('[Layout] Date changed:', event.previousDate, '->', event.newDate);
    });

    // Initialize JudgmentEngine and generate today's schedule
    const judgmentEngine = await JudgmentEngine.getInstance();
    const today = JudgmentEngine.getTodayDate();
    await judgmentEngine.generateDailySchedule(today);

    // Schedule OS notifications for today's judgment times
    await JudgmentNotificationScheduler.initialize();
    const schedule = await judgmentEngine.getScheduleForDate(today);
    await JudgmentNotificationScheduler.scheduleNotifications(schedule);
```

**変更後:**

```tsx
databaseInit()
  .then(async () => {
    setDbReady(true);

    dailyManager = await DailyManager.getInstance();
    dailyManager.onDateChange((event) => {
      console.log('[Layout] Date changed:', event.previousDate, '->', event.newDate);
    });

    // ─── 通知権限リクエスト ────────────────────────────────────────────────
    // DB 初期化後・スケジューリング前に権限を確認・リクエストする。
    // 拒否されても通知以外の機能は継続動作させる（クラッシュしない）。
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'undetermined') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        console.warn('[Layout] 通知権限が拒否されました。通知は配信されません。status:', newStatus);
      } else {
        console.log('[Layout] 通知権限が付与されました');
      }
    } else if (existingStatus === 'denied') {
      console.warn('[Layout] 通知権限が拒否済みです。設定から手動で許可してください。');
    } else {
      console.log('[Layout] 通知権限は付与済みです');
    }
    // ──────────────────────────────────────────────────────────────────────

    // Initialize JudgmentEngine and generate today's schedule
    const judgmentEngine = await JudgmentEngine.getInstance();
    const today = JudgmentEngine.getTodayDate();
    await judgmentEngine.generateDailySchedule(today);

    // Schedule OS notifications for today's judgment times
    await JudgmentNotificationScheduler.initialize();
    const schedule = await judgmentEngine.getScheduleForDate(today);
    await JudgmentNotificationScheduler.scheduleNotifications(schedule);
```

---

### Fix 3 — `interruptionLevel: 'timeSensitive'` を削除

**ファイル:** `src/notifications/JudgmentNotificationScheduler.ts`

**変更前:**

```ts
const notificationId = await Notifications.scheduleNotificationAsync({
  content: {
    title: 'ONE DAY OS',
    body: questionRendered,
    categoryIdentifier: JUDGMENT_CATEGORY_IDENTIFIER,
    interruptionLevel: 'timeSensitive',  // ← 削除対象
    data: {
```

**変更後:**

```ts
const notificationId = await Notifications.scheduleNotificationAsync({
  content: {
    title: 'ONE DAY OS',
    body: questionRendered,
    categoryIdentifier: JUDGMENT_CATEGORY_IDENTIFIER,
    // interruptionLevel: 'timeSensitive' は entitlement 未設定のため削除
    // Apple 審査通過後に entitlement を追加してから復活させること
    data: {
```

**将来対応:** `timeSensitive` を使いたい場合は `app.json` に以下を追加してから EAS ビルドする:

```json
"ios": {
  "bundleIdentifier": "com.nonturn.onedayos",
  "entitlements": {
    "com.apple.developer.usernotifications.time-sensitive": true
  }
}
```

---

### Fix 4 — 過去時刻スキップ時のログ追加

**ファイル:** `src/notifications/JudgmentNotificationScheduler.ts`

**変更前:**

```ts
// Skip if time has already passed today
const scheduledDate = new Date(
  `${schedule.scheduled_date}T${schedule.scheduled_time}:00`
);
if (scheduledDate <= now) continue;
```

**変更後:**

```ts
// Skip if time has already passed today
const scheduledDate = new Date(
  `${schedule.scheduled_date}T${schedule.scheduled_time}:00`
);
if (scheduledDate <= now) {
  console.warn(
    `[JudgmentNotificationScheduler] 過去時刻のためスキップ: scheduleId=${schedule.id}, scheduled=${schedule.scheduled_date}T${schedule.scheduled_time}, now=${now.toISOString()}`
  );
  continue;
}
```

---

## 修正後の完全なファイル状態

### `app/_layout.tsx` — 変更サマリー

```
追加行:
  1. import * as Notifications from 'expo-notifications';  (モジュール先頭)
  2. Notifications.setNotificationHandler({...})  (モジュールレベル、コンポーネント外)
  3. 権限リクエストブロック  (databaseInit チェーン内、スケジューリング前)

変更行数: +25行程度
```

### `src/notifications/JudgmentNotificationScheduler.ts` — 変更サマリー

```
削除行:
  - interruptionLevel: 'timeSensitive',

追加行:
  - console.warn(...) for past-time skip

変更行数: -1行 + +5行 = +4行程度
```

---

## 実装順序

```
Step 1: Fix 1 — setNotificationHandler をモジュールレベルに追加
        対象: app/_layout.tsx
        リスク: なし（既存動作を上書きしない）

Step 2: Fix 2 — requestPermissionsAsync を初期化フローに挿入
        対象: app/_layout.tsx
        リスク: 低（権限拒否時もクラッシュしない実装）

Step 3: Fix 3 — interruptionLevel: 'timeSensitive' を削除
        対象: src/notifications/JudgmentNotificationScheduler.ts
        リスク: なし（通知の基本動作に影響しない）

Step 4: Fix 4 — 過去時刻スキップのログ追加
        対象: src/notifications/JudgmentNotificationScheduler.ts
        リスク: なし（ログのみ）

Step 5: EAS ビルド & 実機テスト
        ※ Expo Go では通知が正常動作しない場合がある（EAS Build 必須）
```

---

## 動作確認手順

### EAS ビルド後の確認

```bash
# Preview ビルド（実機テスト用）
eas build --platform ios --profile preview

# または Development ビルド
eas build --platform ios --profile development
```

### 確認項目

1. **権限ダイアログ**
   初回起動時に「"One Day OS"から通知を受け取りますか？」が表示される。

2. **スケジュール確認**
   Xcode Console または `expo-notifications` の `getAllScheduledNotificationsAsync()` で、今日の未来時刻に通知がスケジュールされていることを確認。

3. **実際の通知受信**
   近い未来時刻（1〜2分後）に手動でスケジュールして、通知バナーが表示されることを確認。

4. **ログ確認**
   ```
   [Layout] 通知権限が付与されました  ← Fix 2 が動いている
   [JudgmentNotificationScheduler] 過去時刻のためスキップ: ...  ← Fix 4 が動いている（あれば）
   ```

---

## 注意事項

### Expo Go では通知が動作しない

Expo Go はサンドボックス環境のため、カスタム通知カテゴリや一部の通知機能が正常に動作しない。**必ず EAS Build（development または preview プロファイル）で実機テストすること。**

### シミュレーターでは通知を完全にテストできない

iOS シミュレーターはプッシュ通知を受信できるが、スケジュール通知の挙動が実機と異なる場合がある。最終確認は実機で行うこと。

### 権限ダイアログのタイミング

現在の実装（Fix 2）では、アプリ起動直後（DB 初期化後）に権限ダイアログが表示される。UX 上は「オンボーディング中」に表示する方が自然だが、今回は最小変更で通知を動かすことを優先する。オンボーディングへの移動は次フェーズで検討する。

---

## チェックリスト

- [ ] Fix 1: `setNotificationHandler` をモジュールレベルに追加
- [ ] Fix 2: `requestPermissionsAsync` を初期化フローに追加
- [ ] Fix 3: `interruptionLevel: 'timeSensitive'` を削除
- [ ] Fix 4: 過去時刻スキップのログを追加
- [ ] EAS ビルドを実行
- [ ] 実機で権限ダイアログが表示されることを確認
- [ ] 実機で通知が届くことを確認
- [ ] ログで Fix 2・Fix 4 が動作していることを確認
