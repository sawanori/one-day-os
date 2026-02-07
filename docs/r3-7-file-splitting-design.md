# R3-7 大ファイル分割設計書

## 概要

本設計書は、One Day OSプロジェクトにおける380行超の大ファイル4件の分割計画を定義する。
分割の目的は、Single Responsibility Principle（単一責務原則）の遵守、テスト容易性の向上、
そして将来の機能追加に対する保守性の確保である。

### 対象ファイル

| # | ファイル | 行数 | 優先度 |
|---|---------|------|--------|
| 1 | `src/core/onboarding/OnboardingManager.ts` | 546行 | 高 |
| 2 | `src/ui/screens/onboarding/OnboardingFlow.tsx` | 519行 | 高 |
| 3 | `src/core/identity/IdentityEngine.ts` | 453行 | 中 |
| 4 | `app/index.tsx` | 388行 | 中 |

---

## 1. OnboardingManager.ts（546行）

### 現状の責務分析

現在このファイルには以下の6つの責務が混在している：

1. **型定義・インターフェース**（1-55行）
   - `OnboardingStep`, `StepData`, `OnboardingData`, `OnboardingCompleteEvent`, `StepChangeEvent`
   - 合計55行

2. **シングルトン管理・初期化**（60-139行）
   - `getInstance()`, `resetInstance()`, `initialize()`
   - DB接続、テーブル作成、ステップ復元
   - 合計80行

3. **ステップ進行制御**（144-191行）
   - `isOnboardingComplete()`, `getCurrentStep()`, `completeStep()`
   - ステップ順序の管理、コールバック発火
   - 合計48行

4. **バリデーションロジック**（345-407行）
   - `validateStepData()` — 各ステップのデータ型・空文字チェック
   - 大きなswitch文（62行）

5. **DB永続化ロジック**（412-507行）
   - `saveStepData()` — 各ステップデータのINSERT/UPDATE
   - `persistCurrentStep()` — 現在ステップの保存
   - 大きなswitch文（80行）+ SQLクエリ

6. **データ取得・イベント管理**（196-340, 508-545行）
   - `resetOnboarding()`, `getAntiVision()`, `getIdentity()`, `getMission()`, `getQuests()`, `getAllOnboardingData()`
   - `onComplete()`, `onStepChange()`, `triggerStepChange()`, `triggerComplete()`
   - 合計140行

### 分割提案

#### ファイル構成

```
src/core/onboarding/
  types.ts                      # 型定義（新規）
  OnboardingManager.ts          # コア制御（縮小）
  OnboardingValidator.ts        # バリデーション（新規）
  OnboardingRepository.ts       # DB永続化（新規）
  index.ts                      # 再エクスポート（新規）
```

#### 各ファイルの内容

**`types.ts`**（~55行）
```typescript
// 全型定義を集約
export type OnboardingStep = 'welcome' | 'anti-vision' | 'identity' | 'mission' | 'quests' | 'complete';
export type StepData = null | { antiVision: string } | { identity: string } | { mission: string } | { quests: [string, string] };
export interface OnboardingData { ... }
export interface OnboardingCompleteEvent { ... }
export interface StepChangeEvent { ... }
```

**`OnboardingValidator.ts`**（~80行）
```typescript
import { OnboardingStep, StepData } from './types';

export class OnboardingValidator {
  // 現在の validateStepData() の内容をstaticメソッドとして移動
  static validate(step: OnboardingStep, data: StepData): void { ... }
}
```
- ステートレスなクラス。staticメソッドのみ。
- 独立してテスト可能。

**`OnboardingRepository.ts`**（~150行）
```typescript
import * as SQLite from 'expo-sqlite';
import { OnboardingStep, StepData, OnboardingData } from './types';

export class OnboardingRepository {
  constructor(private db: SQLite.SQLiteDatabase) {}

  // DB操作を集約
  async createTable(): Promise<void> { ... }
  async loadCurrentStep(): Promise<OnboardingStep | null> { ... }
  async persistCurrentStep(step: OnboardingStep): Promise<void> { ... }
  async saveStepData(step: OnboardingStep, data: StepData): Promise<void> { ... }
  async getAntiVision(): Promise<string | null> { ... }
  async getIdentity(): Promise<string | null> { ... }
  async getMission(): Promise<string | null> { ... }
  async getQuests(): Promise<[string, string] | null> { ... }
  async getAllOnboardingData(): Promise<OnboardingData> { ... }
  async resetData(): Promise<void> { ... }
}
```
- DBアクセスを完全に隔離。
- コンストラクタでdb注入（テスト容易性向上）。

**`OnboardingManager.ts`**（~150行 - 元の546行から大幅縮小）
```typescript
import { OnboardingStep, StepData, OnboardingCompleteEvent, StepChangeEvent, OnboardingData } from './types';
import { OnboardingValidator } from './OnboardingValidator';
import { OnboardingRepository } from './OnboardingRepository';

export class OnboardingManager {
  private repository: OnboardingRepository;
  // シングルトン管理、ステップ進行制御、イベント管理のみ
  // バリデーションはOnboardingValidator.validate()に委譲
  // DB操作はthis.repository.*に委譲
}
```

**`index.ts`**（~10行）
```typescript
// 後方互換性を維持する再エクスポート
export { OnboardingManager } from './OnboardingManager';
export type { OnboardingStep, StepData, OnboardingData, OnboardingCompleteEvent, StepChangeEvent } from './types';
export { OnboardingValidator } from './OnboardingValidator';
export { OnboardingRepository } from './OnboardingRepository';
```

#### インターフェース設計

```
OnboardingManager (オーケストレーター)
  ├── uses → OnboardingValidator.validate() [staticメソッド]
  ├── has  → OnboardingRepository [コンストラクタ注入]
  └── emits → OnboardingCompleteEvent, StepChangeEvent [コールバック]
```

### 移行手順

1. `types.ts` を作成し、全型定義を移動
2. `OnboardingManager.ts` のimportを `types.ts` に変更
3. テスト実行で既存テストがパスすることを確認
4. `OnboardingValidator.ts` を作成し、`validateStepData()` を移動
5. `OnboardingManager` 内の `validateStepData()` を `OnboardingValidator.validate()` 呼び出しに置換
6. テスト実行で確認
7. `OnboardingRepository.ts` を作成し、DB操作メソッドを移動
8. `OnboardingManager` 内のDB操作を `this.repository.*` に委譲
9. テスト実行で確認
10. `index.ts` を作成し、再エクスポートを設定
11. 全テスト実行で最終確認

### テスト影響

| テストファイル | 変更内容 |
|--------------|---------|
| `src/core/onboarding/OnboardingManager.test.ts`（649行） | importパスを `./OnboardingManager` から変更不要（index.tsで再エクスポート）。ただし新モジュール用のテスト追加が必要 |
| `src/ui/screens/onboarding/OnboardingFlow.test.tsx`（687行） | 変更不要（OnboardingManagerのpublicインターフェースは変わらない） |

**追加テストファイル：**
- `src/core/onboarding/OnboardingValidator.test.ts` — バリデーションロジック単体テスト
- `src/core/onboarding/OnboardingRepository.test.ts` — DB永続化単体テスト

---

## 2. OnboardingFlow.tsx（519行）

### 現状の責務分析

現在このファイルには以下の4つの責務が混在している：

1. **コンポーネント状態管理・ロジック**（19-108行）
   - 5つのinput state、manager state、error/initialized state
   - useEffect初期化、handleCompleteStep、handleBack
   - 合計90行

2. **各ステップのレンダリング**（122-357行）
   - `renderWelcome()` — 12行
   - `renderAntiVision()` — 46行
   - `renderIdentity()` — 47行
   - `renderMission()` — 46行
   - `renderQuests()` — 53行
   - `renderStep()` — 21行
   - 合計236行（ファイルの45%）

3. **メインレンダリング・エラー表示**（359-374行）
   - エラーハンドリングUI、コンテナレンダリング
   - 合計16行

4. **StyleSheet定義**（376-519行）
   - 19個のスタイル定義
   - 合計144行（ファイルの28%）

### 分割提案

#### ファイル構成

```
src/ui/screens/onboarding/
  OnboardingFlow.tsx                # メインコンポーネント（縮小）
  steps/
    WelcomeStep.tsx                 # ステップ1（新規）
    AntiVisionStep.tsx              # ステップ2（新規）
    IdentityStep.tsx                # ステップ3（新規）
    MissionStep.tsx                 # ステップ4（新規）
    QuestsStep.tsx                  # ステップ5（新規）
    index.ts                        # 再エクスポート（新規）
  onboarding.styles.ts              # 共通スタイル（新規）
```

#### 各ファイルの内容

**`onboarding.styles.ts`**（~150行）
```typescript
import { StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';

export const onboardingStyles = StyleSheet.create({
  container: { ... },
  stepContainer: { ... },
  // ... 全19スタイル定義
});
```

**`steps/WelcomeStep.tsx`**（~35行）
```typescript
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { onboardingStyles as styles } from '../onboarding.styles';

interface WelcomeStepProps {
  onComplete: () => void;
}

export function WelcomeStep({ onComplete }: WelcomeStepProps) {
  return (
    <View style={styles.stepContainer}>
      {/* 現在のrenderWelcome()の内容 */}
    </View>
  );
}
```

**`steps/AntiVisionStep.tsx`**（~65行）
```typescript
interface AntiVisionStepProps {
  onComplete: (data: { antiVision: string }) => void;
  onBack: () => void;
}

export function AntiVisionStep({ onComplete, onBack }: AntiVisionStepProps) {
  const [text, setText] = useState('');
  const isValid = text.trim().length > 0;
  // 現在のrenderAntiVision()の内容（state含む）
}
```

**`steps/IdentityStep.tsx`**（~65行）— 同様の構造

**`steps/MissionStep.tsx`**（~65行）— 同様の構造

**`steps/QuestsStep.tsx`**（~70行）
```typescript
interface QuestsStepProps {
  onComplete: (data: { quests: [string, string] }) => void;
  onBack: () => void;
}

export function QuestsStep({ onComplete, onBack }: QuestsStepProps) {
  const [quest1Text, setQuest1Text] = useState('');
  const [quest2Text, setQuest2Text] = useState('');
  // 現在のrenderQuests()の内容（state含む）
}
```

**`steps/index.ts`**（~5行）
```typescript
export { WelcomeStep } from './WelcomeStep';
export { AntiVisionStep } from './AntiVisionStep';
export { IdentityStep } from './IdentityStep';
export { MissionStep } from './MissionStep';
export { QuestsStep } from './QuestsStep';
```

**`OnboardingFlow.tsx`**（~100行 - 元の519行から大幅縮小）
```typescript
import { WelcomeStep, AntiVisionStep, IdentityStep, MissionStep, QuestsStep } from './steps';
import { onboardingStyles as styles } from './onboarding.styles';

export function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [manager, setManager] = useState<OnboardingManager | null>(null);
  // ... 初期化ロジック（useEffect）
  // ... handleCompleteStep
  // ... ステップ切り替えロジック（switch → コンポーネント選択のみ）

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome': return <WelcomeStep onComplete={handleWelcomePress} />;
      case 'anti-vision': return <AntiVisionStep onComplete={(d) => handleCompleteStep('anti-vision', d)} onBack={handleBack} />;
      // ...
    }
  };
}
```

#### インターフェース設計

```
OnboardingFlow (コンテナコンポーネント)
  ├── renders → WelcomeStep [onComplete]
  ├── renders → AntiVisionStep [onComplete, onBack]
  ├── renders → IdentityStep [onComplete, onBack]
  ├── renders → MissionStep [onComplete, onBack]
  ├── renders → QuestsStep [onComplete, onBack]
  └── imports → onboardingStyles (共有)
```

**重要な設計判断：**
- 各ステップのinput state（`antiVisionText`, `identityText`等）は、現在OnboardingFlow内でまとめて管理されているが、分割後は各ステップコンポーネント内にローカライズする。
- これにより、ステップコンポーネントが自己完結し、テストが容易になる。
- OnboardingFlowから各ステップへのデータフローは `onComplete` コールバック props のみ。

### 移行手順

1. `onboarding.styles.ts` を作成し、StyleSheet定義を移動
2. `OnboardingFlow.tsx` のスタイルimportを変更
3. テスト実行で確認
4. `steps/WelcomeStep.tsx` を作成（最もシンプルなステップから開始）
5. `OnboardingFlow.tsx` の `renderWelcome()` を `<WelcomeStep>` に置換
6. テスト実行で確認
7. 残りの4ステップを順番に分離（AntiVision → Identity → Mission → Quests）
8. 各ステップ分離後にテスト実行
9. `steps/index.ts` を作成
10. `OnboardingFlow.tsx` のimportを `./steps` に統合
11. 全テスト実行で最終確認

### テスト影響

| テストファイル | 変更内容 |
|--------------|---------|
| `src/ui/screens/onboarding/OnboardingFlow.test.tsx`（687行） | **変更なし**。テストはOnboardingFlowを通してレンダリングしているため、内部コンポーネントの分割はテストに影響しない（testIDベースのテスト） |

**追加テストファイル：**
- `src/ui/screens/onboarding/steps/WelcomeStep.test.tsx` — 単体テスト
- `src/ui/screens/onboarding/steps/AntiVisionStep.test.tsx` — 入力バリデーションテスト
- `src/ui/screens/onboarding/steps/IdentityStep.test.tsx` — 同上
- `src/ui/screens/onboarding/steps/MissionStep.test.tsx` — 同上
- `src/ui/screens/onboarding/steps/QuestsStep.test.tsx` — 複数入力テスト

**注意：** 既存のOnboardingFlow.test.txはインテグレーションテストとして維持し、新しいステップコンポーネントのテストはユニットテストとして追加する。

---

## 3. IdentityEngine.ts（453行）

### 現状の責務分析

現在このファイルには以下の5つの責務が混在している：

1. **型定義・インターフェース**（14-42行）
   - `IHResponse`, `WipeEvent`, `QuestCompletion`, `NotificationResponse`
   - 合計29行

2. **シングルトン管理・初期化**（47-100行）
   - `getInstance()`, `resetInstance()`, `initialize()`
   - DB接続、IH読み込み
   - 合計54行

3. **IH計算・ペナルティロジック**（105-219行）
   - `getCurrentIH()`, `setCurrentIH()`
   - `applyNotificationResponse()` — 通知応答ペナルティ
   - `applyQuestPenalty()` — クエスト未完了ペナルティ
   - `applyOnboardingStagnationPenalty()` — オンボーディング停滞ペナルティ
   - 合計115行

4. **ライフサイクル管理（生死制御）**（222-387行）
   - `checkHealth()` — 健康状態チェック（despairモード連携）
   - `applyDamage()` — ダメージ適用
   - `restoreHealth()` — 回復
   - `killUser()` — データ完全消去（NUCLEAR OPTION）
   - `useInsurance()` — 保険によるリバイブ
   - `getAntiVision()` — アンチビジョン取得
   - 合計166行

5. **ワイプイベント・ユーティリティ**（392-452行）
   - `isWipeNeeded()`, `onWipeTrigger()`, `triggerWipe()`
   - `clampIH()`, `persistIH()`
   - 合計61行

### 分割提案

#### ファイル構成

```
src/core/identity/
  types.ts                    # 型定義（新規）
  IdentityEngine.ts           # コアエンジン（縮小）
  IHCalculator.ts             # IH計算ロジック（新規）
  IdentityLifecycle.ts        # 生死制御（新規）
  index.ts                    # 再エクスポート（新規）
```

#### 各ファイルの内容

**`types.ts`**（~30行）
```typescript
export interface IHResponse {
  previousIH: number;
  newIH: number;
  delta: number;
  timestamp: number;
}

export interface WipeEvent {
  reason: 'IH_ZERO' | 'QUEST_FAIL' | 'USER_REQUEST';
  finalIH: number;
  timestamp: number;
}

export interface QuestCompletion {
  completedCount: number;
  totalCount: number;
}

export type NotificationResponse = 'YES' | 'NO' | 'IGNORED';
```

**`IHCalculator.ts`**（~100行）
```typescript
import { IH_CONSTANTS } from '../../constants';
import { NotificationResponse, QuestCompletion, IHResponse } from './types';

/**
 * IH計算ロジックを集約。ステートレスなユーティリティクラス。
 * IdentityEngineから呼び出される。
 */
export class IHCalculator {
  /** IH値を[0, 100]にクランプ */
  static clamp(value: number): number {
    return Math.max(0, Math.min(100, value));
  }

  /** 通知応答に基づくデルタ計算 */
  static calculateNotificationDelta(response: NotificationResponse): number { ... }

  /** クエスト完了状態に基づくデルタ計算 */
  static calculateQuestDelta(completion: QuestCompletion): number { ... }

  /** オンボーディング停滞ペナルティのデルタ */
  static calculateStagnationDelta(): number { return -5; }

  /** IHResponse生成ヘルパー */
  static createResponse(previousIH: number, delta: number): IHResponse { ... }
}
```
- 純粋な計算ロジック。副作用なし。
- テストが最も書きやすい形。

**`IdentityLifecycle.ts`**（~120行）
```typescript
import * as SQLite from 'expo-sqlite';
import { initDatabase } from '../../database/schema';
import { runInTransaction } from '../../database/transaction';

/**
 * ユーザーの生死を管理するクラス。
 * killUser(), useInsurance(), checkHealth(), applyDamage(), restoreHealth()
 */
export class IdentityLifecycle {
  constructor(
    private db: SQLite.SQLiteDatabase,
    private syncIH: (value: number) => void  // IdentityEngineのcurrentIHを同期するコールバック
  ) {}

  async checkHealth(): Promise<{ health: number; isDead: boolean }> { ... }
  async applyDamage(amount: number): Promise<{ health: number; isDead: boolean }> { ... }
  async restoreHealth(amount: number): Promise<void> { ... }
  async killUser(): Promise<void> { ... }
  async useInsurance(): Promise<void> { ... }
  async getAntiVision(): Promise<string> { ... }
}
```
- DB操作を含むが、IdentityEngineのin-memory状態を `syncIH` コールバックで同期。
- トランザクション管理はこのクラスが担当。

**`IdentityEngine.ts`**（~150行 - 元の453行から縮小）
```typescript
import { IHCalculator } from './IHCalculator';
import { IdentityLifecycle } from './IdentityLifecycle';
import { NotificationResponse, QuestCompletion, IHResponse, WipeEvent } from './types';

export class IdentityEngine {
  private lifecycle: IdentityLifecycle;
  // シングルトン管理 + IH状態管理 + ペナルティ適用（IHCalculatorに委譲） + ワイプイベント管理
  // checkHealth/applyDamage/restoreHealth/killUser/useInsurance → this.lifecycle.*
  // clampIH/calculateDelta → IHCalculator.*
}
```

**`index.ts`**（~10行）
```typescript
export { IdentityEngine } from './IdentityEngine';
export type { IHResponse, WipeEvent, QuestCompletion, NotificationResponse } from './types';
export { IHCalculator } from './IHCalculator';
export { IdentityLifecycle } from './IdentityLifecycle';
```

#### インターフェース設計

```
IdentityEngine (シングルトン・オーケストレーター)
  ├── uses → IHCalculator.clamp(), .calculateNotificationDelta() [staticメソッド]
  ├── has  → IdentityLifecycle [コンストラクタ注入]
  ├── owns → currentIH (in-memory state)
  ├── owns → wipeCallbacks[] (イベントリスナー)
  └── owns → persistIH() (DB同期)
```

### 移行手順

1. `types.ts` を作成し、全型定義を移動
2. `IdentityEngine.ts` のimportを `types.ts` に変更
3. テスト実行で確認
4. `IHCalculator.ts` を作成し、計算ロジックを移動
5. `IdentityEngine` 内の `clampIH()` と各メソッドのデルタ計算を `IHCalculator` に委譲
6. テスト実行で確認
7. `IdentityLifecycle.ts` を作成し、生死制御メソッドを移動
8. `IdentityEngine` 内の `checkHealth()`, `applyDamage()`, `restoreHealth()`, `killUser()`, `useInsurance()` を `this.lifecycle.*` に委譲
9. テスト実行で確認
10. `index.ts` を作成し、再エクスポートを設定
11. 全テスト実行で最終確認

### テスト影響

| テストファイル | 変更内容 |
|--------------|---------|
| `src/core/identity/IdentityEngine.test.ts`（441行） | importパスは `index.ts` 経由で変更不要。publicインターフェースは維持 |
| `src/notifications/NotificationHandler.test.ts`（704行） | 変更不要（IdentityEngineのモック対象メソッドは変わらない） |
| `src/ui/screens/onboarding/ExcavationPhase.test.tsx`（336行） | 変更不要 |
| `app/death.test.tsx`（160行） | 変更不要 |

**追加テストファイル：**
- `src/core/identity/IHCalculator.test.ts` — 純粋計算ロジックの単体テスト
- `src/core/identity/IdentityLifecycle.test.ts` — 生死制御の単体テスト

**重要：** IdentityEngineは10以上のファイルからimportされている（NotificationHandler, StressContainer, MissionLens, IdentityLens, QuestLens, app/index.tsx, app/death.tsx, app/evening.tsx, app/judgment.tsx, app/morning.tsx, ExcavationPhase）。`index.ts` による再エクスポートで既存のimportパスを維持し、**外部ファイルの変更はゼロ**にする。

---

## 4. app/index.tsx（388行）

### 現状の責務分析

現在このファイルには以下の5つの責務が混在している：

1. **データ型定義**（21-27行）
   - `Quest` インターフェース
   - 合計7行

2. **状態管理・データ読み込み**（29-99行）
   - 8つのuseState、3つのuseEffect（ヘルスチェック、ハプティクス、データロード）
   - オンボーディングチェック・リダイレクト
   - 合計71行

3. **ユーザーアクション**（101-185行）
   - `updateLens()`, `animateToLens()` — レンズ操作
   - `toggleQuest()` — クエスト完了トグル
   - `resetIH()` — デバッグ：IHリセット
   - `sendTestNotification()` — デバッグ：テスト通知
   - 合計85行

4. **レンダリング**（187-307行）
   - `renderLens()` — レンズ切り替え
   - `ContentView` — フィーチャーフラグによるビュー選択
   - ローディング表示、ヘッダー、コンテンツ、レンズセレクター
   - デバッグボタン3つ
   - 合計121行

5. **StyleSheet定義**（310-388行）
   - 14個のスタイル定義
   - 合計79行

### 分割提案

#### ファイル構成

```
app/
  index.tsx                         # メインルート（縮小）
src/ui/screens/home/
  useHomeData.ts                    # データ取得カスタムフック（新規）
  useHealthMonitor.ts               # ヘルスモニタリングフック（新規）
  HomeHeader.tsx                    # ヘッダーコンポーネント（新規）
  LensContent.tsx                   # レンズコンテンツ表示（新規）
  DebugActions.tsx                  # デバッグアクション（新規）
  home.styles.ts                    # スタイル定義（新規）
  index.ts                          # 再エクスポート（新規）
```

#### 各ファイルの内容

**`src/ui/screens/home/useHomeData.ts`**（~80行）
```typescript
import { useState, useEffect } from 'react';
import { getDB } from '../../../database/client';
import { useRouter } from 'expo-router';

export interface Quest {
  id: number;
  quest_text: string;
  is_completed: number;
  created_at: string;
  completed_at: string | null;
}

export function useHomeData() {
  const router = useRouter();
  const [mission, setMission] = useState('');
  const [antiVision, setAntiVision] = useState('');
  const [identity, setIdentity] = useState('');
  const [quests, setQuests] = useState<Quest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 現在のuseEffect（データロード + オンボーディングチェック）を移動

  const toggleQuest = async (id: number) => { ... };

  return { mission, antiVision, identity, quests, isLoading, toggleQuest };
}
```
- DBからのデータロード、オンボーディングリダイレクト、クエストトグルを一つのフックに集約。
- このフックが唯一のDB接点（`getDB()`呼び出し元）。

**`src/ui/screens/home/useHealthMonitor.ts`**（~30行）
```typescript
import { useState, useEffect } from 'react';
import { IdentityEngine } from '../../../core/identity/IdentityEngine';

export function useHealthMonitor(intervalMs: number = 2000) {
  const [health, setHealth] = useState(100);

  useEffect(() => {
    const checkHealth = async () => {
      const engine = await IdentityEngine.getInstance();
      const status = await engine.checkHealth();
      setHealth(status.health);
    };
    checkHealth();
    const interval = setInterval(checkHealth, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs]);

  return health;
}
```

**`src/ui/screens/home/HomeHeader.tsx`**（~60行）
```typescript
interface HomeHeaderProps {
  health: number;
  onResetIH?: () => void;
  onViewDeath?: () => void;
  onSendNotification?: () => void;
}

export function HomeHeader({ health, onResetIH, onViewDeath, onSendNotification }: HomeHeaderProps) {
  // ヘッダー部分 + デバッグボタン
  // __DEV__ チェックはここで行う
}
```

**`src/ui/screens/home/LensContent.tsx`**（~60行）
```typescript
interface LensContentProps {
  lens: 0.5 | 1.0 | 2.0;
  scale: Animated.Value;
  panResponder: any;
  health: number;
  mission: string;
  antiVision: string;
  identity: string;
  quests: Quest[];
  onQuestToggle: (id: number) => void;
}

export function LensContent(props: LensContentProps) {
  // フィーチャーフラグによるビュー選択ロジック
  // UnifiedLensView / Legacy lens view の切り替え
}
```

**`src/ui/screens/home/DebugActions.ts`**（~50行）
```typescript
import { IdentityEngine } from '../../../core/identity/IdentityEngine';
import * as Notifications from 'expo-notifications';

export async function resetIH(): Promise<void> { ... }
export async function sendTestNotification(): Promise<void> { ... }
```
- デバッグ用アクションを関数として切り出し。
- `__DEV__` フラグに関係なく存在するが、UIからの呼び出しは `__DEV__` で制御。

**`src/ui/screens/home/home.styles.ts`**（~80行）
```typescript
import { StyleSheet } from 'react-native';
import { theme } from '../../theme/theme';

export const homeStyles = StyleSheet.create({
  container: { ... },
  // ... 全14スタイル定義
});
```

**`app/index.tsx`**（~80行 - 元の388行から大幅縮小）
```typescript
import { useHomeData } from '../src/ui/screens/home/useHomeData';
import { useHealthMonitor } from '../src/ui/screens/home/useHealthMonitor';
import { HomeHeader } from '../src/ui/screens/home/HomeHeader';
import { LensContent } from '../src/ui/screens/home/LensContent';
import { homeStyles as styles } from '../src/ui/screens/home/home.styles';
import { resetIH, sendTestNotification } from '../src/ui/screens/home/DebugActions';

export default function Home() {
  const health = useHealthMonitor();
  const { mission, antiVision, identity, quests, isLoading, toggleQuest } = useHomeData();
  const { panResponder, scale } = useLensGesture(updateLens);
  // ... レンズ管理（最小限のステート）

  return (
    <SafeAreaView style={styles.container}>
      <HomeHeader health={health} ... />
      <StressContainer>
        <LensContent ... />
      </StressContainer>
      {/* Lens Selector */}
    </SafeAreaView>
  );
}
```

#### インターフェース設計

```
app/index.tsx (Home - ルートコンポーネント)
  ├── uses → useHomeData() [データ取得フック]
  ├── uses → useHealthMonitor() [ヘルスモニタリングフック]
  ├── uses → useLensGesture() [既存フック - 変更不要]
  ├── renders → HomeHeader [props: health, debug callbacks]
  ├── renders → LensContent [props: lens state, data]
  └── calls → DebugActions.resetIH/sendTestNotification [__DEV__時のみ]
```

### 移行手順

1. `src/ui/screens/home/` ディレクトリを作成
2. `home.styles.ts` を作成し、StyleSheet定義を移動
3. `app/index.tsx` のスタイルimportを変更
4. テスト実行（app/index.tsxの直接テストは現時点で存在しない）
5. `useHealthMonitor.ts` を作成し、ヘルスモニタリングuseEffectを移動
6. `useHomeData.ts` を作成し、データロード・クエストトグルを移動
7. `HomeHeader.tsx` を作成し、ヘッダーUIを移動
8. `LensContent.tsx` を作成し、レンズ切り替えロジックを移動
9. `DebugActions.ts` を作成し、デバッグ関数を移動
10. `app/index.tsx` を統合して縮小
11. `index.ts` を作成（再エクスポート用）
12. 手動テスト（Expo devサーバーでの動作確認）

### テスト影響

| テストファイル | 変更内容 |
|--------------|---------|
| なし（現時点でapp/index.tsxの直接テストは存在しない） | - |

**追加テストファイル：**
- `src/ui/screens/home/useHomeData.test.ts` — データ取得フックのテスト
- `src/ui/screens/home/useHealthMonitor.test.ts` — ヘルスモニタリングのテスト
- `src/ui/screens/home/HomeHeader.test.tsx` — ヘッダーUIテスト
- `src/ui/screens/home/LensContent.test.tsx` — レンズ表示テスト

**注意：** app/index.tsxはExpo Routerのファイルベースルーティングで使用されるため、ファイルパスの変更は不可。`app/index.tsx` 自体はそのまま残し、中身を薄いシェルにする。

---

## 依存関係グラフ

### 分割前

```
app/index.tsx ──────────────────┐
  ├── IdentityEngine            │
  ├── HapticEngine              │
  ├── getDB()                   │
  ├── StressContainer           │
  ├── MissionLens               │
  ├── IdentityLens              │
  ├── QuestLens                 │
  ├── UnifiedLensView           │
  ├── useLensGesture            │
  ├── isFeatureEnabled          │
  └── expo-notifications        │
                                │
OnboardingFlow.tsx ─────────────┤
  ├── OnboardingManager ────────┤  (直接importで強結合)
  ├── updateAppState            │
  └── theme                     │
                                │
OnboardingManager.ts ───────────┤
  ├── getDB, databaseInit       │
  └── expo-sqlite               │
                                │
IdentityEngine.ts ──────────────┘
  ├── getDB
  ├── IH_CONSTANTS
  ├── initDatabase
  ├── runInTransaction
  └── expo-sqlite
```

### 分割後

```
app/index.tsx (薄いシェル)
  ├── useHomeData ──────────── getDB, useRouter
  ├── useHealthMonitor ─────── IdentityEngine
  ├── HomeHeader ───────────── (プレゼンテーション)
  ├── LensContent ──────────── 既存Lensコンポーネント群
  └── DebugActions ─────────── IdentityEngine, Notifications

OnboardingFlow.tsx (薄いシェル)
  ├── steps/WelcomeStep ────── (プレゼンテーション)
  ├── steps/AntiVisionStep ─── (プレゼンテーション + ローカルstate)
  ├── steps/IdentityStep ───── (プレゼンテーション + ローカルstate)
  ├── steps/MissionStep ────── (プレゼンテーション + ローカルstate)
  ├── steps/QuestsStep ─────── (プレゼンテーション + ローカルstate)
  └── onboarding.styles ────── theme

OnboardingManager.ts (オーケストレーター)
  ├── types ────────────────── (型のみ)
  ├── OnboardingValidator ──── (ステートレス)
  └── OnboardingRepository ─── getDB, databaseInit, expo-sqlite

IdentityEngine.ts (オーケストレーター)
  ├── types ────────────────── (型のみ)
  ├── IHCalculator ─────────── IH_CONSTANTS (ステートレス)
  └── IdentityLifecycle ────── getDB, initDatabase, runInTransaction
```

---

## 実装順序

### 推奨実装順序（依存関係とリスクに基づく）

| 順序 | ファイル | 理由 |
|------|---------|------|
| **1** | `OnboardingManager.ts` | 最も行数が多い。外部依存が2ファイルのみで影響範囲が狭い。型分離から始められる安全なスタート |
| **2** | `IdentityEngine.ts` | 外部依存が10ファイル以上だが、index.tsによる再エクスポートで安全に分割可能。OnboardingManagerの分割パターンを踏襲できる |
| **3** | `OnboardingFlow.tsx` | UIコンポーネントの分割はロジック分割より副作用が少ない。既存テストがtestIDベースなので影響が小さい |
| **4** | `app/index.tsx` | カスタムフック抽出が中心。テストが存在しないため、分割と同時にテスト追加が必要。最後に実施 |

### 各ステップの所要時間見積もり

| ファイル | 見積もり | 内訳 |
|---------|---------|------|
| OnboardingManager | 2-3時間 | 型分離(30分) + Validator(30分) + Repository(1時間) + 統合テスト(30分) |
| IdentityEngine | 2-3時間 | 型分離(30分) + Calculator(30分) + Lifecycle(1時間) + 統合テスト(30分) |
| OnboardingFlow | 3-4時間 | スタイル分離(30分) + 5ステップ分離(各30分) + テスト追加(1時間) |
| app/index.tsx | 3-4時間 | フック抽出(1時間) + コンポーネント分離(1時間) + テスト新規作成(1.5時間) |

**合計見積もり：10-14時間**

---

## リスク評価

### 高リスク

| リスク | 影響 | 軽減策 |
|-------|------|--------|
| **IdentityEngineのimportパス破壊** | 10以上のファイルがimportしている。パス変更で大量のコンパイルエラー | `index.ts` による再エクスポートで既存パスを完全維持。外部ファイルの変更ゼロを保証 |
| **シングルトンの状態同期崩壊** | IdentityEngineの分割でin-memory IHとDB値の不整合 | `IdentityLifecycle` にsyncIHコールバックを注入し、DB更新時に必ずin-memory状態を同期 |

### 中リスク

| リスク | 影響 | 軽減策 |
|-------|------|--------|
| **OnboardingFlowのテスト不安定化** | ステップコンポーネント分割で既存テストのtestID検索が失敗する可能性 | 分割後もtestIDを完全に維持。renderフローを変えずにコンポーネント境界のみを変更 |
| **循環依存の発生** | 分割したモジュール間で意図しない循環importが発生する可能性 | 型定義を `types.ts` に隔離し、一方向の依存フロー（types ← Calculator/Repository ← Engine）を強制 |
| **デバッグ機能の喪失** | app/index.tsxのデバッグボタン分離で `__DEV__` の扱いが崩れる可能性 | `DebugActions.ts` はロジックのみ、UI側の `__DEV__` ガードは `HomeHeader` で維持 |

### 低リスク

| リスク | 影響 | 軽減策 |
|-------|------|--------|
| **スタイルの重複** | 共通スタイルファイル分離時に参照漏れ | StyleSheet.create()はビルド時にチェックされるため、コンパイルエラーで即座に検知可能 |
| **バンドルサイズの微増** | ファイル数増加によるメタデータ増加 | React NativeのMetroバンドラーは効率的なツリーシェイキングを行うため、実質的な影響はない |

### ロールバック戦略

各ファイルの分割は独立して実施可能であり、問題発生時は以下の手順でロールバックできる：

1. 各分割はgitの独立コミットとして実施
2. `index.ts` の再エクスポートにより、外部ファイルへの影響を遮断
3. 問題が発生した分割のみを `git revert` で巻き戻し可能
4. 他の分割には影響しない

---

## 補足：分割基準の根拠

本設計は以下の原則に基づく：

1. **Single Responsibility Principle**: 各ファイルが1つの明確な責務を持つ
2. **Open/Closed Principle**: 新しいステップやペナルティタイプの追加時に既存コードの変更を最小化
3. **Dependency Inversion**: 具体的なDB実装ではなく、抽象（Repository/Lifecycle）に依存
4. **目標行数**: 各ファイル150行以下を目標とする（StyleSheet含むUIコンポーネントは200行以下）
