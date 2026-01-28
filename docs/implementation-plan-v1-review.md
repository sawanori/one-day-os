# One Day OS 実装計画書 v1.0 レビューレポート

**レビュー日:** 2026-01-28
**レビュアー:** Senior Architect (Claude Opus 4.5)
**対象文書:** `/home/noritakasawada/project/20260128/docs/implementation-plan-v1.md`
**基準文書:** `/home/noritakasawada/project/20260128/docs/idea.md`

---

## 1. 問題点リスト（サマリー）

| # | 問題点 | 重大度 | カテゴリ |
|---|--------|--------|----------|
| 1 | 絶望モードの仕様が未定義 | Critical | 抜け・漏れ |
| 2 | IH初期化タイミングの欠落 | Critical | 論理的ギャップ |
| 3 | 通知タイムアウト検知の設計不備 | Critical | エラーの温床 |
| 4 | Wipe後の絶望モード遷移ロジック欠落 | Critical | 抜け・漏れ |
| 5 | クエストペナルティの条件が仕様と不一致 | High | 論理的ギャップ |
| 6 | 日次リセット/IH維持ロジックの欠落 | High | 抜け・漏れ |
| 7 | オンボーディングフローの未定義 | High | 抜け・漏れ |
| 8 | PHASE時間帯制御ロジックの欠落 | High | 抜け・漏れ |
| 9 | バックアップ無効化の実装が不完全 | High | エラーの温床 |
| 10 | アプリ削除によるWipe条件の未実装 | High | 抜け・漏れ |
| 11 | 通知スケジュールのタイムゾーン未考慮 | Medium | エッジケース |
| 12 | IdentityEngineとDBの同期問題 | Medium | 依存関係の問題 |
| 13 | 複数クエスト未達成時のペナルティ累積 | Medium | 論理的ギャップ |
| 14 | GlitchTextのテストケースが不十分 | Medium | TDD観点 |
| 15 | WipeManager.test.tsのモック設計が不正確 | Medium | TDD観点 |
| 16 | setIntervalによるメモリリーク | Medium | エラーの温床 |
| 17 | Expo Router v4のファイル構成の誤り | Medium | 依存関係の問題 |
| 18 | IH回復メカニズムの欠落 | Low | 抜け・漏れ |
| 19 | 通知権限拒否後の再要求フロー未定義 | Low | エッジケース |
| 20 | アンチビジョン・クエスト入力UIの未定義 | Low | 抜け・漏れ |

---

## 2. 各問題の詳細と修正提案

### 問題 #1: 絶望モードの仕様が未定義【Critical】

**カテゴリ:** 抜け・漏れ

**問題の説明:**
仕様書（idea.md）では、Wipe後に「絶望モード固定 / 24時間再構築不可」と明記されている。しかし、実装計画書には「Despair Mode: Data wipe only (immediate re-setup possible)」と記載されており、仕様と矛盾している。

仕様書の状態遷移図:
```
Evening -->|IH <= 0 または 削除| Wipe[!! 物理ワイプ実行 !!]
Wipe --> Dead[絶望モード固定 / 24時間再構築不可]
```

実装計画書では、Wipe後に即座に再セットアップ可能と記載されている。

**なぜ問題か:**
- 仕様と実装の根本的な不一致
- 24時間再構築不可という「絶望モード」がアプリのコアコンセプトの一部である
- ユーザー体験が大きく異なる

**修正提案:**
「Confirmed Specifications」で「Despair Mode: Data wipe only (immediate re-setup possible)」と確認されているため、これが正式な仕様変更であれば、以下を実装計画に追加:

```typescript
// src/core/identity/DespairModeManager.ts
export class DespairModeManager {
  // Wipe後の状態を管理
  // 即座に再セットアップ可能であることを明示

  async onWipe(): Promise<void> {
    // 1. 全データ消去
    // 2. オンボーディング画面に遷移
    // 3. 新しいアイデンティティの入力を促す
  }
}
```

また、idea.mdの仕様と異なることを明示的に文書化し、変更理由を記載すべき。

---

### 問題 #2: IH初期化タイミングの欠落【Critical】

**カテゴリ:** 論理的ギャップ

**問題の説明:**
`identity_health`テーブルには初期値として`DEFAULT 100`が設定されているが、このレコードを「いつ」「どのように」挿入するかが定義されていない。

スキーマ:
```sql
CREATE TABLE IF NOT EXISTS identity_health (
  id INTEGER PRIMARY KEY CHECK (id = 1),  -- シングルトン制約
  current_value INTEGER NOT NULL DEFAULT 100,
  ...
);
```

しかし、このテーブルへの`INSERT`文がどこにも存在しない。

**なぜ問題か:**
- アプリ初回起動時にIH値が存在しない
- `IdentityEngine.getCurrentIH()`がnullを返す可能性
- Wipe後にIH値が0のままで新しい値が設定されない

**修正提案:**
```typescript
// src/database/db.ts
export async function initializeDatabase(): Promise<void> {
  const db = await SQLite.openDatabaseAsync('onedayos.db');

  // テーブル作成
  for (const tableSQL of Object.values(TABLES)) {
    await db.execAsync(tableSQL);
  }

  // IH初期値の挿入（存在しない場合のみ）
  await db.runAsync(`
    INSERT OR IGNORE INTO identity_health (id, current_value, last_updated)
    VALUES (1, 100, ?)
  `, [Date.now()]);
}
```

また、TDDテストを追加:
```typescript
test('初回起動時にIHが100で初期化される', async () => {
  await initializeDatabase();
  const ih = await engine.getCurrentIH();
  expect(ih).toBe(100);
});
```

---

### 問題 #3: 通知タイムアウト検知の設計不備【Critical】

**カテゴリ:** エラーの温床

**問題の説明:**
`NotificationHandler`の`checkTimeouts()`は`setInterval`で1分ごとに実行されるが、以下の致命的な問題がある:

1. **アプリがバックグラウンドにあるとき`setInterval`は動作しない**
2. **通知の発火時刻が`trackedNotifications`に記録されるタイミングが不明**
3. **アプリ再起動時に`trackedNotifications` (インメモリMap) がクリアされる**

```typescript
// 現在の実装
setInterval(() => this.checkTimeouts(), 60 * 1000);
```

**なぜ問題か:**
- ユーザーが通知を見て15分以内に応答しなくても、アプリがバックグラウンドにあればIGNORED扱いにならない
- アプリを再起動すると、過去の未応答通知が追跡されない
- 仕様の「無視でIH -15%」が正しく動作しない

**修正提案:**
1. 通知発火時刻をDBに永続化
2. アプリ起動時（フォアグラウンド復帰時）にタイムアウトチェック

```typescript
// src/notifications/NotificationHandler.ts

async trackNotification(notificationId: string, timestamp: number): Promise<void> {
  // DBに永続化
  await this.db.runAsync(
    `UPDATE notification_responses
     SET scheduled_time = ?
     WHERE notification_id = ?`,
    [timestamp, notificationId]
  );
}

async checkTimeoutsOnResume(): Promise<void> {
  // アプリ起動時に呼び出す
  const pendingNotifications = await this.db.getAllAsync(`
    SELECT notification_id, scheduled_time
    FROM notification_responses
    WHERE response_type IS NULL
      AND scheduled_time < ?
  `, [Date.now() - 15 * 60 * 1000]);

  for (const notif of pendingNotifications) {
    await this.handleTimeout(notif.notification_id);
  }
}
```

また、`AppState`リスナーでフォアグラウンド復帰を検知:
```typescript
import { AppState } from 'react-native';

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    notificationHandler.checkTimeoutsOnResume();
  }
});
```

---

### 問題 #4: Wipe後の絶望モード遷移ロジック欠落【Critical】

**カテゴリ:** 抜け・漏れ

**問題の説明:**
`WipeManager.executeWipe()`はデータを削除するが、その後のアプリ状態遷移が定義されていない。

現在の実装:
```typescript
async executeWipe(reason: string, finalIH: number): Promise<void> {
  // データ削除...
  // その後、何が起こる？
}
```

**なぜ問題か:**
- Wipe後にユーザーがアプリを開くと何が表示されるか不明
- ナビゲーション状態がリセットされない可能性
- 再セットアップへの導線がない

**修正提案:**
```typescript
// src/core/identity/WipeManager.ts

async executeWipe(reason: string, finalIH: number): Promise<WipeResult> {
  // ... データ削除 ...

  // Wipe完了後のコールバックで画面遷移を制御
  return {
    success: true,
    nextScreen: 'onboarding', // または 'despair'
    timestamp: Date.now()
  };
}

// app/_layout.tsx でWipe状態をチェック
export default function RootLayout() {
  const [isWiped, setIsWiped] = useState(false);

  useEffect(() => {
    checkWipeStatus().then(setIsWiped);
  }, []);

  if (isWiped) {
    return <OnboardingFlow />;
  }

  return <MainApp />;
}
```

---

### 問題 #5: クエストペナルティの条件が仕様と不一致【High】

**カテゴリ:** 論理的ギャップ

**問題の説明:**
仕様書では「夜のクエストが未達成の場合に -20%」と記載されているが、実装計画では以下のように解釈されている:

```typescript
async applyQuestPenalty(completion: {
  quest1: boolean;
  quest2: boolean;
}): Promise<IHResponse> {
  const anyIncomplete = !completion.quest1 || !completion.quest2;
  const delta = anyIncomplete ? IH_CONSTANTS.QUEST_PENALTY : 0;
  // ...
}
```

これは「どちらか1つでも未完了なら -20%」という意味。

**なぜ問題か:**
- 仕様が曖昧: 「クエスト1つ未達成 = -20%」なのか「全クエスト未達成 = -20%」なのか
- 現在の実装: quest1だけ未完了でも -20%、両方未完了でも -20%（累積しない）
- 仕様の意図と異なる可能性

**修正提案:**
仕様を明確化し、以下のいずれかを選択:

**オプションA:** 各クエスト個別にペナルティ（各 -10%）
```typescript
async applyQuestPenalty(completion: {
  quest1: boolean;
  quest2: boolean;
}): Promise<IHResponse> {
  let delta = 0;
  if (!completion.quest1) delta -= 10;
  if (!completion.quest2) delta -= 10;
  return this.updateIH(delta);
}
```

**オプションB:** いずれか未達成で -20%（現状維持、ただし仕様書に明記）

TDDテストも追加:
```typescript
test('両方のクエストが未達成の場合のペナルティ', async () => {
  const result = await engine.applyQuestPenalty({ quest1: false, quest2: false });
  expect(result.delta).toBe(-20); // または -40 if オプションA
});
```

---

### 問題 #6: 日次リセット/IH維持ロジックの欠落【High】

**カテゴリ:** 抜け・漏れ

**問題の説明:**
仕様書の状態遷移図によると、「Evening --> Sleep[翌日のループへ]」とあり、日をまたぐ際の処理が存在する。しかし、実装計画には以下が欠落:

1. IHは翌日も引き継がれるのか、リセットされるのか
2. 日次の通知応答記録は翌日もカウントされるのか
3. クエストは翌日にリセットされるのか

**なぜ問題か:**
- 2日目以降の動作が未定義
- IH=100で新しい日を始めると、仕様の厳しさが失われる
- IHを引き継ぐと、ユーザーが回復できない

**修正提案:**
日次処理ロジックを追加:

```typescript
// src/core/daily/DailyManager.ts

export class DailyManager {
  async onNewDay(): Promise<void> {
    // 1. 新しいクエストの入力を促す
    await this.createNewDailyQuests();

    // 2. IHは維持（リセットしない）
    // これにより、連続した悪い日がWipeに繋がる

    // 3. 過去の通知応答記録は保持（統計用）
  }

  async checkDayChange(): Promise<boolean> {
    const lastActiveDate = await this.getLastActiveDate();
    const today = new Date().toDateString();
    return lastActiveDate !== today;
  }
}
```

---

### 問題 #7: オンボーディングフローの未定義【High】

**カテゴリ:** 抜け・漏れ

**問題の説明:**
仕様書によると、ユーザーは以下を設定する必要がある:
- アンチビジョン（絶対に生きたくない5年後の火曜日）
- アイデンティティステートメント（私は〜な人間だ）
- 1年ミッション
- 今日の2つのクエスト

しかし、これらの入力画面やフローが実装計画に含まれていない。

**なぜ問題か:**
- アプリ起動後に何を入力すればいいかわからない
- DBに必須データがない状態でアプリが動作する
- Wipe後の再セットアップフローが不明

**修正提案:**
```
one-day-os/
├── app/
│   ├── onboarding/
│   │   ├── index.tsx         # オンボーディング開始
│   │   ├── anti-vision.tsx   # アンチビジョン入力
│   │   ├── identity.tsx      # アイデンティティ入力
│   │   ├── mission.tsx       # 1年ミッション入力
│   │   └── quests.tsx        # 今日のクエスト入力
```

また、オンボーディング完了チェック:
```typescript
async function isOnboardingComplete(): Promise<boolean> {
  const identity = await db.getFirstAsync('SELECT * FROM identity');
  const antiVision = await db.getFirstAsync('SELECT * FROM anti_vision');
  return identity !== null && antiVision !== null;
}
```

---

### 問題 #8: PHASE時間帯制御ロジックの欠落【High】

**カテゴリ:** 抜け・漏れ

**問題の説明:**
仕様書では明確な時間帯が定義されている:
- Morning Layer: AM 6:00-9:00
- Evening Layer: PM 20:00-24:00
- 日中の通知: 11:00, 13:30, 15:15, 17:00, 19:30

実装計画では`PHASE_TIMES`定数は定義されているが、実際にこれを使って画面を制御するロジックがない。

**なぜ問題か:**
- AM 10:00にMorning Layerにアクセスできてしまう
- 時間帯外での操作がどうなるか未定義
- 仕様の「強制」が実装されていない

**修正提案:**
```typescript
// src/core/phase/PhaseManager.ts

export type Phase = 'morning' | 'core' | 'evening' | 'locked';

export function getCurrentPhase(): Phase {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();

  if (hour >= 6 && hour < 9) return 'morning';
  if (hour >= 20 && hour < 24) return 'evening';
  if (hour >= 9 && hour < 20) return 'core';
  return 'locked'; // AM 0:00-6:00 は操作不可?
}

// app/_layout.tsx
export default function RootLayout() {
  const phase = getCurrentPhase();

  return (
    <Tabs>
      <Tabs.Screen
        name="morning"
        options={{
          href: phase === 'morning' ? '/morning' : null
        }}
      />
      {/* ... */}
    </Tabs>
  );
}
```

---

### 問題 #9: バックアップ無効化の実装が不完全【High】

**カテゴリ:** エラーの温床

**問題の説明:**
現在の`WipeManager.disableBackup()`は`.nosync`ファイルを作成するだけだが、これは不十分:

```typescript
private async disableBackup(): Promise<void> {
  const noSyncPath = `${dbPath}.nosync`;
  await FileSystem.writeAsStringAsync(noSyncPath, '', { ... });
}
```

**なぜ問題か:**
1. `.nosync`ファイルはiCloudのバックアップ除外には使えない（iCloud Driveの同期除外用）
2. Androidでは全く効果がない
3. iOSで正しく除外するには`NSURLIsExcludedFromBackupKey`が必要

**修正提案:**
```typescript
// iOS: expo-file-system の正しい設定
import * as FileSystem from 'expo-file-system';

async disableBackup(): Promise<void> {
  const dbPath = `${FileSystem.documentDirectory}SQLite/onedayos.db`;

  // iOS: isExcludedFromBackup フラグを設定
  // Expo ではネイティブモジュールが必要な場合がある

  // 代替案: データベースを Library/Caches に配置
  // この場合、OSがストレージ不足時に削除する可能性があることに注意
}

// Android: app.json の設定
{
  "expo": {
    "android": {
      "allowBackup": false  // これが必要
    }
  }
}
```

リスク項目にも記載があるが、`allowBackup: false`の設定がapp.jsonの例に含まれていない。

---

### 問題 #10: アプリ削除によるWipe条件の未実装【High】

**カテゴリ:** 抜け・漏れ

**問題の説明:**
仕様書の状態遷移図:
```
Evening -->|IH <= 0 または 削除| Wipe[!! 物理ワイプ実行 !!]
```

「削除」がWipeトリガーになると記載されているが、実装計画にはこのロジックがない。

**なぜ問題か:**
- アプリを削除して再インストールすると、データがリセットされ、ペナルティなしで再開できる
- 仕様の「不可逆」原則に違反

**修正提案:**
技術的にはアプリ削除を検知することは困難。代替案として:

1. **サーバーレス原則を維持しつつ、ローカルに「削除検知」マーカーを残す方法はない**（アプリデータも消える）
2. **仕様変更を提案:** この要件は技術的に実現困難であることを文書化

```markdown
### 技術的制限事項

アプリ削除によるWipeトリガーは、以下の理由により実装不可:
- iOS/Androidともに、アプリ削除時に全データが消去される
- サーバーレス原則によりサーバー側での状態管理ができない

代替案: ユーザーが自主的にWipeを選択できる「自己破壊ボタン」を提供
```

---

### 問題 #11: 通知スケジュールのタイムゾーン未考慮【Medium】

**カテゴリ:** エッジケース

**問題の説明:**
`NOTIFICATION_SCHEDULE`はローカル時間で定義されているが、タイムゾーン変更時の動作が未定義:

```typescript
export const NOTIFICATION_SCHEDULE = [
  { hour: 11, minute: 0, question: '...' },
  // ...
];
```

**なぜ問題か:**
- 海外旅行中にタイムゾーンが変わると、通知が意図しない時間に発火
- 夏時間（DST）の切り替えで通知がスキップまたは重複

**修正提案:**
```typescript
// 通知スケジュール時にタイムゾーンを考慮
await Notifications.scheduleNotificationAsync({
  trigger: {
    hour: schedule.hour,
    minute: schedule.minute,
    repeats: true,
    // Expo Notifications は自動的にローカルタイムゾーンを使用
    // ただし、タイムゾーン変更時の再スケジュールが必要
  },
});

// app/_layout.tsx でタイムゾーン変更を監視
useEffect(() => {
  const subscription = AppState.addEventListener('change', async (state) => {
    if (state === 'active') {
      // タイムゾーン変更をチェックし、必要に応じて再スケジュール
      await notificationScheduler.rescheduleDailyNotifications();
    }
  });
  return () => subscription.remove();
}, []);
```

---

### 問題 #12: IdentityEngineとDBの同期問題【Medium】

**カテゴリ:** 依存関係の問題

**問題の説明:**
`IdentityEngine`はIH値をインメモリで保持しているが、DBとの同期が不明確:

```typescript
export class IdentityEngine {
  private currentIH: number = 100;  // インメモリ

  setCurrentIH(value: number): void {
    this.currentIH = Math.max(0, Math.min(100, value));
    // DBへの書き込みがない
  }
}
```

**なぜ問題か:**
- アプリ再起動時にIH値がリセットされる
- 複数の場所から`IdentityEngine`がインスタンス化されると、IH値が不整合になる

**修正提案:**
1. `IdentityEngine`をシングルトンにする
2. IH変更時に必ずDBに書き込む

```typescript
export class IdentityEngine {
  private static instance: IdentityEngine;
  private db: SQLite.SQLiteDatabase;

  static async getInstance(): Promise<IdentityEngine> {
    if (!this.instance) {
      this.instance = new IdentityEngine();
      await this.instance.initialize();
    }
    return this.instance;
  }

  private async initialize(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync('onedayos.db');
    // DBからIH値を読み込み
    const row = await this.db.getFirstAsync(
      'SELECT current_value FROM identity_health WHERE id = 1'
    );
    this.currentIH = row?.current_value ?? 100;
  }

  private async updateIH(delta: number): Promise<IHResponse> {
    this.currentIH = Math.max(0, this.currentIH + delta);

    // DBに永続化
    await this.db.runAsync(
      'UPDATE identity_health SET current_value = ?, last_updated = ? WHERE id = 1',
      [this.currentIH, Date.now()]
    );

    // ...
  }
}
```

---

### 問題 #13: 複数クエスト未達成時のペナルティ累積【Medium】

**カテゴリ:** 論理的ギャップ

**問題の説明:**
仕様では「夜のクエストが未達成の場合に -20%」とあるが、2つのクエストがある場合の扱いが不明。現在の実装:

```typescript
test('夜のクエストが未達成の場合、IHが20%減少する', async () => {
  const result = await engine.applyQuestPenalty({ quest1: false, quest2: true });
  expect(result.newIH).toBe(80);
});
```

**なぜ問題か:**
- quest1だけ未完了 → -20%
- quest2だけ未完了 → -20%
- 両方未完了 → -20% (累積しない?)

この挙動が仕様として正しいのか不明。

**修正提案:**
TDDテストに全パターンを追加:

```typescript
describe('クエストペナルティ', () => {
  test('quest1のみ未達成 → -20%', async () => {
    const result = await engine.applyQuestPenalty({ quest1: false, quest2: true });
    expect(result.delta).toBe(-20);
  });

  test('quest2のみ未達成 → -20%', async () => {
    const result = await engine.applyQuestPenalty({ quest1: true, quest2: false });
    expect(result.delta).toBe(-20);
  });

  test('両方未達成 → -20%（累積しない）', async () => {
    const result = await engine.applyQuestPenalty({ quest1: false, quest2: false });
    expect(result.delta).toBe(-20); // または -40 if 累積
  });

  test('両方達成 → 0%', async () => {
    const result = await engine.applyQuestPenalty({ quest1: true, quest2: true });
    expect(result.delta).toBe(0);
  });
});
```

---

### 問題 #14: GlitchTextのテストケースが不十分【Medium】

**カテゴリ:** TDD観点

**問題の説明:**
`GlitchText.test.tsx`のテストは、実際のスタイル検証が不正確:

```typescript
test('IH 100%の場合、グリッチエフェクトなし', () => {
  expect(text.props.style).not.toContainEqual(
    expect.objectContaining({ textShadow: expect.any(String) })
  );
});
```

`textShadow`は React Native には存在しないプロパティ。

**なぜ問題か:**
- テストが誤った条件で検証している
- 実装とテストの不一致
- TDDの原則に違反

**修正提案:**
```typescript
test('IH 100%の場合、グリッチエフェクトなし', () => {
  const { getByText } = render(
    <GlitchText ih={100}>Test Text</GlitchText>
  );

  const text = getByText('Test Text');
  const flatStyle = StyleSheet.flatten(text.props.style);

  // transform が undefined または translateX/Y が 0
  expect(flatStyle.transform).toBeUndefined();
  // または
  expect(flatStyle.opacity).toBe(1);
});
```

---

### 問題 #15: WipeManager.test.tsのモック設計が不正確【Medium】

**カテゴリ:** TDD観点

**問題の説明:**
テストで`mockDb.execAsync`をモックしているが、テスト内で直接`mockDb.execAsync`を呼んでいる:

```typescript
test('Wipeは元に戻せない（不可逆性の確認）', async () => {
  // データを挿入
  await mockDb.execAsync('INSERT INTO identity (identity_statement) VALUES ("Test")');
  // ...
});
```

これはモックへの書き込みであり、実際のDB動作をテストしていない。

**なぜ問題か:**
- テストが実際の不可逆性を検証していない
- モックされた関数を呼んでも意味がない

**修正提案:**
統合テストとして実際のDBを使用するか、モックの設計を見直す:

```typescript
// 統合テスト（E2Eレベル）
describe('WipeManager - Integration', () => {
  let db: SQLite.SQLiteDatabase;
  let wipeManager: WipeManager;

  beforeEach(async () => {
    db = await SQLite.openDatabaseAsync(':memory:');
    wipeManager = new WipeManager(db);
    await initializeSchema(db);
  });

  test('Wipe後、identityテーブルが空になる', async () => {
    // 事前にデータを挿入
    await db.runAsync('INSERT INTO identity (...) VALUES (...)');

    // Wipe実行
    await wipeManager.executeWipe('IH_ZERO', 0);

    // 検証
    const rows = await db.getAllAsync('SELECT * FROM identity');
    expect(rows.length).toBe(0);
  });
});
```

---

### 問題 #16: setIntervalによるメモリリーク【Medium】

**カテゴリ:** エラーの温床

**問題の説明:**
`NotificationHandler.initialize()`で`setInterval`を設定しているが、クリーンアップ処理がない:

```typescript
async initialize(): Promise<void> {
  // ...
  setInterval(() => this.checkTimeouts(), 60 * 1000);
}
```

**なぜ問題か:**
- コンポーネントがアンマウントされてもインターバルが動き続ける
- メモリリークの原因
- 複数回`initialize()`が呼ばれると、複数のインターバルが動作

**修正提案:**
```typescript
export class NotificationHandler {
  private timeoutIntervalId: NodeJS.Timeout | null = null;

  async initialize(): Promise<void> {
    // 既存のインターバルをクリア
    this.cleanup();

    // ...
    this.timeoutIntervalId = setInterval(() => this.checkTimeouts(), 60 * 1000);
  }

  cleanup(): void {
    if (this.timeoutIntervalId) {
      clearInterval(this.timeoutIntervalId);
      this.timeoutIntervalId = null;
    }
  }
}

// React コンポーネントで使用する場合
useEffect(() => {
  const handler = new NotificationHandler(engine);
  handler.initialize();

  return () => handler.cleanup();
}, []);
```

---

### 問題 #17: Expo Router v4のファイル構成の誤り【Medium】

**カテゴリ:** 依存関係の問題

**問題の説明:**
実装計画ではExpo Router v4（~4.0.0）を使用しているが、ファイル構成が古いパターン:

```
app/
├── (tabs)/
│   ├── index.tsx
│   ├── morning.tsx
│   └── evening.tsx
├── _layout.tsx
```

Expo Router v3以降、`(tabs)`グループを使用する場合は、グループ内に`_layout.tsx`が必要。

**なぜ問題か:**
- ナビゲーションが正しく動作しない可能性
- Expo Router v4の仕様変更に対応していない

**修正提案:**
```
app/
├── (tabs)/
│   ├── _layout.tsx    # タブナビゲーション定義
│   ├── index.tsx
│   ├── morning.tsx
│   └── evening.tsx
├── _layout.tsx        # ルートレイアウト（Stack）
├── onboarding/
│   └── ...
```

```typescript
// app/_layout.tsx (ルート)
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}

// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="morning" />
      <Tabs.Screen name="index" />
      <Tabs.Screen name="evening" />
    </Tabs>
  );
}
```

---

### 問題 #18: IH回復メカニズムの欠落【Low】

**カテゴリ:** 抜け・漏れ

**問題の説明:**
仕様書によると「YES回答 → IH値を維持 / 輝度維持」とあるが、IHが減少した後に回復する手段がない。

**なぜ問題か:**
- 一度IHが減少すると、回復不能
- 5回の通知全てでNOと答えると -75%（IH=25%）
- 翌日もクエスト未達成なら -20%（IH=5%）
- 数日で確実にWipe

**修正提案:**
仕様確認が必要だが、以下のいずれかを検討:

1. **仕様通り維持のみ（回復なし）** - 現状のまま、ただし文書化
2. **YES回答で微量回復** - 例: YES → +5%（ただし100を超えない）

```typescript
async applyNotificationResponse(response: 'YES' | 'NO' | 'IGNORED'): Promise<IHResponse> {
  let delta = 0;
  switch (response) {
    case 'YES':
      delta = IH_CONSTANTS.YES_BONUS; // +5 など
      break;
    case 'NO':
    case 'IGNORED':
      delta = IH_CONSTANTS.NOTIFICATION_PENALTY; // -15
      break;
  }
  return this.updateIH(delta);
}
```

---

### 問題 #19: 通知権限拒否後の再要求フロー未定義【Low】

**カテゴリ:** エッジケース

**問題の説明:**
通知権限が拒否された場合、エラーを投げるだけ:

```typescript
if (newStatus !== 'granted') {
  throw new Error('Notification permission not granted');
}
```

**なぜ問題か:**
- ユーザーがアプリを使い続けられない
- 設定画面への誘導がない
- 通知なしでも使えるのか不明

**修正提案:**
```typescript
async scheduleDailyNotifications(): Promise<ScheduleResult> {
  const { status } = await Notifications.getPermissionsAsync();

  if (status !== 'granted') {
    const { status: newStatus } = await Notifications.requestPermissionsAsync();

    if (newStatus !== 'granted') {
      // 設定画面への誘導
      return {
        success: false,
        reason: 'permission_denied',
        action: () => Linking.openSettings()
      };
    }
  }

  // 通知をスケジュール...
}
```

UIでのハンドリング:
```tsx
const result = await scheduler.scheduleDailyNotifications();
if (!result.success) {
  Alert.alert(
    '通知を有効にしてください',
    'One Day OSは通知が必須です。設定から通知を有効にしてください。',
    [
      { text: '設定を開く', onPress: result.action },
      { text: 'キャンセル' }
    ]
  );
}
```

---

### 問題 #20: アンチビジョン・クエスト入力UIの未定義【Low】

**カテゴリ:** 抜け・漏れ

**問題の説明:**
以下のUIが定義されていない:
- アンチビジョン入力画面
- 今日のクエスト入力画面
- 3層レンズ（ピンチズーム）UI
- 夜の「停滞の理由」入力UI

**なぜ問題か:**
- 初期スコープ外かもしれないが、コアUXの一部
- オンボーディング後の日常フローが不明

**修正提案:**
Phase 3以降のマイルストーンに明確に追加:

```markdown
### Milestone 4: コアUI実装 (Week 7-8)

1. アンチビジョン入力画面
   - 全画面テキスト入力
   - 自動保存

2. クエスト入力画面
   - 2つのテキスト入力フィールド
   - 完了チェックボックス

3. 3層レンズUI
   - ピンチズームジェスチャー
   - 0.5x / 1.0x / 2.0x の3段階

4. 夜の振り返りUI
   - 「停滞の理由」入力
   - 「本当の敵」命名
```

---

## 3. 総合評価

### 評価サマリー

| 項目 | 評価 | コメント |
|------|------|----------|
| **構造の明確さ** | B+ | ファイル構成は明確だが、一部Expo Router v4との不整合あり |
| **TDDアプローチ** | B | テストケースは網羅的だが、一部モック設計に問題あり |
| **仕様との整合性** | C | 絶望モード、日次処理、PHASE制御など重要な仕様が欠落 |
| **技術的実現性** | B+ | expo-sqlite, expo-notifications の使用は適切 |
| **エッジケース考慮** | C+ | タイムゾーン、権限拒否、アプリ再起動時の処理が不足 |
| **リスク管理** | B | リスク項目は挙げられているが、対策が具体的でない箇所あり |

### 実装準備状態

**現状: 実装開始には時期尚早**

以下のCritical/High問題を解決するまで、実装を開始すべきではない:

1. **[Critical #1]** 絶望モードの仕様明確化
2. **[Critical #2]** IH初期化ロジックの追加
3. **[Critical #3]** 通知タイムアウト検知の再設計
4. **[Critical #4]** Wipe後の画面遷移ロジック追加
5. **[High #6]** 日次リセット/維持ロジックの定義
6. **[High #7]** オンボーディングフローの追加
7. **[High #8]** PHASE時間帯制御の実装

### 推奨アクション

1. **仕様書（idea.md）との差分を明確化** - 変更点をCHANGELOGとして文書化
2. **実装計画書 v1.1 を作成** - 上記Critical/High問題を解決した改訂版
3. **TDDテストケースの見直し** - モック設計とエッジケースを追加
4. **スケジュールの再見積もり** - 欠落機能を含めると、現在の7週間では不足

---

**レビュー完了日:** 2026-01-28
**次のアクション:** 問題点 #1〜#10 の解決後、再レビューを実施
