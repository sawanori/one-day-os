# 「審判のアラーム」物理フィードバック改善計画書 v1.1（改訂版）

**作成日:** 2026-01-29
**改訂日:** 2026-01-29
**対象機能:** 日中5つの通知に対する「NO/無視」時のTaptic Engine振動フィードバック
**ステータス:** ✅ Opusレビュー完了・修正版（実装準備完了）
**レビュアー:** Opus
**実装者:** Sonnet

---

## 改訂履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| v1.0 | 2026-01-29 | 初版作成 |
| v1.1 | 2026-01-29 | Opusレビュー指摘事項を反映（Critical Issues 3件、推奨事項4件を修正） |

---

## 1. 現状分析

### 1.1 現在の実装状況

**実装済み機能:**
- ✅ `HapticEngine.punishmentHeartbeat()` メソッド存在
- ✅ NOを選択した場合に振動トリガー実装済み
- ✅ タイムアウト（無視）時に振動トリガー実装済み

**実装コード（src/core/HapticEngine.ts:58-78）:**
```typescript
async punishmentHeartbeat() {
    if (Platform.OS === 'web') return;
    try {
        // First aggressive pulse
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        // Short pause
        await new Promise(resolve => setTimeout(resolve, 100));

        // Second aggressive pulse
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        // Another pause
        await new Promise(resolve => setTimeout(resolve, 200));

        // Third pulse (lighter but still present)
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {
        // Ignore haptic errors
    }
}
```

### 1.2 問題点

| # | 問題 | 現状 | 要件 |
|---|------|------|------|
| 1 | 振動の持続時間が短い | 3パルスのみ（約400ms） | より長く、不快な体験が必要 |
| 2 | 反復が不足 | 1回のみの実行 | 「ダブルタップの反復」が必要 |
| 3 | 最後が弱まる | Heavy → Heavy → Medium | 最大出力を維持すべき |
| 4 | 心拍音らしさが不足 | 均等な間隔 | 心臓の不整脈のようなリズムが必要 |
| 5 | 不快さが不十分 | 短く終わる | より長く、より不快に |

### 1.3 ユーザー要件との差異

**ユーザー要件:**
> Taptic Engineを最大出力で駆動させ、不快な心拍音のような振動（ダブルタップの反復）を発生させてください。

**現在の実装:**
- ❌ 最大出力ではない（MediumとHeavyの混合）
- ❌ ダブルタップの反復なし（1回のみ）
- ❌ 不快さが不十分（短すぎる）

---

## 2. 改善要件定義

### 2.1 機能要件

**FR-1: 振動パターン強化**
- Taptic Engineを最大出力（Heavy）で駆動
- ダブルタップ（2連続パルス）を複数回反復
- 合計持続時間: 約0.7-1.0秒（実測値に基づく）

**FR-2: 不快な心拍音の再現**
- 不整脈のようなリズムパターン
- 短い間隔（80ms）のダブルタップ
- やや長い間隔（250ms）で反復

**FR-3: トリガー条件**
- NO選択時: 即座に振動実行
- タイムアウト（無視）時: 即座に振動実行

### 2.2 非機能要件

**NFR-1: パフォーマンス**
- 振動実行による処理ブロッキングなし
- async/awaitで非同期処理

**NFR-2: デバイス互換性**
- iOS: Taptic Engine（iPhone 7以降）
- Android: 標準バイブレーションAPI（代替実装を検討）
- Web: 無効化（既存通り）

**NFR-3: エラーハンドリング**
- 振動APIエラー時も処理続行
- try-catchで安全に処理
- エラーログ出力（console.warn）

---

## 3. 改善提案

### 3.1 新しい振動パターン設計

**パターンA: 不整脈心拍（推奨）**
```
[Heavy] -80ms- [Heavy] -250ms- [Heavy] -80ms- [Heavy] -250ms- [Heavy] -80ms- [Heavy]
   ↑                              ↑                              ↑
ダブルタップ1                 ダブルタップ2                 ダブルタップ3
```

**特徴:**
- 6パルス（3回のダブルタップ）
- すべてHeavy（最大出力維持）
- 合計時間: 約740ms（80×3 + 250×2 = 740ms）+ API実行オーバーヘッド
- 実測予想: 800-1000ms
- 不快な不整脈リズム

**パターンB: 長時間不快（代替案）**
```
[Heavy] -100ms- [Heavy] -200ms- [Heavy] -100ms- [Heavy] -200ms- [Heavy] -100ms- [Heavy] -200ms- [Heavy] -100ms- [Heavy]
   ↑                                ↑                                ↑                                ↑
ダブルタップ1                   ダブルタップ2                   ダブルタップ3                   ダブルタップ4
```

**特徴:**
- 8パルス（4回のダブルタップ）
- すべてHeavy
- 合計時間: 約1.2秒
- より長く、より不快

### 3.2 推奨パターン

**パターンA（不整脈心拍）を推奨**

**理由:**
1. 適度な長さ（0.8-1.0秒）で不快さを維持
2. 3回の反復で「繰り返し」を実感
3. パフォーマンス影響が最小
4. 心拍音のリアルな再現

---

## 4. 実装計画

### 4.1 変更対象ファイル

| ファイル | 変更内容 | 影響範囲 |
|---------|---------|---------|
| `src/core/HapticEngine.ts` | `punishmentHeartbeat()` メソッド書き換え | 低（メソッド内部のみ） |
| `src/core/HapticEngine.test.ts` | テストケース追加（新規） | 新規 |
| `docs/CLAUDE.md` | 振動パターン仕様を追記 | ドキュメントのみ |

### 4.2 実装手順

#### Phase 1: HapticEngine改善

**Step 1.1: punishmentHeartbeat()メソッドの書き換え**

**定数の追加（ファイル冒頭）:**
```typescript
/**
 * Punishment haptic configuration
 */
const PUNISHMENT_REPEAT_COUNT = 3;          // Number of double-tap repetitions
const DOUBLE_TAP_INTERVAL_MS = 80;          // Interval between pulses in a double-tap
const BETWEEN_DOUBLE_TAP_INTERVAL_MS = 250; // Interval between double-taps
```

**メソッド実装:**
```typescript
/**
 * Aggressive punishment vibration for "NO" or ignored notifications
 * Creates an uncomfortable double-tap heartbeat pattern (repeated 3 times)
 *
 * Pattern: [Heavy]-80ms-[Heavy]-250ms-[Heavy]-80ms-[Heavy]-250ms-[Heavy]-80ms-[Heavy]
 * Total duration: ~740ms (pauses only) + API execution overhead (~100-200ms)
 * Expected real duration: 800-1000ms
 *
 * @platform iOS: Uses Taptic Engine (Heavy impact)
 * @platform Android: Uses Vibration API (may be weaker on some devices)
 * @platform Web: No-op (returns immediately)
 */
async punishmentHeartbeat() {
    if (Platform.OS === 'web') return;

    try {
        // Repeat double-tap pattern 3 times for maximum discomfort
        for (let i = 0; i < PUNISHMENT_REPEAT_COUNT; i++) {
            // First pulse of double-tap (Heavy)
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            // Very short pause (creates double-tap effect)
            await new Promise(resolve => setTimeout(resolve, DOUBLE_TAP_INTERVAL_MS));

            // Second pulse of double-tap (Heavy)
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

            // Longer pause before next double-tap (unless it's the last iteration)
            if (i < PUNISHMENT_REPEAT_COUNT - 1) {
                await new Promise(resolve => setTimeout(resolve, BETWEEN_DOUBLE_TAP_INTERVAL_MS));
            }
        }
    } catch (e) {
        // Ignore haptic errors - don't block execution
        // Log for debugging purposes
        console.warn('Punishment haptic failed:', e);
    }
}
```

**変更ポイント:**
- ✅ 定数を抽出（マジックナンバー削除）
- ✅ ループで3回反復
- ✅ すべてHeavy（最大出力）
- ✅ 80ms/250msのリズム（不整脈心拍）
- ✅ 最後の不要なpauseを削除（`i < PUNISHMENT_REPEAT_COUNT - 1`で条件分岐）
- ✅ エラーログ追加（console.warn）
- ✅ JSDoc詳細化（タイミング、プラットフォーム動作を明記）

**Step 1.2: 既存の呼び出し箇所確認**

以下の箇所で既に呼び出されているため、変更不要：
- `src/notifications/NotificationHandler.ts:145`（NO選択時）
- `src/notifications/NotificationHandler.ts:211`（タイムアウト時）

#### Phase 2: テスト実装

**Step 2.1: 単体テストファイル作成**

ファイル: `src/core/HapticEngine.test.ts`

```typescript
import { HapticEngine } from './HapticEngine';
import * as Haptics from 'expo-haptics';

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
    ImpactFeedbackStyle: {
        Heavy: 'heavy',
        Medium: 'medium',
        Light: 'light',
    },
    NotificationFeedbackType: {
        Error: 'error',
    },
    impactAsync: jest.fn().mockResolvedValue(undefined),
    notificationAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock react-native Platform
jest.mock('react-native', () => ({
    Platform: {
        OS: 'ios', // Default to iOS for most tests
    },
}));

describe('HapticEngine', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('punishmentHeartbeat', () => {
        it('should trigger 6 Heavy impacts (3 double-taps) on iOS', async () => {
            // Verify Platform.OS is 'ios' (from mock)
            const { Platform } = require('react-native');
            expect(Platform.OS).toBe('ios');

            await HapticEngine.punishmentHeartbeat();

            // Should call impactAsync 6 times (3 double-taps × 2)
            expect(Haptics.impactAsync).toHaveBeenCalledTimes(6);

            // All calls should use Heavy style
            for (let i = 0; i < 6; i++) {
                expect(Haptics.impactAsync).toHaveBeenNthCalledWith(
                    i + 1,
                    Haptics.ImpactFeedbackStyle.Heavy
                );
            }
        });

        it('should not trigger on web platform', async () => {
            // Mock Platform.OS as 'web' for this test
            jest.resetModules();
            jest.doMock('react-native', () => ({
                Platform: { OS: 'web' },
            }));

            // Re-import HapticEngine with new Platform mock
            const { HapticEngine: HapticEngineWeb } = require('./HapticEngine');

            await HapticEngineWeb.punishmentHeartbeat();

            expect(Haptics.impactAsync).not.toHaveBeenCalled();
        });

        it('should not throw error if haptic API fails', async () => {
            (Haptics.impactAsync as jest.Mock).mockRejectedValue(new Error('Haptic API error'));

            await expect(HapticEngine.punishmentHeartbeat()).resolves.not.toThrow();
        });

        it('should log warning when haptic API fails', async () => {
            const error = new Error('Haptic API error');
            (Haptics.impactAsync as jest.Mock).mockRejectedValue(error);

            await HapticEngine.punishmentHeartbeat();

            expect(console.warn).toHaveBeenCalledWith('Punishment haptic failed:', error);
        });

        it('should handle partial failure during loop', async () => {
            let callCount = 0;
            (Haptics.impactAsync as jest.Mock).mockImplementation(() => {
                callCount++;
                if (callCount === 3) {
                    return Promise.reject(new Error('API error mid-loop'));
                }
                return Promise.resolve();
            });

            await expect(HapticEngine.punishmentHeartbeat()).resolves.not.toThrow();

            // Should stop at the 3rd call where error occurred
            expect(Haptics.impactAsync).toHaveBeenCalledTimes(3);
            expect(console.warn).toHaveBeenCalled();
        });

        it('should complete within expected time range (700-1200ms)', async () => {
            const startTime = Date.now();
            await HapticEngine.punishmentHeartbeat();
            const duration = Date.now() - startTime;

            // Expected pauses: (80ms × 3) + (250ms × 2) = 740ms
            // With API execution overhead: 700-1200ms is reasonable range
            expect(duration).toBeGreaterThanOrEqual(700);
            expect(duration).toBeLessThan(1200);
        }, 10000); // Increase timeout for this timing test
    });

    describe('other haptic methods (regression tests)', () => {
        it('pulseHeartbeat should trigger Heavy then Light', async () => {
            await HapticEngine.pulseHeartbeat();

            expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Heavy);
            // Note: Light impact is delayed by setTimeout, may not be called in sync test
        });

        it('punishFailure should trigger error notification', async () => {
            await HapticEngine.punishFailure();

            expect(Haptics.notificationAsync).toHaveBeenCalledWith(
                Haptics.NotificationFeedbackType.Error
            );
        });

        it('snapLens should trigger Medium impact', async () => {
            await HapticEngine.snapLens();

            expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);
        });

        it('lightClick should trigger Light impact', async () => {
            await HapticEngine.lightClick();

            expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
        });
    });
});
```

**テストの改善ポイント（Opusレビュー反映）:**
- ✅ タイミング期待値を700-1200msに修正（正確な計算に基づく）
- ✅ Platform.OSのモックを適切なパターンに変更
- ✅ console.warnのモック追加
- ✅ 部分的失敗のテストケース追加
- ✅ 既存メソッドの回帰テスト追加

**Step 2.2: 統合テスト確認**

既存の`src/notifications/NotificationHandler.test.ts`で以下が検証されていることを確認：

```typescript
// 既存テストの確認項目
it('NO response should trigger punishmentHeartbeat', async () => {
    await handler.handleResponse('notif-123', 'NO');
    expect(HapticEngine.punishmentHeartbeat).toHaveBeenCalledTimes(1);
});

it('timeout should trigger punishmentHeartbeat', async () => {
    // タイムアウト処理をトリガー
    await handler.checkTimeoutsOnResume();
    expect(HapticEngine.punishmentHeartbeat).toHaveBeenCalled();
});
```

**アクション:** 既存テストを実行して上記が正しく動作することを確認（変更不要）

**Step 2.3: 手動テスト計画**

実機でのテスト項目：

| # | テスト項目 | 期待結果 | 検証方法 | 優先度 |
|---|----------|---------|---------|-------|
| T-1 | NO選択時の振動 | ダブルタップ×3が発生 | 通知受信時にNOをタップ | 高 |
| T-2 | タイムアウト時の振動 | ダブルタップ×3が発生 | 通知を5分間無視 | 高 |
| T-3 | 振動の不快さ | 強い不快感を感じる | 主観評価 | 高 |
| T-4 | 振動の持続時間 | 約0.8-1.0秒 | ストップウォッチで計測 | 中 |
| T-5 | 処理ブロッキング | UIがフリーズしない | 振動中にタップ操作 | 高 |
| T-6 | iOS実機（Taptic Engine） | 正常動作、強い振動 | iPhone 7以降でテスト | 高 |
| T-7 | Android実機 | 正常動作（やや弱い可能性） | Android実機テスト | 中 |
| T-8 | エラー時の挙動 | アプリがクラッシュしない | デバッグログ確認 | 中 |

#### Phase 3: ドキュメント更新

**Step 3.1: CLAUDE.md更新**

ファイル: `/Users/noritakasawada/AI_P/one-day-os/CLAUDE.md`

以下のセクションを追加（「### Core Engine: IdentityEngine」の後に挿入）：

```markdown
#### Haptic Feedback System

Location: `src/core/HapticEngine.ts`

**Punishment Heartbeat Pattern** (`punishmentHeartbeat()`):
- **Trigger Conditions:**
  - User responds NO to notification
  - User ignores notification (timeout after 5 minutes)
- **Pattern:** 3x double-tap repetitions at Heavy intensity
- **Timing:**
  ```
  [Heavy]-80ms-[Heavy]-250ms-[Heavy]-80ms-[Heavy]-250ms-[Heavy]-80ms-[Heavy]
     ↑                          ↑                          ↑
  Double-tap 1            Double-tap 2            Double-tap 3
  ```
- **Duration:** ~740ms (pauses) + overhead = 800-1000ms total
- **Platforms:**
  - iOS: Taptic Engine (strong vibration)
  - Android: Vibration API (may be weaker on some devices)
  - Web: No-op (returns immediately)
- **Error Handling:** Catches all haptic API errors, logs warning, continues execution

**Other Haptic Methods:**
- `pulseHeartbeat()`: Identity Lens heartbeat (1.0x zoom only)
- `punishFailure()`: Error notification feedback
- `snapLens()`: Lens switching feedback
- `lightClick()`: Standard button tap feedback
```

---

## 5. Android対応強化計画（Phase 4 - オプション）

### 5.1 Android振動の問題

**現状認識:**
- `Haptics.impactAsync(Heavy)`はAndroidでは標準Vibration APIにフォールバック
- デバイスメーカーによって振動強度が大きく異なる
- 低価格端末では非常に弱い可能性

### 5.2 代替実装案

**ファイル:** `src/core/HapticEngine.ts`

```typescript
async punishmentHeartbeat() {
    if (Platform.OS === 'web') return;

    try {
        // Android: Use custom Vibration pattern for more control
        if (Platform.OS === 'android') {
            const { Vibration } = require('react-native');
            // Pattern: [delay, vibrate, delay, vibrate, ...]
            // More aggressive pattern with longer vibrations
            const pattern = [
                0,   // Start immediately
                100, // First pulse
                80,  // Short pause
                100, // Second pulse
                250, // Medium pause
                100, // Third pulse
                80,  // Short pause
                100, // Fourth pulse
                250, // Medium pause
                100, // Fifth pulse
                80,  // Short pause
                100, // Sixth pulse
            ];
            Vibration.vibrate(pattern);
            return;
        }

        // iOS: Original Taptic Engine implementation
        for (let i = 0; i < PUNISHMENT_REPEAT_COUNT; i++) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await new Promise(resolve => setTimeout(resolve, DOUBLE_TAP_INTERVAL_MS));
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            if (i < PUNISHMENT_REPEAT_COUNT - 1) {
                await new Promise(resolve => setTimeout(resolve, BETWEEN_DOUBLE_TAP_INTERVAL_MS));
            }
        }
    } catch (e) {
        console.warn('Punishment haptic failed:', e);
    }
}
```

### 5.3 実装判断

**実装タイミング:**
- Phase 1-3完了後、Android実機テスト（T-7）の結果に基づいて判断
- 振動が明らかに弱い場合のみPhase 4を実行

**判断基準:**
- ✅ Phase 4実装: Android実機で振動がほとんど感じられない
- ❌ Phase 4スキップ: Android実機で十分な振動が感じられる

---

## 6. タイムライン

| フェーズ | タスク | 担当 | 所要時間 |
|---------|--------|------|---------|
| Phase 1 | HapticEngine.ts実装 | Sonnet | 15分 |
| Phase 2.1 | 単体テスト実装 | Sonnet | 25分 |
| Phase 2.2 | 統合テスト確認 | Sonnet | 5分 |
| Phase 2.3 | 実機テスト実行 | ユーザー | 30分 |
| Phase 3 | CLAUDE.md更新 | Sonnet | 10分 |
| Phase 4 | Android対応（条件付き） | Sonnet | 20分 |

**合計（Phase 4除く）:** 約1.5時間
**合計（Phase 4含む）:** 約2時間

---

## 7. リスクと対策

### 7.1 技術リスク

| リスク | 影響度 | 確率 | 対策 | ステータス |
|--------|--------|------|------|----------|
| 振動が強すぎる | 中 | 低 | パターンAで実装、実機テストで確認 | 対応済み |
| デバイス非対応 | 低 | 低 | try-catchで安全に処理済み | 対応済み |
| パフォーマンス影響 | 低 | 極低 | 非同期処理で影響最小化 | 対応済み |
| Androidでの振動が弱い | 中 | 中 | **Phase 4でVibration API代替実装を用意** | 🆕 対策追加 |
| テストのタイミング不安定 | 低 | 中 | 期待値範囲を広めに設定（700-1200ms） | 🆕 対応済み |
| Platform.OSモックの失敗 | 低 | 低 | jest.doMockで適切にモック化 | 🆕 対応済み |

### 7.2 UXリスク

| リスク | 影響度 | 確率 | 対策 | ステータス |
|--------|--------|------|------|----------|
| ユーザーが不快すぎると感じる | 高 | 中 | **これは意図した設計**。ただし、反復回数を定数化し将来調整可能 | 対応済み |
| バッテリー消費増加 | 低 | 低 | 1日5回×0.8秒のみなので影響微小 | 問題なし |
| アクセシビリティ問題 | 中 | 低 | 振動無効化設定を将来実装する余地を残す（定数化により対応可能） | 対応済み |

---

## 8. 実装後の検証項目

### 8.1 機能検証

- [ ] NO選択時にダブルタップ×3が発生する
- [ ] タイムアウト時にダブルタップ×3が発生する
- [ ] すべてのパルスがHeavy強度である
- [ ] 振動持続時間が約0.8-1.0秒である
- [ ] Web版で振動が発生しない

### 8.2 品質検証

- [ ] 単体テストがすべて通過する（7ケース）
- [ ] 統合テストがすべて通過する（既存NotificationHandler tests）
- [ ] エラー発生時もアプリがクラッシュしない
- [ ] エラー時にconsole.warnが出力される
- [ ] UIがブロッキングされない
- [ ] iOS実機で正常動作する
- [ ] Android実機で正常動作する（やや弱い可能性は許容）

### 8.3 UX検証

- [ ] ユーザーが「不快」と感じる（意図した体験）
- [ ] 心拍音のような不整脈リズムを感じる
- [ ] 「罰」としての効果を実感できる
- [ ] 振動が長すぎて煩わしいとは感じない（1秒以内）

---

## 9. ロールバック戦略

### 9.1 ロールバック条件

以下の場合にロールバックを検討：
- 実機テストで重大な不具合が発見された
- 振動が強すぎてアプリ使用に支障が出る
- iOS/Androidで予期しないクラッシュが発生
- パフォーマンス問題が確認された

### 9.2 ロールバック手順

**Step 1: Git Revert実行**
```bash
cd /Users/noritakasawada/AI_P/one-day-os
git log --oneline -5  # コミットハッシュを確認
git revert <commit-hash>  # 該当コミットをrevert
```

**Step 2: 影響範囲の確認**
- データベース変更: なし（データへの影響なし）
- ユーザーデータ: なし（振動パターンのみの変更）
- 既存機能: なし（punishmentHeartbeat内部のみ変更）

**Step 3: テスト実行**
```bash
npm test -- src/core/HapticEngine.test.ts  # テスト削除またはスキップ
npm test  # 全テスト実行
```

**Step 4: 実機確認**
- iOS/Androidで旧パターンに戻っていることを確認

### 9.3 ロールバック後の対応

- 問題を分析し、改善案を再検討
- 必要に応じてパターンBや反復回数調整を検討
- ドキュメントに問題点を記録

---

## 10. 代替案・将来の拡張

### 10.1 代替案

**案1: より長いパターン（4回反復）**
- より不快さを増強したい場合
- `PUNISHMENT_REPEAT_COUNT = 4`に変更

**案2: カスタマイズ可能な反復回数**
```typescript
async punishmentHeartbeat(repeatCount: number = PUNISHMENT_REPEAT_COUNT) {
    for (let i = 0; i < repeatCount; i++) {
        // ...
    }
}
```

### 10.2 将来の拡張

**拡張1: IH値に応じた強度変更**
```typescript
async punishmentHeartbeat() {
    const ih = await IdentityEngine.getCurrentIH();
    const repeatCount = ih < 20 ? 4 : ih < 50 ? 3 : 2;
    // ...
}
```

**拡張2: 設定画面での振動無効化**
- アクセシビリティ対応
- ユーザー設定で振動ON/OFF
- AsyncStorageで設定保存

**拡張3: キャンセル機構**
- 振動中にユーザーアクションで中断可能
- AbortControllerパターンで実装

---

## 11. 承認とレビューフロー

### 11.1 レビュー履歴

| レビュアー | 日付 | 結果 | 指摘事項 |
|-----------|------|------|---------|
| Opus | 2026-01-29 | 承認（修正条件付き） | Critical 3件、推奨4件 |

### 11.2 修正対応状況

**Critical Issues（必須修正）:**
- ✅ Issue 1.1: テストタイミング計算修正（1500-2000ms → 700-1200ms）
- ✅ Issue 1.2: Platform.OSモックパターン修正（jest.doMockを使用）
- ✅ Issue 1.3: console.warnモック追加

**推奨修正:**
- ✅ Issue 2.1: Android振動対策追加（Phase 4として実装）
- ✅ Issue 3.1: 部分的失敗テスト追加
- ✅ Issue 3.3: 統合テスト確認を明示（Step 2.2）
- ✅ Issue 4.1: CLAUDE.md更新内容を具体化
- ✅ Issue 4.2: ロールバック戦略追加（セクション9）

**オプション（将来対応）:**
- ⏸️ Issue 2.2: キャンセル機構（拡張3として記載）
- ⏸️ Issue 3.2: Fake Timers（現時点では不要と判断）
- ✅ Issue 5.3: マジックナンバー削除（定数化完了）

### 11.3 最終承認

**ステータス:** ✅ **実装準備完了**

すべてのCritical Issuesと推奨修正事項が対応されました。Sonnetによる実装を開始できます。

---

## 12. 参考資料

### 12.1 関連ファイル

- `src/core/HapticEngine.ts` - 実装対象ファイル
- `src/core/HapticEngine.test.ts` - 新規作成テストファイル
- `src/notifications/NotificationHandler.ts` - 呼び出し元（変更不要）
- `src/notifications/NotificationHandler.test.ts` - 統合テスト確認
- `src/constants/index.ts` - ペナルティ定数
- `docs/CLAUDE.md` - プロジェクト仕様書（更新対象）

### 12.2 外部リンク

- [Expo Haptics API](https://docs.expo.dev/versions/latest/sdk/haptics/)
- [iOS Haptic Feedback Guidelines](https://developer.apple.com/design/human-interface-guidelines/haptics)
- [React Native Vibration API](https://reactnative.dev/docs/vibration)
- [Jest Mocking Documentation](https://jestjs.io/docs/mock-functions)

---

**計画書作成日:** 2026-01-29
**最終更新日:** 2026-01-29 (v1.1)
**レビュー承認日:** 2026-01-29
**次のアクション:** Sonnetによる実装開始
