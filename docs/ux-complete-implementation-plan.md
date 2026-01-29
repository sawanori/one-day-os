# One Day OS - UX完全実装計画書 v1.0

**作成日:** 2026-01-29
**対象:** UX_IMPLEMENTATION_PLAN.mdの全要素
**目標:** 全UX機能の完全実装と既存コードの改善

---

## 実装状況サマリー

### ✅ 既存実装（改善必要）
- GlitchText（静的オフセット → 動的に変更）
- NoiseOverlay（黒背景 → 実際のノイズテクスチャ）
- StressContainer（完成度高いが、Anti-Vision Bleed未実装）
- HapticEngine（完璧）
- death.tsx（プログレスバーアニメーション未実装）
- judgment.tsx（完璧）
- WipeAnimation（完成）

### ❌ 未実装
- Anti-Vision Bleed（低IH時の背景表示）
- Lens Zoom（Expo Go互換版）
- Notification Actions（YES/NOボタン）
- ノイズテクスチャ画像アセット

---

## Phase 1: アセット準備と基盤改善

### 1.1 ノイズテクスチャの生成と追加
**目標:** 本物のノイズオーバーレイ効果を実現

**タスク:**
- [ ] ノイズテクスチャ画像（512x512px）を生成
  - グレースケール
  - ランダムピクセルノイズ
  - PNG形式、透明度なし
- [ ] `assets/noise.png`として保存
- [ ] NoiseOverlay.tsxを更新してImageBackgroundを使用

**実装ファイル:**
- `assets/noise.png`（新規）
- `src/ui/effects/NoiseOverlay.tsx`（更新）

**技術仕様:**
```typescript
// NoiseOverlay.tsx
import { ImageBackground } from 'react-native';

<ImageBackground
  source={require('../../../assets/noise.png')}
  style={[styles.container, { opacity }]}
  resizeMode="repeat"
  pointerEvents="none"
/>
```

**検証:**
- [ ] ノイズが全画面に表示される
- [ ] IH低下時に徐々に濃くなる
- [ ] パフォーマンスに影響がない（60fps維持）

---

### 1.2 GlitchTextの動的オフセット実装
**目標:** グリッチ効果をリアルタイムでランダム化

**タスク:**
- [ ] useEffectで定期的にオフセットを更新
- [ ] severityに応じてオフセット範囲を変更
- [ ] メモリリーク防止（cleanup）

**実装ファイル:**
- `src/ui/effects/GlitchText.tsx`（更新）

**技術仕様:**
```typescript
const [offsets, setOffsets] = useState({ r: 0, b: 0 });

useEffect(() => {
  if (severity <= 0) return;

  const interval = setInterval(() => {
    setOffsets({
      r: (Math.random() - 0.5) * severity * 6,
      b: (Math.random() - 0.5) * severity * 4,
    });
  }, 100); // 10fps for glitch effect

  return () => clearInterval(interval);
}, [severity]);
```

**検証:**
- [ ] グリッチが自然にチカチカする
- [ ] severity=0で完全に停止
- [ ] CPUへの負荷が許容範囲内

---

## Phase 2: Anti-Vision Bleed機能

### 2.1 Anti-Vision Bleed Overlay実装
**目標:** 低IH時にユーザーのAnti-Visionを背景に薄く表示

**タスク:**
- [ ] `src/ui/effects/AntiVisionBleed.tsx`を新規作成
- [ ] StressContainerに統合
- [ ] IH < 30%で表示開始
- [ ] IH 30% → 0%でopacity 0 → 0.3

**実装ファイル:**
- `src/ui/effects/AntiVisionBleed.tsx`（新規）
- `src/ui/layout/StressContainer.tsx`（更新）

**技術仕様:**
```typescript
// AntiVisionBleed.tsx
export const AntiVisionBleed = ({
  antiVision,
  health
}: {
  antiVision: string;
  health: number;
}) => {
  if (health >= 30) return null;

  const opacity = (30 - health) / 100; // 0 to 0.3

  return (
    <View style={[styles.container, { opacity }]} pointerEvents="none">
      <ThemedText style={styles.bleedText}>{antiVision}</ThemedText>
    </View>
  );
};
```

**データ取得:**
- IdentityEngineまたはDBから現在のAnti-Visionテキストを取得
- StressContainerでpolling時に一緒に取得

**検証:**
- [ ] IH 30%未満で表示される
- [ ] IH低下に応じて濃くなる
- [ ] テキストが読めるが邪魔にならない

---

## Phase 3: Death Screenのアニメーション強化

### 3.1 プログレスバーのアニメーション
**目標:** ワイプ進行状況を視覚的に表示

**タスク:**
- [ ] Animated.Valueを使用
- [ ] 0% → 100%に3秒かけてアニメーション
- [ ] ファイル削除テキストも段階的に表示

**実装ファイル:**
- `app/death.tsx`（更新）

**技術仕様:**
```typescript
const [progress] = useState(new Animated.Value(0));

useEffect(() => {
  if (stage === 'wiping') {
    Animated.timing(progress, {
      toValue: 100,
      duration: 3000,
      useNativeDriver: false, // width animation
    }).start();
  }
}, [stage]);

const progressWidth = progress.interpolate({
  inputRange: [0, 100],
  outputRange: ['0%', '100%'],
});
```

**検証:**
- [ ] プログレスバーがスムーズにアニメーション
- [ ] ワイプ完了と同期
- [ ] カクつかない

---

### 3.2 ファイル削除エフェクト
**目標:** ファイル名が徐々に消える演出

**タスク:**
- [ ] ファイルリストを配列で管理
- [ ] タイミングをずらして1つずつ表示
- [ ] opacity fadeアニメーション

**検証:**
- [ ] ファイルが順番に表示され消える
- [ ] リアルな削除感がある

---

## Phase 4: Lens Zoom（Expo Go互換版）

### 4.1 問題分析
**現状:**
- react-native-reanimatedのWorkletsバージョンミスマッチ
- Expo Goでは動作しない

**解決策オプション:**

#### Option A: PanResponderベース（推奨）
- **利点:** ネイティブAPIのみ、Expo Go互換
- **欠点:** アニメーションがreanimatedより劣る

#### Option B: Expo Development Build
- **利点:** reanimated完全対応、最高のUX
- **欠点:** Expo Goが使えない、ビルド時間増加

**選択:** **Option A（PanResponder）** - Expo Go互換性を優先

---

### 4.2 PanResponderベースLens Zoom実装
**目標:** ピンチジェスチャーでレンズ切り替え

**タスク:**
- [ ] `src/ui/lenses/LensGestureHandler.tsx`を新規作成
- [ ] PanResponderでピンチ検出（2点タッチ）
- [ ] スケール計算ロジック
- [ ] アニメーション（Animated.View使用）

**実装ファイル:**
- `src/ui/lenses/LensGestureHandler.tsx`（新規）
- `app/index.tsx`（更新）

**技術仕様:**
```typescript
// LensGestureHandler.tsx
import { PanResponder, Animated } from 'react-native';

export const useLensGesture = (
  onLensChange: (lens: 0.5 | 1.0 | 2.0) => void
) => {
  const scale = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 2点タッチでピンチジェスチャー検出
        return gestureState.numberActiveTouches === 2;
      },
      onPanResponderMove: (_, gestureState) => {
        // スケール計算ロジック（2点間距離）
        const distance = calculateDistance(gestureState);
        scale.setValue(distance / initialDistance);
      },
      onPanResponderRelease: (_, gestureState) => {
        const finalScale = scale._value;

        // スナップロジック
        if (finalScale < 0.75) {
          onLensChange(0.5);
        } else if (finalScale > 1.5) {
          onLensChange(2.0);
        } else {
          onLensChange(1.0);
        }

        // リセット
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  return { panResponder, scale };
};
```

**検証:**
- [ ] ピンチイン/アウトで

レンズ切り替え
- [ ] スムーズなアニメーション
- [ ] Expo Goで動作

---

### 4.3 代替案: ボタンUI改善（現行）
**目標:** ボタンベースUIを洗練

**タスク:**
- [ ] ボタンデザイン改善
- [ ] アニメーション追加（タップ時）
- [ ] 視覚的フィードバック強化

**実装ファイル:**
- `app/index.tsx`（更新）

**技術仕様:**
```typescript
// ボタンタップ時のスケールアニメーション
const buttonScale = useRef(new Animated.Value(1)).current;

const handlePress = (newLens) => {
  Animated.sequence([
    Animated.timing(buttonScale, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }),
    Animated.timing(buttonScale, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }),
  ]).start();

  updateLens(newLens);
};
```

**検証:**
- [ ] タップ時に視覚的フィードバック
- [ ] レスポンシブな感触

---

## Phase 5: Notification Actions

### 5.1 Interactive Notifications実装
**目標:** 通知にYES/NOボタンを追加

**タスク:**
- [ ] NotificationScheduler.tsを更新
- [ ] カテゴリーアクションを設定
- [ ] Deep Linkingでjudgment画面へ

**実装ファイル:**
- `src/notifications/NotificationScheduler.ts`（更新）
- `src/core/NotificationController.tsx`（更新）

**技術仕様:**
```typescript
// NotificationScheduler.ts
await Notifications.setNotificationCategoryAsync('IDENTITY_QUESTION', [
  {
    identifier: 'YES',
    buttonTitle: 'はい',
    options: {
      opensAppToForeground: true,
    },
  },
  {
    identifier: 'NO',
    buttonTitle: 'いいえ',
    options: {
      opensAppToForeground: true,
    },
  },
]);

// Notification content
{
  categoryIdentifier: 'IDENTITY_QUESTION',
  data: { questionId: id, question: text },
}
```

**NotificationController:**
```typescript
const subscription = Notifications.addNotificationResponseReceivedListener(
  (response) => {
    const { actionIdentifier, notification } = response;
    const { questionId, question } = notification.request.content.data;

    if (actionIdentifier === 'YES' || actionIdentifier === 'NO') {
      router.push({
        pathname: '/judgment',
        params: {
          id: questionId,
          question,
          preset: actionIdentifier,
        },
      });
    }
  }
);
```

**検証:**
- [ ] 通知にYES/NOボタンが表示される
- [ ] タップでjudgment画面へ遷移
- [ ] プリセット値が渡される

---

## Phase 6: IdentityEngine完全実装

### 6.1 未実装メソッドの確認と実装
**タスク:**
- [ ] IdentityEngine.tsの現在の実装を確認
- [ ] 必要なメソッドを追加:
  - `applyDamage(amount: number)`
  - `restoreHealth(amount: number)`
  - `useInsurance()`

**実装ファイル:**
- `src/core/IdentityEngine.ts`（更新）

**技術仕様:**
```typescript
// IdentityEngine.ts
export const IdentityEngine = {
  async applyDamage(amount: number) {
    const db = getDB();
    await db.execAsync(`
      UPDATE user_status
      SET identity_health = MAX(0, identity_health - ${amount})
      WHERE id = 1
    `);

    // Check if dead
    const status = await this.checkHealth();
    if (status.health <= 0) {
      router.push('/death');
    }
  },

  async restoreHealth(amount: number) {
    const db = getDB();
    await db.execAsync(`
      UPDATE user_status
      SET identity_health = MIN(100, identity_health + ${amount})
      WHERE id = 1
    `);
  },

  async useInsurance() {
    const db = getDB();
    await db.execAsync(`
      UPDATE user_status
      SET is_dead = 0, identity_health = 50
      WHERE id = 1
    `);
    // Recreate tables
    await initializeTables();
  },
};
```

**検証:**
- [ ] applyDamageでIHが減る
- [ ] IH 0で/deathへ遷移
- [ ] restoreHealthでIHが回復
- [ ] useInsuranceで復活

---

## Phase 7: 統合テストと最終調整

### 7.1 全機能統合テスト
**テストケース:**
- [ ] IH 100 → 30: Glitch開始、Noise表示
- [ ] IH 30 → 10: Anti-Vision Bleed表示、Heartbeat開始
- [ ] IH 10 → 0: Critical Glitch、Death画面遷移
- [ ] Death → Wipe: アニメーション再生、DB削除
- [ ] Resurrection: Insurance使用、復活

### 7.2 パフォーマンステスト
**確認項目:**
- [ ] FPS 60維持（全エフェクト有効時）
- [ ] メモリリークなし
- [ ] バッテリー消費許容範囲
- [ ] 低スペック端末で動作

### 7.3 UX最終調整
**調整項目:**
- [ ] Glitchエフェクトの強度調整
- [ ] Haptic強度の微調整
- [ ] タイミング調整（Death Sequence等）
- [ ] テキストサイズ・可読性

---

## 実装優先順位

### P0 - 最高優先度（即座に実装）
1. ノイズテクスチャ追加（1.1）
2. GlitchText動的化（1.2）
3. IdentityEngine完全実装（6.1）

### P1 - 高優先度（Week 1）
4. Anti-Vision Bleed（2.1）
5. Death Animation（3.1, 3.2）
6. Notification Actions（5.1）

### P2 - 中優先度（Week 2）
7. Lens Zoom（4.2または4.3）
8. 統合テスト（7.1）

### P3 - 低優先度（Week 3）
9. パフォーマンス最適化（7.2）
10. UX微調整（7.3）

---

## 技術的リスクと対策

### リスク1: Worklets互換性
**リスク:** Expo Goでreanimatedが動作しない
**対策:** PanResponderで代替実装（4.2）
**回避策:** Development Buildへ移行（長期）

### リスク2: ノイズオーバーレイのパフォーマンス
**リスク:** 全画面ノイズでFPS低下
**対策:** 低解像度テクスチャ、GPUアクセラレーション
**回避策:** IH < 30%のみ表示

### リスク3: Hapticのバッテリー消費
**リスク:** 頻繁なHapticで電池消耗
**対策:** Heartbeatを2秒間隔に制限
**回避策:** 設定でHaptic無効化オプション

---

## 完了条件

### 機能完了
- [ ] 全7 Phaseのタスク完了
- [ ] テストケース全通過
- [ ] パフォーマンス基準クリア

### ドキュメント完了
- [ ] 各機能のREADME更新
- [ ] テスト結果レポート作成
- [ ] ユーザーガイド作成

### 品質基準
- [ ] Expo Goで動作確認
- [ ] iOS/Android両対応
- [ ] クラッシュなし
- [ ] メモリリークなし

---

## タイムライン（目安）

| Phase | 期間 | 担当 |
|-------|------|------|
| Phase 1 | 1日 | Sonnet |
| Phase 2 | 1日 | Sonnet |
| Phase 3 | 1日 | Sonnet |
| Phase 4 | 2日 | Sonnet |
| Phase 5 | 1日 | Sonnet |
| Phase 6 | 1日 | Sonnet |
| Phase 7 | 2日 | Sonnet + Opus(Review) |
| **合計** | **9日** | |

---

## 次のステップ

1. ✅ この実装計画書をOpusでレビュー
2. ⏳ Opusのフィードバックを反映
3. ⏳ Phase 1から順次実装開始（Sonnet）

---

**作成者:** Claude Sonnet 4.5
**レビュー待ち:** Opus 4.5
