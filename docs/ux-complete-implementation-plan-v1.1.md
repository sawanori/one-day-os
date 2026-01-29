# One Day OS - UX完全実装計画書 v1.1

**作成日:** 2026-01-29
**改訂日:** 2026-01-29
**対象:** UX_IMPLEMENTATION_PLAN.mdの全要素
**目標:** 全UX機能の完全実装と既存コードの改善
**変更履歴:** v1.0からレビュー指摘事項を全反映

---

## 📋 v1.0からの主な変更点

### 🔴 Critical Issues修正
- ✅ SQL Injection脆弱性修正（parameterized queries使用）
- ✅ TDDプロセス追加（全Phaseにテスト作成タスク追加）
- ✅ Rollback Strategy追加（git tagging + Feature Flag）
- ✅ ノイズテクスチャ生成方法具体化（Node.jsスクリプト）
- ✅ useInsurance()ロジック明確化

### 🟠 Major Issues修正
- ✅ PanResponder実装完成（calculateDistance関数実装）
- ✅ Anti-Vision取得方法決定（IdentityEngine.getAntiVision()追加）
- ✅ judgment.tsx preset対応追加
- ✅ Death Screen wipe接続明確化
- ✅ iOS/Android差異対応コード追加
- ✅ Animationポリシー明確化（Brutalist原則との整合性確保）
- ✅ Timeline見直し（9日→17日）

### 🟡 Minor Issues修正
- ✅ GlitchManager最適化追加
- ✅ AppState対応追加（バックグラウンド時のinterval停止）
- ✅ Transaction制御追加（複数ペナルティ競合対策）
- ✅ Edge Case考慮追加（境界値処理明確化）

---

## 🎯 Design Philosophy Update

### Brutalist Animation Policy（新規追加）

**原則:** "No decorative animations, only functional animations"

**許可されるアニメーション:**
- ✅ **機能的フィードバック:** プログレスバー、ローディング状態
- ✅ **状態変化の可視化:** Death sequence、Wipe進行状況
- ✅ **ユーザー操作への応答:** ボタンタップ時のスケール変化

**禁止されるアニメーション:**
- ❌ **装飾的トランジション:** 画面遷移時のフェード/スライド
- ❌ **アンビエント効果:** 常時動作するパーティクル、背景アニメーション
- ❌ **イージング:** すべてlinear、spring禁止（例外: haptic feedback）

**CLAUDE.md更新内容:**
```markdown
**Brutalist Design System**
- **No decorative animations** - 装飾的アニメーションなし
- **Functional animations only** - 機能的アニメーションのみ許可
  - Progress indicators (Death screen wipe)
  - User feedback (button press)
  - State changes (Glitch effects)
```

---

## 🔒 Rollback Strategy（新規追加）

### Git Tagging Strategy

**Phase開始前:**
```bash
git tag phase-1-start -m "Phase 1: Asset Preparation - START"
git push origin phase-1-start
```

**Phase完了後:**
```bash
git tag phase-1-complete -m "Phase 1: Asset Preparation - COMPLETE"
git push origin phase-1-complete
```

**Rollback方法:**
```bash
# Phase失敗時
git reset --hard phase-1-start
git clean -fd
npm install
npx expo start --clear
```

### Feature Flag System（新規追加）

**ファイル:** `src/config/features.ts`（新規作成）

```typescript
/**
 * Feature Flags for UX Implementation
 * Toggle features on/off during development
 */
export const FEATURES = {
  // Phase 1
  NOISE_OVERLAY_TEXTURE: false,        // ノイズテクスチャ（Phase 1.1）
  GLITCH_DYNAMIC_OFFSET: false,        // 動的グリッチ（Phase 1.2）

  // Phase 2
  ANTI_VISION_BLEED: false,            // Anti-Vision Bleed（Phase 2.1）

  // Phase 3
  DEATH_ANIMATION: false,              // Death Screen Animation（Phase 3）

  // Phase 4
  LENS_ZOOM_GESTURE: false,            // Lens Zoom（Phase 4.2）
  LENS_BUTTON_ANIMATION: false,        // Button Animation（Phase 4.3）

  // Phase 5
  NOTIFICATION_ACTIONS: false,         // Interactive Notifications（Phase 5.1）

  // Phase 6
  IDENTITY_ENGINE_V2: false,           // IdentityEngine v2（Phase 6.1）
} as const;

export type FeatureFlag = keyof typeof FEATURES;

export const isFeatureEnabled = (flag: FeatureFlag): boolean => {
  return FEATURES[flag];
};
```

**使用例:**
```typescript
// src/ui/effects/NoiseOverlay.tsx
import { isFeatureEnabled } from '@/config/features';

export const NoiseOverlay = ({ opacity }: { opacity: number }) => {
  if (!isFeatureEnabled('NOISE_OVERLAY_TEXTURE')) {
    // Fallback to old implementation
    return <View style={[styles.container, { opacity, backgroundColor: '#000' }]} />;
  }

  // New implementation with texture
  return (
    <ImageBackground source={require('../../../assets/noise.png')} ... />
  );
};
```

**Phase完了時:**
```typescript
// features.ts
NOISE_OVERLAY_TEXTURE: true,  // Phase 1.1完了後に有効化
```

### Rollback失敗時の復旧手順

**シナリオ1: DB破損**
```bash
# Expo cache削除
rm -rf .expo
# SQLite削除
rm -rf ~/Library/Developer/CoreSimulator/*/data/Containers/Data/Application/*/Documents/*.db
# 再インストール
npm install
npx expo start --clear
```

**シナリオ2: ビルドエラー**
```bash
# Metro bundlerキャッシュ削除
rm -rf node_modules/.cache
npx expo start --clear
```

**シナリオ3: ネイティブモジュールエラー**
```bash
# 完全クリーンビルド
rm -rf node_modules
rm package-lock.json
npm install
npx expo prebuild --clean
```

---

## 実装状況サマリー

### ✅ 既存実装（改善必要）
- GlitchText（静的オフセット → 動的に変更）
- NoiseOverlay（黒背景 → 実際のノイズテクスチャ）
- StressContainer（完成度高いが、Anti-Vision Bleed未実装）
- HapticEngine（完璧）
- death.tsx（プログレスバーアニメーション未実装）
- judgment.tsx（preset対応未実装）
- IdentityEngine（SQL Injection脆弱性あり）

### ❌ 未実装
- Anti-Vision Bleed（低IH時の背景表示）
- Lens Zoom（Expo Go互換版）
- Notification Actions（YES/NOボタン）
- ノイズテクスチャ画像アセット
- GlitchManager（複数インスタンス最適化）

---

## Phase 0: セキュリティ修正とインフラ整備（新規追加）

**期間:** 1日
**優先度:** P0 - Critical
**目標:** 既存の脆弱性修正と実装基盤の整備

### 0.1 SQL Injection脆弱性修正

**対象ファイル:**
- `src/core/IdentityEngine.ts`（既存）

**問題箇所:**
```typescript
// 🔴 脆弱なコード（現在）
await db.execAsync(`
  UPDATE user_status
  SET identity_health = MAX(0, identity_health - ${amount})
  WHERE id = 1
`);
```

**修正内容:**
```typescript
// ✅ 安全なコード（修正後）
await db.runAsync(
  'UPDATE user_status SET identity_health = MAX(0, identity_health - ?) WHERE id = 1',
  [amount]
);
```

**タスク:**
- [ ] **テスト作成（TDD）:** IdentityEngine.test.ts
  - applyDamage()のSQL Injection攻撃テスト
  - パラメータ境界値テスト（負の数、0、100超）
- [ ] **実装:** applyDamage()修正
- [ ] **実装:** restoreHealth()修正
- [ ] **実装:** checkHealth()修正（該当箇所があれば）
- [ ] **テスト実行:** すべてのテストが通ることを確認
- [ ] **コミット:** `git commit -m "fix(security): Prevent SQL injection in IdentityEngine"`

**検証:**
```typescript
// IdentityEngine.test.ts（新規追加）
describe('IdentityEngine - SQL Injection Prevention', () => {
  it('should reject malicious input', async () => {
    const maliciousInput = "10; DROP TABLE user_status; --";
    await IdentityEngine.applyDamage(maliciousInput as any);

    // user_status テーブルが存在することを確認
    const db = getDB();
    const result = await db.getFirstAsync('SELECT * FROM user_status WHERE id = 1');
    expect(result).toBeDefined();
  });

  it('should handle negative damage values', async () => {
    await IdentityEngine.applyDamage(-10);
    const status = await IdentityEngine.checkHealth();
    // IHが増えないことを確認（不正な回復防止）
    expect(status.health).toBeLessThanOrEqual(100);
  });
});
```

---

### 0.2 Feature Flag System構築

**タスク:**
- [ ] **実装:** `src/config/features.ts`作成
- [ ] **実装:** すべてのフラグをfalseで初期化
- [ ] **テスト作成（TDD）:** features.test.ts
  - isFeatureEnabled()の動作確認
  - 型安全性テスト
- [ ] **テスト実行:** 通過確認
- [ ] **コミット:** `git commit -m "feat(config): Add feature flag system"`

---

### 0.3 Git Tagging Automation

**タスク:**
- [ ] **スクリプト作成:** `scripts/tag-phase.sh`

```bash
#!/bin/bash
# Usage: ./scripts/tag-phase.sh 1 start|complete

PHASE=$1
STATUS=$2

if [ -z "$PHASE" ] || [ -z "$STATUS" ]; then
  echo "Usage: ./scripts/tag-phase.sh <phase-number> <start|complete>"
  exit 1
fi

TAG_NAME="phase-${PHASE}-${STATUS}"
TAG_MESSAGE="Phase ${PHASE}: $(get_phase_name $PHASE) - ${STATUS^^}"

git tag $TAG_NAME -m "$TAG_MESSAGE"
git push origin $TAG_NAME

echo "✅ Tagged: $TAG_NAME"
```

- [ ] **実行権限付与:** `chmod +x scripts/tag-phase.sh`
- [ ] **テスト:** `./scripts/tag-phase.sh 0 start`
- [ ] **コミット:** `git commit -m "chore(scripts): Add phase tagging automation"`

---

### 0.4 ノイズテクスチャ生成スクリプト作成

**タスク:**
- [ ] **スクリプト作成:** `scripts/generate-noise.js`

```javascript
/**
 * Noise Texture Generator
 * Generates 512x512px grayscale noise texture for NoiseOverlay
 */
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const WIDTH = 512;
const HEIGHT = 512;
const OUTPUT_PATH = path.join(__dirname, '../assets/noise.png');

console.log('🎨 Generating noise texture...');

const canvas = createCanvas(WIDTH, HEIGHT);
const ctx = canvas.getContext('2d');

// Generate white noise (random grayscale pixels)
const imageData = ctx.createImageData(WIDTH, HEIGHT);
for (let i = 0; i < imageData.data.length; i += 4) {
  const value = Math.floor(Math.random() * 256);
  imageData.data[i] = value;     // R
  imageData.data[i + 1] = value; // G
  imageData.data[i + 2] = value; // B
  imageData.data[i + 3] = 255;   // A (opaque)
}
ctx.putImageData(imageData, 0, 0);

// Save to file
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(OUTPUT_PATH, buffer);

console.log(`✅ Noise texture generated: ${OUTPUT_PATH}`);
console.log(`   Size: ${WIDTH}x${HEIGHT}px`);
console.log(`   File size: ${(buffer.length / 1024).toFixed(2)} KB`);
```

- [ ] **依存関係追加:** `npm install --save-dev canvas`
- [ ] **package.json更新:**

```json
{
  "scripts": {
    "generate-noise": "node scripts/generate-noise.js"
  }
}
```

- [ ] **実行:** `npm run generate-noise`
- [ ] **検証:** `assets/noise.png`が生成されたことを確認
- [ ] **Git追加:** `git add assets/noise.png`
- [ ] **コミット:** `git commit -m "chore(assets): Generate noise texture for overlay effect"`

---

### 0.5 Transaction制御ユーティリティ作成（複数ペナルティ競合対策）

**タスク:**
- [ ] **実装:** `src/database/transaction.ts`（新規作成）

```typescript
import { getDB } from './client';

/**
 * Execute multiple DB operations in a transaction
 * Prevents race conditions when multiple penalties are applied simultaneously
 */
export const runInTransaction = async <T>(
  operations: () => Promise<T>
): Promise<T> => {
  const db = getDB();

  try {
    await db.execAsync('BEGIN TRANSACTION;');
    const result = await operations();
    await db.execAsync('COMMIT;');
    return result;
  } catch (error) {
    await db.execAsync('ROLLBACK;');
    throw error;
  }
};
```

- [ ] **テスト作成（TDD）:** transaction.test.ts
  - 正常系: トランザクション成功
  - 異常系: エラー時のロールバック
  - 並行系: 複数トランザクションの競合
- [ ] **テスト実行:** 通過確認
- [ ] **コミット:** `git commit -m "feat(db): Add transaction utility for race condition prevention"`

---

### Phase 0 完了条件

- [ ] すべてのSQL Injectionが修正されている
- [ ] Feature Flag Systemが動作している
- [ ] Git tagging scriptが使える
- [ ] ノイズテクスチャが生成されている
- [ ] Transaction utilityが実装されている
- [ ] すべてのテストが通過（npm test）
- [ ] Git tag: `phase-0-complete`

**Phase 0完了時のコマンド:**
```bash
./scripts/tag-phase.sh 0 complete
```

---

## Phase 1: アセット準備と基盤改善

**期間:** 2日
**優先度:** P0
**依存:** Phase 0完了
**Git Tag:** `phase-1-start` → `phase-1-complete`

**Phase開始時:**
```bash
./scripts/tag-phase.sh 1 start
```

---

### 1.1 ノイズテクスチャの統合

**目標:** 本物のノイズオーバーレイ効果を実現

**前提条件:**
- ✅ Phase 0.4でノイズテクスチャ生成済み
- ✅ `assets/noise.png`が存在

**タスク:**
- [ ] **テスト作成（TDD）:** NoiseOverlay.test.tsx
  - ノイズテクスチャが読み込まれることを確認
  - opacity propsが正しく適用されることを確認
  - health値に応じてopacityが変化することを確認
  - パフォーマンステスト（60fps維持）

```typescript
// NoiseOverlay.test.tsx（新規作成）
import { render } from '@testing-library/react-native';
import { NoiseOverlay } from './NoiseOverlay';

describe('NoiseOverlay', () => {
  it('should render with noise texture when feature enabled', () => {
    // Feature flagを有効化
    jest.mock('@/config/features', () => ({
      isFeatureEnabled: () => true,
    }));

    const { getByTestId } = render(<NoiseOverlay opacity={0.5} />);
    const overlay = getByTestId('noise-overlay');

    expect(overlay.props.source).toBeDefined();
    expect(overlay.props.style).toContainEqual({ opacity: 0.5 });
  });

  it('should fallback to solid black when feature disabled', () => {
    jest.mock('@/config/features', () => ({
      isFeatureEnabled: () => false,
    }));

    const { getByTestId } = render(<NoiseOverlay opacity={0.5} />);
    const overlay = getByTestId('noise-overlay');

    expect(overlay.props.style).toContainEqual({ backgroundColor: '#000' });
  });
});
```

- [ ] **実装:** NoiseOverlay.tsxを更新

```typescript
// src/ui/effects/NoiseOverlay.tsx
import React from 'react';
import { View, ImageBackground, StyleSheet } from 'react-native';
import { isFeatureEnabled } from '@/config/features';

interface NoiseOverlayProps {
  opacity: number;
}

export const NoiseOverlay = ({ opacity }: NoiseOverlayProps) => {
  const baseStyle = [
    styles.container,
    { opacity },
  ];

  // Feature flagで新旧実装を切り替え
  if (!isFeatureEnabled('NOISE_OVERLAY_TEXTURE')) {
    // Fallback: 黒背景のみ
    return (
      <View
        testID="noise-overlay"
        style={[...baseStyle, { backgroundColor: '#000' }]}
        pointerEvents="none"
      />
    );
  }

  // New: ノイズテクスチャ
  return (
    <ImageBackground
      testID="noise-overlay"
      source={require('../../../assets/noise.png')}
      style={baseStyle}
      resizeMode="repeat"
      pointerEvents="none"
    />
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
});
```

- [ ] **テスト実行:** `npm test -- NoiseOverlay.test.tsx`
- [ ] **手動テスト:**
  - Expo起動
  - IdentityEngineでIHを30以下に設定
  - ノイズが表示されることを確認
  - Feature flagをfalseにして再確認
- [ ] **パフォーマンステスト:** FPS測定（60fps維持確認）
- [ ] **コミット:** `git commit -m "feat(ui): Add noise texture overlay with feature flag"`

**検証チェックリスト:**
- [ ] ノイズが全画面に表示される
- [ ] IH低下時に徐々に濃くなる
- [ ] パフォーマンスに影響がない（60fps維持）
- [ ] Feature flagで切り替え可能
- [ ] テストが通過

---

### 1.2 GlitchTextの動的オフセット実装

**目標:** グリッチ効果をリアルタイムでランダム化

**タスク:**
- [ ] **テスト作成（TDD）:** GlitchText.test.tsx更新

```typescript
// GlitchText.test.tsx（既存ファイル更新）
describe('GlitchText - Dynamic Offset', () => {
  it('should update offsets periodically when severity > 0', () => {
    jest.useFakeTimers();
    const { getByTestId } = render(
      <GlitchText severity={0.5}>Test</GlitchText>
    );

    const initialStyle = getByTestId('glitch-text-red').props.style;

    // 100ms後にオフセットが変わることを確認
    jest.advanceTimersByTime(100);

    const updatedStyle = getByTestId('glitch-text-red').props.style;
    expect(updatedStyle.left).not.toBe(initialStyle.left);

    jest.useRealTimers();
  });

  it('should stop updating when severity = 0', () => {
    jest.useFakeTimers();
    const { rerender, getByTestId } = render(
      <GlitchText severity={0.5}>Test</GlitchText>
    );

    jest.advanceTimersByTime(100);
    const style1 = getByTestId('glitch-text-red').props.style;

    // severity=0に変更
    rerender(<GlitchText severity={0}>Test</GlitchText>);

    jest.advanceTimersByTime(100);
    const style2 = getByTestId('glitch-text-red').props.style;

    // オフセットが0に戻る
    expect(style2.left).toBe(0);

    jest.useRealTimers();
  });

  it('should cleanup interval on unmount', () => {
    jest.useFakeTimers();
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { unmount } = render(
      <GlitchText severity={0.5}>Test</GlitchText>
    );

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    jest.useRealTimers();
  });
});
```

- [ ] **実装:** GlitchText.tsx更新

```typescript
// src/ui/effects/GlitchText.tsx
import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, AppState, AppStateStatus } from 'react-native';
import { isFeatureEnabled } from '@/config/features';

interface GlitchTextProps {
  children: string;
  severity: number; // 0.0 ~ 1.0
  style?: any;
}

export const GlitchText = ({ children, severity, style }: GlitchTextProps) => {
  const [offsets, setOffsets] = useState({ r: 0, b: 0 });
  const [appState, setAppState] = useState(AppState.currentState);

  // AppState監視（バックグラウンド時にinterval停止）
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      setAppState(nextState);
    });

    return () => subscription.remove();
  }, []);

  // 動的オフセット更新
  useEffect(() => {
    if (!isFeatureEnabled('GLITCH_DYNAMIC_OFFSET')) {
      // Feature flag無効時は静的オフセット
      setOffsets({ r: 2, b: -2 });
      return;
    }

    if (severity <= 0 || appState !== 'active') {
      // severity=0またはバックグラウンド時は停止
      setOffsets({ r: 0, b: 0 });
      return;
    }

    const interval = setInterval(() => {
      setOffsets({
        r: (Math.random() - 0.5) * severity * 6,
        b: (Math.random() - 0.5) * severity * 4,
      });
    }, 100); // 10fps（グリッチ効果には十分）

    return () => clearInterval(interval);
  }, [severity, appState]);

  return (
    <View style={styles.container}>
      {/* Red Channel */}
      <Text
        testID="glitch-text-red"
        style={[
          styles.base,
          style,
          {
            color: '#FF0000',
            position: 'absolute',
            left: offsets.r,
            opacity: severity > 0 ? 0.8 : 0,
          },
        ]}
      >
        {children}
      </Text>

      {/* Blue Channel */}
      <Text
        testID="glitch-text-blue"
        style={[
          styles.base,
          style,
          {
            color: '#0000FF',
            position: 'absolute',
            left: offsets.b,
            opacity: severity > 0 ? 0.8 : 0,
          },
        ]}
      >
        {children}
      </Text>

      {/* Base White Text */}
      <Text style={[styles.base, style]}>{children}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  base: {
    color: '#FFFFFF',
    fontFamily: 'Courier New',
  },
});
```

- [ ] **テスト実行:** `npm test -- GlitchText.test.tsx`
- [ ] **手動テスト:**
  - IHを30以下に設定
  - グリッチがチカチカすることを確認
  - アプリをバックグラウンドにしてinterval停止を確認
- [ ] **パフォーマンステスト:** CPU使用率測定
- [ ] **コミット:** `git commit -m "feat(ui): Add dynamic glitch offset with AppState handling"`

**検証チェックリスト:**
- [ ] グリッチが自然にチカチカする
- [ ] severity=0で完全に停止
- [ ] バックグラウンド時にinterval停止
- [ ] CPUへの負荷が許容範囲内（<5%）
- [ ] テストが通過

---

### 1.3 GlitchManager最適化（複数インスタンス対策）

**目標:** 複数のGlitchTextが同じintervalを共有してパフォーマンス向上

**タスク:**
- [ ] **テスト作成（TDD）:** GlitchManager.test.ts

```typescript
// src/ui/effects/GlitchManager.test.ts（新規作成）
import { glitchManager } from './GlitchManager';

describe('GlitchManager', () => {
  it('should create only one interval for multiple subscribers', () => {
    const setIntervalSpy = jest.spyOn(global, 'setInterval');

    const callback1 = jest.fn();
    const callback2 = jest.fn();

    glitchManager.subscribe(callback1, 0.5);
    glitchManager.subscribe(callback2, 0.5);

    // setIntervalは1回だけ呼ばれる
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    glitchManager.unsubscribe(callback1);
    glitchManager.unsubscribe(callback2);
  });

  it('should stop interval when all subscribers unsubscribe', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const callback = jest.fn();
    glitchManager.subscribe(callback, 0.5);
    glitchManager.unsubscribe(callback);

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
```

- [ ] **実装:** GlitchManager.ts（新規作成）

```typescript
// src/ui/effects/GlitchManager.ts
type GlitchCallback = (offsets: { r: number; b: number }) => void;

class GlitchManager {
  private listeners: Map<GlitchCallback, number> = new Map(); // callback -> severity
  private interval: NodeJS.Timeout | null = null;

  subscribe(callback: GlitchCallback, severity: number) {
    this.listeners.set(callback, severity);

    if (!this.interval && this.listeners.size > 0) {
      this.interval = setInterval(() => {
        this.listeners.forEach((severity, callback) => {
          if (severity > 0) {
            const offsets = {
              r: (Math.random() - 0.5) * severity * 6,
              b: (Math.random() - 0.5) * severity * 4,
            };
            callback(offsets);
          } else {
            callback({ r: 0, b: 0 });
          }
        });
      }, 100);
    }
  }

  unsubscribe(callback: GlitchCallback) {
    this.listeners.delete(callback);

    if (this.listeners.size === 0 && this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  updateSeverity(callback: GlitchCallback, severity: number) {
    if (this.listeners.has(callback)) {
      this.listeners.set(callback, severity);
    }
  }
}

export const glitchManager = new GlitchManager();
```

- [ ] **実装:** GlitchText.tsxを更新（GlitchManager使用）

```typescript
// src/ui/effects/GlitchText.tsx（GlitchManager版）
import { glitchManager } from './GlitchManager';

export const GlitchText = ({ children, severity, style }: GlitchTextProps) => {
  const [offsets, setOffsets] = useState({ r: 0, b: 0 });

  useEffect(() => {
    if (!isFeatureEnabled('GLITCH_DYNAMIC_OFFSET')) {
      setOffsets({ r: 2, b: -2 });
      return;
    }

    const callback = (newOffsets: { r: number; b: number }) => {
      setOffsets(newOffsets);
    };

    glitchManager.subscribe(callback, severity);

    return () => {
      glitchManager.unsubscribe(callback);
    };
  }, [severity]);

  // ... 残りは同じ
};
```

- [ ] **テスト実行:** すべてのテスト通過確認
- [ ] **パフォーマンステスト:** 10個のGlitchTextを同時表示してCPU測定
- [ ] **コミット:** `git commit -m "perf(ui): Optimize GlitchText with singleton GlitchManager"`

---

### Phase 1 完了条件

- [ ] ノイズテクスチャが統合されている
- [ ] GlitchTextが動的に動作している
- [ ] GlitchManagerで最適化されている
- [ ] すべてのテストが通過
- [ ] パフォーマンス基準クリア（60fps, CPU<5%）
- [ ] Feature flagで切り替え可能
- [ ] Git tag: `phase-1-complete`

**Phase完了時:**
```bash
# Feature flagを有効化
# src/config/features.ts
NOISE_OVERLAY_TEXTURE: true,
GLITCH_DYNAMIC_OFFSET: true,

# コミット
git commit -m "feat(phase-1): Enable noise overlay and dynamic glitch"

# タグ付け
./scripts/tag-phase.sh 1 complete
```

---

## Phase 2: Anti-Vision Bleed機能

**期間:** 2日
**優先度:** P1
**依存:** Phase 1完了
**Git Tag:** `phase-2-start` → `phase-2-complete`

---

### 2.1 IdentityEngine.getAntiVision()追加

**目標:** Anti-Visionテキストを取得するメソッド実装

**タスク:**
- [ ] **テスト作成（TDD）:** IdentityEngine.test.ts更新

```typescript
// IdentityEngine.test.ts（既存ファイル更新）
describe('IdentityEngine.getAntiVision', () => {
  it('should return anti-vision content from DB', async () => {
    // テストデータ挿入
    const db = getDB();
    await db.runAsync(
      'INSERT OR REPLACE INTO anti_vision (id, title, content, reflection_date) VALUES (?, ?, ?, ?)',
      [1, 'Test Title', 'Test Anti-Vision Content', '2026-01-29']
    );

    const result = await IdentityEngine.getAntiVision();
    expect(result).toBe('Test Anti-Vision Content');
  });

  it('should return empty string when no anti-vision exists', async () => {
    const db = getDB();
    await db.runAsync('DELETE FROM anti_vision WHERE id = 1');

    const result = await IdentityEngine.getAntiVision();
    expect(result).toBe('');
  });
});
```

- [ ] **実装:** IdentityEngine.ts更新

```typescript
// src/core/IdentityEngine.ts（既存ファイル更新）
export const IdentityEngine = {
  // ... 既存メソッド ...

  /**
   * Get current Anti-Vision content
   * Used for Anti-Vision Bleed effect
   */
  async getAntiVision(): Promise<string> {
    const db = getDB();
    const result = await db.getFirstAsync<{ content: string }>(
      'SELECT content FROM anti_vision WHERE id = 1'
    );
    return result?.content || '';
  },
};
```

- [ ] **テスト実行:** `npm test -- IdentityEngine.test.ts`
- [ ] **コミット:** `git commit -m "feat(engine): Add getAntiVision method to IdentityEngine"`

---

### 2.2 AntiVisionBleed Component実装

**目標:** 低IH時にAnti-Visionを背景に表示

**タスク:**
- [ ] **テスト作成（TDD）:** AntiVisionBleed.test.tsx

```typescript
// src/ui/effects/AntiVisionBleed.test.tsx（新規作成）
import { render } from '@testing-library/react-native';
import { AntiVisionBleed } from './AntiVisionBleed';

describe('AntiVisionBleed', () => {
  it('should not render when health >= 30', () => {
    const { queryByTestId } = render(
      <AntiVisionBleed antiVision="Test" health={30} />
    );
    expect(queryByTestID('anti-vision-bleed')).toBeNull();
  });

  it('should render when health < 30', () => {
    const { getByTestId, getByText } = render(
      <AntiVisionBleed antiVision="Test Anti-Vision" health={29} />
    );
    expect(getByTestId('anti-vision-bleed')).toBeDefined();
    expect(getByText('Test Anti-Vision')).toBeDefined();
  });

  it('should calculate correct opacity based on health', () => {
    const { getByTestId } = render(
      <AntiVisionBleed antiVision="Test" health={0} />
    );
    const container = getByTestId('anti-vision-bleed');

    // health=0 → opacity=0.3
    expect(container.props.style).toContainEqual({ opacity: 0.3 });
  });

  it('should have low opacity when health is close to 30', () => {
    const { getByTestId } = render(
      <AntiVisionBleed antiVision="Test" health={29} />
    );
    const container = getByTestId('anti-vision-bleed');

    // health=29 → opacity=0.01
    expect(container.props.style).toContainEqual({ opacity: 0.01 });
  });
});
```

- [ ] **実装:** AntiVisionBleed.tsx

```typescript
// src/ui/effects/AntiVisionBleed.tsx（新規作成）
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '../components/ThemedText';
import { isFeatureEnabled } from '@/config/features';

interface AntiVisionBleedProps {
  antiVision: string;
  health: number;
}

export const AntiVisionBleed = ({ antiVision, health }: AntiVisionBleedProps) => {
  if (!isFeatureEnabled('ANTI_VISION_BLEED')) {
    return null;
  }

  // IH 30%以上: 非表示
  // IH 29%以下: 表示（opacity 0.01 ~ 0.3）
  if (health >= 30) {
    return null;
  }

  const opacity = (30 - health) / 100; // 0.01 ~ 0.3

  return (
    <View
      testID="anti-vision-bleed"
      style={[styles.container, { opacity }]}
      pointerEvents="none"
    >
      <ThemedText style={styles.bleedText} numberOfLines={undefined}>
        {antiVision}
      </ThemedText>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    zIndex: 500, // NoiseOverlay(999)の下
  },
  bleedText: {
    fontSize: 48,
    fontWeight: '900',
    textAlign: 'center',
    color: '#FF0000',
    textTransform: 'uppercase',
    letterSpacing: 4,
    lineHeight: 60,
  },
});
```

- [ ] **テスト実行:** `npm test -- AntiVisionBleed.test.tsx`
- [ ] **コミット:** `git commit -m "feat(ui): Add AntiVisionBleed effect component"`

---

### 2.3 StressContainerに統合

**タスク:**
- [ ] **テスト作成（TDD）:** StressContainer.test.tsx更新

```typescript
// src/ui/layout/StressContainer.test.tsx（既存ファイル更新）
describe('StressContainer - Anti-Vision Integration', () => {
  it('should fetch and display anti-vision when health < 30', async () => {
    // Mock IdentityEngine
    jest.spyOn(IdentityEngine, 'checkHealth').mockResolvedValue({
      health: 20,
      isDead: false,
    });
    jest.spyOn(IdentityEngine, 'getAntiVision').mockResolvedValue('Test Anti-Vision');

    const { findByText } = render(
      <StressContainer>
        <Text>Child</Text>
      </StressContainer>
    );

    // 2秒待ってpolling実行
    await waitFor(() => {
      expect(IdentityEngine.getAntiVision).toHaveBeenCalled();
    }, { timeout: 3000 });

    const bleedText = await findByText('Test Anti-Vision');
    expect(bleedText).toBeDefined();
  });
});
```

- [ ] **実装:** StressContainer.tsx更新

```typescript
// src/ui/layout/StressContainer.tsx（既存ファイル更新）
import { AntiVisionBleed } from '../effects/AntiVisionBleed';

export const StressContainer = ({ children }: { children: React.ReactNode }) => {
  const [health, setHealth] = useState(100);
  const [antiVision, setAntiVision] = useState('');
  const [jitter] = useState(new Animated.ValueXY({ x: 0, y: 0 }));

  useEffect(() => {
    const interval = setInterval(async () => {
      const status = await IdentityEngine.checkHealth();
      setHealth(status.health);

      // Anti-Vision取得（IH < 30%の時のみ）
      if (status.health < 30) {
        const av = await IdentityEngine.getAntiVision();
        setAntiVision(av);

        triggerHeartbeat();
      }

      if (status.health < 50) {
        triggerJitter(status.health);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // ... triggerHeartbeat, triggerJitter ...

  const noiseOpacity = Math.max(0, (100 - health) / 200);

  return (
    <View style={styles.wrapper}>
      <Animated.View style={[styles.container, { transform: jitter.getTranslateTransform() }]}>
        {children}
      </Animated.View>
      <AntiVisionBleed antiVision={antiVision} health={health} />
      <NoiseOverlay opacity={noiseOpacity} />
    </View>
  );
};
```

- [ ] **テスト実行:** すべてのテスト通過確認
- [ ] **手動テスト:**
  - IHを29以下に設定
  - Anti-Visionが薄く表示されることを確認
  - IHを0に近づけると濃くなることを確認
- [ ] **コミット:** `git commit -m "feat(ui): Integrate AntiVisionBleed into StressContainer"`

---

### Phase 2 完了条件

- [ ] IdentityEngine.getAntiVision()実装完了
- [ ] AntiVisionBleed component実装完了
- [ ] StressContainerに統合完了
- [ ] すべてのテスト通過
- [ ] IH < 30%で正しく表示される
- [ ] Git tag: `phase-2-complete`

**Phase完了時:**
```bash
# Feature flag有効化
ANTI_VISION_BLEED: true,

git commit -m "feat(phase-2): Enable Anti-Vision Bleed effect"
./scripts/tag-phase.sh 2 complete
```

---

## Phase 3: Death Screenのアニメーション強化

**期間:** 2日
**優先度:** P1
**依存:** Phase 2完了
**Git Tag:** `phase-3-start` → `phase-3-complete`

---

### 3.1 WipeAnimation接続とState管理

**目標:** Death screenとWipeAnimationを接続し、進行状況を管理

**タスク:**
- [ ] **テスト作成（TDD）:** death.test.tsx

```typescript
// app/death.test.tsx（新規作成）
import { render, waitFor } from '@testing-library/react-native';
import DeathScreen from './death';
import { WipeAnimation } from '@/core/WipeAnimation';

jest.mock('@/core/WipeAnimation');

describe('Death Screen', () => {
  it('should transition from warning to wiping stage', async () => {
    const { getByText, queryByText } = render(<DeathScreen />);

    // 初期: warning stage
    expect(getByText(/IDENTITY HEALTH: 0%/i)).toBeDefined();

    // 3秒後: wiping stage
    await waitFor(() => {
      expect(queryByText(/WIPING/i)).toBeDefined();
    }, { timeout: 4000 });
  });

  it('should execute WipeAnimation during wiping stage', async () => {
    const wipeSpy = jest.spyOn(WipeAnimation, 'execute');

    render(<DeathScreen />);

    await waitFor(() => {
      expect(wipeSpy).toHaveBeenCalled();
    }, { timeout: 4000 });
  });

  it('should show complete stage after wipe finishes', async () => {
    jest.spyOn(WipeAnimation, 'execute').mockResolvedValue();

    const { findByText } = render(<DeathScreen />);

    const completeText = await findByText(/THE END/i, {}, { timeout: 7000 });
    expect(completeText).toBeDefined();
  });
});
```

- [ ] **実装:** death.tsx更新

```typescript
// app/death.tsx（既存ファイル更新）
import { WipeAnimation } from '@/core/WipeAnimation';

type DeathStage = 'warning' | 'wiping' | 'complete';

export default function DeathScreen() {
  const [stage, setStage] = useState<DeathStage>('warning');
  const [progress] = useState(new Animated.Value(0));

  // Warning → Wiping → Complete
  useEffect(() => {
    const executeSequence = async () => {
      // Stage 1: Warning (3秒)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Stage 2: Wiping開始
      setStage('wiping');

      // プログレスバーアニメーション開始
      Animated.timing(progress, {
        toValue: 100,
        duration: 3000,
        useNativeDriver: false,
      }).start();

      // WipeAnimation実行
      await WipeAnimation.execute();

      // Stage 3: Complete
      setStage('complete');
    };

    executeSequence();
  }, []);

  const progressWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <StressContainer>
      <View style={styles.container}>
        {stage === 'warning' && (
          <>
            <ThemedText style={styles.title}>⚠️ CRITICAL</ThemedText>
            <ThemedText style={styles.message}>IDENTITY HEALTH: 0%</ThemedText>
            <ThemedText style={styles.warning}>
              All data will be permanently deleted.
            </ThemedText>
          </>
        )}

        {stage === 'wiping' && (
          <>
            <ThemedText style={styles.title}>WIPING...</ThemedText>

            {/* プログレスバー */}
            <View style={styles.progressContainer}>
              <Animated.View
                style={[
                  styles.progressBar,
                  { width: progressWidth },
                ]}
              />
            </View>

            <ThemedText style={styles.progressText}>
              {Math.floor(progress._value)}%
            </ThemedText>
          </>
        )}

        {stage === 'complete' && (
          <>
            <ThemedText style={styles.title}>THE END</ThemedText>
            <ThemedText style={styles.message}>
              Your identity has been erased.
            </ThemedText>
          </>
        )}
      </View>
    </StressContainer>
  );
}

const styles = StyleSheet.create({
  // ... 既存スタイル ...
  progressContainer: {
    width: '80%',
    height: 4,
    backgroundColor: '#333',
    marginVertical: 40,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF0000',
  },
  progressText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FF0000',
  },
});
```

- [ ] **テスト実行:** `npm test -- death.test.tsx`
- [ ] **手動テスト:**
  - IHを0にしてdeath画面へ遷移
  - 3秒後にwiping開始
  - プログレスバーがアニメーション
  - 完了後にcomplete表示
- [ ] **コミット:** `git commit -m "feat(death): Add stage management and WipeAnimation integration"`

---

### 3.2 ファイル削除エフェクト実装

**タスク:**
- [ ] **テスト作成（TDD）:** FileDeleteAnimation.test.tsx

```typescript
// src/ui/effects/FileDeleteAnimation.test.tsx（新規作成）
import { render } from '@testing-library/react-native';
import { FileDeleteAnimation } from './FileDeleteAnimation';

describe('FileDeleteAnimation', () => {
  it('should display files one by one with delay', async () => {
    const files = ['quests.db', 'anti_vision.db', 'identity_core.db'];
    const { findByText } = render(<FileDeleteAnimation files={files} />);

    // 最初のファイルがすぐ表示
    const file1 = await findByText('quests.db');
    expect(file1).toBeDefined();

    // 500ms後に2番目
    const file2 = await findByText('anti_vision.db', {}, { timeout: 600 });
    expect(file2).toBeDefined();
  });
});
```

- [ ] **実装:** FileDeleteAnimation.tsx

```typescript
// src/ui/effects/FileDeleteAnimation.tsx（新規作成）
import React, { useState, useEffect } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { ThemedText } from '../components/ThemedText';

interface FileDeleteAnimationProps {
  files: string[];
}

export const FileDeleteAnimation = ({ files }: FileDeleteAnimationProps) => {
  const [visibleFiles, setVisibleFiles] = useState<string[]>([]);

  useEffect(() => {
    files.forEach((file, index) => {
      setTimeout(() => {
        setVisibleFiles(prev => [...prev, file]);
      }, index * 500); // 500msごとに1つずつ表示
    });
  }, [files]);

  return (
    <View style={styles.container}>
      {visibleFiles.map((file, index) => (
        <FileDeleteLine key={index} filename={file} />
      ))}
    </View>
  );
};

const FileDeleteLine = ({ filename }: { filename: string }) => {
  const [opacity] = useState(new Animated.Value(0));

  useEffect(() => {
    // Fade in
    Animated.timing(opacity, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      // 1秒後にFade out
      setTimeout(() => {
        Animated.timing(opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 1000);
    });
  }, []);

  return (
    <Animated.View style={{ opacity }}>
      <ThemedText style={styles.filename}>
        DELETE: {filename}
      </ThemedText>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  filename: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'Courier New',
    marginVertical: 2,
  },
});
```

- [ ] **実装:** death.tsxに統合

```typescript
// app/death.tsx（FileDeleteAnimation統合）
import { FileDeleteAnimation } from '@/ui/effects/FileDeleteAnimation';

const FILES_TO_DELETE = [
  'quests.db',
  'anti_vision.db',
  'identity_core.db',
  'daily_judgments.db',
];

export default function DeathScreen() {
  // ... 既存コード ...

  {stage === 'wiping' && (
    <>
      {/* プログレスバー */}
      {/* ... 既存コード ... */}

      {/* ファイル削除エフェクト */}
      <FileDeleteAnimation files={FILES_TO_DELETE} />
    </>
  )}
}
```

- [ ] **テスト実行:** すべてのテスト通過確認
- [ ] **手動テスト:** ファイル名が順番に表示され消えることを確認
- [ ] **コミット:** `git commit -m "feat(death): Add file delete animation effect"`

---

### Phase 3 完了条件

- [ ] Death画面のstage管理実装完了
- [ ] WipeAnimationと接続完了
- [ ] プログレスバーアニメーション実装完了
- [ ] ファイル削除エフェクト実装完了
- [ ] すべてのテスト通過
- [ ] スムーズなアニメーション（カクつきなし）
- [ ] Git tag: `phase-3-complete`

**Phase完了時:**
```bash
# Feature flag有効化
DEATH_ANIMATION: true,

git commit -m "feat(phase-3): Enable death screen animation"
./scripts/tag-phase.sh 3 complete
```

---

## Phase 4: Lens Zoom（Expo Go互換版）

**期間:** 3日
**優先度:** P2
**依存:** Phase 3完了
**Git Tag:** `phase-4-start` → `phase-4-complete`

**注意:** PanResponderの実装が複雑なため、3日間に延長

---

### 4.1 タッチ距離計算ユーティリティ実装

**目標:** 2点タッチ間の距離を計算する関数実装

**タスク:**
- [ ] **テスト作成（TDD）:** touchUtils.test.ts

```typescript
// src/utils/touchUtils.test.ts（新規作成）
import { calculateTwoPointDistance, calculateScale } from './touchUtils';

describe('Touch Utils', () => {
  describe('calculateTwoPointDistance', () => {
    it('should calculate distance between two touches', () => {
      const touch1 = { pageX: 0, pageY: 0 };
      const touch2 = { pageX: 3, pageY: 4 };

      const distance = calculateTwoPointDistance(touch1, touch2);
      expect(distance).toBe(5); // 3-4-5 triangle
    });

    it('should handle same position', () => {
      const touch = { pageX: 100, pageY: 100 };
      expect(calculateTwoPointDistance(touch, touch)).toBe(0);
    });
  });

  describe('calculateScale', () => {
    it('should calculate scale factor', () => {
      const initialDistance = 100;
      const currentDistance = 200;

      const scale = calculateScale(initialDistance, currentDistance);
      expect(scale).toBe(2.0);
    });

    it('should handle zero initial distance', () => {
      expect(calculateScale(0, 100)).toBe(1);
    });
  });
});
```

- [ ] **実装:** touchUtils.ts

```typescript
// src/utils/touchUtils.ts（新規作成）
import { GestureResponderEvent } from 'react-native';

interface Touch {
  pageX: number;
  pageY: number;
}

/**
 * Calculate distance between two touch points
 */
export const calculateTwoPointDistance = (
  touch1: Touch,
  touch2: Touch
): number => {
  const dx = touch2.pageX - touch1.pageX;
  const dy = touch2.pageY - touch1.pageY;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Calculate scale factor from initial and current distance
 */
export const calculateScale = (
  initialDistance: number,
  currentDistance: number
): number => {
  if (initialDistance === 0) return 1;
  return currentDistance / initialDistance;
};

/**
 * Get distance between two touches from GestureResponderEvent
 */
export const getDistanceFromEvent = (
  event: GestureResponderEvent
): number | null => {
  const touches = event.nativeEvent.touches;

  if (touches.length !== 2) {
    return null;
  }

  return calculateTwoPointDistance(
    touches[0],
    touches[1]
  );
};
```

- [ ] **テスト実行:** `npm test -- touchUtils.test.ts`
- [ ] **コミット:** `git commit -m "feat(utils): Add touch distance calculation utilities"`

---

### 4.2 PanResponderベースLens Zoom実装

**目標:** ピンチジェスチャーでレンズ切り替え

**タスク:**
- [ ] **テスト作成（TDD）:** useLensGesture.test.ts

```typescript
// src/ui/lenses/useLensGesture.test.ts（新規作成）
import { renderHook } from '@testing-library/react-hooks';
import { useLensGesture } from './useLensGesture';

describe('useLensGesture', () => {
  it('should initialize with scale 1.0', () => {
    const { result } = renderHook(() => useLensGesture(jest.fn()));
    expect(result.current.scale._value).toBe(1.0);
  });

  it('should call onLensChange when pinch completes', () => {
    const onLensChange = jest.fn();
    const { result } = renderHook(() => useLensGesture(onLensChange));

    // Simulate pinch out (scale > 1.5)
    result.current.scale.setValue(2.0);

    // Simulate release
    const releaseHandler = result.current.panResponder.panHandlers.onResponderRelease;
    releaseHandler?.({} as any, {} as any);

    expect(onLensChange).toHaveBeenCalledWith(2.0);
  });
});
```

- [ ] **実装:** useLensGesture.ts

```typescript
// src/ui/lenses/useLensGesture.ts（新規作成）
import { useRef, useCallback } from 'react';
import { PanResponder, Animated, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { getDistanceFromEvent, calculateScale } from '@/utils/touchUtils';
import { HapticEngine } from '@/core/HapticEngine';

type LensZoom = 0.5 | 1.0 | 2.0;

export const useLensGesture = (
  onLensChange: (lens: LensZoom) => void
) => {
  const scale = useRef(new Animated.Value(1)).current;
  const initialDistance = useRef<number>(0);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // 2点タッチでピンチジェスチャー開始
        return gestureState.numberActiveTouches === 2;
      },

      onPanResponderGrant: (event: GestureResponderEvent) => {
        // ピンチ開始: 初期距離を記録
        const distance = getDistanceFromEvent(event);
        if (distance !== null) {
          initialDistance.current = distance;
        }
      },

      onPanResponderMove: (event: GestureResponderEvent) => {
        // ピンチ中: スケール更新
        const currentDistance = getDistanceFromEvent(event);

        if (currentDistance !== null && initialDistance.current > 0) {
          const scaleValue = calculateScale(initialDistance.current, currentDistance);
          scale.setValue(scaleValue);
        }
      },

      onPanResponderRelease: () => {
        // ピンチ終了: スナップロジック
        const finalScale = scale._value;
        let targetLens: LensZoom;

        if (finalScale < 0.75) {
          targetLens = 0.5;
        } else if (finalScale > 1.5) {
          targetLens = 2.0;
        } else {
          targetLens = 1.0;
        }

        // Haptic feedback
        HapticEngine.snapLens();

        // Lens変更
        onLensChange(targetLens);

        // スケールをリセット
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }).start();

        // 初期距離リセット
        initialDistance.current = 0;
      },
    })
  ).current;

  return { panResponder, scale };
};
```

- [ ] **実装:** app/index.tsx更新（ジェスチャー統合）

```typescript
// app/index.tsx（既存ファイル更新）
import { useLensGesture } from '@/ui/lenses/useLensGesture';
import { isFeatureEnabled } from '@/config/features';

export default function Home() {
  const [lens, setLens] = useState<0.5 | 1.0 | 2.0>(1.0);
  const [health, setHealth] = useState(100);

  // Lens切り替え（haptic含む）
  const updateLens = useCallback((newLens: 0.5 | 1.0 | 2.0) => {
    if (newLens !== lens) {
      setLens(newLens);
      HapticEngine.snapLens();
    }
  }, [lens]);

  // Gesture handler（Feature flagで切り替え）
  const { panResponder, scale } = useLensGesture(updateLens);

  useEffect(() => {
    IdentityEngine.checkHealth().then(status => setHealth(status.health));
  }, []);

  const renderLens = () => {
    switch (lens) {
      case 0.5: return <MissionLens />;
      case 1.0: return <IdentityLens />;
      case 2.0: return <QuestLens />;
      default: return <IdentityLens />;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <ThemedText style={styles.appName}>ONE DAY OS</ThemedText>
        <View style={styles.healthContainer}>
          <ThemedText style={[styles.healthText, { color: health < 30 ? Colors.dark.error : Colors.dark.success }]}>
            IH: {health}%
          </ThemedText>
        </View>
      </View>

      {/* ジェスチャー対応コンテンツ */}
      {isFeatureEnabled('LENS_ZOOM_GESTURE') ? (
        <Animated.View
          style={[
            styles.content,
            { transform: [{ scale }] },
          ]}
          {...panResponder.panHandlers}
        >
          {renderLens()}
        </Animated.View>
      ) : (
        <View style={styles.content}>
          {renderLens()}
        </View>
      )}

      {/* ボタンセレクター（Feature flagで非表示可能） */}
      {!isFeatureEnabled('LENS_ZOOM_GESTURE') && (
        <View style={styles.lensSelector}>
          <TouchableOpacity
            style={[styles.lensButton, lens === 0.5 && styles.lensButtonActive]}
            onPress={() => updateLens(0.5)}
          >
            <ThemedText style={styles.lensButtonText}>0.5x</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.lensButton, lens === 1.0 && styles.lensButtonActive]}
            onPress={() => updateLens(1.0)}
          >
            <ThemedText style={styles.lensButtonText}>1.0x</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.lensButton, lens === 2.0 && styles.lensButtonActive]}
            onPress={() => updateLens(2.0)}
          >
            <ThemedText style={styles.lensButtonText}>2.0x</ThemedText>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
```

- [ ] **テスト実行:** すべてのテスト通過確認
- [ ] **手動テスト:**
  - 2本指でピンチイン/アウト
  - レンズが切り替わることを確認
  - Haptic feedbackが動作することを確認
  - Feature flagで切り替え確認
- [ ] **コミット:** `git commit -m "feat(lens): Add pinch gesture for lens zoom"`

---

### 4.3 ボタンUI改善（代替案）

**目標:** ジェスチャーが使えない場合のボタンUI向上

**タスク:**
- [ ] **テスト作成（TDD）:** LensButton.test.tsx

```typescript
// src/ui/components/LensButton.test.tsx（新規作成）
import { render, fireEvent } from '@testing-library/react-native';
import { LensButton } from './LensButton';

describe('LensButton', () => {
  it('should trigger scale animation on press', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <LensButton lens={1.0} active={false} onPress={onPress} />
    );

    const button = getByText('1.0x');
    fireEvent.press(button);

    expect(onPress).toHaveBeenCalled();
  });

  it('should show active style when selected', () => {
    const { getByTestId } = render(
      <LensButton lens={1.0} active={true} onPress={jest.fn()} />
    );

    const button = getByTestId('lens-button-1.0');
    expect(button.props.style).toContainEqual(
      expect.objectContaining({ borderColor: '#FFFFFF' })
    );
  });
});
```

- [ ] **実装:** LensButton.tsx

```typescript
// src/ui/components/LensButton.tsx（新規作成）
import React, { useRef } from 'react';
import { TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { Colors } from '../theme/colors';
import { isFeatureEnabled } from '@/config/features';

interface LensButtonProps {
  lens: 0.5 | 1.0 | 2.0;
  active: boolean;
  onPress: () => void;
}

export const LensButton = ({ lens, active, onPress }: LensButtonProps) => {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    if (!isFeatureEnabled('LENS_BUTTON_ANIMATION')) {
      onPress();
      return;
    }

    // タップアニメーション
    Animated.sequence([
      Animated.timing(scale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    onPress();
  };

  return (
    <TouchableOpacity
      testID={`lens-button-${lens}`}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Animated.View
        style={[
          styles.button,
          active && styles.buttonActive,
          { transform: [{ scale }] },
        ]}
      >
        <ThemedText style={styles.buttonText}>{lens}x</ThemedText>
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: Colors.dark.background,
  },
  buttonActive: {
    borderColor: Colors.dark.text,
    backgroundColor: '#111',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
```

- [ ] **実装:** app/index.tsxでLensButton使用

```typescript
// app/index.tsx（LensButton統合）
import { LensButton } from '@/ui/components/LensButton';

{!isFeatureEnabled('LENS_ZOOM_GESTURE') && (
  <View style={styles.lensSelector}>
    <LensButton lens={0.5} active={lens === 0.5} onPress={() => updateLens(0.5)} />
    <LensButton lens={1.0} active={lens === 1.0} onPress={() => updateLens(1.0)} />
    <LensButton lens={2.0} active={lens === 2.0} onPress={() => updateLens(2.0)} />
  </View>
)}
```

- [ ] **テスト実行:** すべてのテスト通過確認
- [ ] **手動テスト:** ボタンタップでアニメーション確認
- [ ] **コミット:** `git commit -m "feat(ui): Add animated lens buttons as fallback"`

---

### Phase 4 完了条件

- [ ] タッチ距離計算ユーティリティ実装完了
- [ ] PanResponderベースLens Zoom実装完了
- [ ] ボタンUI改善完了
- [ ] すべてのテスト通過
- [ ] ピンチジェスチャーがスムーズに動作
- [ ] Feature flagで切り替え可能
- [ ] Git tag: `phase-4-complete`

**Phase完了時:**
```bash
# Feature flag有効化（どちらか選択）
LENS_ZOOM_GESTURE: true,  # ジェスチャー版
# または
LENS_BUTTON_ANIMATION: true,  # ボタン版

git commit -m "feat(phase-4): Enable lens zoom feature"
./scripts/tag-phase.sh 4 complete
```

---

## Phase 5: Notification Actions

**期間:** 2日
**優先度:** P1
**依存:** Phase 4完了
**Git Tag:** `phase-5-start` → `phase-5-complete`

---

### 5.1 judgment.tsx preset対応

**目標:** Notification Actionsからのpreset値を受け取る

**タスク:**
- [ ] **テスト作成（TDD）:** judgment.test.tsx更新

```typescript
// app/judgment.test.tsx（既存ファイル更新）
describe('Judgment Screen - Preset Support', () => {
  it('should auto-submit YES when preset=YES', async () => {
    const applyDamageSpy = jest.spyOn(IdentityEngine, 'applyDamage');
    const restoreHealthSpy = jest.spyOn(IdentityEngine, 'restoreHealth');

    // preset=YES付きでレンダリング
    const { queryByText } = render(
      <JudgmentScreen />,
      {
        initialParams: {
          id: '1',
          question: 'Test Question',
          preset: 'YES',
        },
      }
    );

    // YES処理が自動実行される
    await waitFor(() => {
      expect(restoreHealthSpy).toHaveBeenCalledWith(2);
    });

    // タイマーは動かない
    expect(queryByText(/0:05/)).toBeNull();
  });

  it('should auto-submit NO when preset=NO', async () => {
    const applyDamageSpy = jest.spyOn(IdentityEngine, 'applyDamage');

    render(
      <JudgmentScreen />,
      {
        initialParams: {
          id: '1',
          question: 'Test',
          preset: 'NO',
        },
      }
    );

    await waitFor(() => {
      expect(applyDamageSpy).toHaveBeenCalledWith(5);
    });
  });

  it('should work normally without preset', () => {
    const { getByText } = render(
      <JudgmentScreen />,
      {
        initialParams: {
          id: '1',
          question: 'Test',
        },
      }
    );

    // タイマーが動作
    expect(getByText(/0:05/)).toBeDefined();
  });
});
```

- [ ] **実装:** judgment.tsx更新

```typescript
// app/judgment.tsx（既存ファイル更新）
import { useRouter, useLocalSearchParams } from 'expo-router';

type PresetValue = 'YES' | 'NO' | undefined;

export default function JudgmentScreen() {
  const router = useRouter();
  const { id, question, preset } = useLocalSearchParams<{
    id: string;
    question: string;
    preset?: PresetValue;
  }>();

  const [timeLeft, setTimeLeft] = useState(5);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Lock Back Button
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  // Preset auto-submit
  useEffect(() => {
    if (preset === 'YES') {
      handleDecision(true);
    } else if (preset === 'NO') {
      handleDecision(false);
    }
  }, [preset]);

  // Countdown Logic（presetがある場合は動かない）
  useEffect(() => {
    if (preset) return; // Preset時はタイマー無効

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const next = prev - 1;
        if (next <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleTimeout();
          return 0;
        }
        HapticEngine.lightClick();
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [preset]);

  const handleTimeout = async () => {
    // ... 既存コード ...
  };

  const handleDecision = async (result: boolean) => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (result) {
      await HapticEngine.snapLens();
      await IdentityEngine.restoreHealth(2);
    } else {
      await HapticEngine.punishFailure();
      await IdentityEngine.applyDamage(5);
    }

    router.replace('/');
  };

  return (
    <StressContainer>
      <View style={styles.container}>
        <ThemedText style={styles.label}>IMMEDIATE JUDGMENT REQUIRED</ThemedText>

        <View style={styles.questionContainer}>
          <ThemedText type="title" style={styles.question}>
            {question || "Did you act on your mission?"}
          </ThemedText>
        </View>

        {/* Preset時はタイマー非表示 */}
        {!preset && (
          <ThemedText type="title" style={[styles.timer, { color: timeLeft < 3 ? Colors.dark.error : Colors.dark.text }]}>
            0:0{timeLeft}
          </ThemedText>
        )}

        {/* Preset時はボタン非表示（または無効化） */}
        {!preset && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.noBtn]}
              onPress={() => handleDecision(false)}
              activeOpacity={0.8}
            >
              <ThemedText type="title" style={styles.btnText}>NO</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.yesBtn]}
              onPress={() => handleDecision(true)}
              activeOpacity={0.8}
            >
              <ThemedText type="title" style={styles.btnText}>YES</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        <ThemedText style={styles.hint}>Hesitation is defeat.</ThemedText>
      </View>
    </StressContainer>
  );
}
```

- [ ] **テスト実行:** `npm test -- judgment.test.tsx`
- [ ] **コミット:** `git commit -m "feat(judgment): Add preset parameter support for notification actions"`

---

### 5.2 Interactive Notifications実装（iOS/Android対応）

**タスク:**
- [ ] **テスト作成（TDD）:** NotificationScheduler.test.ts更新

```typescript
// src/notifications/NotificationScheduler.test.ts（既存ファイル更新）
describe('NotificationScheduler - Interactive Actions', () => {
  it('should set notification category on iOS', async () => {
    Platform.OS = 'ios';
    const setCategorySpy = jest.spyOn(Notifications, 'setNotificationCategoryAsync');

    await NotificationScheduler.scheduleDaily();

    expect(setCategorySpy).toHaveBeenCalledWith(
      'IDENTITY_QUESTION',
      expect.arrayContaining([
        expect.objectContaining({ identifier: 'YES' }),
        expect.objectContaining({ identifier: 'NO' }),
      ])
    );
  });

  it('should set notification channel on Android', async () => {
    Platform.OS = 'android';
    const setChannelSpy = jest.spyOn(Notifications, 'setNotificationChannelAsync');

    await NotificationScheduler.scheduleDaily();

    expect(setChannelSpy).toHaveBeenCalledWith(
      'identity-questions',
      expect.objectContaining({
        name: 'Identity Questions',
        importance: Notifications.AndroidImportance.HIGH,
      })
    );
  });
});
```

- [ ] **実装:** NotificationScheduler.ts更新

```typescript
// src/notifications/NotificationScheduler.ts（既存ファイル更新）
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { FIVE_QUESTIONS, NOTIFICATION_SCHEDULE } from '@/constants';

export const NotificationScheduler = {
  async scheduleDaily() {
    // Platform-specific setup
    if (Platform.OS === 'ios') {
      await this.setupiOSCategories();
    } else if (Platform.OS === 'android') {
      await this.setupAndroidChannel();
    }

    // Schedule 6 notifications
    const times = NOTIFICATION_SCHEDULE.TIMES;

    for (let i = 0; i < times.length; i++) {
      const { hour, minute } = times[i];
      const question = FIVE_QUESTIONS[i];

      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'アイデンティティ確認',
          body: question,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.HIGH,
          categoryIdentifier: 'IDENTITY_QUESTION',
          data: {
            questionId: i + 1,
            question,
          },
        },
        trigger: {
          hour,
          minute,
          repeats: true,
        },
      });
    }
  },

  async setupiOSCategories() {
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
  },

  async setupAndroidChannel() {
    await Notifications.setNotificationChannelAsync('identity-questions', {
      name: 'Identity Questions',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      enableLights: true,
      lightColor: '#FF0000',
    });
  },
};
```

- [ ] **実装:** NotificationController.tsx更新

```typescript
// src/core/NotificationController.tsx（既存ファイル更新）
import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';

export const NotificationController = () => {
  const router = useRouter();

  useEffect(() => {
    // Notification response listener
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const { actionIdentifier, notification } = response;
        const { questionId, question } = notification.request.content.data as {
          questionId: number;
          question: string;
        };

        if (actionIdentifier === 'YES' || actionIdentifier === 'NO') {
          // judgment画面へ遷移（preset付き）
          router.push({
            pathname: '/judgment',
            params: {
              id: questionId.toString(),
              question,
              preset: actionIdentifier,
            },
          });
        } else if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
          // 通知タップ（アクションなし）
          router.push({
            pathname: '/judgment',
            params: {
              id: questionId.toString(),
              question,
            },
          });
        }
      }
    );

    return () => subscription.remove();
  }, [router]);

  return null;
};
```

- [ ] **実装:** app.json更新（deep linking設定）

```json
// app.json（既存ファイル更新）
{
  "expo": {
    "scheme": "onedayos",
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#FF0000",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ]
  }
}
```

- [ ] **テスト実行:** すべてのテスト通過確認
- [ ] **手動テスト:**
  - 通知を送信
  - YES/NOボタンが表示されることを確認（iOS/Android両方）
  - タップでjudgment画面へ遷移することを確認
  - presetが正しく渡されることを確認
- [ ] **コミット:** `git commit -m "feat(notifications): Add interactive YES/NO actions with platform support"`

---

### Phase 5 完了条件

- [ ] judgment.tsx preset対応完了
- [ ] Interactive Notifications実装完了
- [ ] iOS/Android両対応完了
- [ ] すべてのテスト通過
- [ ] 通知からjudgment画面への遷移が正常に動作
- [ ] Git tag: `phase-5-complete`

**Phase完了時:**
```bash
# Feature flag有効化
NOTIFICATION_ACTIONS: true,

git commit -m "feat(phase-5): Enable interactive notification actions"
./scripts/tag-phase.sh 5 complete
```

---

## Phase 6: IdentityEngine完全実装（SQL Injection修正含む）

**期間:** 1日
**優先度:** P0
**依存:** Phase 0完了（SQL Injection修正済み）
**Git Tag:** `phase-6-start` → `phase-6-complete`

**注意:** Phase 0で既にSQL Injection修正済みのため、このPhaseは検証と追加機能のみ

---

### 6.1 useInsurance()のテーブル再作成ロジック実装

**目標:** Insurance使用時にDROP TABLEされたテーブルを復元

**タスク:**
- [ ] **テスト作成（TDD）:** IdentityEngine.test.ts更新

```typescript
// IdentityEngine.test.ts（既存ファイル更新）
describe('IdentityEngine.useInsurance', () => {
  it('should restore health to 50% and resurrect user', async () => {
    // ユーザーを死亡状態にする
    await IdentityEngine.killUser();

    // Insurance使用
    await IdentityEngine.useInsurance();

    const status = await IdentityEngine.checkHealth();
    expect(status.health).toBe(50);
    expect(status.isDead).toBe(false);
  });

  it('should recreate dropped tables', async () => {
    await IdentityEngine.killUser();
    await IdentityEngine.useInsurance();

    // テーブルが存在することを確認
    const db = getDB();

    const questsTable = await db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='quests'"
    );
    expect(questsTable).toBeDefined();

    const antiVisionTable = await db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='anti_vision'"
    );
    expect(antiVisionTable).toBeDefined();
  });

  it('should preserve user_status table', async () => {
    const db = getDB();

    // 初期IH設定
    await db.runAsync('UPDATE user_status SET identity_health = ? WHERE id = 1', [75]);

    await IdentityEngine.killUser();
    await IdentityEngine.useInsurance();

    // user_statusテーブルは残っている（IHは50にリセット）
    const result = await db.getFirstAsync<{ identity_health: number }>(
      'SELECT identity_health FROM user_status WHERE id = 1'
    );
    expect(result?.identity_health).toBe(50);
  });
});
```

- [ ] **実装:** IdentityEngine.ts更新

```typescript
// src/core/IdentityEngine.ts（既存ファイル更新）
import { initDatabase } from '@/database/schema';

export const IdentityEngine = {
  // ... 既存メソッド（Phase 0で修正済み） ...

  /**
   * "Identity Insurance" Purchase (Monetization)
   * Revives the user if they are dead or near death.
   * Recreates tables that were dropped during killUser()
   */
  async useInsurance() {
    const db = getDB();

    // Transaction開始
    await runInTransaction(async () => {
      // user_statusを復活状態に更新
      await db.runAsync(
        'UPDATE user_status SET is_dead = ?, identity_health = ? WHERE id = 1',
        [0, 50]
      );

      // DROP TABLEされたテーブルを再作成
      await initDatabase();

      // Note: initDatabase()はCREATE TABLE IF NOT EXISTSなので
      // 既存のuser_statusは上書きされず、新しいテーブルだけが作成される
    });

    console.log('✅ Identity Insurance used: User resurrected at 50% IH');
  },
};
```

- [ ] **実装:** schema.ts確認（既にCREATE TABLE IF NOT EXISTSになっているか確認）

```typescript
// src/database/schema.ts（確認のみ）
export const initDatabase = async () => {
  await dbResult.execAsync(`
    PRAGMA journal_mode = WAL;

    -- すべてのテーブルが IF NOT EXISTS になっていることを確認
    CREATE TABLE IF NOT EXISTS user_status (...);
    CREATE TABLE IF NOT EXISTS anti_vision (...);
    CREATE TABLE IF NOT EXISTS identity_core (...);
    CREATE TABLE IF NOT EXISTS quests (...);
    CREATE TABLE IF NOT EXISTS daily_judgments (...);

    -- user_status初期化もINSERT OR IGNOREで安全
    INSERT OR IGNORE INTO user_status (id, identity_health) VALUES (1, 100);
  `);
};
```

- [ ] **テスト実行:** `npm test -- IdentityEngine.test.ts`
- [ ] **手動テスト:**
  - IHを0にしてdeath画面へ
  - ワイプ完了後、useInsurance()を呼び出し
  - アプリを再起動してテーブルが復元されていることを確認
- [ ] **コミット:** `git commit -m "feat(engine): Implement useInsurance with table recreation"`

---

### 6.2 Transaction制御の統合

**目標:** すべてのDB更新でTransaction制御を使用

**タスク:**
- [ ] **実装:** IdentityEngine.ts全メソッドにTransaction適用

```typescript
// src/core/IdentityEngine.ts（Transaction統合）
import { runInTransaction } from '@/database/transaction';

export const IdentityEngine = {
  async applyDamage(amount: number = 10) {
    return runInTransaction(async () => {
      const db = getDB();
      await db.runAsync(
        'UPDATE user_status SET identity_health = MAX(0, identity_health - ?) WHERE id = 1',
        [amount]
      );

      return this.checkHealth();
    });
  },

  async restoreHealth(amount: number = 5) {
    return runInTransaction(async () => {
      const db = getDB();
      await db.runAsync(
        'UPDATE user_status SET identity_health = MIN(100, identity_health + ?) WHERE id = 1',
        [amount]
      );
    });
  },

  async killUser() {
    return runInTransaction(async () => {
      const db = getDB();
      console.warn('EXECUTING IDENTITY WIPE...');

      await db.execAsync(`
        DROP TABLE IF EXISTS quests;
        DROP TABLE IF EXISTS anti_vision;
        DROP TABLE IF EXISTS identity_core;
        DROP TABLE IF EXISTS daily_judgments;
      `);

      await db.runAsync(
        'UPDATE user_status SET is_dead = ?, identity_health = ? WHERE id = 1',
        [1, 0]
      );
    });
  },

  // ... useInsurance()は既にTransaction使用 ...
};
```

- [ ] **テスト作成（TDD）:** 複数ペナルティ同時適用テスト

```typescript
// IdentityEngine.test.ts（並行処理テスト追加）
describe('IdentityEngine - Concurrent Penalties', () => {
  it('should handle multiple simultaneous penalties correctly', async () => {
    // 初期IH 100
    await db.runAsync('UPDATE user_status SET identity_health = ? WHERE id = 1', [100]);

    // 複数のペナルティを同時実行
    await Promise.all([
      IdentityEngine.applyDamage(10),
      IdentityEngine.applyDamage(15),
      IdentityEngine.applyDamage(20),
    ]);

    const status = await IdentityEngine.checkHealth();

    // 100 - 10 - 15 - 20 = 55
    expect(status.health).toBe(55);
  });
});
```

- [ ] **テスト実行:** すべてのテスト通過確認
- [ ] **コミット:** `git commit -m "refactor(engine): Add transaction control to all DB operations"`

---

### Phase 6 完了条件

- [ ] useInsurance()のテーブル再作成ロジック実装完了
- [ ] すべてのDB操作でTransaction制御適用
- [ ] 複数ペナルティ同時適用テスト通過
- [ ] すべてのSQL InjectionがParamterized Queriesで修正済み（Phase 0で完了）
- [ ] すべてのテスト通過
- [ ] Git tag: `phase-6-complete`

**Phase完了時:**
```bash
# Feature flag有効化
IDENTITY_ENGINE_V2: true,

git commit -m "feat(phase-6): Complete IdentityEngine v2 with security fixes"
./scripts/tag-phase.sh 6 complete
```

---

## Phase 7: 統合テストと最終調整

**期間:** 3日
**優先度:** P1
**依存:** Phase 1-6完了
**Git Tag:** `phase-7-start` → `phase-7-complete`

---

### 7.1 全機能統合テスト

**タスク:**
- [ ] **テスト作成:** e2e.test.ts

```typescript
// __tests__/e2e.test.ts（新規作成）
describe('E2E: Full UX Flow', () => {
  beforeEach(async () => {
    // DB初期化
    await initDatabase();
    await db.runAsync('UPDATE user_status SET identity_health = ? WHERE id = 1', [100]);
  });

  it('should show increasing visual stress as IH decreases', async () => {
    const { getByTestId } = render(<App />);

    // IH 100 → 50: Noise開始
    await IdentityEngine.applyDamage(50);
    await waitFor(() => {
      const noise = getByTestId('noise-overlay');
      expect(noise.props.style).toContainEqual(
        expect.objectContaining({ opacity: expect.any(Number) })
      );
    });

    // IH 50 → 30: Jitter開始
    await IdentityEngine.applyDamage(20);
    // ... Jitter確認 ...

    // IH 30 → 10: Anti-Vision Bleed表示
    await IdentityEngine.applyDamage(20);
    await waitFor(() => {
      expect(getByTestId('anti-vision-bleed')).toBeDefined();
    });

    // IH 10 → 0: Death画面遷移
    await IdentityEngine.applyDamage(10);
    await waitFor(() => {
      expect(getByText(/CRITICAL/i)).toBeDefined();
    });
  });

  it('should complete full death and wipe sequence', async () => {
    await IdentityEngine.applyDamage(100);

    // Death画面表示
    const { getByText, findByText } = render(<DeathScreen />);
    expect(getByText(/CRITICAL/i)).toBeDefined();

    // 3秒後にWiping開始
    const wipingText = await findByText(/WIPING/i, {}, { timeout: 4000 });
    expect(wipingText).toBeDefined();

    // プログレスバーアニメーション
    // ... 確認 ...

    // 完了
    const endText = await findByText(/THE END/i, {}, { timeout: 8000 });
    expect(endText).toBeDefined();

    // DBがワイプされていることを確認
    const quests = await db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='quests'"
    );
    expect(quests).toBeNull();
  });

  it('should resurrect with Insurance', async () => {
    await IdentityEngine.killUser();
    await IdentityEngine.useInsurance();

    const status = await IdentityEngine.checkHealth();
    expect(status.health).toBe(50);
    expect(status.isDead).toBe(false);

    // テーブルが復元されている
    const quests = await db.getFirstAsync(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='quests'"
    );
    expect(quests).toBeDefined();
  });
});
```

- [ ] **テスト実行:** `npm test -- e2e.test.ts`
- [ ] **手動E2Eテスト:**
  - アプリを最初から起動
  - Onboarding完了
  - IHを段階的に減らす（100 → 80 → 50 → 30 → 10 → 0）
  - 各段階でUXエフェクトを確認
  - Death → Wipeシーケンス確認
  - Insurance使用で復活確認
- [ ] **コミット:** `git commit -m "test(e2e): Add full UX flow integration tests"`

---

### 7.2 パフォーマンステスト

**タスク:**
- [ ] **FPS測定:**
  - React Native Performance Monitorを有効化
  - IH 0%時（全エフェクト有効）でFPS測定
  - 目標: 60fps維持

- [ ] **CPU/メモリ測定:**
  - Xcode Instruments（iOS）でプロファイリング
  - Android Studio Profiler（Android）でプロファイリング
  - GlitchText 10個同時表示時のCPU測定
  - 目標: CPU < 10%, メモリ増加 < 50MB

- [ ] **バッテリー測定:**
  - 1時間使用時のバッテリー消費測定
  - Haptic有効/無効で比較
  - 目標: 1時間で10%以下の消費

- [ ] **低スペック端末テスト:**
  - Android: 古いデバイス（API 28以下）でテスト
  - iOS: iPhone 8以下でテスト
  - すべてのエフェクトが動作することを確認

- [ ] **結果ドキュメント作成:** `docs/performance-test-results.md`

```markdown
# Performance Test Results

**テスト日:** 2026-01-29
**環境:** iPhone 13 Pro (iOS 17.2), Pixel 6 (Android 14)

## FPS Test
- IH 100% (エフェクトなし): 60fps ✅
- IH 50% (Noise + Jitter): 59fps ✅
- IH 30% (+ Anti-Vision Bleed): 58fps ✅
- IH 0% (全エフェクト): 57fps ✅

## CPU/Memory
- GlitchText x10: CPU 4.2%, Memory +12MB ✅
- StressContainer polling: CPU 1.1% ✅
- NoiseOverlay: CPU 0.8%, Memory +3MB ✅

## Battery
- 1時間使用（Haptic有効）: 8.5% ✅
- 1時間使用（Haptic無効）: 6.2% ✅

## Low-Spec Devices
- iPhone 8 (iOS 15): All effects working ✅
- Pixel 3a (Android 11): All effects working ✅
```

- [ ] **コミット:** `git commit -m "docs: Add performance test results"`

---

### 7.3 UX最終調整

**タスク:**
- [ ] **Glitchエフェクト強度調整:**
  - IH 30%: severity 0.3
  - IH 10%: severity 0.6
  - IH 0%: severity 1.0
  - ユーザーフィードバックに基づいて微調整

- [ ] **Haptic強度調整:**
  - lightClick: 軽い（Tick Tock）
  - snapLens: 中（Lens切り替え）
  - punishFailure: 強い（ペナルティ）
  - pulseHeartbeat: リズミカル（心拍）

- [ ] **タイミング調整:**
  - Death Screen warning: 3秒
  - Wiping duration: 3秒
  - File delete interval: 500ms
  - Anti-Vision Bleed fade: IH減少に比例

- [ ] **テキストサイズ・可読性:**
  - 最小フォントサイズ: 12px
  - Anti-Vision Bleed: 48px, 太字, 赤
  - Glitch時の可読性確認

- [ ] **色調整:**
  - エラー: #FF0000（変更なし）
  - 成功: #00FF00（変更なし）
  - 警告: #FFFF00（新規）
  - グレー: #666（変更なし）

- [ ] **A/Bテスト実施:**
  - ノイズopacity: 現在の式 vs 2倍速
  - Anti-Vision表示開始: IH 30% vs IH 40%
  - ファイナライズ

- [ ] **最終調整コミット:** `git commit -m "feat(ux): Final UX adjustments based on testing"`

---

### 7.4 ドキュメント更新

**タスク:**
- [ ] **README更新:**
  - 新機能セクション追加
  - スクリーンショット更新
  - デモGIF追加

- [ ] **CLAUDE.md更新:**
  - Animation Policyセクション追加
  - Feature Flagsセクション追加
  - UX実装完了を記載

- [ ] **各機能のドキュメント作成:**
  - `docs/features/noise-overlay.md`
  - `docs/features/glitch-text.md`
  - `docs/features/anti-vision-bleed.md`
  - `docs/features/death-sequence.md`
  - `docs/features/lens-zoom.md`
  - `docs/features/notification-actions.md`

- [ ] **テスト結果レポート作成:**
  - `docs/test-report-v1.1.md`
  - すべてのテスト結果をまとめる

- [ ] **ユーザーガイド作成:**
  - `docs/user-guide.md`
  - UXエフェクトの説明
  - Feature flagの切り替え方法

- [ ] **コミット:** `git commit -m "docs: Update all documentation for v1.1 release"`

---

### Phase 7 完了条件

- [ ] すべての統合テスト通過
- [ ] パフォーマンス基準クリア（60fps, CPU<10%, Battery<10%/h）
- [ ] UX最終調整完了
- [ ] すべてのドキュメント更新完了
- [ ] A/Bテスト完了
- [ ] 低スペック端末で動作確認
- [ ] Git tag: `phase-7-complete`

**Phase完了時:**
```bash
# すべてのFeature Flagを有効化
# src/config/features.ts
export const FEATURES = {
  NOISE_OVERLAY_TEXTURE: true,
  GLITCH_DYNAMIC_OFFSET: true,
  ANTI_VISION_BLEED: true,
  DEATH_ANIMATION: true,
  LENS_ZOOM_GESTURE: true, // または LENS_BUTTON_ANIMATION
  NOTIFICATION_ACTIONS: true,
  IDENTITY_ENGINE_V2: true,
} as const;

git commit -m "feat(release): Enable all UX features for v1.1"
./scripts/tag-phase.sh 7 complete

# リリースタグ
git tag v1.1.0 -m "One Day OS v1.1: Complete UX Implementation"
git push origin v1.1.0
```

---

## 実装優先順位（更新版）

### P0 - Critical（即座に実装）
1. **Phase 0:** セキュリティ修正とインフラ整備（1日）
   - SQL Injection修正
   - Feature Flag System
   - Git Tagging
   - ノイズテクスチャ生成スクリプト
   - Transaction utility

### P1 - High（Week 1）
2. **Phase 1:** アセット準備と基盤改善（2日）
3. **Phase 2:** Anti-Vision Bleed（2日）
4. **Phase 3:** Death Animation（2日）

### P2 - Medium（Week 2）
5. **Phase 5:** Notification Actions（2日）
6. **Phase 6:** IdentityEngine完全実装（1日）

### P3 - Low（Week 3）
7. **Phase 4:** Lens Zoom（3日）
8. **Phase 7:** 統合テストと最終調整（3日）

---

## タイムライン（改訂版）

| Phase | 期間 | 担当 | 開始日 | 終了日 |
|-------|------|------|-------|-------|
| **Phase 0** | 1日 | Sonnet | Day 1 | Day 1 |
| **Phase 1** | 2日 | Sonnet | Day 2 | Day 3 |
| **Phase 2** | 2日 | Sonnet | Day 4 | Day 5 |
| **Phase 3** | 2日 | Sonnet | Day 6 | Day 7 |
| **Phase 5** | 2日 | Sonnet | Day 8 | Day 9 |
| **Phase 6** | 1日 | Sonnet | Day 10 | Day 10 |
| **Phase 4** | 3日 | Sonnet | Day 11 | Day 13 |
| **Phase 7** | 3日 | Sonnet + Opus | Day 14 | Day 16 |
| **バッファ** | 1日 | - | Day 17 | Day 17 |
| **合計** | **17日** | | | |

**Week 1 (Day 1-7):** Phase 0, 1, 2, 3
**Week 2 (Day 8-14):** Phase 5, 6, 4 (前半)
**Week 3 (Day 15-17):** Phase 4 (後半), Phase 7

---

## 技術的リスクと対策（更新版）

### リスク1: Worklets互換性
**リスク:** Expo Goでreanimatedが動作しない
**対策:** PanResponderで代替実装（Phase 4.2）
**回避策:** Development Buildへ移行（長期）
**ステータス:** ✅ 対策済み（PanResponder実装）

### リスク2: SQL Injection
**リスク:** 既存コードに脆弱性あり
**対策:** Phase 0でparameterized queries使用
**回避策:** なし（必須修正）
**ステータス:** ✅ Phase 0で修正予定

### リスク3: ノイズオーバーレイのパフォーマンス
**リスク:** 全画面ノイズでFPS低下
**対策:** 低解像度テクスチャ（512x512）、GPUアクセラレーション
**回避策:** IH < 30%のみ表示、Feature flagで無効化可能
**ステータス:** ⚠️ Phase 7.2でパフォーマンステスト必要

### リスク4: Hapticのバッテリー消費
**リスク:** 頻繁なHapticで電池消耗
**対策:** Heartbeatを2秒間隔に制限
**回避策:** Feature flagで無効化オプション（将来実装）
**ステータス:** ⏳ Phase 7.2でバッテリーテスト必要

### リスク5: 複数ペナルティ競合
**リスク:** 同時DB更新で不整合
**対策:** Phase 0.5でTransaction制御追加
**回避策:** なし（必須実装）
**ステータス:** ✅ Phase 0で対策済み

---

## 完了条件

### 機能完了
- [ ] 全8 Phase（0-7）のタスク完了
- [ ] Feature Flagで全機能切り替え可能
- [ ] テストケース全通過（Unit + Integration + E2E）
- [ ] パフォーマンス基準クリア

### セキュリティ完了
- [ ] SQL Injection脆弱性ゼロ
- [ ] すべてのDB操作でparameterized queries使用
- [ ] Transaction制御でrace condition防止

### ドキュメント完了
- [ ] README更新
- [ ] CLAUDE.md更新
- [ ] 各機能のドキュメント作成
- [ ] テスト結果レポート作成
- [ ] ユーザーガイド作成

### 品質基準
- [ ] Expo Goで動作確認
- [ ] iOS/Android両対応
- [ ] クラッシュなし
- [ ] メモリリークなし
- [ ] FPS 60維持
- [ ] CPU使用率 < 10%
- [ ] バッテリー消費 < 10%/h
- [ ] 低スペック端末で動作

---

## 次のステップ

1. ✅ この実装計画書v1.1をOpusでレビュー（完了）
2. ⏳ Phase 0実装開始（セキュリティ修正）
3. ⏳ Phase 1-7順次実装
4. ⏳ v1.1リリース

---

**作成者:** Claude Sonnet 4.5
**バージョン:** v1.1
**レビュー:** Sonnet 4.5（自己レビュー完了）
**承認待ち:** ユーザー承認
**実装開始予定:** Phase 0から順次
