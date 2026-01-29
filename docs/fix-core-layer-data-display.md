# 実装プラン: コアレイヤーデータ表示修正

## 概要

オンボーディングで入力したデータがコアレイヤー（index.tsx）に表示されない問題を修正する。

## 問題分析

### 根本原因

1. **コアレイヤーがデータベースから読み込んでいない**
   - `app/(tabs)/index.tsx`がハードコードされたプレースホルダーを使用
   - データベースクエリ処理が存在しない

2. **オンボーディング完了後にアプリ状態を更新していない**
   - `src/ui/screens/onboarding/OnboardingFlow.tsx`が`updateAppState('active')`を呼んでいない
   - アプリ再起動時にオンボーディングに戻される可能性

### 現状確認

#### ✅ 正常に動作している部分

- **オンボーディングデータの保存**: `OnboardingManager.completeStep()`が正しくデータベースに保存
  - `anti_vision` → `identity.anti_vision`
  - `identity_statement` → `identity.identity_statement`
  - `one_year_mission` → `identity.one_year_mission`
  - `quests` → `quests`テーブル

- **データ取得メソッド**: `OnboardingManager`に以下のメソッドが実装済み
  - `getAntiVision()`: src/core/onboarding/OnboardingManager.ts:217-227
  - `getIdentity()`: src/core/onboarding/OnboardingManager.ts:232-242
  - `getMission()`: src/core/onboarding/OnboardingManager.ts:247-257
  - `getQuests()`: src/core/onboarding/OnboardingManager.ts:262-276

- **IH取得メソッド**: `IdentityEngine.getCurrentIH()` (src/core/identity/IdentityEngine.ts:103-105)

- **アプリ状態更新関数**: `updateAppState()` (src/database/db.ts:119-129)

#### ❌ 修正が必要な部分

**ファイル1: `app/(tabs)/index.tsx`**

| 行番号 | 問題 | 現在の実装 |
|--------|------|------------|
| 12 | IH値がハードコード | `const currentIH = 75; // Placeholder` |
| 60-62 | アイデンティティ宣言がプレースホルダー | `[アイデンティティ宣言]\n\n"決断する人間だ"` |
| 68-84 | 三層レンズがプレースホルダー | ハードコードされたボタンのみ |
| 全体 | データベースクエリが存在しない | useEffectなし、OnboardingManager呼び出しなし |

**ファイル2: `src/ui/screens/onboarding/OnboardingFlow.tsx`**

| 行番号 | 問題 | 現在の実装 |
|--------|------|------------|
| 104-106 | app_state更新が欠落 | `if (isComplete) { router.replace('/(tabs)'); }` |
| - | updateAppStateのimportなし | importステートメントに含まれていない |

## 修正内容

### 修正1: コアレイヤーのデータ読み込み実装

**ファイル**: `app/(tabs)/index.tsx`

#### 変更箇所

1. **Importステートメント追加** (行6-8の後)
```typescript
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { OnboardingManager } from '../../src/core/onboarding/OnboardingManager';
import { IdentityEngine } from '../../src/core/identity/IdentityEngine';
```

**重要**: useEffectではなくuseFocusEffectを使用することで、タブ切り替え時にもデータが再取得されます。

2. **Stateフックとデータ読み込み処理追加** (行10-12を置き換え)

**重要**: 行12の `const currentIH = 75; // Placeholder` を削除してください。この値はuseStateで管理されます。

```typescript
export default function CoreScreen() {
  // State for loaded data
  const [antiVision, setAntiVision] = useState<string>('');
  const [identityStatement, setIdentityStatement] = useState<string>('');
  const [oneYearMission, setOneYearMission] = useState<string>('');
  const [currentIH, setCurrentIH] = useState<number>(100);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load data from database when screen is focused
  // useFocusEffect ensures data is refreshed when returning to this tab
  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadData = async () => {
        try {
          const manager = await OnboardingManager.getInstance();
          const engine = await IdentityEngine.getInstance();

          // Check if component is still mounted before updating state
          if (!isMounted) return;

          // Load identity data
          const antiVisionData = await manager.getAntiVision();
          const identityData = await manager.getIdentity();
          const missionData = await manager.getMission();
          const ihData = await engine.getCurrentIH();

          setAntiVision(antiVisionData || '');
          setIdentityStatement(identityData || '');
          setOneYearMission(missionData || '');
          setCurrentIH(ihData);
        } catch (error) {
          console.error('Error loading identity data:', error);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      };

      loadData();

      // Cleanup function to prevent state updates after unmount
      return () => {
        isMounted = false;
      };
    }, [])
  );
```

**変更理由**:
- `useEffect` → `useFocusEffect`: タブ切り替え時にデータを再取得
- `isMounted`フラグ追加: コンポーネントアンマウント後のstate更新を防止
- クリーンアップ関数追加: メモリリーク防止

3. **プレースホルダーをStateで置き換え** (行60-62)

**変更前**:
```typescript
<Text style={styles.statementText}>
  {/* アイデンティティ宣言のプレースホルダー */}
  [アイデンティティ宣言]
  {'\n\n'}
  "決断する人間だ"
</Text>
```

**変更後**:
```typescript
<Text style={styles.statementText}>
  {isLoading ? '[読み込み中...]' : identityStatement || '[未設定]'}
</Text>
```

4. **三層レンズにデータ反映** (行68-84)

**将来実装のため、今回は現状維持。ただしコメント追加:**
```typescript
{/* 三層レンズ - 将来実装: antiVision(ミクロ), identityStatement(現在), oneYearMission(マクロ) */}
<View style={styles.lensContainer}>
  {/* ... 現状のコード維持 ... */}
</View>
```

#### 影響範囲

- **変更ファイル**: 1個 (`app/(tabs)/index.tsx`)
- **既存機能への影響**: なし（読み取り専用の追加）
- **テスト要件**:
  - オンボーディング完了後、index.tsx画面に正しいデータが表示されることを確認
  - データがない場合、適切なフォールバック表示（'[未設定]'）が表示されることを確認

---

### 修正2: オンボーディング完了時のアプリ状態更新

**ファイル**: `src/ui/screens/onboarding/OnboardingFlow.tsx`

#### 変更箇所

1. **Importステートメント追加** (行15の後)
```typescript
import { updateAppState } from '../../../database/db';
```

2. **handleCompleteStep内にapp_state更新追加** (行104-107を置き換え)

**変更前**:
```typescript
const isComplete = await manager.isOnboardingComplete();
if (isComplete) {
  router.replace('/(tabs)');
}
```

**変更後**:
```typescript
const isComplete = await manager.isOnboardingComplete();
if (isComplete) {
  // Update app state to 'active' before navigating
  try {
    await updateAppState('active');
  } catch (error) {
    console.error('Failed to update app state:', error);
    // Continue with navigation even if app_state update fails
    // On next app start, isOnboardingComplete() will be true
    // and user will be redirected to main app automatically
  }
  router.replace('/(tabs)');
}
```

**エラーハンドリングの理由**:
- app_state更新失敗時もナビゲーションは続行
- 次回起動時、`isOnboardingComplete()`が`true`を返すため自動的にメイン画面へ遷移
- データ不整合を防ぐための安全策

#### 影響範囲

- **変更ファイル**: 1個 (`src/ui/screens/onboarding/OnboardingFlow.tsx`)
- **既存機能への影響**: なし（データベース更新の追加のみ）
- **テスト要件**:
  - オンボーディング完了後、`app_state.state`が`'active'`になることを確認
  - アプリ再起動後、オンボーディングに戻されないことを確認

---

## 実装手順

### Phase 1: 修正1の実装（コアレイヤーデータ読み込み）

1. `app/(tabs)/index.tsx`を開く
2. **行12削除**: `const currentIH = 75; // Placeholder` を削除
3. Importステートメント追加（useFocusEffect, useCallback, useState, OnboardingManager, IdentityEngine）
4. Stateフック追加（antiVision, identityStatement, oneYearMission, currentIH, isLoading）
5. useFocusEffectでデータ読み込み処理追加（isMountedフラグ、クリーンアップ処理含む）
6. プレースホルダーをState変数で置き換え
7. 三層レンズにコメント追加

### Phase 2: 修正2の実装（アプリ状態更新）

1. `src/ui/screens/onboarding/OnboardingFlow.tsx`を開く
2. `updateAppState`をimport
3. `handleCompleteStep`内に`updateAppState('active')`追加（try-catchでエラーハンドリング）

### Phase 3: テスト実行と動作確認

1. **既存テストの実行**
   ```bash
   npm test
   ```
   - 全テストがパスすることを確認
   - エラーが出た場合は修正が既存機能に影響していないか確認

2. **手動動作確認**
   - アプリを起動
   - オンボーディングフローを完了
   - コアレイヤー（index.tsx）で入力データが表示されることを確認
   - アプリを再起動
   - オンボーディングに戻されず、コアレイヤーが表示されることを確認
   - IH値が正しく表示されることを確認

3. **タブ切り替え確認**（useFocusEffectの動作確認）
   - コアレイヤーでIH値を確認
   - 別のタブに移動
   - コアレイヤーに戻る
   - データが再取得されることを確認（将来的にIH変動時に重要）

---

## テスト計画

### 手動テスト

#### テストケース1: オンボーディング完了後のデータ表示

**手順**:
1. アプリをクリーンインストール（または既存データ削除）
2. オンボーディングフローを開始
3. 以下のデータを入力:
   - Anti-vision: "40歳で貯金ゼロ、無職、孤独死"
   - Identity: "毎日成長し続ける人間だ"
   - Mission: "1年後、年収600万円のエンジニアになる"
   - Quest1: "朝6時に起きる"
   - Quest2: "コーディング3時間"
4. オンボーディング完了

**期待結果**:
- コアレイヤー画面に遷移
- IH値が100%で表示される
- アイデンティティ宣言に"毎日成長し続ける人間だ"が表示される
- 三層レンズは現状のプレースホルダー（将来実装）

#### テストケース2: アプリ再起動後の状態保持

**手順**:
1. テストケース1を完了
2. アプリを完全終了（バックグラウンドからも削除）
3. アプリを再起動

**期待結果**:
- オンボーディング画面にリダイレクトされない
- コアレイヤー画面が表示される
- 入力したデータが保持されている
- IH値が100%のまま

#### テストケース3: データ未設定時のフォールバック

**手順**:
1. データベースを手動で削除または破損
2. アプリを起動

**期待結果**:
- エラーで落ちない
- アイデンティティ宣言に"[未設定]"が表示される
- IH値が100%（デフォルト値）で表示される

### 自動テスト（将来実装推奨）

#### Unit Test: CoreScreen data loading

```typescript
// app/(tabs)/index.test.tsx (新規作成推奨)
describe('CoreScreen data loading', () => {
  it('loads and displays onboarding data', async () => {
    // Mock OnboardingManager
    const mockManager = {
      getAntiVision: jest.fn().mockResolvedValue('Test anti-vision'),
      getIdentity: jest.fn().mockResolvedValue('Test identity'),
      getMission: jest.fn().mockResolvedValue('Test mission'),
    };

    // Mock IdentityEngine
    const mockEngine = {
      getCurrentIH: jest.fn().mockResolvedValue(85),
    };

    // Render and verify
    // ...
  });

  it('shows fallback text when data is missing', async () => {
    // Mock OnboardingManager with null values
    // Verify '[未設定]' is displayed
  });
});
```

#### Integration Test: OnboardingFlow to CoreScreen

```typescript
// __tests__/integration/onboarding-to-core.test.tsx (新規作成推奨)
describe('Onboarding to Core Screen flow', () => {
  it('saves data and updates app_state on completion', async () => {
    // Complete onboarding flow
    // Verify app_state is 'active'
    // Navigate to CoreScreen
    // Verify data is displayed
  });
});
```

---

## エッジケース考慮

### ケース1: データベース初期化エラー

**シナリオ**: `OnboardingManager.getInstance()`または`IdentityEngine.getInstance()`が失敗

**対策**:
- useEffect内でtry-catchでエラーハンドリング済み
- エラー時は`console.error()`でログ出力
- `isLoading`を`false`に設定してUI続行

**改善案（将来実装）**:
- エラー時にユーザーにエラーメッセージを表示
- リトライボタンを提供

### ケース2: 部分的なデータ欠損

**シナリオ**: anti_visionは保存されているがidentity_statementが欠損

**対策**:
- 各フィールドで`|| ''`によるnullチェック実施
- 表示時に`|| '[未設定]'`でフォールバック

### ケース3: オンボーディング中断

**シナリオ**: ユーザーがオンボーディング途中でアプリを終了

**現状**:
- `OnboardingManager`が`current_step`を保存
- 再起動時に中断した場所から再開可能

**影響**:
- `isOnboardingComplete()`が`false`を返す
- `app_state`は`'onboarding'`のまま
- コアレイヤーに遷移しない（期待通り）

---

## ロールバック戦略

### 修正1のロールバック

**影響**: コアレイヤーがデータベースから読み込めなくなる（プレースホルダー表示に戻る）

**手順**:
1. `app/(tabs)/index.tsx`をgit resetでコミット前に戻す
```bash
git checkout app/(tabs)/index.tsx
```

**データ損失**: なし（読み取り専用の変更）

### 修正2のロールバック

**影響**: オンボーディング完了後、app_stateが'active'に更新されない

**手順**:
1. `src/ui/screens/onboarding/OnboardingFlow.tsx`をgit resetでコミット前に戻す
```bash
git checkout src/ui/screens/onboarding/OnboardingFlow.tsx
```

**データ損失**: なし（データベース更新の追加のみ）

**既存データへの影響**:
- 既にオンボーディングを完了したユーザーは影響なし
- 新規ユーザーはapp_stateが'onboarding'のままになるが、再度オンボーディング実行で解決

---

## チェックリスト

### 実装前
- [x] 問題の根本原因を特定
- [x] OnboardingManagerのデータ取得メソッドを確認
- [x] IdentityEngine.getCurrentIH()の存在確認
- [x] updateAppState()の存在確認
- [x] 実装プラン作成

### 実装中
- [ ] Phase 1: index.tsxのimport追加
- [ ] Phase 1: index.tsxのstate追加
- [ ] Phase 1: index.tsxのuseEffect追加
- [ ] Phase 1: プレースホルダー置き換え
- [ ] Phase 2: OnboardingFlow.tsxのimport追加
- [ ] Phase 2: updateAppState呼び出し追加

### 実装後
- [ ] テストケース1: オンボーディング完了後のデータ表示確認
- [ ] テストケース2: アプリ再起動後の状態保持確認
- [ ] テストケース3: データ未設定時のフォールバック確認
- [ ] エッジケース確認（データベースエラー、部分欠損）
- [ ] コミット作成（Phase 1とPhase 2を分離推奨）

---

## 将来の改善案

### 優先度: 中

1. **三層レンズの実装**
   - ミクロ（今日）: 今日のクエスト表示
   - 現在（今）: アイデンティティ宣言（現状）
   - マクロ（1年）: 1年後のミッション表示

2. **エラーハンドリングUI**
   - データベース初期化失敗時にエラー画面表示
   - リトライボタン実装

3. **ローディング状態の視覚化**
   - `isLoading`時にスケルトンスクリーンまたはスピナー表示

### 優先度: 低

4. **自動テスト実装**
   - CoreScreen unit test
   - Onboarding→CoreScreen integration test

5. **パフォーマンス最適化**
   - OnboardingManagerのキャッシュ活用
   - 不要な再レンダリング防止（useMemo/useCallback）

---

## 参考情報

### 関連ファイル

| ファイル | 役割 |
|---------|------|
| `app/(tabs)/index.tsx` | コアレイヤーUI（修正対象） |
| `src/ui/screens/onboarding/OnboardingFlow.tsx` | オンボーディングフロー（修正対象） |
| `src/core/onboarding/OnboardingManager.ts` | オンボーディングデータ管理 |
| `src/core/identity/IdentityEngine.ts` | IH計算エンジン |
| `src/database/db.ts` | データベース操作 |
| `src/database/schema.ts` | データベーススキーマ定義 |

### データベーススキーマ

**identityテーブル** (single-row, id=1):
```sql
CREATE TABLE identity (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  identity_health REAL NOT NULL DEFAULT 100,
  anti_vision TEXT,
  identity_statement TEXT,
  one_year_mission TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

**app_stateテーブル** (single-row, id=1):
```sql
CREATE TABLE app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  state TEXT NOT NULL CHECK (state IN ('onboarding', 'active', 'despair')),
  updated_at TEXT NOT NULL
);
```

### 定数

**IH初期値** (src/constants/index.ts):
```typescript
export const INITIAL_IH = 100;
```

---

## まとめ

### 変更ファイル数: 2個

1. `app/(tabs)/index.tsx` - データ読み込み実装
2. `src/ui/screens/onboarding/OnboardingFlow.tsx` - app_state更新追加

### 推定実装時間

- Phase 1: 15分
- Phase 2: 5分
- 動作確認: 10分
- **合計**: 30分

### リスク評価

- **リスクレベル**: 低
- **既存機能への影響**: なし（読み取り追加のみ）
- **データ損失リスク**: なし
- **ロールバック容易性**: 高（git checkoutで即座に戻せる）

### 次のステップ

1. ✅ 実装プラン作成完了
2. ⏭️ Opusによる実装プランレビュー
3. ⏭️ 問題点修正
4. ⏭️ Sonnetによる実装実行
5. ⏭️ 動作確認
6. ⏭️ コミット作成
