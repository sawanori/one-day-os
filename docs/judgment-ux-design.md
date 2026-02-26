# 審判UX設計書 - One Day OS
## "通知"から"OSの意志"への昇華

---

## 設計思想

### 現状の問題
現在の通知は「外部からの割り込み」として設計されている。
スマホが振動し、通知バナーが出て、ユーザーがタップする。これは**すべてのアプリと同じ体験**であり、One Day OSの世界観を破壊する。

### 目指す体験
**「OSそのものが意志を持ち、ユーザーを監視し、審判を下す」**

通知は「お知らせ」ではない。OSがユーザーの現実に介入する瞬間である。
ユーザーは通知を受けるのではなく、**OSに呼び出される**。

---

## 1. 審判の5つのモード

### 1-1. カテゴリー定義

各カテゴリーはレンズシステムと連動する。OSはユーザーが設定した3層のデータを武器として使う。

| モード | レンズ対応 | 審判の角度 | トーン |
|--------|-----------|-----------|--------|
| **EVASION（逃避検知）** | 2.0x (Quest) | 今この瞬間、クエストから逃げていないか | 追及 |
| **OBSERVER（観測者の視線）** | 外部視点 | 第三者が今の君をどう見るか | 冷笑 |
| **DISSONANCE（不一致）** | 1.0x (Identity) | 行動とアイデンティティの乖離 | 告発 |
| **ANTI-VISION（暗黒想起）** | 0.5x (Mission) | 怠惰が導く1年後の地獄 | 恐怖 |
| **SURVIVAL（生存確認）** | 全レンズ | OSへの服従と覚悟の再確認 | 最後通告 |

**注記:** アンチビジョンはユーザーが恐れる将来像を指す。1年計画（one_year_mission）とは独立した概念であり、時間軸はユーザーの入力内容に依存する。本設計では主に1年後を想定した質問として記載するが、ユーザーのアンチビジョン次第で柔軟に調整される。

### 1-2. 動的質問テンプレート

質問はユーザーのオンボーディングデータを埋め込む。`{{}}` はランタイム置換。

#### anti_vision_fragment の抽出アルゴリズム

アンチビジョンテキストを句読点（。、！、？、\n）で分割し、ランダムに1フラグメントを選択する。テキストが短い（50文字以下）場合はそのまま全文を使用する。

```typescript
function extractAntiVisionFragment(antiVision: string): string {
  if (antiVision.length <= 50) return antiVision;
  const fragments = antiVision.split(/[。、！？\n]+/).filter(s => s.trim().length > 0);
  return fragments[Math.floor(Math.random() * fragments.length)];
}
```

#### 質問テンプレート一覧

```
EVASION:
  ja: "「{{quest_1}}」は完了したか。まだなら、今何をしている？"
  en: "Is '{{quest_1}}' done? If not, what are you doing right now?"

  ja: "重要でないふりをしている最重要のことは何だ？"
  en: "What is the most important thing you're pretending isn't important?"

OBSERVER:
  ja: "今の君を5分間観察した他人は、何を目指す人間だと結論づけるか？"
  en: "Someone watching you for 5 minutes — what would they conclude you want?"

  ja: "{{identity}}と名乗る人間が、今この行動をしている。矛盾を説明しろ。"
  en: "A person who claims '{{identity}}' is doing this right now. Explain the contradiction."

DISSONANCE:
  ja: "{{identity}} — これは今も真実か？"
  en: "{{identity}} — Is this still true?"

  ja: "今の行動は、君が定義した理想と一致しているか？YESと言えるか？"
  en: "Does your current action align with your defined ideal? Can you say YES?"

ANTI-VISION:
  ja: "{{anti_vision_fragment}} — この未来に1分近づいたか、1分遠ざかったか？"
  en: "{{anti_vision_fragment}} — Did this minute bring you closer or further?"

  ja: "1年後、最悪の火曜日。今の1分がその日を確定させていないか？"
  en: "1 year from now, the worst Tuesday. Is this minute making it certain?"

SURVIVAL:
  ja: "沈黙は死だ。君はまだ自分を諦めていないか？"
  en: "Silence is death. Have you given up on yourself?"

  ja: "応答せよ。さもなくば、覚悟はその程度だ。"
  en: "Respond. Otherwise, your resolve amounts to nothing."
```

---

## 2. 審判の到来演出（Judgment Arrival）

### 2-1. アプリ外（バックグラウンド）

```
[OS通知]
┌─────────────────────────────────┐
│ ■ ONE DAY OS                    │
│                                 │
│ 「{{identity}} — これは今も     │
│   真実か？」                    │
│                                 │
│  [YES]          [NO]            │
└─────────────────────────────────┘
```

- **Time-Sensitive通知レベル**（初回リリース用。Critical Alert申請は審査承認後）
- iOS: `interruptionLevel: .timeSensitive`（承認後に`.critical`へ変更予定）
- カスタムサウンド: 低音の単発パルス（0.3秒、不快な周波数）
  - フォーマット: `.caf`形式（iOS）/ `.mp3`形式（Android）
  - 配置場所: `/assets/sounds/judgment_pulse.caf`
  - 長さ: 30秒以下
  - Phase P4以降で実装
- YES/NOボタンをOS通知内に直接配置
- OS通知内のYES/NOアクションは `opensAppToForeground: false` に設定し、アプリを開かずにバックグラウンドで応答を処理する
- 応答はバックグラウンドでIHに即反映

### 2-2. アプリ内（フォアグラウンド）— 没入演出

アプリを開いている最中に審判が到来した場合、**通知バナーではなくOS自体が変容する**。

**注: ブルータリストデザインの原則として通常UIにはアニメーションを使わないが、審判の「侵食」は例外的にアニメーションを使用する。これはOSの意志による介入であり、ユーザーが意図的に排除できない「外部からの力」を表現するため。**

```
Phase 1: 前兆（0.5秒）
├── 画面全体に微細なノイズ増加
├── 心拍ハプティクス開始（Heavy impact × 2回）
└── 現在のUI要素がわずかにジッターする

Phase 2: 侵食（0.3秒）
├── 画面上部から赤い水平線が降下
├── 現在のコンテンツが上方にスクロールアウト
└── 審判画面がフェードイン（opacity 0→1, 200ms）

Phase 3: 審判画面表示
├── 質問テキスト（GlitchText, severity 0.3）
├── 5秒カウントダウン（赤、72px）※72pxは例外的にtheme外サイズ（侵食の象徴）
├── YES / NO ボタン
└── 背景: 純黒 + 微細なノイズオーバーレイ

Phase 4: 応答後
├── YES → 画面が一瞬白くフラッシュ → 元のUIに復帰（静寂）
├── NO → 赤フラッシュ + グリッチ爆発 → IH減少アニメーション表示
└── タイムアウト → 画面が赤→黒にフェード + 「沈黙は敗北」テキスト
```

### 2-3. ハプティクスシーケンス

HapticEngineに以下の4つの新規メソッドを追加する。すべて既存パターンに従う（Platform.OS チェック、try/catch、delay関数使用）。

**delay関数の定義:**
`src/utils/delay.ts` に配置:
```typescript
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
```

**新規メソッド:**

```typescript
// 審判到来
async judgmentArrival(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    // 前兆パルス
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise(resolve => setTimeout(resolve, 200));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise(resolve => setTimeout(resolve, 500));
    // 侵食バイブレーション
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch (error) {
    console.error('Haptic judgmentArrival failed:', error);
  }
}

// YES応答（静寂 = 報酬）
async judgmentYes(): Promise<void> {
  // 何もしない。静寂が報酬。
}

// NO応答（罰）
async judgmentNo(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    await new Promise(resolve => setTimeout(resolve, 100));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await new Promise(resolve => setTimeout(resolve, 100));
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  } catch (error) {
    console.error('Haptic judgmentNo failed:', error);
  }
}

// タイムアウト（最重罰）
async judgmentTimeout(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    // 3連パルス → 長い沈黙 → 最終パルス
    for (let i = 0; i < 3; i++) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      await new Promise(resolve => setTimeout(resolve, 80));
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } catch (error) {
    console.error('Haptic judgmentTimeout failed:', error);
  }
}
```

---

## 3. 審判の痕跡（Judgment Scars）

審判は終わった後も消えない。失敗した審判はUIに「傷」として残る。

### 3-1. Identity Lens（1.0x）への傷

アイデンティティ画面の背景に、過去24時間の審判結果がゴーストテキストとして浮かぶ。

```
YES応答 → 何も残らない（当然の義務を果たしただけ）
NO応答  → 「NO」が薄い赤(opacity 0.08)で背景にランダム配置。24時間で消失。
タイムアウト → 「...」が灰色(opacity 0.12)で配置。48時間で消失。
```

1日にNOを3回答えると、背景が「NO NO NO」のテクスチャで満たされ、自分のアイデンティティ宣言が読みにくくなる。**自分の嘘で自分のアイデンティティが見えなくなる視覚的表現。**

#### ゴーストテキストのデータアクセス

ゴーストテキストの表示は `judgment_log` テーブルからの直近24-48時間のクエリで生成。レコード自体は削除しない（ログとして永続）。表示の消失は `created_at` からの経過時間に基づくフィルタリングで制御。

```typescript
// 例: Identity Lensでのゴーストテキスト取得
const ghosts = db.getAllSync(
  `SELECT response, created_at FROM judgment_log
   WHERE response IN ('NO', 'TIMEOUT')
   AND datetime(created_at) > datetime('now', '-48 hours')
   ORDER BY created_at DESC`
);
```

### 3-2. Mission Lens（0.5x）への墓標

0.5xレンズ（アンチビジョン表示画面）の下部に、失敗した審判が「墓標」として刻まれる。

```
┌─────────────────────────┐
│  LENS: 0.5x [1年計画]   │
│                         │
│  あなたが想定する       │
│  最悪の未来             │
│                         │
│  「朝起きても何もする   │
│   気が起きない...」     │
│                         │
│ ─── JUDGMENT LOG ───    │
│                         │
│  09:00 NO  IH: 85→70   │
│  15:00 ... IH: 70→50   │
│  18:00 NO  IH: 50→35   │
│                         │
│  累計損失: -65%         │
└─────────────────────────┘
```

墓標はアンチビジョンの直下に表示される。
**「この怠惰の積み重ねが、あの最悪の未来を現実にする」**という因果関係を視覚化。

#### 墓標のデータアクセス

MissionLensコンポーネントはマウント時に `judgment_log` テーブルから当日の `response = 'NO' OR response = 'TIMEOUT' OR response = 'IGNORED'` レコードをクエリし、墓標として表示する。ポーリング間隔は2秒（既存のhealth checkと同一）。

```typescript
// 例: Mission Lensでの墓標データ取得
const tombstones = db.getAllSync(
  `SELECT scheduled_at, response, ih_before, ih_after
   FROM judgment_log
   WHERE response IN ('NO', 'TIMEOUT', 'IGNORED')
   AND date(scheduled_at) = date('now', 'localtime')
   ORDER BY scheduled_at ASC`
);
```

### 3-3. Quest Lens（2.0x）への圧力

クエスト画面に、次の審判までの推定時間を表示。

```
┌─────────────────────────┐
│  LENS: 2.0x [今日]      │
│                         │
│  ☐ BOSS: 3時間コーディング│
│  ☐ MINION: 朝6時起床    │
│                         │
│  ── NEXT JUDGMENT ──    │
│  推定: 12〜45分後       │
│  （正確な時刻は不明）   │
└─────────────────────────┘
```

正確な時間は表示しない。「12〜45分後」のような曖昧な範囲のみ。
**いつ来るかわからない恐怖が、常に背筋を伸ばさせる。**

#### エッジケース処理

- **全5回の審判が完了した場合**: "本日の審判は終了"と表示
- **最終審判後**: 同上
- **全審判にYESで回答**: "本日の審判は終了"（特別な表示なし）

---

## 4. タイミング設計（ランダム性 + 知性）

### 4-1. 基本ルール

**重要: 既存の6固定時刻通知システムからの変更**

本設計は、既存の `NOTIFICATION_SCHEDULE.TIMES`（6:00, 9:00, 12:00, 15:00, 18:00, 21:00の6固定時刻）を廃止し、新しいランダムタイミングシステムに置き換える。

```
- 1日5回（固定） ← 既存の6回から変更
- アクティブ時間帯内でランダム配置（6:00〜22:00）
- 最低間隔: 60分（連続攻撃の防止）
- 最大間隔: 4時間（安心させない）
- 毎朝6:00に当日分をスケジュール（expo-notifications trigger計算）
```

**アクティブ時間帯の根拠:**
22:00を上限とするのは、深夜の通知によるユーザーの睡眠妨害を避けるため。既存の`PHASE_TIMES.EVENING`（18:00-24:00）とは異なる制約であり、審判専用の時間帯として定義する。

**6:00スケジューリングの実装方法:**

expo-notificationsには信頼性のある完全バックグラウンドスケジューリング機能がないため、以下のブートストラップアプローチを採用:

1. **オプションA（推奨）**: 毎朝6:00に繰り返しカレンダー通知をスケジュールし、その通知がアプリをトリガーする
2. **オプションB**: その日の最初のアプリオープン時に、当日分のスケジュールを生成する（6:00を過ぎている場合は残り時間で調整）
3. **必要に応じて**: `expo-task-manager` を依存関係として追加し、バックグラウンドタスクでの定期実行を検討

### 4-2. 知的タイミング（Phase 2実装）

アプリ使用パターンから「逃避」を検知し、タイミングを調整する。

**実装上の制約:**
知的タイミング調整はアプリがフォアグラウンドに復帰した際に実行する。`AppState` の `active` イベントで未発火の審判をチェックし、条件に応じて `expo-notifications` で再スケジュールする。バックグラウンドでの動的再スケジュールは技術的制約によりPhase 2（知的タイミング）でのみ対応。

**クエスト完了状態の検知制限:**
クエスト完了状態の検知はアプリフォアグラウンド時にのみ可能。バックグラウンドではクエスト状態を参照できないため、pre-scheduled判定は最後にアプリを開いた時点の状態に基づく。

```
検知パターン → 審判タイミング調整

1. 長時間アプリ未使用（2時間+）
   → 復帰直後に審判を発火（「逃げたな」）

2. クエスト未完了 + 夕方（16:00以降）
   → 審判頻度を上げる（残り枠を16:00〜22:00に集中配置）

3. 前回NOまたはタイムアウト
   → 次の審判を通常より早く配置（30分以内）

4. 全問YES連続
   → 最低間隔を維持（ご褒美ではなく、当然の義務）
```

### 4-3. カテゴリー選択アルゴリズム

#### JudgmentContext 型定義

```typescript
interface JudgmentContext {
  questsCompleted: boolean;  // すべてのクエストが完了済みか
  lastResponse: 'YES' | 'NO' | 'TIMEOUT' | 'IGNORED' | null;
  currentIH: number;
  hourOfDay: number;
}
```

#### 選択ロジック

```typescript
function selectCategory(context: JudgmentContext): JudgmentCategory {
  const { questsCompleted, lastResponse, currentIH, hourOfDay } = context;

  // Quest未設定の場合はSURVIVALカテゴリー固定
  // （オンボーディング中などのエッジケース対応）

  // クエスト未完了 → 逃避検知を優先
  if (!questsCompleted && hourOfDay >= 15) return 'EVASION';

  // 前回NO → 不一致を突く
  if (lastResponse === 'NO') return 'DISSONANCE';

  // IH低下中 → アンチビジョン想起
  if (currentIH < 50) return 'ANTI_VISION';

  // 長時間無応答 → 生存確認
  if (lastResponse === 'TIMEOUT') return 'SURVIVAL';

  // デフォルト → 5カテゴリーからランダム
  return randomFrom(['EVASION', 'OBSERVER', 'DISSONANCE', 'ANTI_VISION', 'SURVIVAL']);
}
```

---

## 5. 応答後の余韻（Aftereffect）

審判は応答して終わりではない。応答の結果がUIに残響する。

### 5-1. YES応答後

```
- 静寂（ハプティクスなし）
- 画面がクリーンに復帰
- IH変動なし（0%）
- 何も起きない。それが正しい状態。
```

**設計意図:** YESは「報酬」ではない。「当然の義務を果たした」だけ。ドーパミンを与えない。

### 5-2. NO応答後

```
- 赤フラッシュ（200ms）
- IH -15% アニメーション表示（現在値から赤く減少）
- 罰ハプティクス（Error + Heavy × 2）
- 画面復帰後、5秒間 GlitchText severity が +0.3 上昇
- Identity Lens背景に「NO」ゴーストテキスト追加
- StressContainerのアンチビジョン浸食が再計算される
```

#### GlitchText severity 一時上昇の実装

severity一時上昇は `JudgmentAftereffect` コンテキスト（React Context）経由でGlitchTextに伝播する。5秒後にタイマーでリセット。

```typescript
// 例: JudgmentAftereffectContext
const JudgmentAftereffectContext = React.createContext({
  severityBoost: 0,
  setSeverityBoost: (boost: number) => {}
});
```

#### StressContainer再計算のトリガー

StressContainerは既存の2秒ポーリングでIH変化を検知し、次のポーリングサイクルで効果を更新する（即座の再計算ではない）。

### 5-3. タイムアウト後

```
- 画面が赤→黒にスローフェード（1.5秒）
- テキスト表示:「沈黙は敗北と同義だ」
- IH -20% アニメーション
- 3連パルスハプティクス + 1秒沈黙 + 最終パルス
- Identity Lens背景に「...」ゴーストテキスト追加
- 次の審判タイミングが前倒し（30分以内に再審判）
```

### 5-4. IH = 0 到達時の特殊処理

審判応答によりIH=0に到達した場合、応答後のアニメーション（赤フラッシュ等）を再生した後、DespairModeManagerが発動しDespairScreenへ遷移する。審判画面の応答UIはすでに非表示のため、wipeは応答アニメーション完了を待つ（1.5秒）。

### 5-5. ペナルティ一覧表

| 応答タイプ | IH変動 | 対応定数 |
|-----------|--------|---------|
| YES       | 0%     | なし    |
| NO        | -15%   | `IH_CONSTANTS.NOTIFICATION_PENALTY` |
| TIMEOUT   | -20%   | `IH_CONSTANTS.MISSED_NOTIFICATION_PENALTY` |
| IGNORED   | -20%   | `IH_CONSTANTS.MISSED_NOTIFICATION_PENALTY` |

---

## 6. 応答ウィンドウ設計

### 6-1. 5秒 vs 5分 — ハイブリッド設計

完全な5秒制限はOS通知では技術的に不可能（iOS/Androidの制約）。
そこで**二段階ウィンドウ**を設計する。

```
[OS通知到達] ─── 5分以内にタップ ───→ [アプリ内審判画面]
                                           │
                                      5秒カウントダウン
                                           │
                                    ┌──────┼──────┐
                                   YES    NO    タイムアウト
```

- **第1段階（5分）**: OS通知をタップしてアプリを開く猶予
- **第2段階（5秒）**: アプリ内で即答する猶予

**応答タイプの定義:**

- **TIMEOUT**: アプリ内5秒カウントダウンが切れた場合（-20%）
- **IGNORED**: OS通知5分ウィンドウを超えて無視した場合（-20%）

両者は異なる無視状態を表すが、ペナルティは同じ最重罰（-20%）。

**5分を超えて通知を無視 → IGNORED扱い（-20%、最重ペナルティ）**
**5分以内に開いたが5秒以内に答えない → TIMEOUT扱い（-20%）**
**OS通知内のYES/NOボタンで直接回答 → 即座に反映（アプリを開く必要なし）**

### 6-2. OS通知内直接応答（最速パス）

**バックグラウンド応答の実装:**

バックグラウンドでの応答処理には `expo-task-manager` + `Notifications.registerTaskAsync()` が必要。バックグラウンドタスク内では最小限のDB書き込み（judgment_logへのINSERT + identityテーブルのIH UPDATE）のみ行う。

```
iOS: actionIdentifier = 'YES' or 'NO'
→ Background fetch でIH更新
→ 次にアプリを開いた時に結果をUI反映
```

これにより「アプリを開かなくても審判に応答できる」が、
**アプリを開いて5秒以内に答える方が「儀式」としての重みがある。**

### 6-3. 複数審判の衝突処理

審判画面表示中に次の審判時刻が到達した場合、現在の審判が完了するまで次の審判をキューに入れる。応答後に即座に次の審判が発火する。キューの上限は2件（それ以上はIGNORED扱い）。

---

## 7. 全体フロー図

```
[毎朝6:00]
    │
    ├── 当日5回分の審判時刻をランダム生成
    ├── expo-notificationsでスケジュール
    ├── Quest未設定の場合は「SURVIVAL」カテゴリー固定
    └── オンボーディング未完了（app_state === 'onboarding'）の場合は審判を一切発生させない
        Despair状態（app_state === 'despair'）でも審判は停止する

[審判時刻到達]
    │
    ├── アプリ閉じている → OS通知（Time-Sensitive Alert）
    │   ├── YES/NOボタンタップ → バックグラウンドIH更新（expo-task-manager使用）
    │   ├── 通知タップ → アプリ内審判画面（5秒制限）
    │   └── 5分無視 → IGNORED(-20%)
    │
    └── アプリ開いている → アプリ内侵食演出
        ├── 前兆（0.5秒）→ 侵食（0.3秒）→ 審判画面
        ├── YES → 静寂 + クリーン復帰
        ├── NO → 赤フラッシュ + IH-15% + ゴースト追加
        └── 5秒タイムアウト → TIMEOUT(-20%) + 最重ペナルティ演出

[応答後]
    │
    ├── IH更新 → StressContainer再計算（次の2秒ポーリングサイクルで）
    ├── 審判ログをDBに記録（judgment_log）
    ├── Identity Lens背景にゴースト追加（NO/タイムアウト時）
    ├── Mission Lens墓標に追記
    ├── Quest Lens「次の審判」推定時間更新
    └── IH=0到達時 → 応答アニメーション完了後にDespairScreenへ遷移
```

**審判システムの有効化条件:**

審判システムはオンボーディング完了後（`app_state === 'active'`）にのみ有効化される。`app_state === 'onboarding'` の間は審判は一切発生しない。Despair状態（`app_state === 'despair'`）でも審判は停止する。

---

## 8. データモデル拡張

### 8-1. judgment_log テーブル（新規）

```sql
CREATE TABLE IF NOT EXISTS judgment_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER,               -- daily_judgment_schedule.id への参照
  category TEXT NOT NULL,            -- 'EVASION' | 'OBSERVER' | 'DISSONANCE' | 'ANTI_VISION' | 'SURVIVAL'
  question_key TEXT NOT NULL,        -- i18nキー
  question_rendered TEXT,            -- 動的変数展開後の実際の質問文
  response TEXT NOT NULL,            -- 'YES' | 'NO' | 'TIMEOUT' | 'IGNORED'
  ih_before INTEGER NOT NULL,
  ih_after INTEGER NOT NULL,
  response_time_ms INTEGER,          -- 応答までのミリ秒（NULL = タイムアウト/無視）
  scheduled_at TEXT NOT NULL,
  responded_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (schedule_id) REFERENCES daily_judgment_schedule(id)
);
```

### 8-2. daily_judgment_schedule テーブル（新規）

```sql
CREATE TABLE IF NOT EXISTS daily_judgment_schedule (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scheduled_date TEXT NOT NULL,      -- 'YYYY-MM-DD'
  scheduled_time TEXT NOT NULL,      -- 'HH:MM'
  category TEXT NOT NULL,
  notification_id TEXT,              -- expo-notificationsのID
  is_fired INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
-- リレーション: judgment_log.schedule_id → daily_judgment_schedule.id（一方向参照）
-- 逆引きはJOINで対応: SELECT * FROM daily_judgment_schedule s LEFT JOIN judgment_log l ON l.schedule_id = s.id
```

### 8-3. NotificationResponse 型の拡張

**重要: 型システムの更新が必要**

現在の `NotificationResponse` 型（`src/core/identity/types.ts`）:
```typescript
type NotificationResponse = 'YES' | 'NO' | 'IGNORED';
```

新しい型定義:
```typescript
type NotificationResponse = 'YES' | 'NO' | 'IGNORED' | 'TIMEOUT';
```

**応答タイプの明確な区別:**
- **TIMEOUT**: アプリ内5秒カウントダウンが切れた場合
- **IGNORED**: OS通知5分ウィンドウを超えて無視した場合
- **両者とも -20% ペナルティ（`MISSED_NOTIFICATION_PENALTY`）**

### 8-4. データ移行戦略

#### 既存テーブルとの関係

- **`notifications` テーブル**: 現在アクティブ。審判システム完成後に非推奨化。
- **`daily_judgments` テーブル**: 既存のレガシーテーブル（もし存在すれば）。削除対象。

#### 移行手順（P0フェーズで実施）

1. `judgment_log` と `daily_judgment_schedule` テーブルを新規作成
2. `DB_TABLES` 定数に以下を追加:
   ```typescript
   JUDGMENT_LOG: 'judgment_log',
   JUDGMENT_SCHEDULE: 'daily_judgment_schedule'
   ```
3. `notifications` テーブルは当面維持（既存システムとの互換性のため）
4. `daily_judgments` レガシーテーブルがあればDROP
5. P3（ランダムタイミング）完了時に `notifications` テーブル完全非推奨化

---

## 9. 実装優先度

| Phase | 内容 | 依存 | 詳細 |
|-------|------|------|------|
| **P0** | JudgmentEngine基盤構築 | なし | JudgmentEngineクラス新規作成（judgment_logへの記録、IH反映）<br/>新規DBテーブル作成（judgment_log, daily_judgment_schedule）<br/>NotificationController.tsx修正: 審判ルーティング接続<br/>`_layout.tsx`でのJudgmentEngine初期化<br/>既存NotificationHandler/notificationsテーブルの非推奨化<br/>NotificationResponse型に'TIMEOUT'を追加 |
| **P1** | 5カテゴリー質問テンプレート + i18n + 二段階応答ウィンドウ | P0 | 5カテゴリーの質問テンプレート実装<br/>i18n統合<br/>5分OS通知 + 5秒アプリ内カウントダウンのコアロジック実装<br/>既存getReflectionQuestions()の非推奨化 |
| **P2** | 動的変数置換（アンチビジョン/クエスト埋め込み） | P1 | `{{quest_1}}`, `{{identity}}`, `{{anti_vision_fragment}}` の動的置換<br/>anti_vision_fragment抽出アルゴリズム実装 |
| **P3** | ランダムタイミング生成 + 毎朝再スケジュール | P1 | 6:00-22:00内でランダム配置<br/>最低60分/最大4時間間隔制御<br/>expo-task-manager統合（6:00自動スケジュール）<br/>既存NOTIFICATION_SCHEDULE定数の完全廃止 |
| **P4** | アプリ内侵食演出（フォアグラウンド審判） | P1 | 前兆→侵食→審判画面のアニメーション<br/>カスタムサウンド実装<br/>HapticEngineへの4メソッド追加 |
| **P5** | 審判の痕跡（ゴーストテキスト + 墓標） | P2 | Identity Lensゴーストテキスト<br/>Mission Lens墓標<br/>Quest Lens次回審判推定表示 |
| **P6** | 知的タイミング（逃避検知 + 適応） | P3 | AppState監視とフォアグラウンド復帰時の再スケジュール<br/>クエスト状態ベースのタイミング調整<br/>前回応答ベースの頻度調整 |
| **P7** | OS通知内直接応答（バックグラウンドIH更新） | P0, P1 | expo-task-manager統合<br/>Notifications.registerTaskAsync()実装<br/>バックグラウンドでのjudgment_log記録 + IH更新<br/>opensAppToForeground: false設定 |

### 新旧システムの共存期間

既存の `NotificationScheduler` + `NOTIFICATION_SCHEDULE`（6固定時刻）は P0 完了時点で非推奨化し、P3（ランダムタイミング）完了時に完全置換する。移行期間中は新旧システムが共存する可能性があるため、通知カテゴリーIDを区別する:
- 既存通知: カテゴリーID `IDENTITY_QUESTION`
- 審判通知: カテゴリーID `JUDGMENT`

---

## 10. 設計上の制約と対策

| 制約 | 対策 |
|------|------|
| iOS Critical Alertは審査で却下リスク | 初回リリースは`.timeSensitive`で。承認後にCritical申請 |
| バックグラウンドでのDB操作制限 | expo-notifications background handlerで最小限の書き込み<br/>expo-task-manager必須依存 |
| 5秒制限はOS通知では強制不可 | 二段階ウィンドウ設計（通知5分 + アプリ内5秒） |
| ランダム通知のApp Store審査 | 「マインドフルネスリマインダー」として申請<br/>ユーザー設定で通知オフ可能に（コンプライアンス対応）<br/>※これはApp Store審査通過のための最小限の対応であり、頻度の微調整機能は提供しない |
| expo-notificationsのローカル通知上限（iOS64件） | 当日分5件のみスケジュール。翌日分は毎朝再生成 |

---

## 11. 新規定数一覧

以下の定数を `src/constants/index.ts` に追加する:

```typescript
// 審判システム定数
export const JUDGMENT_ACTIVE_HOURS = {
  start: 6,
  end: 22
} as const;

export const JUDGMENT_COUNT_PER_DAY = 5;
export const JUDGMENT_MIN_INTERVAL_MINUTES = 60;
export const JUDGMENT_MAX_INTERVAL_MINUTES = 240;
export const JUDGMENT_IN_APP_TIMEOUT_SECONDS = 5;
export const JUDGMENT_OS_NOTIFICATION_TIMEOUT_MINUTES = 5;

// アンチビジョンフラグメント抽出の閾値
export const ANTI_VISION_FRAGMENT_MIN_LENGTH = 50;
```

既存の定数（変更なし、参照用）:
```typescript
// 既存のペナルティ定数（審判でも使用）
NOTIFICATION_PENALTY: 15           // NO応答時
MISSED_NOTIFICATION_PENALTY: 20    // TIMEOUT/IGNORED応答時
```

---

**設計書 v1.0 完成**
**レビュー実施日: 2026-02-08**
**全39件の指摘事項を反映済み**
