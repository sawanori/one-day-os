# 日本語化・UX改善 実装計画 (v2 - レビュー修正版)

## 概要

One Day OSアプリの全テキストを日本語化し、直感的な使い方を実現するためのUI/UX改善を行う。

**レビュー結果**: 致命的な問題3件、高優先度問題4件を修正済み。

---

## 目標

### 1. 完全日本語化
- すべてのユーザー向けテキストを日本語に翻訳
- ブルータリストデザイン思想を維持したまま日本語表現を最適化
- 日本語表示用のフォント設定を最適化

### 2. UX改善
- **問題点**: 現在のアプリは使い方が直感的にわからない
- **解決策**:
  - 各画面に簡潔な説明テキストを追加
  - 時間制限のある操作に視覚的な時間インジケーターを追加
  - オンボーディングで操作フローを明示
  - PhaseGuardコンポーネントを新規作成して時間制限を可視化

---

## Phase 0: 基盤修正（致命的問題の解決）

### 0.1 FIVE_QUESTIONSの統一

**問題**:
- `src/constants/index.ts`: 英語の質問6個
- `src/notifications/NotificationScheduler.ts`: 日本語の質問5個（異なるスケジュール）

**解決策**:
- `src/constants/index.ts`を正とする
- 質問を日本語化し、6回の通知スケジュールに統一
- `NotificationScheduler.ts`から独自定義を削除し、constantsから参照

**実装ファイル**:
- `src/constants/index.ts`
- `src/notifications/NotificationScheduler.ts`

**変更内容**:

**constants/index.ts:**
```typescript
// Five Questions for Notifications
export const FIVE_QUESTIONS = [
  "あなたは誰か？",
  "あなたは何をしているか？",
  "なぜそれをしているのか？",
  "それはあなたのアイデンティティと一致しているか？",
  "次に何をするか？",
  "何を避けようとしているか？",
] as const;
```

**NotificationScheduler.ts:**
- 独自のFIVE_QUESTIONS定義を削除
- constantsからimport: `import { FIVE_QUESTIONS, NOTIFICATION_SCHEDULE } from '@/constants';`
- 6回の通知スケジュールに対応

---

### 0.2 PhaseGuardコンポーネントの新規作成

**問題**:
- Morning/Eveningレイヤーの時間制限機能が実装されていない
- 計画では「改善」としているが、実際には新規作成が必要

**解決策**:
- `src/ui/components/PhaseGuard.tsx`を新規作成
- 時間外アクセス時に専用のエラー画面を表示
- 現在時刻と次の利用可能時刻を表示

**実装ファイル**: `src/ui/components/PhaseGuard.tsx` (新規作成)

**機能仕様**:
```typescript
interface PhaseGuardProps {
  phase: 'MORNING' | 'EVENING';
  children: React.ReactNode;
}

// 機能:
// 1. 現在時刻がphaseの時間範囲内かチェック
// 2. 範囲内 → childrenを表示
// 3. 範囲外 → 時間外エラー画面を表示
//    - 「[フェーズ名]レイヤー」
//    - 「アクセス不可」
//    - 「利用可能時間: [時間範囲]」
//    - 「現在時刻: [HH:MM]」
```

**使用箇所**:
- `app/(tabs)/morning.tsx`
- `app/(tabs)/evening.tsx`

---

### 0.3 日本語フォントの設定

**問題**:
- Courier Newは日本語グリフを持たない
- フォールバックが不明確でデザインの一貫性が崩れる可能性

**解決策**:
- `theme.ts`のfontFamilyを日本語対応フォントに変更
- システムフォントのmonoスペースフォールバックを明示

**実装ファイル**: `src/ui/theme/theme.ts`

**変更内容**:
```typescript
// 変更前:
fontFamily: '"Courier New", Courier, monospace',

// 変更後（日本語対応）:
fontFamily: Platform.select({
  ios: '"Courier New", "Hiragino Sans", "Hiragino Kaku Gothic ProN", monospace',
  android: '"Courier New", "Noto Sans Mono CJK JP", "Droid Sans Mono", monospace',
  default: '"Courier New", "Courier", monospace',
}),
```

**注**: Platformのimportが必要
```typescript
import { Platform } from 'react-native';
```

---

## Phase 1: 日本語化

### 1.1 コアレイヤー画面 (app/(tabs)/index.tsx)

**変更箇所:**

| 英語 | 日本語 |
|------|--------|
| CORE LAYER | コアレイヤー |
| Identity Statement | アイデンティティ宣言 |
| IDENTITY HEALTH | アイデンティティ・ヘルス |
| IH {currentIH} | IH {currentIH} ※IHはそのまま |
| 3-LAYER LENS | 三層レンズ |
| Micro | ミクロ（今日） |
| Current | 現在（今） |
| Macro | マクロ（1年） |

**実装ファイル:** `app/(tabs)/index.tsx`

**変更内容:**
- 全テキストを上記テーブルに従って置換
- GlitchText コンポーネントは既存のまま使用

---

### 1.2 モーニングレイヤー画面 (app/(tabs)/morning.tsx)

**変更箇所:**

| 英語 | 日本語 |
|------|--------|
| MORNING LAYER | モーニングレイヤー |
| Anti-Vision Display | アンチビジョン表示 |
| [Anti-Vision Text Scroll Placeholder] | [アンチビジョンのスクロールテキスト] |
| Here you will see scrolling text of futures you reject. | あなたが拒絶する未来がここにスクロール表示されます |
| Example: | 例: |

**実装ファイル:** `app/(tabs)/morning.tsx`

**変更内容:**
- プレースホルダーテキストを日本語化
- 説明文も日本語化

---

### 1.3 イブニングレイヤー画面 (app/(tabs)/evening.tsx)

**変更箇所:**

| 英語 | 日本語 |
|------|--------|
| EVENING LAYER | イブニングレイヤー |
| Quest Completion & Reflection | クエスト完了と振り返り |
| DAILY QUESTS | 今日のクエスト |
| Quest 1: [Placeholder Quest] | クエスト1: [プレースホルダー] |
| Quest 2: [Placeholder Quest] | クエスト2: [プレースホルダー] |
| If quests were not completed, why? | クエストが未完了の場合、その理由は？ |
| Enter reason for incomplete quests... | 未完了の理由を入力... |
| COMPLETE DAY | 本日完了 |

**実装ファイル:** `app/(tabs)/evening.tsx`

**変更内容:**
- 全テキストを日本語化
- プレースホルダーも日本語化

---

### 1.4 タブナビゲーション (app/(tabs)/_layout.tsx)

**変更箇所:**

| 英語 | 日本語 |
|------|--------|
| MORNING | モーニング |
| CORE | コア |
| EVENING | イブニング |

**実装ファイル:** `app/(tabs)/_layout.tsx`

**変更内容:**
- タブラベルを日本語化

---

### 1.5 オンボーディング画面 (src/ui/screens/onboarding/OnboardingFlow.tsx)

**変更箇所:**

#### Step 1 - Welcome
| 英語 | 日本語 |
|------|--------|
| ONE DAY OS | ONE DAY OS ※固有名詞はそのまま |
| WELCOME | ようこそ |
| A system to rebuild your life, one day at a time. Define your worst fear, claim your identity, and execute daily quests. | あなたの人生を一日で再構築するシステム。最悪の未来を定義し、アイデンティティを宣言し、日々のクエストを実行せよ。 |
| BEGIN | 開始 |

#### Step 2 - Anti-Vision
| 英語 | 日本語 |
|------|--------|
| ANTI-VISION | アンチビジョン |

#### Step 3 - Identity
| 英語 | 日本語 |
|------|--------|
| IDENTITY | アイデンティティ |
| I am a person who... | 私は〜な人間だ |

#### Step 4 - Mission
| 英語 | 日本語 |
|------|--------|
| MISSION | 使命 |

#### Step 5 - Quests
| 英語 | 日本語 |
|------|--------|
| QUESTS | クエスト |
| Quest 1 | クエスト1 |
| Quest 2 | クエスト2 |

#### Error messages
| 英語 | 日本語 |
|------|--------|
| Error: {error.message} | エラー: {error.message} |

**実装ファイル:** `src/ui/screens/onboarding/OnboardingFlow.tsx`

**変更内容:**
- 全ステップのテキストを日本語化
- プレースホルダーも日本語化
- エラーメッセージも日本語化

---

### 1.6 通知システムの日本語化とタイムアウト表示 (統合版)

**Phase 0.1で統一されたFIVE_QUESTIONSを使用**

**実装ファイル:** `src/notifications/NotificationScheduler.ts`

**変更内容:**

1. **FIVE_QUESTIONSのimport**
```typescript
import { FIVE_QUESTIONS, NOTIFICATION_SCHEDULE } from '@/constants';
```

2. **通知スケジュールの修正**
- 独自定義のFIVE_QUESTIONSを削除
- NOTIFICATION_SCHEDULE.TIMESを使用（6回の通知）
- 各通知にFIVE_QUESTIONSの質問を割り当て

3. **通知内容の日本語化**
```typescript
{
  content: {
    title: FIVE_QUESTIONS[index],  // 日本語の質問
    body: '5分以内に回答。無応答でIH -20%',
    categoryIdentifier: CATEGORY_IDENTIFIER,
  },
  trigger: {
    hour: NOTIFICATION_SCHEDULE.TIMES[index].hour,
    minute: NOTIFICATION_SCHEDULE.TIMES[index].minute,
    repeats: true,
  }
}
```

4. **アクションボタンの日本語化**
```typescript
{
  identifier: 'YES',
  buttonTitle: 'はい',
  // ...
},
{
  identifier: 'NO',
  buttonTitle: 'いいえ',
  // ...
}
```

**注意**: この変更はPhase 0.1完了後に実施すること。

---

### 1.7 404画面 (app/+not-found.tsx)

**変更箇所:**

| 英語 | 日本語 |
|------|--------|
| 404 | 404 ※そのまま |
| Screen not found | 画面が見つかりません |
| Go to Home | ホームへ戻る |

**実装ファイル:** `app/+not-found.tsx`

**変更内容:**
- エラーメッセージを日本語化

---

## Phase 2: UX改善

### 問題点の特定

#### 現在の問題
1. **各レイヤーの役割が不明確**
   - Morning/Core/Eveningの違いがわからない
   - 何をすればいいのか明示されていない

2. **時間制限の認識不足**
   - Morning（6:00-12:00）、Evening（18:00-24:00）の時間制限が視覚的にわからない
   - 通知の5分タイムアウトが認識できない

3. **IHの意味が不明**
   - Identity Healthが何を示すのか、画面上で説明がない
   - ペナルティの仕組みが不透明

4. **クエストの操作方法が不明**
   - チェックボックスがあるだけで、何をすればいいか不明
   - 完了ボタンの意味が不明確

### 改善策

#### 2.1 各画面に説明テキストを追加

**app/(tabs)/index.tsx - Core Layer**

追加テキスト:
```
説明:
「あなたのアイデンティティを確認する場所。
 三層レンズで今日・今・1年後を見据える。」
```

**実装方法:**
- GlitchTextで画面上部に表示
- variant: 'caption', intensity: 'NONE'

---

**app/(tabs)/morning.tsx - Morning Layer**

追加テキスト:
```
説明:
「6:00-12:00のみアクセス可能。
 今日のクエストを確認し、アンチビジョンを刻め。」

操作:
「この画面は閲覧のみ。クエスト完了はイブニングレイヤーで。」
```

**実装方法:**
- 画面上部に説明を追加
- 時間外の場合: 「アクセス不可（6:00-12:00のみ）」を赤文字で表示

---

**app/(tabs)/evening.tsx - Evening Layer**

追加テキスト:
```
説明:
「18:00-24:00のみアクセス可能。
 クエストを完了し、5つの質問に答えよ。」

操作:
「1. 全てのクエストをチェック
 2. 未完了の理由を記入（該当する場合）
 3. 「本日完了」をタップして一日を締めくくる」
```

**実装方法:**
- 画面上部に説明を追加
- 時間外の場合: 「アクセス不可（18:00-24:00のみ）」を赤文字で表示

---

#### 2.2 IH表示の改善

**app/(tabs)/index.tsx**

現在:
```
IDENTITY HEALTH
IH {currentIH}
```

改善後:
```
アイデンティティ・ヘルス (IH)
現在値: {currentIH}%

IHとは:
あなたの生命力。通知無視やクエスト未完了でペナルティ。
0%到達で全データ消去。
```

**実装方法:**
- IH値の下に簡潔な説明を追加
- variant: 'caption', 現在のIH値に応じて色を変える

---

#### 2.3 時間制限の視覚的表示

**PhaseGuard コンポーネントの改善**

現在: 時間外だとタブが非表示になるだけ

改善後: 時間外の場合、以下を表示
```
[タブ名]レイヤー
アクセス不可

利用可能時間: [時間範囲]
現在時刻: [HH:MM]

あと[X]時間[Y]分で利用可能
```

**実装ファイル:** `src/ui/components/PhaseGuard.tsx`

**実装方法:**
- 時間外の場合、専用のエラー画面を表示
- 現在時刻と次の利用可能時刻を計算して表示

---

#### 2.4 オンボーディングの改善（旧2.5）

**OnboardingFlow.tsx の改善**

各ステップに「これは何か？」の説明を追加:

**Step 2 - Anti-Vision**
```
アンチビジョン

これは何か:
あなたが絶対に避けたい最悪の未来。
これを明確化することで、逃げられない現実を作る。

例:
「40歳で貯金ゼロ、無職、孤独死」
```

**Step 3 - Identity**
```
アイデンティティ

これは何か:
あなたが何者であるかの宣言。
この宣言に従って行動し続けることがIHを維持する鍵。

例:
「私は毎日成長し続ける人間だ」
```

**Step 4 - Mission**
```
使命

これは何か:
今から1年後に達成する目標。
アンチビジョンから逃げるための具体的なゴール。

例:
「1年後、年収600万円のエンジニアになる」
```

**Step 5 - Quests**
```
クエスト

これは何か:
今日一日で達成すべき具体的なタスク。
2つのクエストを設定してください。

例:
「朝6時に起きる」
「コーディング3時間」
```

**実装ファイル:** `src/ui/screens/onboarding/OnboardingFlow.tsx`

**変更内容:**
- 各ステップに説明セクションを追加
- 具体例を表示

---

## Phase 3: テスト

### 3.1 日本語化テスト

各画面で以下を確認:
- [ ] すべてのテキストが日本語化されている
- [ ] 日本語フォント（Courier New）が正しく表示される
- [ ] 長い日本語テキストがレイアウトを崩していない

### 3.2 UX改善テスト

- [ ] 各画面の説明テキストが表示される
- [ ] 時間外アクセス時に適切なエラーメッセージが表示される
- [ ] IHの説明が明確に表示される
- [ ] 通知のタイムアウト警告が表示される
- [ ] オンボーディングの説明が表示される

### 3.3 機能テスト

- [ ] 日本語化後も既存機能が正常動作する
- [ ] 通知が正しく日本語で表示される
- [ ] Five Questionsが日本語で表示される

---

## 実装順序

### 優先度0（基盤修正 - 最優先）
1. ⏳ Phase 0.1 - FIVE_QUESTIONSの統一と日本語化
2. ⏳ Phase 0.2 - PhaseGuardコンポーネントの新規作成
3. ⏳ Phase 0.3 - 日本語フォントの設定

### 優先度1（日本語化）
4. ⏳ Phase 1.1 - Core Layer日本語化
5. ⏳ Phase 1.2 - Morning Layer日本語化
6. ⏳ Phase 1.3 - Evening Layer日本語化
7. ⏳ Phase 1.4 - タブナビゲーション日本語化
8. ⏳ Phase 1.5 - オンボーディング日本語化
9. ⏳ Phase 1.6 - 通知ボタン日本語化とタイムアウト表示（Phase 2.4と統合）
10. ⏳ Phase 1.7 - 404画面日本語化

### 優先度2（UX改善）
11. ⏳ Phase 2.1 - 各画面に説明テキスト追加
12. ⏳ Phase 2.2 - IH表示の改善
13. ⏳ Phase 2.3 - PhaseGuardによる時間制限の視覚的表示（Phase 0.2完了後）
14. ⏳ Phase 2.5 - オンボーディングの改善

### 優先度3（最終確認）
15. ⏳ Phase 3.1 - 日本語化テスト
16. ⏳ Phase 3.2 - UX改善テスト
17. ⏳ Phase 3.3 - 機能テスト
18. ⏳ Phase 3.4 - 実機テスト

**凡例**: ⏳ 未着手 / 🔄 進行中 / ✅ 完了

---

## コミット戦略

各Phaseごとに1コミット。コミットメッセージ形式：

```
feat(i18n): Phase 0.1 - Unify and translate FIVE_QUESTIONS
feat(components): Phase 0.2 - Create PhaseGuard component
feat(theme): Phase 0.3 - Configure Japanese font support
feat(i18n): Phase 1.1 - Translate Core Layer to Japanese
feat(ux): Phase 2.1 - Add explanatory text to screens
test: Phase 3.1 - Japanese localization tests
```

---

## 潜在的な問題点と対策（レビュー反映版）

### 問題1: 日本語フォントがブルータリストデザインに合わない
**対策（修正済み）:** Phase 0.3でシステム日本語monoフォントのフォールバックを明示的に設定

### 問題2: 長い日本語テキストがレイアウトを崩す
**対策:**
- 各入力フィールドに最大文字数制限を設定（例：Anti-Vision 200文字）
- flexWrap: 'wrap'をTextコンポーネントに設定
- ScrollViewで画面全体をラップ

### 問題3: 通知の日本語が途中で切れる
**対策（修正済み）:** 通知本文を簡潔に「5分以内に回答。無応答でIH -20%」

### 問題4: タイムゾーン考慮が必要
**対策:** ローカルタイム使用（端末設定に従う）。ドキュメントに明記。

### 問題5: オンボーディングのテキスト量が多くなる
**対策:** 説明セクションをトグル表示（デフォルト非表示）にして情報過多を防ぐ

### 問題6: GlitchTextへの長いテキスト
**対策:** 説明文には通常のTextコンポーネントを使用し、GlitchTextはタイトルのみに限定

### 問題7: PhaseGuardのリアルタイム更新
**対策:** カウントダウン表示は静的テキストのみ（画面遷移時のみ更新）

---

## ロールバック戦略（修正版）

万が一、実装後に問題が発生した場合：

### 個別Phase の Rollback
```bash
# 最新コミットをrevert
git revert HEAD

# 特定のPhaseをrevert
git revert <commit-hash>
```

### 複数Phase の Rollback
```bash
# Phase 2.1〜2.5を一括revert
git revert HEAD~5..HEAD
```

### 問題コミットの特定
```bash
# bisectで問題コミットを特定
git bisect start
git bisect bad HEAD
git bisect good <last-known-good-commit>
```

**重要**: git stashはロールバック手段ではない。git revertのみを使用。

---

## 完了条件

### Phase 0 完了条件
- [ ] FIVE_QUESTIONSが`constants/index.ts`で一元管理されている
- [ ] FIVE_QUESTIONSが日本語化されている（6つの質問）
- [ ] NotificationSchedulerが独自定義を使わず、constantsから参照している
- [ ] PhaseGuard.tsxが新規作成され、Morning/Eveningで使用されている
- [ ] 日本語フォントのフォールバックが設定されている

### Phase 1 完了条件
- [ ] すべてのユーザー向けテキストが日本語化されている
- [ ] 通知のボタンラベルが日本語化されている
- [ ] 通知のbodyにタイムアウト警告が表示されている

### Phase 2 完了条件
- [ ] 各画面に説明テキストが追加されている
- [ ] IHの意味が明確に表示されている
- [ ] PhaseGuardによる時間制限が視覚的にわかる
- [ ] オンボーディングに各ステップの説明が追加されている

### Phase 3 完了条件
- [ ] すべてのテストが通過する
- [ ] 実機（iOS/Android）でUIが崩れていない
- [ ] 日本語テキストが正しく表示される
- [ ] 通知が日本語で正しく表示される
- [ ] PhaseGuardが時間制限を正しく制御する

---

## レビュー結果まとめ

### 修正済みの致命的問題
✅ PhaseGuard.tsxの不在 → Phase 0.2で新規作成
✅ FIVE_QUESTIONSの二重定義 → Phase 0.1で統一
✅ Courier Newの日本語非対応 → Phase 0.3でフォールバック設定

### 修正済みの高優先度問題
✅ 実装順序の見直し → Phase 0を最優先に
✅ 通知のボタン日本語化とタイムアウト表示の統合 → Phase 1.6に統合
✅ ロールバック戦略の明確化 → git revertのみを使用

### 残存する中優先度問題（実装中に対応）
⏳ 入力値の文字数制限（Phase 1.5で対応）
⏳ アクセシビリティ対応（将来の改善として記録）

---

## 備考

- エラーメッセージ（開発者向け）は英語のまま維持
- 固有名詞（"ONE DAY OS", "IH"）は英語のまま
- ブルータリストデザインの原則（黒背景・白文字・Monospace）は維持
- 日本語フォントはシステムフォントのMonospaceフォールバックを使用
