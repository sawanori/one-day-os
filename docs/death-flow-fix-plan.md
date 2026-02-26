# Death Flow Fix Plan

**作成日:** 2026-02-26
**対象:** ゲームオーバー → インシュアランス フローの修正
**優先度:** BL1（Critical）、BL2（Medium）のみ対応

---

## 概要

IH が 0 になった際にユーザーを `/death` 画面へ誘導し、ワイプ完了後に `app_state` を正しく更新するための修正計画。

---

## 現状の問題

### BL1（Critical）: `useHealthMonitor` が `isDead` を無視する

**ファイル:** `src/ui/screens/home/useHealthMonitor.ts`

```typescript
// 現状（壊れている）
const checkHealth = async () => {
  const engine = await IdentityEngine.getInstance();
  const status = await engine.checkHealth();
  setHealth(status.health); // isDead を完全に無視している
};
```

`engine.checkHealth()` は `{ health: number; isDead: boolean }` を返すが、`health` だけを読んで `isDead` を捨てている。
IH が 0 になっても画面はホームのまま。ユーザーは "0%" という数値を見ているが何も起きない。

**内部動作の確認:**
`IdentityLifecycle.checkHealth()` を読むと:

```typescript
// src/core/identity/IdentityLifecycle.ts (line 30-53)
async checkHealth(): Promise<{ health: number; isDead: boolean }> {
  const identityResult = ...
  const stateResult = ...

  const isDead = stateResult?.state === 'despair';

  if (identityResult.identity_health <= 0 && !isDead) {
    await this.killUser(); // app_state を 'despair' にセット
    return { health: 0, isDead: true };
  }

  return { health: identityResult.identity_health, isDead };
}
```

`killUser()` は `app_state.state = 'despair'` をセットする。つまり `isDead: true` が返ってきた段階で DB は既に despair 状態になっている。
あとは画面遷移だけが抜けている。

---

### BL2（Medium）: `WipeManager.executeWipe()` が `app_state` を更新しない

**ファイル:** `src/core/identity/WipeManager.ts`

```typescript
// 現状（壊れている） - executeWipe() の一部
await this.db.execAsync(`
  DELETE FROM identity;
  DELETE FROM quests;
  DELETE FROM notifications;
  DELETE FROM daily_state;
  DELETE FROM identity_backup;
`);

// insurance state のリセットはしているが...
await this.db.runAsync(
  'UPDATE app_state SET has_used_insurance = 0, life_number = life_number + 1 WHERE id = 1'
);
// ↑ app_state.state は 'active' のまま！ 'despair' にセットしていない
```

`death.tsx` の `executeFinalWipe()` は `WipeManager.executeWipe()` を呼ぶが、完了後に `app_state.state` は `'active'` のまま残る。
その後 `/onboarding` へ遷移するが、次回アプリ起動時に `useHomeData` が `identityData` を見つけられず `/onboarding` へリダイレクトするため、偶然動いているように見える。しかし正式な状態管理として壊れている。

**`_layout.tsx` の確認:**
`_layout.tsx` は `app_state` を直接読んでルーティングしていない（Stack ナビゲーションに依存しており、`useHomeData` → `/onboarding` リダイレクトに頼っている）。したがって `app_state = 'despair'` のセットは `useHomeData` の既存ロジックを壊さないが、将来的な正確性のために必要。

---

## 修正方針

### Fix 1: `useHealthMonitor` に死亡検知 + ナビゲーション追加

**対象ファイル:** `src/ui/screens/home/useHealthMonitor.ts`

**変更点:**
1. `useRouter` を import
2. 二重遷移防止用の `ref` を追加
3. `isDead: true` 時に `router.replace('/death')` を呼ぶ

**修正後コード:**

```typescript
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';
import { IdentityEngine } from '../../../core/identity/IdentityEngine';
import { HapticEngine } from '../../../core/HapticEngine';

type LensValue = 0.5 | 1.0 | 2.0;

/**
 * useHealthMonitor
 * Polls Identity Health every 2 seconds and provides heartbeat haptics
 * when the Identity lens (1.0x) is active.
 *
 * When isDead=true, navigates to /death to start the death sequence.
 */
export const useHealthMonitor = (lens: LensValue) => {
  const router = useRouter();
  const [health, setHealth] = useState(100);
  const isNavigatingRef = useRef(false); // 二重遷移防止

  // Check health periodically (centralized)
  useEffect(() => {
    const checkHealth = async () => {
      // すでに死亡画面へ遷移中なら処理しない
      if (isNavigatingRef.current) return;

      const engine = await IdentityEngine.getInstance();
      const status = await engine.checkHealth();
      setHealth(status.health);

      // BL1 Fix: isDead=true の場合、/death へ遷移
      if (status.isDead && !isNavigatingRef.current) {
        isNavigatingRef.current = true;
        router.replace('/death');
      }
    };
    checkHealth();

    const interval = setInterval(checkHealth, 2000);
    return () => clearInterval(interval);
  }, [router]);

  // Identity Lens Heartbeat Haptics (1.0x only)
  useEffect(() => {
    if (lens !== 1.0) return;

    // Start heartbeat loop
    const heartbeatInterval = setInterval(() => {
      HapticEngine.pulseHeartbeat();
    }, 1000); // Every 1 second

    return () => clearInterval(heartbeatInterval);
  }, [lens]);

  return { health, setHealth };
};
```

**重要な設計判断:**
- `useRouter` は hooks のルールに従い、コンポーネントレベルで呼ぶ。`useHealthMonitor` は hook なので問題なし。
- `isNavigatingRef.current = true` で 2 秒ごとのポーリングが重複遷移しないようにガード。
- `router.replace('/death')` を使う（`push` ではなく `replace`）。ホームに戻れないようにするため。

---

### Fix 2: `WipeManager.executeWipe()` に `app_state = 'despair'` セットを追加

**対象ファイル:** `src/core/identity/WipeManager.ts`

**変更点:**
`executeWipe()` 内で `app_state.state = 'despair'` をセットする SQL を追加。
`app_state` の `has_used_insurance` と `life_number` を更新する既存の `runAsync` と統合する。

**修正後コード（executeWipe の該当箇所）:**

```typescript
// 修正前（WipeManager.ts line 89-91）
await this.db.runAsync(
  'UPDATE app_state SET has_used_insurance = 0, life_number = life_number + 1 WHERE id = 1'
);

// 修正後
await this.db.runAsync(
  'UPDATE app_state SET state = ?, has_used_insurance = 0, life_number = life_number + 1, updated_at = datetime(\'now\') WHERE id = 1',
  ['despair']
);
```

**補足:**
`death.tsx` の `executeFinalWipe()` を見ると、ワイプ後に `/onboarding` へ遷移する。このとき `app_state` が `'despair'` になっていれば、オンボーディング完了後に `OnboardingManager.initialize()` が `updateAppState('active')` を呼ぶ想定になっている（`src/core/onboarding/OnboardingManager.ts` が責務を持つ）。

---

## 実装の順序

1. **Fix 2 を先に実装**（`WipeManager.ts`）
   - 単純な SQL 変更。テストが通りやすい。
   - Fix 1 とは独立しているため先に完了できる。

2. **Fix 1 を実装**（`useHealthMonitor.ts`）
   - `router.replace('/death')` の追加。
   - 依存関係なし、単独でテスト可能。

---

## テスト方針

### Fix 1 のテスト（`useHealthMonitor.test.ts`）

既存テストに以下のケースを追加:

```typescript
it('isDead=true のとき /death へ遷移する', async () => {
  const mockReplace = jest.fn();
  jest.mocked(useRouter).mockReturnValue({ replace: mockReplace } as any);

  const mockEngine = {
    checkHealth: jest.fn().mockResolvedValue({ health: 0, isDead: true }),
  };
  jest.mocked(IdentityEngine.getInstance).mockResolvedValue(mockEngine as any);

  renderHook(() => useHealthMonitor(1.0));

  await waitFor(() => {
    expect(mockReplace).toHaveBeenCalledWith('/death');
  });
});

it('isDead=true でも二重遷移しない', async () => {
  const mockReplace = jest.fn();
  jest.mocked(useRouter).mockReturnValue({ replace: mockReplace } as any);

  const mockEngine = {
    checkHealth: jest.fn().mockResolvedValue({ health: 0, isDead: true }),
  };
  jest.mocked(IdentityEngine.getInstance).mockResolvedValue(mockEngine as any);

  jest.useFakeTimers();
  renderHook(() => useHealthMonitor(1.0));

  // 2秒後のポーリングを複数回トリガー
  jest.advanceTimersByTime(6000);
  await waitFor(() => {
    expect(mockReplace).toHaveBeenCalledTimes(1); // 1回だけ
  });

  jest.useRealTimers();
});
```

### Fix 2 のテスト（`WipeManager.test.ts`）

既存テストに以下のアサーションを追加:

```typescript
it('executeWipe 後に app_state.state が despair になる', async () => {
  await wipeManager.executeWipe('IH_ZERO', 0);

  expect(mockDb.runAsync).toHaveBeenCalledWith(
    expect.stringContaining('state = ?'),
    expect.arrayContaining(['despair'])
  );
});
```

---

## 対応しない問題（意思決定）

| 問題 | 判断 | 理由 |
|------|------|------|
| BL3: DespairScreen にルートなし | 対応不要 | `death.tsx` → `/onboarding` が正しいフロー。DespairScreen は未使用のデッドコードとして放置。 |
| BL4: DespairModeManager 未使用 | 対応不要 | `death.tsx` が権威ある wipe ハンドラー。DespairModeManager はレガシー。 |
| BL5: IdentityEngine.wipeCallbacks 未登録 | 対応不要 | `judgment.tsx` が `wipeTriggered` 戻り値を直接確認している。コールバックシステムは未使用だが無害。 |

---

## フロー全体図（修正後）

```
[IH が 0 になる]
      ↓
[IdentityLifecycle.checkHealth()]
  → killUser() を呼ぶ (app_state = 'despair')
  → { health: 0, isDead: true } を返す
      ↓
[useHealthMonitor がポーリングで検知]
  → isNavigatingRef.current = true (二重遷移ガード)
  → router.replace('/death')
      ↓
[death.tsx: runDeathSequence()]
  BACKUP → SENTENCING → WIPING_VISUAL
      ↓
  [保険対象なら]            [対象外なら]
  INSURANCE_OFFER          executeFinalWipe()
  ↓購入成功  ↓拒否/タイムアウト
  REVIVAL    executeFinalWipe()
  → /home
      ↓
[executeFinalWipe()]
  → WipeManager.executeWipe('IH_ZERO', 0)
    → identity/quests/notifications/daily_state/identity_backup を DELETE
    → app_state: state='despair', has_used_insurance=0, life_number++ ← Fix 2
  → FINAL_WIPE → VOID
  → router.replace('/onboarding')
      ↓
[オンボーディング完了]
  → OnboardingManager が app_state = 'active' にセット
```

---

## リスクと注意点

### リスク 1: `IdentityLifecycle.killUser()` の二重呼び出し

`useHealthMonitor` が 2 秒ごとにポーリングし、各ポーリングで `checkHealth()` を呼ぶ。`checkHealth()` 内で `identity_health <= 0 && !isDead` のとき `killUser()` を呼ぶ。

`isNavigatingRef` で `/death` への二重遷移はブロックできるが、遷移前の短い間に `killUser()` が複数回呼ばれる可能性がある。
`killUser()` は冪等（DELETE は既に空のテーブルに対して safe）なので致命的ではないが、注意が必要。

**対策:** `isNavigatingRef.current = true` の直後に `clearInterval` を呼ぶことでポーリングを止めることも検討できるが、`useEffect` のクリーンアップに任せる方が React 的に正しい。

### リスク 2: `death.tsx` と `IdentityLifecycle.killUser()` の二重ワイプ

`IdentityLifecycle.checkHealth()` → `killUser()` が `identity` テーブルを DELETE する。
その後 `death.tsx` の `WipeManager.executeWipe()` が再度 `identity` を DELETE する。

二重 DELETE は SQL 的に問題ないが、ログ (`wipe_log`) が二重記録されない点を確認すること。
`WipeManager.executeWipe()` のみが `wipe_log` に INSERT するため、二重記録はない。

### リスク 3: Judgment 経由の死亡パス

`app/judgment.tsx` が `wipeTriggered` を返す場合、`judgment.tsx` 側が `/death` へ遷移するロジックを持っているか確認が必要。BL1 の Fix は `useHealthMonitor`（ホーム画面のポーリング）のみに適用されるため、Judgment 経由のパスは別途確認すること。

---

## 実装チェックリスト

- [ ] `src/ui/screens/home/useHealthMonitor.ts` に `useRouter` import 追加
- [ ] `useHealthMonitor.ts` に `isNavigatingRef` 追加
- [ ] `useHealthMonitor.ts` の `checkHealth` 内に `isDead` チェックと `router.replace('/death')` 追加
- [ ] `src/core/identity/WipeManager.ts` の `executeWipe` 内の SQL を修正（`state = 'despair'` 追加）
- [ ] `useHealthMonitor.test.ts` に死亡検知テスト追加
- [ ] `WipeManager.test.ts` に `app_state` 更新テスト追加
- [ ] `npm test -- src/ui/screens/home/useHealthMonitor.test.ts` で通過確認
- [ ] `npm test -- src/core/identity/WipeManager.test.ts` で通過確認
