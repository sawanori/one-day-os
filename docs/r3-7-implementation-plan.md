# R3-7 大ファイル分割 実装計画

## 概要

設計書 `docs/r3-7-file-splitting-design.md` に基づき、4つの大ファイルを分割する。
各分割は独立コミット単位で実施し、テスト全パスを各ステップで保証する。

### 現状

| # | ファイル | 行数 | 外部インポーター数 | テスト有無 |
|---|---------|------|-------------------|-----------|
| 1 | `src/core/onboarding/OnboardingManager.ts` | 546行 | 3ファイル | Yes (649行) |
| 2 | `src/core/identity/IdentityEngine.ts` | 453行 | 14ファイル | Yes (441行) |
| 3 | `src/ui/screens/onboarding/OnboardingFlow.tsx` | 519行 | 1ファイル | Yes (687行) |
| 4 | `app/index.tsx` | 388行 | 0ファイル | No |

### 目標

- 全ファイルを150行以下（UI含むは200行以下）に縮小
- 既存テスト565件が全パスを維持
- 外部インポートパスの変更ゼロ（index.ts再エクスポート）
- TypeScript 0 errors を維持

---

## 実装順序

設計書の推奨順序に従う:

```
Phase 1: OnboardingManager.ts (546→150行) — 外部依存3件で安全
Phase 2: IdentityEngine.ts (453→150行) — Phase 1のパターン踏襲
Phase 3: OnboardingFlow.tsx (519→100行) — UI分割、テスト影響小
Phase 4: app/index.tsx (388→80行) — テスト新規作成が必要
```

---

## Phase 1: OnboardingManager.ts 分割

### 現状の外部インポーター
1. `src/ui/screens/onboarding/OnboardingFlow.tsx` — `OnboardingManager, OnboardingStep`
2. `src/ui/screens/onboarding/OnboardingFlow.test.tsx` — `OnboardingManager`
3. `src/core/onboarding/OnboardingManager.test.ts` — 自身のテスト

### 分割後のファイル構成

```
src/core/onboarding/
  types.ts                    # 型定義 (~55行)
  OnboardingValidator.ts      # バリデーション (~80行)
  OnboardingRepository.ts     # DB永続化 (~150行)
  OnboardingManager.ts        # オーケストレーター (~150行)
  index.ts                    # 再エクスポート (~10行)
```

### タスク

#### Task 1-1: 型定義の分離
- `types.ts` を新規作成
- `OnboardingStep`, `StepData`, `OnboardingData`, `OnboardingCompleteEvent`, `StepChangeEvent` を移動
- `STEP_ORDER` 定数も `types.ts` に `export const STEP_ORDER` として移動（Validator/Manager 両方から参照可能にする）
- `OnboardingManager.ts` の型定義を `import from './types'` に変更
- **検証:** `npm test` 全パス + `npx tsc --noEmit` 0 errors

#### Task 1-2: OnboardingValidator の分離
- `OnboardingValidator.ts` を新規作成
- `validateStepData()` のロジックを `OnboardingValidator.validate()` static メソッドとして移動
- `OnboardingManager.completeStep()` 内の呼び出しを `OnboardingValidator.validate()` に委譲
- **検証:** `npm test` 全パス

#### Task 1-3: OnboardingRepository の分離
- `OnboardingRepository.ts` を新規作成
- DB操作メソッドを移動: `createTable`, `loadCurrentStep`, `persistCurrentStep`, `saveStepData`, `getAntiVision`, `getIdentity`, `getMission`, `getQuests`, `getAllOnboardingData`, `resetData`
- `OnboardingManager.initialize()` で `this.repository = new OnboardingRepository(db)` を初期化
- `OnboardingManager` 内のDB直接操作を `this.repository.*` に委譲
- **キャッシュ戦略:** `cachedData` は `OnboardingManager` 側で保持。`Repository.saveStepData()` はDB書き込みのみを担当し、キャッシュ更新は `OnboardingManager.completeStep()` 内で行う
- **`databaseInit()` の呼び出し:** `OnboardingManager.initialize()` に残す。`Repository.createTable()` は `onboarding_state` テーブル作成のみ
- **検証:** `npm test` 全パス

#### Task 1-4: index.ts 作成と外部インポーター確認
- `index.ts` を新規作成（再エクスポート）
- 外部インポーター (`OnboardingFlow.tsx`, `OnboardingFlow.test.tsx`) のインポートパスが変更不要であることを確認
  - 現在: `from '../../../core/onboarding/OnboardingManager'` — そのまま動作する
  - `index.ts` は将来の利便性のために作成
- **検証:** `npm test` 全パス + `npx tsc --noEmit` 0 errors

#### Task 1-5: 新規テスト追加
- `OnboardingValidator.test.ts` — バリデーションロジック単体テスト
- `OnboardingRepository.test.ts` — DB永続化単体テスト（オプション: 既存テストでカバー済みならスキップ可）
- **検証:** `npm test` 全パス、テスト数増加を確認

#### Task 1-6: コミット
- Phase 1 全変更をコミット
- コミットメッセージ: `refactor(onboarding): split OnboardingManager into types, validator, repository`

---

## Phase 2: IdentityEngine.ts 分割

### 現状の外部インポーター (14ファイル)

**App層 (6件):**
- `app/index.tsx`, `app/morning.tsx`, `app/evening.tsx`, `app/judgment.tsx`, `app/death.tsx`, `app/death.test.tsx`

**UI層 (6件):**
- `src/ui/lenses/IdentityLens.tsx`, `MissionLens.tsx`, `QuestLens.tsx`
- `src/ui/layout/StressContainer.tsx`
- `src/ui/screens/onboarding/ExcavationPhase.tsx`, `ExcavationPhase.test.tsx`

**Core/Notifications層 (2件):**
- `src/notifications/NotificationHandler.ts`, `NotificationHandler.test.ts`

**自テスト (除外):**
- `src/core/identity/IdentityEngine.test.ts`

**テストでモックしているファイル (6件):**
- `IdentityEngine.test.ts`, `NotificationHandler.test.ts`, `death.test.tsx`, `judgment.test.tsx`, `StressContainer.test.tsx`, `ExcavationPhase.test.tsx`

**全て直接パス:** `from '...core/identity/IdentityEngine'` — 分割後もパス維持

### 分割後のファイル構成

```
src/core/identity/
  types.ts                    # 型定義 (~30行)
  IHCalculator.ts             # IH計算ロジック (~100行)
  IdentityLifecycle.ts        # 生死制御 (~120行)
  IdentityEngine.ts           # オーケストレーター (~150行)
  index.ts                    # 再エクスポート (~10行)
  WipeManager.ts              # 既存（変更なし）
  WipeManager.test.ts         # 既存（変更なし）
```

### 重要: インポートパス互換性

現在の全14ファイルは `from '...core/identity/IdentityEngine'` で直接インポート。
分割後も `IdentityEngine.ts` 自体は残り、公開APIは変わらないため **外部ファイルの変更はゼロ**。
`index.ts` は将来の利便性のために作成。

**重要ルール:** `IdentityEngine.ts` 自体では新たな re-export を追加しない。re-export は `index.ts` のみで行う。これにより自動モック（`jest.mock`）の互換性を維持する。

### タスク

#### Task 2-1: 型定義の分離
- `types.ts` を新規作成
- `IHResponse`, `WipeEvent`, `QuestCompletion`, `NotificationResponse` を移動
- `IdentityEngine.ts` の型定義を `import from './types'` に変更
- **検証:** `npm test` 全パス + `npx tsc --noEmit` 0 errors

#### Task 2-2: IHCalculator の分離
- `IHCalculator.ts` を新規作成（ステートレス static メソッド）
- 移動対象: `clampIH()` → `IHCalculator.clamp()`、各ペナルティ計算のデルタロジック
- `IdentityEngine` 内の計算を `IHCalculator.*` に委譲
- **IH_CONSTANTS の扱い:** ペナルティ値は `IHCalculator` が import。`IdentityEngine` は `IH_CONSTANTS.INITIAL_IH` のみ直接 import（初期化用）
- **検証:** `npm test` 全パス

#### Task 2-3: IdentityLifecycle の分離
- `IdentityLifecycle.ts` を新規作成
- 移動対象: `checkHealth()`, `applyDamage()`, `restoreHealth()`, `killUser()`, `useInsurance()`, `getAntiVision()`
- コンストラクタで `db` と `syncIH` コールバックを受け取る
- `IdentityEngine.initialize()` で `this.lifecycle = new IdentityLifecycle(db, (v) => { this.currentIH = v })` を初期化
- **syncIH コールバックについて:** ランタイムでの参照は `Engine → Lifecycle → (callback) → Engine` の循環だが、import レベルの循環はない（意図的設計）
- **DB更新の二重化:** `persistIH()` は `IdentityEngine` に残り IH計算後の永続化を担当。`IdentityLifecycle` 内の `killUser()`/`useInsurance()` 等は直接SQL更新 + `syncIH` コールバックで in-memory 同期。これは設計上の明示的トレードオフ
- **既存テストのモック修正:** `IdentityEngine.test.ts` に `jest.mock('../../database/transaction')` を追加（`runInTransaction` が `IdentityLifecycle` 経由で呼ばれる可能性があるため）
- **検証:** `npm test` 全パス

#### Task 2-4: index.ts 作成
- `index.ts` を新規作成（再エクスポート: IdentityEngine, types, IHCalculator, IdentityLifecycle）
- 外部14ファイルのインポートパスが変更不要であることを確認
- **検証:** `npm test` 全パス + `npx tsc --noEmit` 0 errors

#### Task 2-5: 新規テスト追加
- `IHCalculator.test.ts` — 純粋計算ロジックの単体テスト
- `IdentityLifecycle.test.ts` — 生死制御の単体テスト（オプション）
- **検証:** `npm test` 全パス、テスト数増加を確認

#### Task 2-6: コミット
- Phase 2 全変更をコミット
- コミットメッセージ: `refactor(identity): split IdentityEngine into types, calculator, lifecycle`

---

## Phase 3: OnboardingFlow.tsx 分割

### 現状の外部インポーター
- `app/onboarding/index.tsx` — `export default OnboardingFlow` (唯一のインポーター)

### 分割後のファイル構成

```
src/ui/screens/onboarding/
  OnboardingFlow.tsx                # メインコンポーネント (~100行)
  onboarding.styles.ts              # 共通スタイル (~150行)
  steps/
    WelcomeStep.tsx                 # ステップ1 (~35行)
    AntiVisionStep.tsx              # ステップ2 (~65行)
    IdentityStep.tsx                # ステップ3 (~65行)
    MissionStep.tsx                 # ステップ4 (~65行)
    QuestsStep.tsx                  # ステップ5 (~70行)
    index.ts                        # 再エクスポート (~5行)
```

### 設計判断
- 各ステップの input state をステップコンポーネント内にローカライズ
- OnboardingFlow → 各ステップへのデータフローは `onComplete` / `onBack` コールバック props のみ
- `updateAppState` 依存は `OnboardingFlow` 本体に残す（ステップコンポーネントには渡さない）
- testID は完全維持（既存テストへの影響ゼロ）

### 維持すべき testID 一覧
- `onboarding-container` (メインコンテナ)
- `begin-button` (WelcomeStep)
- `anti-vision-input`, `back-button`, `next-button` (AntiVisionStep)
- `identity-input`, `back-button`, `next-button` (IdentityStep)
- `mission-input`, `back-button`, `next-button` (MissionStep)
- `quest1-input`, `quest2-input`, `back-button`, `complete-button` (QuestsStep)

### タスク

#### Task 3-1: スタイルの分離
- `onboarding.styles.ts` を新規作成
- `OnboardingFlow.tsx` 末尾の `StyleSheet.create({...})` を全て移動
- `OnboardingFlow.tsx` のスタイルインポートを変更
- **検証:** `npm test` 全パス

#### Task 3-2: WelcomeStep の分離
- `steps/WelcomeStep.tsx` を新規作成
- `renderWelcome()` の内容を独立コンポーネントに移動
- `OnboardingFlow.tsx` の `renderWelcome()` を `<WelcomeStep>` に置換
- **検証:** `npm test -- OnboardingFlow.test` パス

#### Task 3-3: AntiVisionStep の分離
- `steps/AntiVisionStep.tsx` を新規作成
- `renderAntiVision()` + `antiVisionText` state を移動
- Props: `onComplete: (data: { antiVision: string }) => void`, `onBack: () => void`
- **検証:** `npm test -- OnboardingFlow.test` パス

#### Task 3-4: IdentityStep の分離
- `steps/IdentityStep.tsx` を新規作成
- `renderIdentity()` + `identityText` state を移動
- **検証:** `npm test -- OnboardingFlow.test` パス

#### Task 3-5: MissionStep の分離
- `steps/MissionStep.tsx` を新規作成
- `renderMission()` + `missionText` state を移動
- **検証:** `npm test -- OnboardingFlow.test` パス

#### Task 3-6: QuestsStep の分離
- `steps/QuestsStep.tsx` を新規作成
- `renderQuests()` + `quest1Text/quest2Text` state を移動
- **検証:** `npm test -- OnboardingFlow.test` パス

#### Task 3-7: steps/index.ts 作成と OnboardingFlow 最終整理
- `steps/index.ts` を新規作成（再エクスポート）
- `OnboardingFlow.tsx` のインポートを `from './steps'` に統合
- `renderStep()` の switch 文を簡素化
- **検証:** `npm test` 全パス + `npx tsc --noEmit` 0 errors

#### Task 3-8: コミット
- Phase 3 全変更をコミット
- コミットメッセージ: `refactor(onboarding-ui): split OnboardingFlow into step components`

---

## Phase 4: app/index.tsx 分割

### 現状
- 外部インポーターなし（Expo Router ファイルベースルーティング）
- テストファイルなし
- 19個のインポート文

### 分割後のファイル構成

```
src/ui/screens/home/
  useHomeData.ts               # データ取得フック (~80行)
  useHealthMonitor.ts          # ヘルスモニタリング (~30行)
  HomeHeader.tsx               # ヘッダー + デバッグボタン (~60行)
  LensContent.tsx              # レンズ表示 (~60行)
  DebugActions.ts              # デバッグ関数 (~50行)
  home.styles.ts               # スタイル定義 (~80行)
  index.ts                     # 再エクスポート (~10行)
app/
  index.tsx                    # 薄いシェル (~80行)
```

### タスク

#### Task 4-1: home.styles.ts の分離
- `src/ui/screens/home/` ディレクトリ作成
- `home.styles.ts` を新規作成、StyleSheet定義を移動
- `app/index.tsx` のスタイルインポートを変更
- **検証:** `npm test` 全パス + `npx tsc --noEmit` 0 errors

#### Task 4-2: useHealthMonitor フック抽出
- `useHealthMonitor.ts` を新規作成
- ヘルスチェック useEffect + health state を移動
- **検証:** `npm test` 全パス

#### Task 4-3: useHomeData フック抽出
- `useHomeData.ts` を新規作成
- Quest型定義、データロード useEffect、オンボーディングチェック、toggleQuest を移動
- **検証:** `npm test` 全パス

#### Task 4-4: DebugActions 分離
- `DebugActions.ts` を新規作成
- `resetIH()`, `sendTestNotification()` を独立関数として移動
- **検証:** `npm test` 全パス

#### Task 4-5: HomeHeader / LensContent コンポーネント分離
- `HomeHeader.tsx` — ヘッダー部分 + デバッグボタン（__DEV__ガード付き）
- `LensContent.tsx` — レンズ切り替え表示ロジック
- `app/index.tsx` を薄いシェルに縮小
- **検証:** `npm test` 全パス + `npx tsc --noEmit` 0 errors

#### Task 4-6: index.ts 作成と新規テスト追加
- `src/ui/screens/home/index.ts` を新規作成
- `useHomeData.test.ts` — データ取得フックのテスト
- `useHealthMonitor.test.ts` — ヘルスモニタリングのテスト
- **検証:** `npm test` 全パス、テスト数増加を確認

#### Task 4-7: コミット
- Phase 4 全変更をコミット
- コミットメッセージ: `refactor(home): split app/index.tsx into hooks, components, styles`

---

## 実行計画サマリー

| Phase | タスク数 | 新規ファイル数 | 削除ファイル | コミット |
|-------|---------|--------------|------------|---------|
| 1: OnboardingManager | 6 | 4 (types, validator, repository, index) | 0 | 1 |
| 2: IdentityEngine | 6 | 4 (types, calculator, lifecycle, index) | 0 | 1 |
| 3: OnboardingFlow | 8 | 8 (styles, 5 steps, steps/index, steps/) | 0 | 1 |
| 4: app/index.tsx | 7 | 8 (2 hooks, 2 components, debug, styles, index, tests) | 0 | 1 |
| **合計** | **27** | **24** | **0** | **4** |

### 完了基準

- [ ] 全4ファイルが目標行数以下
  - OnboardingManager.ts ≤ 150行
  - IdentityEngine.ts ≤ 150行
  - OnboardingFlow.tsx ≤ 100行 (UI)
  - app/index.tsx ≤ 80行
- [ ] 既存テスト565件 + 新規テスト = 全パス
- [ ] TypeScript 0 errors
- [ ] 外部インポーターの変更ゼロ（IdentityEngine 14件、OnboardingManager 3件）
- [ ] 各Phase独立コミット、各ステップでテスト全パス

### リスク軽減策

1. **IdentityEngine syncIH コールバック**: `IdentityLifecycle` コンストラクタで `syncIH` を受け取り、DB更新時に in-memory IH を同期
2. **testID 維持**: OnboardingFlow ステップ分割時、全 testID を完全維持（上記チェックリスト参照）
3. **ロールバック**: 各Phase は独立コミット。問題発生時は `git revert` で該当Phaseのみ巻き戻し可能
4. **jest.mock 互換性**: `IdentityEngine.ts` 自体では re-export を追加しない。re-export は `index.ts` のみ
5. **runInTransaction モック**: Phase 2 Task 2-3 で `IdentityEngine.test.ts` に `jest.mock('../../database/transaction')` を追加
6. **テスト影響範囲**: IdentityEngine をモックしている6テストファイル全て検証済み（パス維持確認）

### レビュー指摘への対応

本計画は Opus 4.6 レビューで CONDITIONAL APPROVAL を受け、以下の指摘を反映済み:
- 外部インポーター数修正 (16→14) [重大]
- `judgment.test.tsx`, `StressContainer.test.tsx` のテスト影響追加 [重大]
- `runInTransaction` モック追加タスクの明記 [重大]
- `cachedData` キャッシュ戦略の明記 [中]
- `STEP_ORDER` 配置先の明記 [中]
- `persistIH()` DB更新二重化の設計判断明記 [中]
- `IH_CONSTANTS.INITIAL_IH` import先の明記 [中]
- testID チェックリストの追加 [中]
