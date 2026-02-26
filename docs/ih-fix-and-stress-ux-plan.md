# IHワイプバグ修正 + StressContainer UX改善 実装計画

**作成日:** 2026-02-26
**対象バージョン:** One Day OS (React Native 0.81.5 / Expo SDK 54)
**優先度:** Critical (P0)

---

## 1. 概要

### 1.1 目的

2つの重大な問題を修正する。

1. **IHワイプバグ**: `IdentityEngine.setCurrentIH()` がワイプコールバックをスキップするため、`JudgmentEngine` 経由でIHが0%になってもワイプが発火しない。
2. **StressContainer 3重ネスト**: `_layout.tsx` / `index.tsx` / `judgment.tsx` の3箇所にネストされた `StressContainer` が、IH=20%時に合成opacity≈0.96の壁を生成し、画面が視認不能・操作不能になる。

### 1.2 影響範囲

| 問題 | 深刻度 | 影響 |
|------|--------|------|
| IHワイプバグ | Critical | TIMEOUT/SUMMONS_EXPIRED でIH=0到達時にデータワイプが発火せず、ゲームループが崩壊する |
| 3重ネスト | Major | 中低IH帯でYES/NOボタンが操作不能、アプリが事実上フリーズ状態に見える |

### 1.3 修正対象ファイル一覧

**Phase 1 (IHワイプバグ修正):**
- `src/core/identity/IdentityEngine.ts`
- `src/core/judgment/JudgmentEngine.ts`

**Phase 2 (StressContainerネスト解消):**
- `app/index.tsx`
- `app/judgment.tsx`
- `src/ui/layout/StressContainer.tsx`

**Phase 3 (エフェクト強度再設計):**
- `src/ui/effects/NoiseOverlay.tsx`
- `src/ui/effects/AntiVisionBleed.tsx`
- `src/ui/effects/AntiVisionFragments.tsx`
- `src/ui/layout/StressContainer.tsx`（jitter上限変更）
- `src/ui/effects/SubliminalFlash.tsx`
- `src/ui/effects/EdgeVignette.tsx` (新規作成)
- `src/ui/effects/ScanlineOverlay.tsx` (新規作成)

**Phase 4 (代替恐怖演出):**
- `src/ui/effects/GlitchText.tsx`
- `src/ui/effects/DecayText.tsx` (新規作成)

---

## 2. Phase 1: IHワイプバグの修正

### 2.1 根本原因の詳細

現在の `setCurrentIH()` (行86-93) のコメントに「Don't trigger wipe callback from setCurrentIH」と明示されており、意図的にスキップされている。しかし `JudgmentEngine.recordResponse()` が TIMEOUT/SUMMONS_EXPIRED 処理でこのメソッドを使用するため、バグになっている。

**バグのある呼び出しパス:**

```
JudgmentEngine.recordResponse('TIMEOUT')
  → penalty = 25 (JUDGMENT_TIMEOUT_PENALTY)
  → newIH = Math.max(0, ihBefore - 25)  // 例: 20 - 25 = 0 → Math.max(0, -5) = 0
  → identityEngine.setCurrentIH(0)      ← ここでワイプスキップ
  → isWipeNeeded() → true               ← 検出はするが...
  → wipeTriggered = true                ← フラグは立つが
  → router.replace('/death') は呼ばれない  ← ナビゲーション先でwipeCallbacksが実行されていない
```

**正常な呼び出しパス (applyNotificationResponse):**

```
applyNotificationResponse('NO')
  → delta = IHCalculator.notificationDelta('NO')  // -15
  → newIH = IHCalculator.applyDelta(currentIH, delta)
  → this.currentIH = newIH
  → persistIH()
  → if (newIH === 0 && previousIH > 0) → triggerWipe()  ← 正しく呼ばれる
    → wipeCallbacks.forEach(cb => cb(event))
```

### 2.2 `IdentityEngine.setCurrentIH()` の修正

**ファイル:** `src/core/identity/IdentityEngine.ts`
**対象行:** 86-93

**変更前:**
```typescript
  public async setCurrentIH(value: number): Promise<void> {
    const _previousIH = this.currentIH; // Reserved for future auditing
    this.currentIH = IHCalculator.clamp(value);
    await this.persistIH();

    // Don't trigger wipe callback from setCurrentIH
    // Only trigger from applyNotificationResponse and applyQuestPenalty
  }
```

**変更後:**
```typescript
  // 二重発火防止フラグ（インスタンス変数として追加）
  private wipeInProgress: boolean = false;

  public async setCurrentIH(value: number): Promise<void> {
    const previousIH = this.currentIH;
    this.currentIH = IHCalculator.clamp(value);
    await this.persistIH();

    // ワイプ判定: 0到達かつ二重発火でない場合のみ発火
    if (this.currentIH === 0 && previousIH > 0 && !this.wipeInProgress) {
      this.wipeInProgress = true;
      this.triggerWipe();
    }
  }
```

**追加すべきインスタンス変数** (行24付近、既存の `private initialized` の直後に追加):

```typescript
  private wipeInProgress: boolean = false;
```

**変更のポイント:**
- `_previousIH` を `previousIH` にリネーム（実際に使用するため）
- `wipeInProgress` フラグで `triggerWipe()` の二重発火を防ぐ
- `triggerWipe()` はすでに `private` メソッドとして存在しているため新規実装不要

**注意:** `wipeInProgress` フラグは `resetInstance()` 呼び出し時に自動リセットされる（インスタンス破棄のため）。テスト後に再利用する場合は `resetInstance()` を呼ぶことで解決する。

#### 既存ワイプロジックの削除（二重発火防止）

`setCurrentIH()` がワイプ判定を一元管理するようになるため、`applyNotificationResponse` と `applyQuestPenalty` 内に存在する既存のワイプ発火ロジックを削除する。

**`applyNotificationResponse` 内の削除対象 (該当箇所):**
```typescript
// 削除対象: applyNotificationResponse 内のワイプ発火コード
// 変更前 (削除する行):
if (newIH === 0 && previousIH > 0) {
  this.triggerWipe();   // ← この呼び出しを削除
}
```

`applyNotificationResponse` は `setCurrentIH()` を経由せず直接 `this.currentIH` を更新している場合、その更新部分を `setCurrentIH()` 呼び出しに置き換えることで一元化する:

```typescript
// 変更後: setCurrentIH() に委譲してワイプ判定を一元化
await this.setCurrentIH(newIH);
// triggerWipe() の直接呼び出しは削除
```

**`applyQuestPenalty` 内の削除対象 (該当箇所):**
```typescript
// 削除対象: applyQuestPenalty 内のワイプ発火コード
// 変更前 (削除する行):
if (newIH === 0 && previousIH > 0) {
  this.triggerWipe();   // ← この呼び出しを削除
}
```

同様に `setCurrentIH()` に委譲する:
```typescript
// 変更後: setCurrentIH() に委譲
await this.setCurrentIH(newIH);
```

**重要:** `setCurrentIH()` 内に `wipeInProgress` フラグが存在するため、`applyNotificationResponse` や `applyQuestPenalty` が `setCurrentIH()` を呼んでも二重発火は防止される。

### 2.3 `JudgmentEngine.recordResponse()` の修正

**ファイル:** `src/core/judgment/JudgmentEngine.ts`
**対象行:** 117-135 (TIMEOUT/SUMMONS_EXPIRED の case ブロック)

Phase 2.2 の修正により `setCurrentIH()` が正しくワイプを発火するようになるため、`JudgmentEngine` 側で `isWipeNeeded()` を呼ぶ必要はなくなる。しかし `wipeTriggered` フィールドは `JudgmentResult` の一部として返されており、呼び出し側 (`app/judgment.tsx` line 134, line 160) がこれを使って `/death` への遷移を判断している。

**wipeTriggered フィールドの返し方を変更する:**

**変更前 (行179):**
```typescript
    // Check if wipe is needed
    const wipeTriggered = await this.identityEngine!.isWipeNeeded();
```

**変更後 (行179):**
```typescript
    // setCurrentIH() がワイプコールバックを発火するため、
    // wipeTriggered は IH=0 かどうかで判定する
    const wipeTriggered = ihResponse.newIH === 0;
```

**変更のポイント:**
- `isWipeNeeded()` は `currentIH === 0` を返すだけなので等価だが、`ihResponse.newIH` を直接使うことで非同期呼び出しを1回削減できる
- TIMEOUT/SUMMONS_EXPIRED の `setCurrentIH()` 経由でもワイプコールバックが発火するようになるため、`wipeTriggered = true` が返されれば呼び出し側の `router.replace('/death')` は引き続き機能する

### 2.4 `JudgmentEngine.applySummonsPenalty()` の修正

**ファイル:** `src/core/judgment/JudgmentEngine.ts`
**対象行:** 197-219

`applySummonsPenalty()` も `setCurrentIH()` を使用しているが、Phase 2.2 の修正で `setCurrentIH()` がワイプを発火するようになるため、追加の修正は**不要**。

ただし、`applySummonsPenalty()` はワイプが発火した場合に呼び出し側が適切にナビゲーションできるよう、戻り値を追加することを推奨する:

**変更前 (行197):**
```typescript
  public async applySummonsPenalty(scheduleId: number | null, scheduledAt: string): Promise<void> {
```

**変更後:**
```typescript
  public async applySummonsPenalty(
    scheduleId: number | null,
    scheduledAt: string
  ): Promise<{ wipeTriggered: boolean }> {
```

**関数末尾 (行212付近) に追加:**
```typescript
    await this.identityEngine!.setCurrentIH(newIH);

    console.log(
      `[JudgmentEngine] Summons penalty applied: scheduleId=${scheduleId}, IH ${ihBefore} → ${newIH} (-${penalty})`
    );

    return { wipeTriggered: newIH === 0 };
  }
```

**`_layout.tsx` 側の呼び出し箇所 (行180) も更新:**

```typescript
// 変更前
await engine.applySummonsPenalty(schedule.id, scheduledAt);

// 変更後
const penaltyResult = await engine.applySummonsPenalty(schedule.id, scheduledAt);
if (penaltyResult.wipeTriggered) {
  // ワイプ発火: death画面へ遷移はwipeCallbacksが行うが、
  // ここでは念のためログのみ（_layout.txは画面遷移のコンテキストが複雑）
  console.warn('[Layout] Summons penalty triggered wipe');
}
```

### 2.5 テスト計画

**テストファイル:** `src/core/judgment/JudgmentEngine.test.ts` (既存)
**追加テストファイル:** `src/core/identity/IdentityEngine.setCurrentIH.test.ts` (新規)

#### テストシナリオ 1: `setCurrentIH` でのワイプ発火

```typescript
// src/core/identity/IdentityEngine.setCurrentIH.test.ts
describe('IdentityEngine.setCurrentIH wipe trigger', () => {
  it('IH=0到達時にwipeCallbackが発火する', async () => {
    // Arrange
    const engine = await IdentityEngine.getInstance();
    await engine.setCurrentIH(5); // IH=5 にセット

    const wipeSpy = jest.fn();
    engine.onWipeTrigger(wipeSpy);

    // Act: IH=0 に設定
    await engine.setCurrentIH(0);

    // Assert
    expect(wipeSpy).toHaveBeenCalledTimes(1);
    expect(wipeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'IH_ZERO', finalIH: 0 })
    );
  });

  it('IH=0 → IH=0 への再設定では二重発火しない (wipeInProgressフラグ)', async () => {
    const engine = await IdentityEngine.getInstance();
    await engine.setCurrentIH(5);

    const wipeSpy = jest.fn();
    engine.onWipeTrigger(wipeSpy);

    await engine.setCurrentIH(0);
    await engine.setCurrentIH(0); // 2回目

    expect(wipeSpy).toHaveBeenCalledTimes(1); // 1回のみ
  });

  it('IH > 0 への設定ではwipeCallbackが発火しない', async () => {
    const engine = await IdentityEngine.getInstance();
    await engine.setCurrentIH(50);

    const wipeSpy = jest.fn();
    engine.onWipeTrigger(wipeSpy);

    await engine.setCurrentIH(30);

    expect(wipeSpy).not.toHaveBeenCalled();
  });
});
```

#### テストシナリオ 2: `recordResponse('TIMEOUT')` でのワイプ発火

```typescript
// src/core/judgment/JudgmentEngine.test.ts に追加
describe('JudgmentEngine.recordResponse TIMEOUT wipe', () => {
  it('IH=20でTIMEOUT(-25)応答するとwipeTriggered=trueが返る', async () => {
    // IH=20 にセット
    const identityEngine = await IdentityEngine.getInstance();
    await identityEngine.setCurrentIH(20);

    const engine = await JudgmentEngine.getInstance();
    const wipeSpy = jest.fn();
    identityEngine.onWipeTrigger(wipeSpy);

    const result = await engine.recordResponse(
      null, 'SURVIVAL', 'test.q1', null, 'TIMEOUT', null,
      new Date().toISOString()
    );

    expect(result.wipeTriggered).toBe(true);
    expect(result.ihAfter).toBe(0);
    expect(wipeSpy).toHaveBeenCalledTimes(1);
  });
});
```

---

## 3. Phase 2: StressContainerネスト解消

### 3.1 現状の問題

`StressContainer` が以下の3箇所にネストされている:

| ファイル | 行番号 | 役割 |
|---------|--------|------|
| `app/_layout.tsx` | 232 | アプリ全体ラッパー |
| `app/index.tsx` | 65 | ホーム画面 LensContent のみ |
| `app/judgment.tsx` | 171 | ジャッジメント画面全体 |

IH=20% 時の合成 NoiseOverlay opacity の計算:
- 1層: `noiseOpacity = (100-20)/100 = 0.80`
- 2層の合成: `1 - (1-0.80)^2 = 0.96`
- 3層の合成: `1 - (1-0.80)^3 = 0.992`

合成 opacity ≈ 0.99 で実質真っ黒になる。

### 3.2 `app/index.tsx` からの StressContainer 削除

**ファイル:** `app/index.tsx`

**変更前 (行7, 65-77):**
```typescript
import { StressContainer } from '../src/ui/layout/StressContainer';
// ...
      {/* Main Lens Content with Gesture Support and Stress Effects */}
      <StressContainer>
        <LensContent
          lens={lens}
          scale={scale}
          panResponder={panResponder}
          health={health}
          mission={mission}
          antiVision={antiVision}
          identity={identity}
          quests={quests}
          onQuestToggle={toggleQuest}
        />
      </StressContainer>
```

**変更後:**
```typescript
// import 行を削除
// ...
      {/* Main Lens Content with Gesture Support */}
      <LensContent
        lens={lens}
        scale={scale}
        panResponder={panResponder}
        health={health}
        mission={mission}
        antiVision={antiVision}
        identity={identity}
        quests={quests}
        onQuestToggle={toggleQuest}
      />
```

`StressContainer` の import 行 (行7) も削除する。

### 3.3 `app/judgment.tsx` からの StressContainer 削除

**ファイル:** `app/judgment.tsx`

**変更前 (行12, 171, 218-219):**
```typescript
import { StressContainer } from '../src/ui/layout/StressContainer';
// ...
    return (
        <StressContainer>
            <View style={styles.container}>
                {/* ... */}
            </View>
        </StressContainer>
    );
```

**変更後:**
```typescript
// import 行を削除
// ...
    return (
        <View style={styles.container}>
            {/* ... */}
        </View>
    );
```

`StressContainer` の import 行 (行12) も削除する。

ジャッジメント画面固有の恐怖演出（心拍pulse overlay, countdown timer）は `StressContainer` に依存していないため、そのまま残す。

### 3.4 StressContainer ポーリング最適化

**ファイル:** `src/ui/layout/StressContainer.tsx`

現在の2秒ポーリングは `health` 値が変わるたびに全エフェクトコンポーネントを再レンダリングする。`stressLevel` を5段階に離散化することで再レンダリング頻度を大幅に削減する。

**Critical: Stale Closure バグの防止**

`useEffect` 内の `setInterval` コールバックで `stressLevel` や `health` を直接参照すると、クロージャが初期値をキャプチャし続ける Stale Closure バグが発生する。これを防ぐため、`useRef` パターンを必須とする。

**変更前 (行12-13):**
```typescript
    const [health, setHealth] = useState(100);
    const [antiVision, setAntiVision] = useState('');
```

**変更後:**
```typescript
    const [health, setHealth] = useState(100);
    const [stressLevel, setStressLevel] = useState<0 | 1 | 2 | 3 | 4>(0);
    const [antiVision, setAntiVision] = useState('');

    // Stale Closure 防止: useRef で最新値を保持する（必須）
    const stressLevelRef = useRef<0 | 1 | 2 | 3 | 4>(0);
    const healthRef = useRef<number>(100);
```

**stressLevel 計算関数を追加 (useEffect の前に):**
```typescript
    // IHを5段階に離散化してre-render頻度を削減
    const getStressLevel = (h: number): 0 | 1 | 2 | 3 | 4 => {
      if (h > 80) return 0;  // calm: エフェクト最小
      if (h > 60) return 1;  // uneasy: 軽微
      if (h > 40) return 2;  // anxious: 中程度
      if (h > 20) return 3;  // critical: 強め
      return 4;              // terminal: 最大
    };
```

**useEffect 内のポーリング処理を変更 (行26-44):**

`setInterval` は Stale Closure を起こすため、再帰的 `setTimeout` パターンに変更する。これにより前の非同期処理が完了してから次のポーリングが発火することも保証される。

```typescript
    useEffect(() => {
      let isCancelled = false;

      const poll = async () => {
        if (isCancelled) return;

        const engine = await IdentityEngine.getInstance();
        const status = await engine.checkHealth();
        const newStressLevel = getStressLevel(status.health);

        // Ref を使って最新値を参照 (Stale Closure 回避)
        const prevStressLevel = stressLevelRef.current;
        const prevHealth = healthRef.current;

        // stressLevelが変化した場合のみ state を更新 (re-render抑制)
        if (newStressLevel !== prevStressLevel || status.health !== prevHealth) {
          stressLevelRef.current = newStressLevel;
          healthRef.current = status.health;
          setHealth(status.health);
          setStressLevel(newStressLevel);
        }

        // Anti-Vision content はstressLevel変化時のみ更新
        if (newStressLevel !== prevStressLevel) {
          const content = await engine.getAntiVision();
          if (!isCancelled) setAntiVision(content);
        }

        // Heartbeat Effect (Level 3以上)
        if (newStressLevel >= 3) {
          triggerHeartbeat();
        }

        // Jitter Effect (Level 2以上)
        if (newStressLevel >= 2) {
          triggerJitter(status.health);
        }

        // 再帰的 setTimeout: 前の処理が完了してから次を予約
        // setInterval(async, ...) は前の非同期が未完了でも次が発火するためNG
        if (!isCancelled) {
          setTimeout(poll, 2000);
        }
      };

      // 初回実行
      poll();

      return () => {
        isCancelled = true;
      };
    }, []); // 依存配列は空 (stressLevelRef/healthRef.current で最新値にアクセスするため)
```

**重要:** `stressLevel` や `health` の state 変数を `useEffect` の依存配列に入れたり、コールバック内で直接参照してはならない。常に `stressLevelRef.current` / `healthRef.current` を使うこと。

---

## 4. Phase 3: エフェクト強度の再設計

### 4.1 段階的パラメータ設計

全エフェクトを以下の5段階で統一制御する:

| ステージ | IH範囲 | 名称 | 体験 |
|---------|--------|------|------|
| 0 | 100-81% | calm | エフェクトなし |
| 1 | 80-61% | uneasy | 極めて微弱なノイズのみ |
| 2 | 60-41% | anxious | ノイズ＋ビネット、中央は視認可能 |
| 3 | 40-21% | critical | 走査線、フラグメント活性化 |
| 4 | 20-0% | terminal | 最大強度、しかし中央コンテンツは常に視認・操作可能 |

### 4.2 NoiseOverlay opacity 計算式変更

**ファイル:** `src/ui/effects/NoiseOverlay.tsx`

**問題:** 現在 `opacity = (100 - health) / 100` → IH=20% で opacity=0.80。全画面を覆う。

**変更方針:** 周辺ビネット化 + 上限0.35

**変更前 (行13-15):**
```typescript
export const NoiseOverlay = ({ opacity }: NoiseOverlayProps) => {
  if (opacity <= 0) return null;
```

**新しいprops定義と計算式 (コンポーネント全体を変更):**
```typescript
interface NoiseOverlayProps {
  health: number; // 直接healthを受け取る（opacityは内部計算）
}

export const NoiseOverlay = ({ health }: NoiseOverlayProps) => {
  // 上限0.35: 中央コンテンツを常に視認可能にする
  // IH=100: 0、IH=0: 0.35
  const opacity = Math.min(0.35, Math.max(0, (100 - health) / 100) * 0.35);

  if (opacity <= 0) return null;
```

**StressContainer 側の呼び出しも変更 (行81):**
```typescript
// 変更前
<NoiseOverlay opacity={noiseOpacity} />

// 変更後
<NoiseOverlay health={health} />
```

### 4.3 AntiVisionBleed の opacity 上限設定と表示エリア制限

**ファイル:** `src/ui/effects/AntiVisionBleed.tsx`

**問題:** 現在のopacity上限0.90で全画面に表示される。

**変更後の opacity 計算 (行27-38 の計算部分を変更):**
```typescript
  // opacity 上限を 0.25 に制限
  // IH 80%未満で段階的に増加、最大でも背景テクスチャ程度
  let opacity: number;
  if (health >= 50) {
    // IH 50-80%: opacity 0.03 - 0.10 (ほぼ不可視)
    opacity = 0.03 + ((80 - health) / 30) * 0.07;
  } else if (health >= 30) {
    // IH 30-50%: opacity 0.10 - 0.18
    opacity = 0.10 + ((50 - health) / 20) * 0.08;
  } else {
    // IH 0-30%: opacity 0.18 - 0.25 (最大)
    opacity = 0.18 + ((30 - health) / 30) * 0.07;
  }
```

**レイアウトを左右両端から圧迫する配置に変更 (StyleSheet 変更):**

左側40%のみで右側が常に安全地帯になるのは不自然であるため、左右両端・上下に分散配置する構造に変更する。コンポーネントは複数のテキスト断片を上下左右の端に分散して表示する。

```typescript
// AntiVisionBleed は単一のコンテナではなく、複数のポジション固定テキストを描画する
// 左上・右上・左下・右下の4隅に配置し、中央コンテンツを囲む形で圧迫感を演出

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 500,
  },
  // 左端: 上部・中部・下部に分散
  bleedLeft: {
    position: 'absolute',
    left: 0,
    top: '10%',
    maxWidth: '22%', // 左端22%のみ
    paddingLeft: 8,
  },
  bleedLeftMid: {
    position: 'absolute',
    left: 0,
    top: '50%',
    maxWidth: '22%',
    paddingLeft: 8,
  },
  // 右端: 上部・下部に分散
  bleedRight: {
    position: 'absolute',
    right: 0,
    top: '20%',
    maxWidth: '22%', // 右端22%のみ
    paddingRight: 8,
    alignItems: 'flex-end',
  },
  bleedRightBottom: {
    position: 'absolute',
    right: 0,
    bottom: '15%',
    maxWidth: '22%',
    paddingRight: 8,
    alignItems: 'flex-end',
  },
  bleedText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FF0000',
    textTransform: 'uppercase',
    letterSpacing: 1,
    lineHeight: 36,
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
  },
});
```

**JSX構造の変更:**
```typescript
return (
  <View style={styles.container} pointerEvents="none">
    {/* 左上 */}
    <View style={styles.bleedLeft}>
      <Text style={[styles.bleedText, { opacity }]}>{words[0]}</Text>
    </View>
    {/* 左中 */}
    <View style={styles.bleedLeftMid}>
      <Text style={[styles.bleedText, { opacity: opacity * 0.7 }]}>{words[1]}</Text>
    </View>
    {/* 右上 */}
    <View style={styles.bleedRight}>
      <Text style={[styles.bleedText, { opacity }]}>{words[2]}</Text>
    </View>
    {/* 右下 */}
    <View style={styles.bleedRightBottom}>
      <Text style={[styles.bleedText, { opacity: opacity * 0.8 }]}>{words[3]}</Text>
    </View>
  </View>
);
```

### 4.4 AntiVisionFragments の数量制限と中央エリア回避

**ファイル:** `src/ui/effects/AntiVisionFragments.tsx`

**問題:** フラグメント数 1-8個、全画面ランダム配置。

**変更後:**

```typescript
  // フラグメント数の上限を4に制限 (1-4個)
  const fragmentCount = Math.min(4, Math.floor((70 - health) / 15) + 1);

  // 中央エリア(30-70%範囲)を回避するためにx座標を端寄せ
  const randomX = () => {
    // 左端(5-25%) または 右端(75-95%)
    return Math.random() < 0.5
      ? 5 + Math.random() * 20
      : 75 + Math.random() * 20;
  };

  // y座標は全体に分散 (端部分を除く10-90%)
  const randomY = () => 10 + Math.random() * 80;
```

**変更箇所 (行42-53のループ内):**
```typescript
    for (let i = 0; i < fragmentCount; i++) {
      const randomWord = words[Math.floor(Math.random() * words.length)];
      newFragments.push({
        id: i,
        text: randomWord,
        x: randomX(),   // 変更: 中央回避
        y: randomY(),   // 変更: 関数化
        opacity: new Animated.Value(0),
        rotation: (Math.random() - 0.5) * 20, // -10 to +10度 (30→20に縮小)
      });
    }
```

**opacity 上限も制限 (行64):**
```typescript
// 変更前
toValue: 0.3 + (70 - health) / 100,

// 変更後 (最大0.50)
toValue: Math.min(0.50, 0.15 + (70 - health) / 100),
```

### 4.5 Jitter の上限を5pxに制限

**ファイル:** `src/ui/layout/StressContainer.tsx`

**変更前 (行55):**
```typescript
        const severity = (50 - currentHealth) / 2; // 0 to 25
```

**変更後:**
```typescript
        // Jitter上限を5pxに制限 (25px → 5px)
        // ボタン等の操作性を確保するため
        const severity = Math.min(5, (50 - currentHealth) / 10); // 0 to 5
```

### 4.6 SubliminalFlash の頻度調整

**ファイル:** `src/ui/effects/SubliminalFlash.tsx`

現在、フラッシュは全画面を黒背景で完全に覆い、50-100ms間表示される。ジャッジメント画面でTIMEOUT中に発火すると操作が妨害される。

**変更方針:** フラッシュ中にコンテンツを全消ししない。背景色を透明に変更し、テキストのみフラッシュさせる。

**変更前 (行104-105, styles.container):**
```typescript
  container: {
    // ...
    backgroundColor: theme.colors.background, // 全画面黒で消去
    zIndex: 1000,
  },
```

**変更後:**
```typescript
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent', // 下のコンテンツを消さない
    zIndex: 1000,
  },
```

### 4.7 新エフェクト: EdgeVignette

**ファイル:** `src/ui/effects/EdgeVignette.tsx` (新規作成)

周辺を暗くする「写真ビネット」エフェクト。中央コンテンツを常に可視化した状態で圧迫感を与える。

```typescript
/**
 * EdgeVignette - 周辺減光エフェクト
 * 画面の四隅を徐々に暗化させ、視界が狭まる圧迫感を演出
 * 中央コンテンツは常に視認可能
 */
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface EdgeVignetteProps {
  health: number;
}

export const EdgeVignette = ({ health }: EdgeVignetteProps) => {
  // IH 60%未満から出現、最大opacity=0.70
  if (health >= 60) return null;

  const intensity = Math.min(0.70, (60 - health) / 60 * 0.70);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* 上端グラデーション */}
      <LinearGradient
        colors={[`rgba(0,0,0,${intensity})`, 'transparent']}
        style={styles.top}
      />
      {/* 下端グラデーション */}
      <LinearGradient
        colors={['transparent', `rgba(0,0,0,${intensity})`]}
        style={styles.bottom}
      />
      {/* 左端グラデーション */}
      <LinearGradient
        colors={[`rgba(0,0,0,${intensity})`, 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.left}
      />
      {/* 右端グラデーション */}
      <LinearGradient
        colors={['transparent', `rgba(0,0,0,${intensity})`]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.right}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  top: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 120,
    zIndex: 450,
  },
  bottom: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 120,
    zIndex: 450,
  },
  left: {
    position: 'absolute',
    top: 0, bottom: 0, left: 0,
    width: 80,
    zIndex: 450,
  },
  right: {
    position: 'absolute',
    top: 0, bottom: 0, right: 0,
    width: 80,
    zIndex: 450,
  },
});
```

**StressContainer.tsx の JSX に追加 (行79-81付近):**
```typescript
import { EdgeVignette } from '../effects/EdgeVignette';
// ...
        <AntiVisionBleed antiVision={antiVision} health={health} />
        <AntiVisionFragments antiVision={antiVision} health={health} />
        <EdgeVignette health={health} />    {/* 新規追加 */}
        <NoiseOverlay health={health} />
```

**注意:** `expo-linear-gradient` がプロジェクトに含まれているか確認が必要。含まれていない場合は `npx expo install expo-linear-gradient` でインストールする。

### 4.8 新エフェクト: ScanlineOverlay

**ファイル:** `src/ui/effects/ScanlineOverlay.tsx` (新規作成)

CRT モニターの走査線を模したエフェクト。IH < 50% で出現し、CRT崩壊を暗示する。

**Critical: 200個の View は使用禁止**

200個の `<View>` を個別にレンダリングする実装は React Native で致命的なパフォーマンス負荷となるため採用しない。代わりに、1x4px の走査線パターン画像を `<Image resizeMode="repeat">` で全画面にタイリング表示する方式を採用する。

**走査線パターン画像の準備:**
- `assets/scanline.png` として 1x4px の PNG 画像を配置する
- 画像内容: 上3px は透明、下1px は半透明黒 (`rgba(0,0,0,0.5)`)
- この画像を repeat タイリングすることで全画面に走査線を描画する

```typescript
/**
 * ScanlineOverlay - CRT走査線エフェクト
 * IH<50%で出現する横線パターン。
 * 1x4px パターン画像を resizeMode="repeat" でタイリング描画。
 * 200個の View を並べる実装はパフォーマンス上 NG のため採用しない。
 */
import React from 'react';
import { Image, StyleSheet } from 'react-native';

interface ScanlineOverlayProps {
  health: number;
}

export const ScanlineOverlay = React.memo(
  ({ health }: ScanlineOverlayProps) => {
    // IH 50%未満で出現
    if (health >= 50) return null;

    // opacity 上限 0.12 (コンテンツを阻害しない)
    const opacity = Math.min(0.12, ((50 - health) / 50) * 0.12);

    return (
      <Image
        source={require('../../assets/scanline.png')}
        resizeMode="repeat"
        style={[StyleSheet.absoluteFill, { opacity, zIndex: 480 }]}
        pointerEvents="none"
        // アクセシビリティ: 装飾目的のため alt text 不要
        accessibilityElementsHidden={true}
        importantForAccessibility="no"
      />
    );
  },
  (prev, next) => {
    // health が同じ「段階」にある場合は再レンダリングしない
    const prevLevel =
      prev.health >= 50 ? 0 : Math.floor((50 - prev.health) / 10);
    const nextLevel =
      next.health >= 50 ? 0 : Math.floor((50 - next.health) / 10);
    return prevLevel === nextLevel;
  }
);
```

**注意:** `assets/scanline.png` が存在しない場合は、`expo-file-system` や画像編集ツールで 1x4px の PNG を生成して配置すること。Expo では `require()` でローカル画像を参照できる。

---

## 5. Phase 4: 代替恐怖演出

### 5.1 GlitchText severity の IH 連動強化

**ファイル:** `src/ui/effects/GlitchText.tsx`

現在 `severity` は呼び出し側が手動で設定している。IH が低いほど severity が高くなるよう `health` プロップを強化する。

**変更前 (行17):**
```typescript
export const GlitchText = ({ text, style, severity = 0, health = 100 }: GlitchTextProps) => {
```

**変更後:** `health` から `severity` を自動計算するオプションを追加:

```typescript
export const GlitchText = ({ text, style, severity: externalSeverity, health = 100 }: GlitchTextProps) => {
  // health から severity を自動計算 (外部指定がない場合)
  const severity = externalSeverity !== undefined
    ? externalSeverity
    : Math.max(0, (100 - health) / 100); // IH=0 で severity=1.0
```

**動的オフセット更新インターバルも health 連動に変更 (行49-54):**
```typescript
    // severity が高いほど更新頻度を上げる (50ms → 最速16ms)
    const updateInterval = Math.max(16, Math.floor(50 * (1 - severity)));
    const interval = setInterval(() => {
      setOffsets({
        r: (Math.random() - 0.5) * severity * 12,
        b: (Math.random() - 0.5) * severity * 10,
      });
    }, updateInterval);
```

### 5.2 タイポグラフィ崩壊: DecayText コンポーネント

**ファイル:** `src/ui/effects/DecayText.tsx` (新規作成)

テキストの一部の文字が定期的にランダム文字に置換され、データが腐敗しているような視覚効果を演出する。

```typescript
/**
 * DecayText - タイポグラフィ崩壊エフェクト
 * IH低下に応じてテキストの文字が崩壊・置換される
 *
 * Usage:
 * <DecayText text="IDENTITY HEALTH" health={health} />
 */
import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, Platform } from 'react-native';

interface DecayTextProps {
  text: string;
  health: number;
  stressLevel: 0 | 1 | 2 | 3 | 4; // タイマーリセットを stressLevel 変化に絞るために必要
  style?: any;
}

const GLITCH_CHARS = '!@#$%^&*[]{}|<>~`░▒▓█▄▀■□▪';

export const DecayText = ({ text, health, stressLevel, style }: DecayTextProps) => {
  const [displayText, setDisplayText] = useState(text);

  useEffect(() => {
    // IH 60%未満で崩壊開始
    if (health >= 60) {
      setDisplayText(text);
      return;
    }

    // 崩壊率: IH=60%で5%、IH=0%で40%の文字が置換される
    const decayRate = (60 - health) / 60 * 0.40;
    // 更新間隔: IH=60%で3000ms、IH=0%で300ms
    const interval = Math.max(300, 3000 - (60 - health) / 60 * 2700);

    const timer = setInterval(() => {
      const chars = text.split('');
      const corrupted = chars.map(char => {
        if (char === ' ') return char;
        if (Math.random() < decayRate) {
          return GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
        }
        return char;
      });
      setDisplayText(corrupted.join(''));
    }, interval);

    return () => clearInterval(timer);
  // 依存配列は health ではなく stressLevel を使う
  // health が毎秒変化してもタイマーがリセットされないよう、
  // 段階変化のみをトリガーにする
  }, [stressLevel, text]);

  return (
    <Text style={[styles.text, style]}>
      {displayText}
    </Text>
  );
};

const styles = StyleSheet.create({
  text: {
    fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace' }),
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
```

**使用箇所:** ホーム画面のIH表示テキスト、ジャッジメント画面のカウントダウン数字に適用を推奨。

### 5.3 心拍同期強化: DeathPulse

**ファイル:** `src/ui/layout/StressContainer.tsx` (既存の `triggerHeartbeat` を強化)

現在の `pulseHeartbeat()` は単発の触覚のみ。IHが極端に低い場合、画面の赤フラッシュを心拍と同期させる。

**StressContainer に赤フラッシュ Animated.Value を追加:**

```typescript
// useState に追加
const [heartbeatOpacity] = useState(new Animated.Value(0));

// triggerHeartbeat を強化
const triggerHeartbeat = async () => {
    await HapticEngine.pulseHeartbeat();

    // IH < 20% の場合は赤フラッシュも同期
    if (health < 20) {
      // 前のアニメーションが実行中の場合は停止してから開始する
      // stopAnimation() を呼ばないと Animated.sequence が競合してフラッシュが乱れる
      heartbeatOpacity.stopAnimation();

      Animated.sequence([
        Animated.timing(heartbeatOpacity, {
          toValue: 0.08,
          duration: 80,
          useNativeDriver: true,
        }),
        Animated.timing(heartbeatOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
};
```

**JSX に赤フラッシュオーバーレイを追加 (行76-83):**
```typescript
        <Animated.View style={[styles.wrapper, { transform: jitter.getTranslateTransform() }]} pointerEvents="box-none">
            {children}
        </Animated.View>
        {/* 心拍同期赤フラッシュ (IH<20%のみ) */}
        <Animated.View
          style={[StyleSheet.absoluteFill, { backgroundColor: '#FF0000', opacity: heartbeatOpacity, zIndex: 490 }]}
          pointerEvents="none"
        />
        <AntiVisionBleed antiVision={antiVision} health={health} />
```

---

## 6. テスト計画

### 6.1 Phase 1 テスト

| テストID | 対象 | 検証内容 | 期待結果 |
|---------|------|---------|---------|
| P1-01 | IdentityEngine.setCurrentIH | IH=5→0でワイプ発火 | wipeCallback呼ばれる |
| P1-02 | IdentityEngine.setCurrentIH | IH=0→0で二重発火なし | wipeCallback1回のみ |
| P1-03 | JudgmentEngine.recordResponse | TIMEOUT でIH=0到達 | wipeTriggered=true |
| P1-04 | JudgmentEngine.recordResponse | SUMMONS_EXPIRED でIH=0到達 | wipeTriggered=true |
| P1-05 | JudgmentEngine.applySummonsPenalty | IH=3でSummons(-5)→IH=0 | wipeTriggered=true |

### 6.2 Phase 2 テスト

| テストID | 対象 | 検証内容 | 期待結果 |
|---------|------|---------|---------|
| P2-01 | app/index.tsx レンダリング | StressContainer が1つのみ存在 | DOM に StressContainer は_layout.tsx の1つのみ |
| P2-02 | app/judgment.tsx レンダリング | StressContainer が1つのみ存在 | 同上 |
| P2-03 | StressContainer polling | stressLevel 変化時のみ setAntiVision 呼ばれる | health=55→45 でコール発生、55→58 ではコールなし |

### 6.3 Phase 3 視覚確認チェックリスト

各IH段階でシミュレーターで以下を確認する:

**IH = 100% (calm)**
- [ ] エフェクト一切なし
- [ ] ノイズ texture 非表示
- [ ] ジャッジメントボタンが正常タップ可能

**IH = 80% (uneasy)**
- [ ] NoiseOverlay opacity ≈ 0.07 (かすかな粒状感)
- [ ] AntiVisionBleed 非表示 (health >= 80)
- [ ] EdgeVignette 非表示 (health >= 60)

**IH = 60% (anxious)**
- [ ] NoiseOverlay opacity ≈ 0.14
- [ ] EdgeVignette 周辺のみ暗化、中央は明るい
- [ ] IH数値テキストが中央で明確に読める
- [ ] ジャッジメントYES/NOボタンが操作可能

**IH = 40% (critical)**
- [ ] ScanlineOverlay 微弱な走査線 (opacity ≈ 0.06)
- [ ] AntiVisionFragments: 端に1-2個のフラグメント
- [ ] AntiVisionBleed opacity ≈ 0.17 (端部分のみ)
- [ ] 中央の主要UIコンテンツが視認可能

**IH = 20% (terminal)**
- [ ] NoiseOverlay opacity ≈ 0.28 (ノイズ texture 明確)
- [ ] EdgeVignette intensity ≈ 0.47 (四隅が暗い)
- [ ] ScanlineOverlay opacity ≈ 0.10 (走査線が見える)
- [ ] Jitter 最大5px (操作は可能)
- [ ] ジャッジメントYES/NOボタンが操作可能 (最重要)
- [ ] 心拍赤フラッシュが同期

**IH = 5% (immediate death)**
- [ ] 上記全エフェクト最大強度
- [ ] DecayText が IH 数値を崩壊させている
- [ ] ジャッジメントボタンが操作可能 (触れたらすぐ反応)

---

## 7. リスクと注意事項

### 7.1 パフォーマンス影響

**ScanlineOverlay の 200 View 問題:**
- 200個の `View` コンポーネントは初回レンダリング時に重い
- `React.memo` + `health` 段階比較で再レンダリングを防ぐ
- 代替案: `expo-canvas` や `react-native-skia` で1回のパス描画を検討
- 最悪の場合: `ScanlineOverlay` は削除しても体験は成立する

**Animated API の useNativeDriver:**
- EdgeVignette の `LinearGradient` は `opacity` 変更が必要だが、`useNativeDriver: true` と `LinearGradient` の相性を確認すること
- 問題がある場合は `useNativeDriver: false` に変更し、JS スレッドで処理

**StressContainer のポーリング最適化:**
- `stressLevelRef` を使った比較で不要な `setAntiVision` 呼び出しを削減
- `getAntiVision()` は DB を読むため、2秒ごとの全実行はコストが高い

### 7.2 既存テストへの影響

**影響を受ける可能性のある既存テスト:**

| テストファイル | 影響内容 | 対応 |
|------------|---------|------|
| `src/core/identity/IdentityEngine.test.ts` | `setCurrentIH` がワイプを発火するようになる | wipeCallback が登録されていないテストは影響なし。登録しているテストはワイプ発火を想定した assertions に更新 |
| `src/core/judgment/JudgmentEngine.test.ts` | `isWipeNeeded()` → `ihResponse.newIH === 0` に変更 | wipeTriggered の計算方法変更のため、TIMEOUT テストを更新 |
| `src/ui/effects/NoiseOverlay.test.tsx` | `opacity` props → `health` props に変更 | 全テストのprops渡し方を更新 |
| `app/index.tsx` のスナップショットテスト | StressContainer が削除される | スナップショット更新 |
| `app/judgment.test.tsx` | StressContainer が削除される | スナップショット更新 |

### 7.3 expo-linear-gradient 依存関係

`EdgeVignette` コンポーネントで `expo-linear-gradient` を使用する。

インストール確認:
```bash
npx expo install expo-linear-gradient
```

すでにインストール済みの場合は不要。`package.json` で確認すること。

代替案として、4つの `View` に `expo-linear-gradient` の代わりに半透明の黒背景を重ねる方法もあるが、グラデーションの滑らかさが失われる。

### 7.4 ロールバック戦略

**Phase 1 (IHバグ修正):** コアロジック変更のため、リグレッションテストが全て通過することを確認してから merge する。ロールバックは git revert で対応可能。

**Phase 2 (StressContainer削除):** StressContainer の import 削除と JSX 変更のみ。ロールバックは各ファイルへの import/JSX 復元で即時対応可能。

**Phase 3-4 (エフェクト変更):** `FEATURES` フラグに新しいフラグを追加し、新エフェクトを feature flag で制御することでロールバックを容易にする推奨:

```typescript
// src/config/features.ts に追加
EDGE_VIGNETTE: true,       // Phase 3.7: EdgeVignette
SCANLINE_OVERLAY: true,    // Phase 3.8: ScanlineOverlay
DECAY_TEXT: true,          // Phase 4.2: DecayText崩壊
HEARTBEAT_FLASH: true,     // Phase 4.3: 心拍赤フラッシュ
```

各エフェクトコンポーネントの先頭に feature flag チェックを追加し、`false` に切り替えることで即時無効化できる。

---

## 8. 実装順序と依存関係

```
Phase 1 (IHバグ修正) ← 最優先、他に依存なし
  └→ Phase 2 (StressContainer ネスト解消) ← Phase 1 完了後に実施推奨
       └→ Phase 3 (エフェクト強度再設計) ← Phase 2 完了後
            └→ Phase 4 (代替恐怖演出) ← Phase 3 完了後
```

Phase 1 は単独でリリース可能。Phase 2-4 はセットで実施することを推奨（エフェクト変更を中途半端に行うと一時的に体験が悪化する可能性がある）。

---

## 9. 変更サマリー（コード行数の見積もり）

| Phase | 変更ファイル数 | 追加行数 | 削除行数 |
|-------|------------|--------|--------|
| Phase 1 | 2 | 約20行 | 約5行 |
| Phase 2 | 3 | 約30行 | 約20行 |
| Phase 3 | 9 (2新規) | 約200行 | 約50行 |
| Phase 4 | 3 (2新規) | 約120行 | 約10行 |
| **合計** | **17** | **約370行** | **約85行** |

---

## 10. レビュー反映履歴

**レビュー実施日:** 2026-02-26
**レビュアー:** Gemini 2.5 Pro Preview
**対応者:** Claude (Sonnet 4.6)

### Critical 指摘と対応

#### Critical 1: StressContainer の Stale Closure バグ

| 項目 | 内容 |
|------|------|
| **問題** | `useEffect` 内の `setInterval` コールバックで `stressLevel` や `health` を直接参照すると、クロージャが初期値をキャプチャし続ける Stale Closure バグが発生する |
| **対応箇所** | Phase 3.4 (StressContainer ポーリング最適化) |
| **修正内容** | `useRef` パターンを必須として明記。`stressLevelRef.current` と `healthRef.current` を使うコード例に全面改訂。さらに `setInterval(async, ...)` を廃止し、再帰的 `setTimeout` パターンに変更することで非同期処理の競合も同時解消 |
| **ステータス** | 対応完了 |

#### Critical 2: ScanlineOverlay の 200 View 問題

| 項目 | 内容 |
|------|------|
| **問題** | 200個の `<View>` は React Native で致命的なパフォーマンス負荷。初回レンダリングが重く、スクロールジャンク・フレームドロップを引き起こす |
| **対応箇所** | Phase 4.8 (ScanlineOverlay) |
| **修正内容** | 200個の View 実装を完全廃止。1x4px の走査線パターン PNG 画像 (`assets/scanline.png`) を `<Image resizeMode="repeat">` でタイリング表示する方式に全面書き直し。コンポーネント全体を新実装に差し替え |
| **ステータス** | 対応完了 |

#### Critical 3: ワイプ処理の二重発火リスク

| 項目 | 内容 |
|------|------|
| **問題** | `setCurrentIH()` にワイプ追加すると、`applyNotificationResponse` および `applyQuestPenalty` 内の既存ワイプロジックと二重発火する恐れがある |
| **対応箇所** | Phase 2.2 (setCurrentIH 修正) |
| **修正内容** | `applyNotificationResponse` と `applyQuestPenalty` 内の `triggerWipe()` 直接呼び出しを削除し、両メソッドの IH 更新処理を `setCurrentIH()` 経由に変更。これによりワイプ判定を `setCurrentIH()` に完全一元化。具体的な削除対象コードと置換後コードをセクションに追加 |
| **ステータス** | 対応完了 |

### Warning 指摘と対応

#### Warning 1: setInterval と非同期処理の競合

| 項目 | 内容 |
|------|------|
| **問題** | `setInterval(async () => {...}, 2000)` は前の非同期処理が完了前に次のインターバルが発火する恐れがある |
| **対応箇所** | Phase 3.4 (StressContainer ポーリング最適化) |
| **修正内容** | `setInterval` を廃止し、再帰的 `setTimeout` パターンに変更。非同期処理の完了を待ってから次のポーリングを予約するため競合が発生しない。`isCancelled` フラグでアンマウント時のクリーンアップも保証 |
| **ステータス** | 対応完了 |

#### Warning 2: AntiVisionBleed の不自然なレイアウト

| 項目 | 内容 |
|------|------|
| **問題** | 左側40%のみで右側が常に安全地帯は不自然。圧迫感の演出として片側のみでは不十分 |
| **対応箇所** | Phase 4.3 (AntiVisionBleed) |
| **修正内容** | `maxWidth: '40%'` の単一コンテナ配置を廃止。左上・左中・右上・右下の4箇所にポジション固定でテキスト断片を分散配置するスタイル設計に変更。中央コンテンツを囲む形で左右両端から圧迫感を演出 |
| **ステータス** | 対応完了 |

### Info 指摘と対応

#### Info 1: DecayText のタイマーリセット依存配列

| 項目 | 内容 |
|------|------|
| **問題** | `health` を依存配列に入れると数値が変化するたびにタイマーがリセットされ、アニメーションがぎこちなくなる |
| **対応箇所** | Phase 5.2 (DecayText) |
| **修正内容** | `useEffect` の依存配列を `[health, text]` から `[stressLevel, text]` に変更。`stressLevel` (0-4の離散値) は段階変化時のみ変わるため、タイマーリセット頻度が大幅に低下。`stressLevel` を props に追加し、`DecayTextProps` インターフェースも更新 |
| **ステータス** | 対応完了 |

#### Info 2: 心拍赤フラッシュのアニメーション競合

| 項目 | 内容 |
|------|------|
| **問題** | `triggerHeartbeat()` が連続呼び出しされた場合、前の `Animated.sequence` が実行中に次が開始されてアニメーションが競合・乱れる |
| **対応箇所** | Phase 5.3 (心拍同期強化: DeathPulse) |
| **修正内容** | `Animated.sequence` 開始前に `heartbeatOpacity.stopAnimation()` を追加。前のアニメーションを明示的に停止してから新しいシーケンスを開始することで競合を防止 |
| **ステータス** | 対応完了 |
