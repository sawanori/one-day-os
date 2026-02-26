# Identity Monetization 実装計画書 v2.0 (Corrected)

> **ステータス:** レビュー済み・全40件修正完了（CRITICAL 6, HIGH 7, MEDIUM 7, LOW 20）
> **作成日:** 2026-02-08
> **対象:** One Day OS - Identity Insurance (IAP)
> **前バージョン:** identity-monetization-implementation-plan.md (v1.0)

---

## 目次

1. [Executive Summary](#1-executive-summary)
2. [現状分析と既存バグ](#2-現状分析と既存バグ)
3. [アーキテクチャ設計](#3-アーキテクチャ設計)
4. [Phase 0: Pre-Implementation Fixes](#4-phase-0-pre-implementation-fixes)
5. [Phase 1: Infrastructure](#5-phase-1-infrastructure)
6. [Phase 2: Identity Backup System](#6-phase-2-identity-backup-system)
7. [Phase 3: Death Flow Rewrite](#7-phase-3-death-flow-rewrite)
8. [Phase 4: IAP Integration](#8-phase-4-iap-integration)
9. [Phase 5: Insurance UI](#9-phase-5-insurance-ui)
10. [Phase 6: Post-Purchase UX](#10-phase-6-post-purchase-ux)
11. [Phase 7: Testing & QA](#11-phase-7-testing--qa)
12. [Phase 8: App Store Submission](#12-phase-8-app-store-submission)
13. [リスク管理](#13-リスク管理)
14. [Issue Traceability Matrix](#14-issue-traceability-matrix)

---

## 1. Executive Summary

### 概要

Identity Insurance は、IH (Identity Health) が 0% に到達した瞬間にのみ提示される「屈辱的な延命」課金機能である。ユーザーの全データ削除プロセスの最中に、10秒間だけ購入の機会を与える。

### 核心仕様

| 項目 | 値 |
|------|-----|
| **トリガー** | IH = 0% (データ削除シーケンス中) |
| **価格** | Tier 10 (Store ローカライズ価格を表示: JPY=1,500 / USD=9.99) |
| **タイマー** | 10秒（IAP Store 処理中は一時停止） |
| **購入後IH** | 10% (現行の50%から変更) |
| **ラベル** | "PAID IDENTITY" 永久表示 |
| **商品タイプ** | Consumable（複数 life にわたり購入可、ただし同一 life 内は1回限り） |
| **App Store 申請名** | "Data Protection Pass" |
| **購入ボタンテキスト** | "I AM WEAK"（アプリ内ボタン。Apple Pay ダイアログ上ではない） |

### 修正対象の重大バグ (CRITICAL 6件)

| ID | 問題 | 修正方針 |
|----|------|----------|
| **C-1** | `death.tsx` が Stage 2 開始時点で即座に `wipeManager.executeWipe()` を実行。Insurance offer 前にデータ消失 | Wipe 実行を Stage 4b (FINAL_WIPE) に移動。Stage 1-3 は純粋にビジュアルのみ |
| **C-2** | `useInsurance()` が COALESCE で wiped data を参照。identity テーブル削除後は空文字にフォールバック | `identity_backup` テーブルで事前バックアップ。Insurance は backup から復元 |
| **C-3** | `judgment.tsx` が `router.replace('/despair')` に遷移。`app/despair.tsx` は存在しない | `router.replace('/death')` に修正 |
| **A-1** | 計画書とコードでルーティング先が不一致 | 統一: `/death` |
| **B-1** | `react-native-iap` には `expo-dev-client` + EAS Build が必須だが未記載 | Phase 1 に EAS Build セットアップ手順を追加 |
| **B-2** | Apple Pay ダイアログ上への "I AM WEAK" オーバーレイは技術的に不可能かつガイドライン違反 | アプリ内購入ボタンに "I AM WEAK" テキストを表示し、タップ後に IAP を programmatic に起動 |

---

## 2. 現状分析と既存バグ

### 2.1 ファイル構成（現状）

```
app/
  death.tsx              -- Death Screen (REWRITE対象)
  judgment.tsx           -- Judgment Screen (BUG: /despair ルーティング)
  onboarding/            -- Onboarding Flow
  _layout.tsx            -- Root Layout
src/
  config/features.ts     -- Feature Flags (INSURANCE_ENABLED 未追加)
  core/
    identity/
      IdentityEngine.ts  -- Singleton (useInsurance で IH=50, COALESCE問題)
      IdentityLifecycle.ts -- useInsurance() 実装 (C-2 バグ)
      WipeManager.ts     -- executeWipe() (VACUUM問題)
      IHCalculator.ts    -- IH計算ロジック
    despair/
      DespairModeManager.ts -- canResetup() = true (lockout無し)
    HapticEngine.ts      -- Haptic patterns (Insurance用 未追加)
  database/
    schema.ts            -- DB schema (identity_backup, insurance_purchases 未定義)
    client.ts            -- getDB(), getAppState(), updateAppState()
  ui/
    screens/
      InsuranceModal.tsx  -- 既存 (未使用、REWRITE対象)
      DespairScreen.tsx   -- Component (NOT a route)
```

### 2.2 Critical Bug: death.tsx の実行順序 (C-1)

**現在のコード** (`app/death.tsx` L70-94):

```
Stage 1: SENTENCING (2s) -- visual
Stage 2: WIPING -- Animated.timing(3s) + wipeManager.executeWipe() <-- 即座に全データ消失
Stage 3: VOID -- Insurance button 表示 <-- データ既に無い
```

`wipeManager.executeWipe()` は L85 で Stage 2 の冒頭に呼ばれる。progress bar アニメーション (3秒) の完了を待たず、即座にデータが削除される。Stage 3 (VOID) で Insurance ボタンが表示される時点では、identity テーブルは既に空。

**修正後のフロー:**

```
Stage 0: BACKUP (instant, invisible) -- identity_backup にデータ退避
Stage 1: SENTENCING (2s) -- visual only
Stage 2: WIPING_VISUAL (0->95%, 3s) -- animation ONLY, NO wipe
Stage 3: INSURANCE_OFFER (95% pause, 10s) -- if eligible
  |-- Purchase --> Stage 4a: REVIVAL
  |-- Decline/Timeout --> Stage 4b: FINAL_WIPE
Stage 4a: REVIVAL -- restore from backup, IH=10%, navigate to /
Stage 4b: FINAL_WIPE -- executeWipe() HERE ONLY --> navigate to /onboarding
```

### 2.3 Critical Bug: useInsurance() のデータ喪失 (C-2)

**現在のコード** (`src/core/identity/IdentityLifecycle.ts` L132-161):

```typescript
async useInsurance(): Promise<void> {
    return runInTransaction(async () => {
        await initDatabase();
        await this.db.runAsync('UPDATE app_state SET state = ? ...', ['active']);
        // Wipe後、identity テーブルは空
        // COALESCE が '' にフォールバック --> anti_vision, identity_statement, one_year_mission 全て空文字
        await this.db.runAsync(
            `INSERT OR REPLACE INTO identity (...) VALUES (
                1,
                COALESCE((SELECT anti_vision FROM identity WHERE id = 1), ''),     // <-- 空!
                COALESCE((SELECT identity_statement FROM identity WHERE id = 1), ''), // <-- 空!
                COALESCE((SELECT one_year_mission FROM identity WHERE id = 1), ''),   // <-- 空!
                ?,
                ...
            )`, [50]
        );
        this.syncIH(50);
    });
}
```

**修正:** Wipe 実行前に `identity_backup` テーブルにデータを退避。Insurance 購入時は backup から復元。

### 2.4 Routing Bug (C-3, A-1)

**現在:** `app/judgment.tsx` L134, L160: `router.replace('/despair')`
**問題:** `app/despair.tsx` は存在しない。`DespairScreen.tsx` は `src/ui/screens/` にある component であり route ではない。
**修正:** `router.replace('/death')` に変更。

### 2.5 Lockout 矛盾 (Issue #17)

**DespairModeManager** (`src/core/despair/DespairModeManager.ts`):
- `canResetup()` L144: `return true` (常時再セットアップ可能)
- `getRemainingLockoutMs()` L160: `return 0` (常時ゼロ)
- `hasLockoutPeriod()` L152: `return false`

**death.tsx** (`app/death.tsx`):
- L148-163: 24h lockout UI を表示
- L25: `const [remainingHours, setRemainingHours] = useState(24)`

**矛盾:** DespairModeManager は lockout を実装していないが、death.tsx は 24h lockout UI を表示している。

**修正方針:** DespairModeManager の仕様（lockout 無し、即時再セットアップ）を正とする。death.tsx の lockout UI は Phase 3 の全面書き換えで削除。Wipe 後は即座に `/onboarding` へ遷移。

---

## 3. アーキテクチャ設計

### 3.1 New Death Flow (完全版)

```
[IH reaches 0%]
    |
    +-- JudgmentEngine.recordResponse() returns { wipeTriggered: true }
    |   OR IdentityEngine penalty methods detect IH === 0
    |
    +-- judgment.tsx / penalty handler: router.replace('/death')  <-- FIX: was '/despair'
    |
    v
[Death Screen Entry]
    |
    +-- Stage 0: BACKUP (instant, invisible)
    |   +-- IdentityBackupManager.createBackup()
    |       +-- INSERT INTO identity_backup SELECT FROM identity WHERE id = 1
    |       +-- If backup fails: skip insurance offer (fail-safe)
    |
    +-- Stage 1: SENTENCING (2s)
    |   +-- "IDENTITY COLLAPSED." + subtext
    |   +-- HapticEngine.acceleratingHeartbeat()
    |
    +-- Stage 2: WIPING_VISUAL (0% -> 95%, 3s)
    |   +-- Progress bar animation ONLY
    |   +-- FileDeleteAnimation (visual only)
    |   +-- NO actual data deletion
    |
    +-- [Decision Point: Show Insurance?]
    |   +-- Check 1: isFeatureEnabled('INSURANCE_ENABLED')
    |   +-- Check 2: !hasBeenRevivedThisLife() (anti-abuse)
    |   +-- Check 3: IAPService.isAvailable()
    |   +-- Check 4: backup was created successfully
    |   |
    |   +-- ALL true --> Stage 3: INSURANCE_OFFER
    |   +-- ANY false --> Stage 4b: FINAL_WIPE
    |
    +-- Stage 3: INSURANCE_OFFER (10s countdown)
    |   +-- Screen flip + noise effect
    |   +-- InsuranceModal with countdown
    |   +-- HapticEngine.insuranceOffer() (ominous slow pulse)
    |   +-- Timer PAUSES during IAP Store processing (isPurchasing=true)
    |   |
    |   +-- Purchase Success --> Stage 4a: REVIVAL
    |   +-- Purchase Failure --> Resume timer, show error
    |   +-- Decline button --> Stage 4b: FINAL_WIPE
    |   +-- Timeout (10s) --> Stage 4b: FINAL_WIPE
    |
    +-- Stage 4a: REVIVAL
    |   +-- IAPService.finishTransaction()
    |   +-- applyInsurance():
    |   |   +-- Restore identity from identity_backup
    |   |   +-- Set IH = 10%
    |   |   +-- Set app_state.has_used_insurance = 1
    |   |   +-- Record in insurance_purchases table
    |   |   +-- Clean up identity_backup
    |   +-- HapticEngine.insurancePurchase() (unpleasant vibration)
    |   +-- Show "PAID IDENTITY" confirmation (2s)
    |   +-- IdentityEngine.setCurrentIH(10)
    |   +-- router.replace('/')
    |
    +-- Stage 4b: FINAL_WIPE
        +-- WipeManager.executeWipe() <-- ONLY HERE (actual data deletion)
        |   +-- DELETE FROM identity
        |   +-- DELETE FROM quests
        |   +-- DELETE FROM notifications
        |   +-- DELETE FROM daily_state
        |   +-- DELETE FROM identity_backup (cleanup)
        |   +-- UPDATE app_state (reset has_used_insurance, increment life_number)
        |   +-- INSERT INTO wipe_log
        |   +-- VACUUM (non-blocking, scheduled via setTimeout)
        +-- Progress bar 95% -> 100% animation (500ms)
        +-- Brief "void" display (1s)
        +-- router.replace('/onboarding')
```

### 3.2 新規ファイル一覧

```
src/
  core/
    insurance/
      InsuranceManager.ts         -- Insurance business logic (eligibility, apply, query)
      InsuranceManager.test.ts
      IdentityBackupManager.ts    -- identity_backup table management
      IdentityBackupManager.test.ts
      IAPService.ts               -- react-native-iap wrapper (singleton)
      IAPService.test.ts
      InsuranceAnalytics.ts       -- Event logging for conversion tracking
      types.ts                    -- Insurance-related type definitions
  database/
    migrations/
      001_insurance.ts            -- app_state column migration
eas.json                          -- EAS Build configuration
```

### 3.3 変更ファイル一覧

```
app/death.tsx                           -- REWRITE (new stage system)
app/judgment.tsx                        -- FIX routing ('/despair' -> '/death')
app/_layout.tsx                         -- ADD startup checks (pending transactions, interrupted death)
src/config/features.ts                  -- ADD INSURANCE_ENABLED flag
src/core/identity/IdentityLifecycle.ts  -- DEPRECATE useInsurance()
src/core/identity/WipeManager.ts        -- ADD identity_backup cleanup, non-blocking VACUUM
src/core/HapticEngine.ts                -- ADD insuranceOffer(), insurancePurchase()
src/database/schema.ts                  -- ADD identity_backup, insurance_purchases tables
src/constants/index.ts                  -- ADD INSURANCE_CONSTANTS
src/ui/screens/InsuranceModal.tsx       -- REWRITE (new props, B-2 fix, localized price)
src/ui/screens/InsuranceModal.test.tsx  -- REWRITE
app.json                                -- ADD expo-dev-client plugin, billing permission
package.json                            -- ADD react-native-iap, expo-dev-client
```

### 3.4 DB Schema Changes

#### New Table: `identity_backup`

```sql
-- Temporary table: saves identity data before death sequence begins.
-- Created at Death Screen Stage 0, read during insurance purchase,
-- deleted after insurance application or wipe execution.
CREATE TABLE IF NOT EXISTS identity_backup (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  anti_vision TEXT NOT NULL,
  identity_statement TEXT NOT NULL,
  one_year_mission TEXT NOT NULL,
  original_ih INTEGER NOT NULL,
  backed_up_at TEXT NOT NULL
);
```

**Lifecycle:**
1. Created: Death Screen Stage 0 (BACKUP) via `IdentityBackupManager.createBackup()`
2. Read: Insurance purchase success via `IdentityBackupManager.getBackup()`
3. Deleted: After insurance application (`clearBackup()`) OR during wipe (`DELETE FROM identity_backup`)

#### New Table: `insurance_purchases`

```sql
-- Permanent table: insurance purchase history (survives wipe, like wipe_log).
-- Used for "PAID IDENTITY" permanent watermark and analytics.
CREATE TABLE IF NOT EXISTS insurance_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  price_amount REAL,
  price_currency TEXT,
  life_number INTEGER NOT NULL DEFAULT 1,
  purchased_at TEXT NOT NULL,
  ih_before INTEGER NOT NULL,
  ih_after INTEGER NOT NULL
);
```

**Important:** This table is NOT included in `WipeManager.executeWipe()` DELETE targets. It persists across wipes, same as `wipe_log`.

#### Modified Table: `app_state` (column additions via migration)

```sql
-- Added via src/database/migrations/001_insurance.ts
ALTER TABLE app_state ADD COLUMN has_used_insurance INTEGER NOT NULL DEFAULT 0;
ALTER TABLE app_state ADD COLUMN life_number INTEGER NOT NULL DEFAULT 1;
```

- `has_used_insurance`: Whether insurance was used in the current "life" (resets to 0 on wipe)
- `life_number`: Increments each time a wipe occurs (used in insurance_purchases for tracking)

### 3.5 WipeManager Changes

**DELETE targets (updated):**

| Table | Action |
|-------|--------|
| `identity` | DELETE (all rows) |
| `quests` | DELETE (all rows) |
| `notifications` | DELETE (all rows) |
| `daily_state` | DELETE (all rows) |
| `identity_backup` | DELETE (all rows) -- NEW |
| `app_state` | UPDATE only (state='onboarding', has_used_insurance=0, life_number+=1) |
| `wipe_log` | PRESERVED (permanent) |
| `insurance_purchases` | PRESERVED (permanent) |
| `judgment_log` | PRESERVED (permanent) |
| `daily_judgment_schedule` | PRESERVED (permanent) |

**VACUUM change (Issue #11):** Move VACUUM to non-blocking background execution via `setTimeout` to prevent UI thread blocking.

---

## 4. Phase 0: Pre-Implementation Fixes

> **Purpose:** Fix existing bugs before implementing new features to ensure a clean baseline.
> **Duration:** 0.5 day
> **Dependencies:** None

### 4.1 Fix: judgment.tsx Routing Bug (C-3, A-1)

**File:** `app/judgment.tsx`

**Change 1:** L134-136 (inside `handleTimeout`):

```typescript
// BEFORE (BUG - route does not exist)
if (result.wipeTriggered) {
    router.replace('/despair');
    return;
}

// AFTER (FIX)
if (result.wipeTriggered) {
    router.replace('/death');
    return;
}
```

**Change 2:** L160-162 (inside `handleDecision`):

```typescript
// BEFORE (BUG - route does not exist)
if (judgmentResult.wipeTriggered) {
    router.replace('/despair');
    return;
}

// AFTER (FIX)
if (judgmentResult.wipeTriggered) {
    router.replace('/death');
    return;
}
```

### 4.2 Comprehensive Search for '/despair' References

Before committing the fix, search the entire codebase for other references to the `/despair` route:

```bash
grep -r "'/despair'" app/ src/ --include="*.ts" --include="*.tsx"
grep -r '"/despair"' app/ src/ --include="*.ts" --include="*.tsx"
```

Fix all occurrences to use `/death` instead.

### 4.3 Verification

- [ ] `judgment.tsx` routes to `/death` when `wipeTriggered=true`
- [ ] `app/death.tsx` renders correctly when navigated to from judgment
- [ ] No remaining references to `/despair` route in codebase
- [ ] All existing tests pass: `npm test`
- [ ] TypeScript check passes: `npx tsc --noEmit`

### 4.4 Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Other files reference `/despair` | Navigation failure | grep search in 4.2 catches all occurrences |
| Existing tests mock `/despair` route | Test failures | Update test mocks to use `/death` |

---

## 5. Phase 1: Infrastructure

> **Purpose:** IAP foundation, EAS Build environment, Feature Flag, schema migration
> **Duration:** 1 day
> **Dependencies:** Phase 0 complete

### 5.1 expo-dev-client + EAS Build Setup (B-1)

**Context:** `react-native-iap` includes native code and cannot run in Expo Go. A Development Build via `expo-dev-client` is required.

#### Step 1: Package Installation

```bash
npx expo install expo-dev-client
npm install react-native-iap@^12.0.0
```

**File:** `package.json` additions:
```json
{
  "dependencies": {
    "expo-dev-client": "~6.0.0",
    "react-native-iap": "^12.0.0"
  }
}
```

#### Step 2: app.json Updates

**File:** `app.json`

```json
{
  "expo": {
    "plugins": [
      "expo-dev-client",
      "expo-router",
      "expo-localization",
      ["expo-notifications", { "sounds": [] }]
    ],
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.nonturn.onedayos",
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"],
        "SKPaymentTransactionObserver": true
      }
    },
    "android": {
      "package": "com.nonturn.onedayos",
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#000000"
      },
      "permissions": [
        "POST_NOTIFICATIONS",
        "SCHEDULE_EXACT_ALARM",
        "com.android.vending.BILLING"
      ],
      "allowBackup": false,
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false
    }
  }
}
```

Key additions:
- `expo-dev-client` plugin
- `bundleIdentifier` for iOS (required for IAP)
- `SKPaymentTransactionObserver` in InfoPlist
- `com.android.vending.BILLING` permission for Android
- `package` for Android (required for IAP)

#### Step 3: EAS Configuration

```bash
npm install -g eas-cli
eas init
eas build:configure
```

**New file:** `eas.json`
```json
{
  "cli": {
    "version": ">= 16.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

#### Step 4: Build Development Client

```bash
# iOS Simulator
eas build --platform ios --profile development

# Android Emulator
eas build --platform android --profile development
```

#### Step 5: package.json Scripts

**File:** `package.json` scripts additions:
```json
{
  "scripts": {
    "start:dev-client": "expo start --dev-client",
    "build:dev:ios": "eas build --platform ios --profile development",
    "build:dev:android": "eas build --platform android --profile development"
  }
}
```

### 5.2 Feature Flag

**File:** `src/config/features.ts`

Add to the `FEATURES` object:
```typescript
export const FEATURES = {
  // ... existing flags ...

  // Phase 8: Identity Insurance (IAP Monetization)
  INSURANCE_ENABLED: false,            // Insurance offer during death sequence
} as const;
```

**Critical:** Remains `false` during development. Changed to `true` only after all phases complete and QA passes. This ensures the existing death flow works unchanged while insurance is being built.

### 5.3 Insurance Constants

**File:** `src/constants/index.ts`

Add after existing constants:
```typescript
// Insurance Constants
export const INSURANCE_CONSTANTS = {
  /** Insurance offer countdown seconds */
  OFFER_TIMEOUT_SECONDS: 10,
  /** IH value after insurance purchase */
  POST_PURCHASE_IH: 10,
  /** Product ID for App Store / Google Play (unified) */
  PRODUCT_ID: 'com.nonturn.onedayos.data_protection_pass',
  /** Maximum insurance purchases per life (anti-abuse) */
  MAX_PURCHASES_PER_LIFE: 1,
  /** Progress bar percentage at which to pause for insurance offer */
  PAUSE_PERCENTAGE: 95,
  /** Duration of visual wipe animation in ms (0% -> 95%) */
  WIPE_ANIMATION_DURATION_MS: 3000,
  /** Duration of sentencing stage in ms */
  SENTENCING_DURATION_MS: 2000,
  /** Duration of revival confirmation display in ms */
  REVIVAL_DISPLAY_DURATION_MS: 2000,
} as const;
```

### 5.4 Insurance Types

**New file:** `src/core/insurance/types.ts`

```typescript
export type DeathStage =
  | 'BACKUP'
  | 'SENTENCING'
  | 'WIPING_VISUAL'
  | 'INSURANCE_OFFER'
  | 'REVIVAL'
  | 'FINAL_WIPE'
  | 'VOID';

export interface InsurancePurchaseRecord {
  id: number;
  transactionId: string;
  productId: string;
  priceAmount: number | null;
  priceCurrency: string | null;
  lifeNumber: number;
  purchasedAt: string;
  ihBefore: number;
  ihAfter: number;
}

export interface InsuranceEligibility {
  eligible: boolean;
  reason?: 'feature_disabled' | 'already_revived' | 'iap_unavailable' | 'iap_init_failed' | 'backup_failed';
}

export interface InsuranceOfferState {
  timeRemaining: number;
  isPurchasing: boolean;
  localizedPrice: string | null;
  error: string | null;
}

export interface BackupData {
  antiVision: string;
  identityStatement: string;
  oneYearMission: string;
  originalIH: number;
  backedUpAt: string;
}
```

### 5.5 HapticEngine Extensions

**File:** `src/core/HapticEngine.ts`

Add two new methods to the `HapticEngine` object:

```typescript
/**
 * Insurance offer: ominous slow pulse.
 * Slow, heavy pulses to create dread during the offer countdown.
 * Returns cleanup function to stop the loop.
 */
async insuranceOffer(): Promise<() => void> {
    if (Platform.OS === 'web') return () => {};

    let stopped = false;
    let timeoutId: NodeJS.Timeout | null = null;

    const pulse = async () => {
        if (stopped) return;
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            await new Promise(resolve => setTimeout(resolve, 200));
            if (stopped) return;
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (e) {
            // Ignore haptic errors
        }
        if (!stopped) {
            timeoutId = setTimeout(pulse, 2000);
        }
    };

    pulse();

    return () => {
        stopped = true;
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
    };
},

/**
 * Insurance purchase: deeply unpleasant error vibration.
 * The shame pattern - makes the purchase feel terrible, not rewarding.
 * Triple error notification followed by a heavy slam.
 */
async insurancePurchase(): Promise<void> {
    if (Platform.OS === 'web') return;
    try {
        for (let i = 0; i < 3; i++) {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            await new Promise(resolve => setTimeout(resolve, 300));
        }
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch (e) {
        // Ignore haptic errors
    }
},
```

### 5.6 DB Schema Migration

**File:** `src/database/schema.ts`

Add to the end of `initDatabase()` exec string, before the closing backtick:

```sql
-- Identity Backup table (temporary, for insurance recovery)
CREATE TABLE IF NOT EXISTS identity_backup (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  anti_vision TEXT NOT NULL,
  identity_statement TEXT NOT NULL,
  one_year_mission TEXT NOT NULL,
  original_ih INTEGER NOT NULL,
  backed_up_at TEXT NOT NULL
);

-- Insurance Purchases table (permanent, survives wipe)
CREATE TABLE IF NOT EXISTS insurance_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  transaction_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  price_amount REAL,
  price_currency TEXT,
  life_number INTEGER NOT NULL DEFAULT 1,
  purchased_at TEXT NOT NULL,
  ih_before INTEGER NOT NULL,
  ih_after INTEGER NOT NULL
);
```

**New file:** `src/database/migrations/001_insurance.ts`

```typescript
/**
 * Migration: Add insurance columns to app_state
 * Idempotent - safe to run multiple times
 */
import * as SQLite from 'expo-sqlite';

export async function migrateInsurance(db: SQLite.SQLiteDatabase): Promise<void> {
  // Check existing columns via PRAGMA
  const tableInfo = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info(app_state)"
  );
  const columnNames = tableInfo.map(col => col.name);

  if (!columnNames.includes('has_used_insurance')) {
    await db.execAsync(
      'ALTER TABLE app_state ADD COLUMN has_used_insurance INTEGER NOT NULL DEFAULT 0'
    );
  }

  if (!columnNames.includes('life_number')) {
    await db.execAsync(
      'ALTER TABLE app_state ADD COLUMN life_number INTEGER NOT NULL DEFAULT 1'
    );
  }
}
```

**Integration point:** Call `migrateInsurance(db)` in `app/_layout.tsx` after `initDatabase()` and before any insurance-related operations.

### 5.7 Verification

- [ ] `eas build --platform ios --profile development` succeeds
- [ ] Dev client launches and connects to Metro
- [ ] Feature flag `INSURANCE_ENABLED: false` causes no changes to existing behavior
- [ ] DB migration runs idempotently (safe to run twice)
- [ ] New tables are created: `identity_backup`, `insurance_purchases`
- [ ] `app_state` has new columns: `has_used_insurance`, `life_number`
- [ ] `npm test` all pass (no regressions)
- [ ] `npx tsc --noEmit` passes

### 5.8 Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| EAS Build first-time setup takes long | Development delay | Pre-prepare Apple Developer Account and Google Play Console |
| expo-dev-client conflicts with existing plugins | Build failure | Minimal config first, add plugins incrementally |
| react-native-iap v12 incompatible with Expo SDK 54 | Runtime crash | Verify compatibility before version lock, check GitHub issues |
| ALTER TABLE fails on older schema versions | Migration error | PRAGMA table_info check makes migration idempotent |

---

## 6. Phase 2: Identity Backup System

> **Purpose:** Fix C-2 by enabling data recovery during insurance purchase
> **Duration:** 0.5 day
> **Dependencies:** Phase 1 complete (schema migration provides identity_backup table)

### 6.1 IdentityBackupManager

**New file:** `src/core/insurance/IdentityBackupManager.ts`

```typescript
/**
 * IdentityBackupManager
 *
 * Saves identity data to identity_backup table before death sequence begins.
 * On insurance purchase: restores identity from backup.
 * On wipe execution: backup is deleted along with other data.
 *
 * This solves C-2: useInsurance() COALESCE on already-wiped data returning empty strings.
 */

import * as SQLite from 'expo-sqlite';
import { getDB } from '../../database/client';
import type { BackupData } from './types';

export class IdentityBackupManager {
  private db: SQLite.SQLiteDatabase;

  constructor(db?: SQLite.SQLiteDatabase) {
    this.db = db || getDB();
  }

  /**
   * Copy current identity data to identity_backup.
   * Called at Death Screen Stage 0 (BACKUP), before any visual sequence begins.
   *
   * @returns true if backup was created, false if identity data doesn't exist
   */
  async createBackup(): Promise<boolean> {
    try {
      const identity = await this.db.getFirstAsync<{
        anti_vision: string;
        identity_statement: string;
        one_year_mission: string;
        identity_health: number;
      }>('SELECT anti_vision, identity_statement, one_year_mission, identity_health FROM identity WHERE id = 1');

      if (!identity) {
        console.error('IdentityBackupManager: No identity data to backup');
        return false;
      }

      await this.db.runAsync(
        `INSERT OR REPLACE INTO identity_backup
         (id, anti_vision, identity_statement, one_year_mission, original_ih, backed_up_at)
         VALUES (1, ?, ?, ?, ?, datetime('now'))`,
        [
          identity.anti_vision,
          identity.identity_statement,
          identity.one_year_mission,
          identity.identity_health,
        ]
      );

      return true;
    } catch (error) {
      console.error('IdentityBackupManager: Backup creation failed:', error);
      return false;
    }
  }

  /**
   * Retrieve backup data.
   * Called during insurance purchase to restore identity.
   *
   * @returns BackupData or null if no backup exists
   */
  async getBackup(): Promise<BackupData | null> {
    try {
      const row = await this.db.getFirstAsync<{
        anti_vision: string;
        identity_statement: string;
        one_year_mission: string;
        original_ih: number;
        backed_up_at: string;
      }>('SELECT anti_vision, identity_statement, one_year_mission, original_ih, backed_up_at FROM identity_backup WHERE id = 1');

      if (!row) return null;

      return {
        antiVision: row.anti_vision,
        identityStatement: row.identity_statement,
        oneYearMission: row.one_year_mission,
        originalIH: row.original_ih,
        backedUpAt: row.backed_up_at,
      };
    } catch (error) {
      console.error('IdentityBackupManager: Get backup failed:', error);
      return null;
    }
  }

  /**
   * Delete backup data.
   * Called after successful insurance restoration, or during wipe.
   */
  async clearBackup(): Promise<void> {
    try {
      await this.db.execAsync('DELETE FROM identity_backup');
    } catch (error) {
      console.error('IdentityBackupManager: Clear backup failed:', error);
    }
  }

  /**
   * Check if a backup exists.
   * Used for interrupted death sequence detection on app restart.
   */
  async hasBackup(): Promise<boolean> {
    try {
      const row = await this.db.getFirstAsync<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM identity_backup'
      );
      return (row?.cnt ?? 0) > 0;
    } catch {
      return false;
    }
  }
}
```

### 6.2 Tests

**New file:** `src/core/insurance/IdentityBackupManager.test.ts`

Test cases:
1. `createBackup()` copies identity table data to identity_backup
2. `createBackup()` returns false when identity table is empty
3. `createBackup()` overwrites existing backup (INSERT OR REPLACE)
4. `getBackup()` returns correct BackupData after createBackup
5. `getBackup()` returns null when no backup exists
6. `clearBackup()` removes all backup data
7. `hasBackup()` returns true when backup exists
8. `hasBackup()` returns false when no backup exists
9. Backup survives DELETE FROM identity (independent table)

### 6.3 Verification

- [ ] `createBackup()` -> `getBackup()` round-trip preserves all fields
- [ ] After `DELETE FROM identity`, `identity_backup` still contains data
- [ ] After `clearBackup()`, `getBackup()` returns null
- [ ] `hasBackup()` correctly reflects backup existence
- [ ] All tests pass

---

## 7. Phase 3: Death Flow Rewrite

> **Purpose:** Fix C-1 by completely rewriting death.tsx with correct wipe timing
> **Duration:** 2 days
> **Dependencies:** Phase 2 complete

### 7.1 death.tsx Complete Rewrite

**File:** `app/death.tsx`

#### Stage Type Definition

```typescript
import type { DeathStage } from '../src/core/insurance/types';

// DeathStage = 'BACKUP' | 'SENTENCING' | 'WIPING_VISUAL' | 'INSURANCE_OFFER'
//            | 'REVIVAL' | 'FINAL_WIPE' | 'VOID'
```

#### State Management

```typescript
const [stage, setStage] = useState<DeathStage>('BACKUP');
const [progress] = useState(new Animated.Value(0));
const [insuranceCountdown, setInsuranceCountdown] = useState(INSURANCE_CONSTANTS.OFFER_TIMEOUT_SECONDS);
const [isPurchasing, setIsPurchasing] = useState(false);
const [insuranceEligible, setInsuranceEligible] = useState(false);
const [localizedPrice, setLocalizedPrice] = useState<string | null>(null);
const [purchaseError, setPurchaseError] = useState<string | null>(null);
const [backupCreated, setBackupCreated] = useState(false);

// Refs for cleanup
const timeoutsRef = useRef<NodeJS.Timeout[]>([]);
const hapticCleanupRef = useRef<(() => void) | null>(null);
```

#### Main Sequence (C-1 Fix: No wipe until Stage 4b)

```typescript
const delay = (ms: number) => new Promise<void>(resolve => {
  const id = setTimeout(resolve, ms);
  timeoutsRef.current.push(id);
});

const runDeathSequence = async () => {
  // -- Stage 0: BACKUP (instant, invisible) --
  const backupManager = new IdentityBackupManager();
  const backupSuccess = await backupManager.createBackup();
  setBackupCreated(backupSuccess);

  // -- Stage 1: SENTENCING (2s) --
  setStage('SENTENCING');
  const heartbeatCleanup = await HapticEngine.acceleratingHeartbeat();
  hapticCleanupRef.current = heartbeatCleanup;
  await delay(INSURANCE_CONSTANTS.SENTENCING_DURATION_MS);
  heartbeatCleanup();

  // -- Stage 2: WIPING_VISUAL (0->95%, 3s) -- ANIMATION ONLY --
  setStage('WIPING_VISUAL');
  Animated.timing(progress, {
    toValue: INSURANCE_CONSTANTS.PAUSE_PERCENTAGE,
    duration: INSURANCE_CONSTANTS.WIPE_ANIMATION_DURATION_MS,
    useNativeDriver: false,
  }).start();
  await delay(INSURANCE_CONSTANTS.WIPE_ANIMATION_DURATION_MS);

  // -- Decision: Show Insurance? --
  const eligibility = await checkInsuranceEligibility(backupSuccess);
  if (eligibility.eligible) {
    setInsuranceEligible(true);
    setStage('INSURANCE_OFFER');
    // Countdown timer starts via useEffect watching stage === 'INSURANCE_OFFER'
  } else {
    // Skip insurance, go directly to wipe
    await executeFinalWipe();
  }
};
```

#### Insurance Eligibility Check (Issues #12, #13)

```typescript
const checkInsuranceEligibility = async (
  backupSuccess: boolean
): Promise<InsuranceEligibility> => {
  // 1. Feature flag
  if (!isFeatureEnabled('INSURANCE_ENABLED')) {
    return { eligible: false, reason: 'feature_disabled' };
  }

  // 2. Backup must exist (fail-safe: if backup failed, don't offer insurance)
  if (!backupSuccess) {
    return { eligible: false, reason: 'backup_failed' };
  }

  // 3. Anti-abuse: already revived this life? (Issue #12)
  const db = getDB();
  const state = await db.getFirstAsync<{ has_used_insurance: number }>(
    'SELECT has_used_insurance FROM app_state WHERE id = 1'
  );
  if (state?.has_used_insurance === 1) {
    return { eligible: false, reason: 'already_revived' };
  }

  // 4. IAP availability (Issue #13: graceful skip if IAP init fails)
  try {
    const available = await IAPService.isAvailable();
    if (!available) {
      return { eligible: false, reason: 'iap_unavailable' };
    }
  } catch {
    return { eligible: false, reason: 'iap_init_failed' };
  }

  // 5. Pre-fetch localized price for display (Issue #14)
  try {
    const product = await IAPService.getProduct(INSURANCE_CONSTANTS.PRODUCT_ID);
    if (product) {
      setLocalizedPrice(product.localizedPrice);
    }
  } catch {
    // Price fetch failed; UI will show without price or use product name
  }

  return { eligible: true };
};
```

#### Insurance Countdown Timer (Issue #8: Pauses During IAP)

```typescript
useEffect(() => {
  if (stage !== 'INSURANCE_OFFER') return;
  if (isPurchasing) return; // PAUSE timer during IAP Store processing

  // Start haptic pulse for insurance offer
  let offerHapticCleanup: (() => void) | null = null;
  HapticEngine.insuranceOffer().then(cleanup => {
    offerHapticCleanup = cleanup;
  });

  const timer = setInterval(() => {
    setInsuranceCountdown(prev => {
      if (prev <= 1) {
        clearInterval(timer);
        // Timeout: proceed to wipe
        executeFinalWipe();
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return () => {
    clearInterval(timer);
    if (offerHapticCleanup) offerHapticCleanup();
  };
}, [stage, isPurchasing]);
```

**Issue #8 resolution:** The `isPurchasing` dependency causes the effect to re-run. When `isPurchasing` becomes `true`, the effect cleanup runs (clears interval). When `isPurchasing` becomes `false` again, a new interval starts from the current `insuranceCountdown` value. This effectively pauses the timer during Store processing.

#### Purchase Handler

```typescript
const handlePurchase = async () => {
  setIsPurchasing(true); // Timer pauses
  setPurchaseError(null);

  try {
    const result = await IAPService.purchase(INSURANCE_CONSTANTS.PRODUCT_ID);

    if (result.success) {
      // Finish transaction first (prevent pending state)
      await IAPService.finishTransaction(result.transactionId);
      // Apply insurance (restore data, set IH, record purchase)
      await applyInsurance(result.transactionId, result.price, result.currency);
      setStage('REVIVAL');
    } else {
      // Purchase failed or cancelled -- resume timer
      if (result.error) {
        setPurchaseError(result.error);
      }
      setIsPurchasing(false);
    }
  } catch (error) {
    console.error('Insurance purchase failed:', error);
    setPurchaseError('Purchase failed.');
    setIsPurchasing(false);
  }
};
```

#### Apply Insurance -- Data Restoration (C-2 Fix)

```typescript
const applyInsurance = async (
  transactionId: string,
  priceAmount: number | null,
  priceCurrency: string | null
): Promise<void> => {
  const db = getDB();
  const backupManager = new IdentityBackupManager(db);
  const backup = await backupManager.getBackup();

  if (!backup) {
    // CRITICAL: This should not happen because we checked backupSuccess in eligibility.
    // But handle gracefully: set IH to 10% with empty identity (user will need to re-enter).
    console.error('CRITICAL: No backup found during insurance application');
  }

  // Use transaction for atomicity
  await db.execAsync('BEGIN TRANSACTION');
  try {
    // 1. Restore identity from backup (C-2 Fix: uses backup, not COALESCE on empty table)
    if (backup) {
      await db.runAsync(
        `INSERT OR REPLACE INTO identity
         (id, anti_vision, identity_statement, one_year_mission, identity_health, created_at, updated_at)
         VALUES (1, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          backup.antiVision,
          backup.identityStatement,
          backup.oneYearMission,
          INSURANCE_CONSTANTS.POST_PURCHASE_IH,
        ]
      );
    } else {
      // Fallback: empty identity with IH=10%
      await db.runAsync(
        `INSERT OR REPLACE INTO identity
         (id, anti_vision, identity_statement, one_year_mission, identity_health, created_at, updated_at)
         VALUES (1, '', '', '', ?, datetime('now'), datetime('now'))`,
        [INSURANCE_CONSTANTS.POST_PURCHASE_IH]
      );
    }

    // 2. Mark insurance as used for this life (anti-abuse)
    await db.runAsync(
      `UPDATE app_state SET has_used_insurance = 1, state = 'active', updated_at = datetime('now') WHERE id = 1`
    );

    // 3. Get current life_number for purchase record
    const stateRow = await db.getFirstAsync<{ life_number: number }>(
      'SELECT life_number FROM app_state WHERE id = 1'
    );
    const lifeNumber = stateRow?.life_number ?? 1;

    // 4. Record purchase in permanent table
    await db.runAsync(
      `INSERT INTO insurance_purchases
       (transaction_id, product_id, price_amount, price_currency, life_number, purchased_at, ih_before, ih_after)
       VALUES (?, ?, ?, ?, ?, datetime('now'), 0, ?)`,
      [
        transactionId,
        INSURANCE_CONSTANTS.PRODUCT_ID,
        priceAmount,
        priceCurrency,
        lifeNumber,
        INSURANCE_CONSTANTS.POST_PURCHASE_IH,
      ]
    );

    // 5. Clean up backup
    await backupManager.clearBackup();

    await db.execAsync('COMMIT');

    // 6. Sync IdentityEngine in-memory state
    const engine = await IdentityEngine.getInstance();
    await engine.setCurrentIH(INSURANCE_CONSTANTS.POST_PURCHASE_IH);

    // 7. Haptic: shame vibration
    await HapticEngine.insurancePurchase();

  } catch (error) {
    await db.execAsync('ROLLBACK');
    console.error('Insurance application failed:', error);
    throw error;
  }
};
```

#### Final Wipe -- Actual Data Deletion (C-1 Fix: Happens HERE only)

```typescript
const executeFinalWipe = async () => {
  setStage('FINAL_WIPE');

  // Complete the progress bar animation (95% -> 100%)
  Animated.timing(progress, {
    toValue: 100,
    duration: 500,
    useNativeDriver: false,
  }).start();

  const db = getDB();
  const wipeManager = new WipeManager(db);

  // THIS is the ONLY place where actual wipe happens.
  // All previous stages are purely visual.
  await wipeManager.executeWipe('IH_ZERO', 0);

  // Brief void display
  setStage('VOID');
  await delay(1000);

  // Navigate to onboarding immediately (no lockout -- Issue #17 resolved)
  router.replace('/onboarding');
};
```

#### Revival Stage Auto-Navigation

```typescript
useEffect(() => {
  if (stage !== 'REVIVAL') return;
  const timeout = setTimeout(() => {
    router.replace('/');
  }, INSURANCE_CONSTANTS.REVIVAL_DISPLAY_DURATION_MS);
  return () => clearTimeout(timeout);
}, [stage]);
```

#### Cleanup on Unmount

```typescript
useEffect(() => {
  return () => {
    // Clean up all timeouts
    timeoutsRef.current.forEach(id => clearTimeout(id));
    timeoutsRef.current = [];
    // Clean up haptic loops
    if (hapticCleanupRef.current) {
      hapticCleanupRef.current();
    }
  };
}, []);
```

#### Render Function (Stage-Based)

```typescript
// BACKUP stage: render nothing (instant)
if (stage === 'BACKUP') {
  return <View style={styles.container} />;
}

// SENTENCING stage
if (stage === 'SENTENCING') {
  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.textRed}>IDENTITY COLLAPSED.</ThemedText>
      <ThemedText style={styles.subtext}>You failed to maintain the structure.</ThemedText>
    </View>
  );
}

// WIPING_VISUAL stage
if (stage === 'WIPING_VISUAL' || stage === 'FINAL_WIPE') {
  return (
    <View style={styles.container}>
      <ThemedText type="title" style={styles.textGlitch}>EXECUTING WIPE...</ThemedText>
      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
      <FileDeleteAnimation files={FILES_TO_DELETE} />
    </View>
  );
}

// INSURANCE_OFFER stage
if (stage === 'INSURANCE_OFFER') {
  return (
    <View style={styles.container}>
      <View style={styles.progressBar}>
        <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
      </View>
      <InsuranceModal
        visible={true}
        countdownSeconds={insuranceCountdown}
        localizedPrice={localizedPrice}
        isPurchasing={isPurchasing}
        error={purchaseError}
        onPurchase={handlePurchase}
        onDecline={() => executeFinalWipe()}
      />
    </View>
  );
}

// REVIVAL stage
if (stage === 'REVIVAL') {
  return (
    <View style={styles.revivalContainer}>
      <ThemedText style={styles.revivalLabel}>PAID IDENTITY</ThemedText>
      <ThemedText style={styles.revivalSubtext}>
        Your cowardice has been recorded.
      </ThemedText>
      <ThemedText style={styles.revivalIH}>
        IH: {INSURANCE_CONSTANTS.POST_PURCHASE_IH}%
      </ThemedText>
    </View>
  );
}

// VOID stage
return (
  <View style={styles.voidContainer}>
    <ThemedText style={styles.voidText}>Welcome back to the old you.</ThemedText>
  </View>
);
```

### 7.2 Interrupted Flow Handling (Issue #9)

**Problem:** User kills app during Stage 3 (Insurance Offer). On next launch, identity_backup exists but no death sequence is running.

**Solution A:** Death screen mount check.

In `app/death.tsx`, modify the initial `useEffect`:

```typescript
useEffect(() => {
  const checkAndRun = async () => {
    // Check for interrupted death sequence
    const backupManager = new IdentityBackupManager();
    const hasBackup = await backupManager.hasBackup();

    if (hasBackup) {
      // Previous death sequence was interrupted.
      // Resume from insurance eligibility check.
      const eligibility = await checkInsuranceEligibility(true);
      if (eligibility.eligible) {
        setStage('INSURANCE_OFFER');
        return;
      } else {
        // Not eligible for insurance -- proceed to wipe
        await executeFinalWipe();
        return;
      }
    }

    // Normal flow: start from beginning
    runDeathSequence();
  };

  checkAndRun();

  return () => {
    timeoutsRef.current.forEach(id => clearTimeout(id));
    timeoutsRef.current = [];
    if (hapticCleanupRef.current) hapticCleanupRef.current();
  };
}, []);
```

**Solution B:** App startup check in `_layout.tsx`.

```typescript
// In app/_layout.tsx, after database initialization:
const checkInterruptedDeath = async () => {
  const backupManager = new IdentityBackupManager();
  const hasInterruptedDeath = await backupManager.hasBackup();
  if (hasInterruptedDeath) {
    // An interrupted death sequence was detected.
    // Route to death screen to resume.
    router.replace('/death');
    return true;
  }
  return false;
};
```

This ensures that even if the user closes and reopens the app (not navigating to `/death`), the interrupted death sequence is detected and resumed.

### 7.3 WipeManager Updates

**File:** `src/core/identity/WipeManager.ts`

#### Updated executeWipe (Issue #11: Non-blocking VACUUM)

```typescript
async executeWipe(reason: WipeReason, finalIH: number): Promise<WipeResult> {
  const timestamp = Date.now();
  const tablesCleared: string[] = [];

  try {
    await this.ensureWipeLogTable();

    // Delete all data from main tables + backup table
    await this.db.execAsync(`
      DELETE FROM identity;
      DELETE FROM quests;
      DELETE FROM notifications;
      DELETE FROM daily_state;
      DELETE FROM identity_backup;
    `);

    tablesCleared.push('identity', 'quests', 'notifications', 'daily_state', 'identity_backup');

    // Update app_state: reset insurance flag, increment life_number
    await this.db.runAsync(
      `UPDATE app_state SET
        state = 'onboarding',
        has_used_insurance = 0,
        life_number = COALESCE(life_number, 0) + 1,
        updated_at = datetime('now')
       WHERE id = 1`
    );

    // Log the wipe event (permanent table)
    await this.db.runAsync(
      'INSERT INTO wipe_log (wiped_at, reason, final_ih_value) VALUES (?, ?, ?)',
      [timestamp, reason, finalIH]
    );

    // VACUUM in background -- non-blocking (Issue #11)
    // Schedule for next event loop iteration to avoid blocking UI thread
    setTimeout(async () => {
      try {
        await this.db.execAsync('VACUUM;');
      } catch (e) {
        console.warn('Background VACUUM failed (non-critical):', e);
      }
    }, 0);

    const result: WipeResult = {
      success: true,
      timestamp,
      reason,
      tablesCleared,
      nextScreen: 'onboarding',
    };

    if (this.onWipeComplete) {
      this.onWipeComplete({
        success: true,
        nextScreen: 'onboarding',
        timestamp,
      });
    }

    return result;
  } catch (error) {
    console.error('Wipe failed:', error);
    // ... existing error handling ...
  }
}
```

### 7.4 IdentityLifecycle.useInsurance() Deprecation

**File:** `src/core/identity/IdentityLifecycle.ts`

The existing `useInsurance()` method (L132-161) contains the C-2 bug and is replaced by `applyInsurance()` in death.tsx. Mark as deprecated:

```typescript
/**
 * @deprecated Use death.tsx applyInsurance() instead.
 * This method has a critical bug: COALESCE on already-wiped identity table
 * returns empty strings. The new flow uses identity_backup for restoration.
 *
 * Will be removed after Phase 7 testing is complete.
 */
async useInsurance(): Promise<void> {
  console.warn('DEPRECATED: IdentityLifecycle.useInsurance() should not be called. Use death.tsx applyInsurance() instead.');
  // ... existing implementation kept for backward compatibility during migration ...
}
```

Similarly in `src/core/identity/IdentityEngine.ts`, mark `useInsurance()` as deprecated.

### 7.5 Verification

- [ ] Stage 1->2->3->4a (purchase path): data restored, IH=10%, navigates to /
- [ ] Stage 1->2->3->4b (decline path): data wiped, navigates to /onboarding
- [ ] Stage 1->2->3->4b (timeout path): timer expires, data wiped, navigates to /onboarding
- [ ] Stage 1->2->4b (insurance ineligible): skips offer, wipes, navigates to /onboarding
- [ ] INSURANCE_ENABLED=false: goes directly to wipe (no offer shown)
- [ ] App kill during Stage 3 -> reopen -> death screen resumes
- [ ] App kill during Stage 3 -> reopen from home -> _layout.tsx redirects to /death
- [ ] After wipe, `identity_backup` is empty
- [ ] After insurance, `identity_backup` is empty
- [ ] After insurance, `insurance_purchases` has new record
- [ ] 24h lockout UI is NOT shown (Issue #17 resolved)
- [ ] Cleanup runs on unmount (no memory leaks)

### 7.6 Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Backup creation failure | Insurance unavailable (data will be lost) | Skip insurance offer when backup fails (fail-safe) |
| Memory leak from timeout/interval refs | ANR/crash | useRef for all timeouts, cleanup in useEffect return |
| IdentityEngine singleton cache stale after insurance | IH mismatch between memory and DB | Call setCurrentIH() after insurance to sync |
| Race condition: user taps purchase + decline simultaneously | Double execution | setIsPurchasing(true) disables buttons; state machine prevents invalid transitions |

---

## 8. Phase 4: IAP Integration

> **Purpose:** Implement react-native-iap wrapper for actual payment processing
> **Duration:** 2 days
> **Dependencies:** Phase 1 complete (expo-dev-client). Can proceed in parallel with Phase 3.

### 8.1 IAPService

**New file:** `src/core/insurance/IAPService.ts`

```typescript
/**
 * IAPService - react-native-iap wrapper (singleton)
 *
 * Handles: initialization, product fetch, purchase, transaction finish, pending check.
 *
 * Product type: CONSUMABLE (Issue #7: can be purchased multiple times across lives)
 * Product ID: com.nonturn.onedayos.data_protection_pass
 *
 * Important behaviors:
 * - Timer is paused during purchase (Issue #8: handled by caller via isPurchasing flag)
 * - Pending transactions checked on startup (Issue #10)
 * - Offline graceful degradation (Issue #19: isAvailable returns false)
 */

import {
  initConnection,
  endConnection,
  getProducts,
  requestPurchase,
  finishTransaction as rniapFinishTransaction,
  getAvailablePurchases,
  purchaseUpdatedListener,
  purchaseErrorListener,
  type ProductPurchase,
  type Product,
  type PurchaseError,
} from 'react-native-iap';
import { Platform } from 'react-native';
import { INSURANCE_CONSTANTS } from '../../constants';

export interface PurchaseResult {
  success: boolean;
  transactionId: string;
  price: number | null;
  currency: string | null;
  error?: string;
}

class IAPServiceClass {
  private initialized: boolean = false;
  private products: Product[] = [];
  private purchaseUpdateSubscription: any = null;
  private purchaseErrorSubscription: any = null;

  /**
   * Initialize IAP connection.
   * Must be called before any other IAP operations.
   */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;
    try {
      await initConnection();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('IAPService: Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Clean up IAP connection and listeners.
   */
  async cleanup(): Promise<void> {
    if (this.purchaseUpdateSubscription) {
      this.purchaseUpdateSubscription.remove();
      this.purchaseUpdateSubscription = null;
    }
    if (this.purchaseErrorSubscription) {
      this.purchaseErrorSubscription.remove();
      this.purchaseErrorSubscription = null;
    }
    try {
      await endConnection();
    } catch (error) {
      console.warn('IAPService: cleanup error:', error);
    }
    this.initialized = false;
  }

  /**
   * Check if IAP is available on this device.
   * Returns false when offline or on unsupported device (Issue #19).
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await this.initialize();
    } catch {
      return false;
    }
  }

  /**
   * Fetch product details from store.
   * Returns product with localized price (Issue #14).
   */
  async getProduct(productId: string): Promise<Product | null> {
    try {
      if (!this.initialized) {
        const ok = await this.initialize();
        if (!ok) return null;
      }

      const products = await getProducts({ skus: [productId] });

      if (products.length > 0) {
        this.products = products;
        return products[0];
      }
      return null;
    } catch (error) {
      console.error('IAPService: Failed to get product:', error);
      return null;
    }
  }

  /**
   * Request purchase.
   * Returns a Promise that resolves when purchase completes, fails, or is cancelled.
   *
   * Caller is responsible for:
   * - Setting isPurchasing=true before calling (pauses timer, Issue #8)
   * - Setting isPurchasing=false on failure/cancel
   * - Calling finishTransaction() on success
   */
  async purchase(productId: string): Promise<PurchaseResult> {
    if (!this.initialized) {
      const ok = await this.initialize();
      if (!ok) {
        return { success: false, transactionId: '', price: null, currency: null, error: 'IAP not available' };
      }
    }

    return new Promise<PurchaseResult>((resolve) => {
      // Clean up previous listeners
      if (this.purchaseUpdateSubscription) this.purchaseUpdateSubscription.remove();
      if (this.purchaseErrorSubscription) this.purchaseErrorSubscription.remove();

      // Listen for purchase success
      this.purchaseUpdateSubscription = purchaseUpdatedListener(
        (purchase: ProductPurchase) => {
          const product = this.products.find(p => p.productId === productId);
          resolve({
            success: true,
            transactionId: purchase.transactionId || `txn_${Date.now()}`,
            price: product ? parseFloat(product.price) : null,
            currency: product?.currency || null,
          });
        }
      );

      // Listen for purchase error/cancellation
      this.purchaseErrorSubscription = purchaseErrorListener(
        (error: PurchaseError) => {
          resolve({
            success: false,
            transactionId: '',
            price: null,
            currency: null,
            error: error.message || 'Purchase failed',
          });
        }
      );

      // Initiate purchase request
      requestPurchase({
        sku: productId,
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
      }).catch((error) => {
        resolve({
          success: false,
          transactionId: '',
          price: null,
          currency: null,
          error: error.message || 'Request failed',
        });
      });
    });
  }

  /**
   * Finish (acknowledge) a transaction.
   * Must be called after successful purchase to prevent refund/re-delivery.
   * Issue #7: isConsumable=true for consumable product.
   */
  async finishTransaction(transactionId: string): Promise<void> {
    try {
      if (Platform.OS === 'ios') {
        await rniapFinishTransaction({
          purchase: { transactionId } as any,
          isConsumable: true,
        });
      } else {
        await rniapFinishTransaction({
          purchase: { purchaseToken: transactionId } as any,
          isConsumable: true,
        });
      }
    } catch (error) {
      console.error('IAPService: Failed to finish transaction:', error);
      // Non-fatal: Apple/Google will auto-refund after ~3 days if not acknowledged.
      // The purchase record is already saved locally.
    }
  }

  /**
   * Check for pending (interrupted) transactions.
   * Called on app startup to handle crash-during-purchase scenario (Issue #10).
   */
  async checkPendingTransactions(): Promise<ProductPurchase[]> {
    try {
      if (!this.initialized) {
        const ok = await this.initialize();
        if (!ok) return [];
      }
      const purchases = await getAvailablePurchases();
      return purchases.filter(
        (p: ProductPurchase) => p.productId === INSURANCE_CONSTANTS.PRODUCT_ID
      );
    } catch (error) {
      console.error('IAPService: Failed to check pending transactions:', error);
      return [];
    }
  }
}

// Singleton export
export const IAPService = new IAPServiceClass();
```

### 8.2 Pending Transaction Recovery (Issue #10)

**Integration point:** `app/_layout.tsx`

After database initialization and migration, add:

```typescript
useEffect(() => {
  const handlePendingTransactions = async () => {
    if (!isFeatureEnabled('INSURANCE_ENABLED')) return;

    try {
      const pending = await IAPService.checkPendingTransactions();

      for (const purchase of pending) {
        const txnId = purchase.transactionId || '';

        // Check if this transaction was already recorded locally
        const db = getDB();
        const existing = await db.getFirstAsync<{ id: number }>(
          'SELECT id FROM insurance_purchases WHERE transaction_id = ?',
          [txnId]
        );

        if (!existing) {
          // Transaction completed on Store side but app crashed before recording.
          // Check if backup exists (interrupted death flow).
          const backupManager = new IdentityBackupManager(db);
          const hasBackup = await backupManager.hasBackup();

          if (hasBackup) {
            // Route to death screen to complete the revival flow
            router.replace('/death');
            return; // Death screen will handle the rest
          }
          // No backup: the wipe may have already completed.
          // Just finish the transaction to clear it from Store.
        }

        // Always finish the transaction to prevent re-delivery
        await IAPService.finishTransaction(txnId);
      }
    } catch (error) {
      console.warn('Pending transaction check failed (non-critical):', error);
    }
  };

  handlePendingTransactions();
}, []);
```

### 8.3 Offline Handling (Issue #19)

The IAP flow handles offline scenarios at multiple levels:

1. **`IAPService.isAvailable()` returns false** when `initConnection()` fails due to no network.
   - Result: `checkInsuranceEligibility()` returns `{ eligible: false, reason: 'iap_unavailable' }`.
   - Death screen skips insurance offer and proceeds directly to wipe.

2. **Network drops during `purchase()`** call:
   - `purchaseErrorListener` fires with network error.
   - `handlePurchase()` sets `isPurchasing = false`, timer resumes.
   - Error message displayed briefly in InsuranceModal.

3. **Network drops after purchase succeeds but before `finishTransaction()`**:
   - Purchase is recorded locally in `insurance_purchases`.
   - `finishTransaction()` failure is logged but non-fatal.
   - On next app startup, `checkPendingTransactions()` retries finishing.

### 8.4 Verification

- [ ] iOS Sandbox: full purchase flow completes
- [ ] iOS Sandbox: purchase cancellation returns to timer
- [ ] Android test: full purchase flow completes
- [ ] Network disconnect during purchase: error shown, timer resumes
- [ ] Pending transaction recovery on app restart
- [ ] `finishTransaction()` called on every successful purchase
- [ ] Consumable product: can purchase again in next life

### 8.5 Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| iOS Sandbox instability | Testing difficulty | Test on multiple Sandbox accounts, use physical device |
| react-native-iap v12 API differences | Build/runtime errors | Pin version, check CHANGELOG and GitHub issues before updating |
| Store dialog takes >10s to appear | Timer would have expired | Issue #8 resolved: timer pauses when isPurchasing=true |
| Consumable transaction not finished | Re-delivery on next launch | Startup pending transaction check (Issue #10) |

---

## 9. Phase 5: Insurance UI

> **Purpose:** Rewrite InsuranceModal, fix B-2 (Apple Pay overlay issue)
> **Duration:** 1.5 days
> **Dependencies:** Phase 3 complete

### 9.1 InsuranceModal Rewrite (B-2 Fix)

**File:** `src/ui/screens/InsuranceModal.tsx`

#### Updated Props

```typescript
export interface InsuranceModalProps {
  visible: boolean;
  countdownSeconds: number;
  localizedPrice: string | null;    // Store-provided localized price (Issue #14)
  isPurchasing: boolean;             // true during IAP Store processing
  error: string | null;              // Purchase error message
  onPurchase: () => void;
  onDecline: () => void;
}
```

#### UI Structure (B-2 Fix Explanation)

**Original spec:** "I AM WEAK" overlaid on Apple Pay button.
**Problem:** Apple Pay dialog is a system UI. Cannot overlay custom text on it. Attempting to do so violates Apple's Human Interface Guidelines and App Store Review Guidelines.
**Solution:** Use an in-app purchase button with "I AM WEAK" as the button text. Tapping this button calls `onPurchase()`, which programmatically triggers IAP via `IAPService.purchase()`. The Apple Pay / Google Pay dialog then appears as a standard system dialog.

```
+----------------------------------+
|                                  |
|  [GlitchText: IDENTITY INSURANCE]|  <-- GlitchText with severity=0.8
|                                  |
|  "Your war ends here.            |  <-- i18n: insurance.body
|   Buy back your cowardly life."  |
|                                  |
|  +----------------------------+  |
|  |                            |  |
|  |    I AM WEAK               |  |  <-- In-app button (onPurchase)
|  |    {localizedPrice}        |  |  <-- Store localized price (Issue #14)
|  |                            |  |
|  +----------------------------+  |
|                                  |
|  [Countdown: 7]                  |  <-- Large red monospace number
|                                  |
|  +----------------------------+  |
|  |  ACCEPT DEATH              |  |  <-- Decline button (onDecline)
|  +----------------------------+  |
|                                  |
|  {isPurchasing: "PROCESSING..."}|  <-- Shown during IAP
|  {error: "Purchase failed."}    |  <-- Shown after IAP failure
|                                  |
+----------------------------------+
```

#### Component Implementation

```typescript
export const InsuranceModal = ({
  visible,
  countdownSeconds,
  localizedPrice,
  isPurchasing,
  error,
  onPurchase,
  onDecline,
}: InsuranceModalProps) => {
  const { t } = useTranslation();

  useEffect(() => {
    if (visible && countdownSeconds <= 1) {
      HapticEngine.punishFailure();
    }
  }, [visible, countdownSeconds]);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Title */}
          <GlitchText
            text={t('insurance.title')}
            style={styles.title}
            severity={0.8}
            health={10}
          />

          {/* Body copy */}
          <ThemedText style={styles.body}>{t('insurance.body')}</ThemedText>

          {/* Purchase button: "I AM WEAK" (B-2 fix: in-app button, not Apple Pay overlay) */}
          <TouchableOpacity
            style={[styles.purchaseButton, isPurchasing && styles.purchaseButtonDisabled]}
            onPress={onPurchase}
            disabled={isPurchasing}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.purchaseLabel}>
              {t('insurance.button')}
            </ThemedText>
            {localizedPrice && (
              <ThemedText style={styles.priceText}>{localizedPrice}</ThemedText>
            )}
          </TouchableOpacity>

          {/* Countdown */}
          <ThemedText style={[
            styles.countdown,
            countdownSeconds <= 3 && styles.countdownUrgent,
          ]}>
            {countdownSeconds}
          </ThemedText>

          {/* Decline button */}
          <TouchableOpacity
            style={[styles.declineButton, isPurchasing && styles.declineButtonDisabled]}
            onPress={onDecline}
            disabled={isPurchasing}
            activeOpacity={0.7}
          >
            <ThemedText style={styles.declineText}>{t('insurance.decline')}</ThemedText>
          </TouchableOpacity>

          {/* Processing indicator */}
          {isPurchasing && (
            <View style={styles.processingContainer}>
              <ThemedText style={styles.processingText}>{t('insurance.processing')}</ThemedText>
              <ThemedText style={styles.processingSubtext}>{t('insurance.timer_paused')}</ThemedText>
            </View>
          )}

          {/* Error display */}
          {error && !isPurchasing && (
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          )}
        </View>
      </View>
    </Modal>
  );
};
```

#### Brutalist Styles

```typescript
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#000000',
    borderWidth: 2,
    borderColor: '#FF0000',
    padding: 32,
    width: '90%',
    alignItems: 'center',
  },
  title: {
    color: '#FF0000',
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'Courier New',
    letterSpacing: 4,
    marginBottom: 16,
  },
  body: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Courier New',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    opacity: 0.8,
  },
  purchaseButton: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 48,
    marginBottom: 24,
    width: '100%',
    alignItems: 'center',
  },
  purchaseButtonDisabled: {
    opacity: 0.3,
    borderColor: '#666666',
  },
  purchaseLabel: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'Courier New',
    letterSpacing: 4,
  },
  priceText: {
    color: '#666666',
    fontSize: 14,
    fontFamily: 'Courier New',
    marginTop: 4,
  },
  countdown: {
    color: '#FF0000',
    fontSize: 96,
    fontWeight: '900',
    fontFamily: 'Courier New',
    marginVertical: 16,
  },
  countdownUrgent: {
    fontSize: 120,
  },
  declineButton: {
    borderWidth: 1,
    borderColor: '#FF0000',
    paddingVertical: 12,
    paddingHorizontal: 32,
    opacity: 0.6,
  },
  declineButtonDisabled: {
    opacity: 0.2,
  },
  declineText: {
    color: '#FF0000',
    fontSize: 12,
    fontFamily: 'Courier New',
    letterSpacing: 2,
  },
  processingContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Courier New',
    letterSpacing: 2,
  },
  processingSubtext: {
    color: '#666666',
    fontSize: 10,
    fontFamily: 'Courier New',
    marginTop: 4,
  },
  errorText: {
    color: '#FF0000',
    fontSize: 12,
    fontFamily: 'Courier New',
    marginTop: 16,
    textAlign: 'center',
  },
});
```

### 9.2 i18n Keys

**File:** `src/i18n/locales/en.json` (additions to insurance namespace):

```json
{
  "insurance": {
    "title": "IDENTITY INSURANCE",
    "body": "Your war ends here. Buy back your cowardly life.",
    "button": "I AM WEAK",
    "decline": "ACCEPT DEATH",
    "processing": "PROCESSING...",
    "timer_paused": "Timer paused.",
    "revival_label": "PAID IDENTITY",
    "revival_subtext": "Your cowardice has been recorded.",
    "purchase_error": "Purchase failed."
  }
}
```

**File:** `src/i18n/locales/ja.json` (additions to insurance namespace):

```json
{
  "insurance": {
    "title": "IDENTITY INSURANCE",
    "body": "君の戦いはここで終わりだ。金で命を買い戻せ。",
    "button": "I AM WEAK",
    "decline": "死を受け入れる",
    "processing": "処理中...",
    "timer_paused": "タイマー停止中",
    "revival_label": "PAID IDENTITY",
    "revival_subtext": "お前の臆病さは記録された。",
    "purchase_error": "購入に失敗しました。"
  }
}
```

**Note (Issue #20):** "I AM WEAK", "PAID IDENTITY", and "IDENTITY INSURANCE" are intentionally kept in English across all locales. These are branding elements, not translatable content.

### 9.3 Verification

- [ ] InsuranceModal renders correctly at Stage 3
- [ ] Countdown displays and decrements correctly
- [ ] Purchase button shows "I AM WEAK" + localized price
- [ ] During isPurchasing: buttons disabled, "PROCESSING..." shown, timer paused
- [ ] After purchase error: error message shown, buttons re-enabled
- [ ] Decline button triggers wipe
- [ ] Countdown urgent style (larger font) at <= 3 seconds
- [ ] All i18n keys render correctly in EN and JA

---

## 10. Phase 6: Post-Purchase UX

> **Purpose:** "PAID IDENTITY" permanent watermark, purchase tracking, analytics
> **Duration:** 1 day
> **Dependencies:** Phase 3, Phase 5 complete

### 10.1 InsuranceManager

**New file:** `src/core/insurance/InsuranceManager.ts`

```typescript
/**
 * InsuranceManager
 * Business logic for insurance eligibility checks and purchase queries.
 * Used by UI for "PAID IDENTITY" watermark and by death.tsx for eligibility.
 */

import * as SQLite from 'expo-sqlite';
import { getDB } from '../../database/client';

export class InsuranceManager {
  private db: SQLite.SQLiteDatabase;

  constructor(db?: SQLite.SQLiteDatabase) {
    this.db = db || getDB();
  }

  /**
   * Check if user has EVER purchased insurance (across all lives).
   * Used for permanent "PAID IDENTITY" watermark display.
   * This flag persists across wipes because insurance_purchases table is never deleted.
   */
  async hasEverPurchased(): Promise<boolean> {
    try {
      const row = await this.db.getFirstAsync<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM insurance_purchases'
      );
      return (row?.cnt ?? 0) > 0;
    } catch {
      return false;
    }
  }

  /**
   * Check if insurance was used in the CURRENT life.
   * Used for anti-abuse: only 1 purchase per life (Issue #12).
   */
  async hasUsedThisLife(): Promise<boolean> {
    try {
      const row = await this.db.getFirstAsync<{ has_used_insurance: number }>(
        'SELECT has_used_insurance FROM app_state WHERE id = 1'
      );
      return row?.has_used_insurance === 1;
    } catch {
      return false;
    }
  }

  /**
   * Get total insurance purchase count across all lives.
   */
  async getTotalPurchaseCount(): Promise<number> {
    try {
      const row = await this.db.getFirstAsync<{ cnt: number }>(
        'SELECT COUNT(*) as cnt FROM insurance_purchases'
      );
      return row?.cnt ?? 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get current life number.
   */
  async getCurrentLifeNumber(): Promise<number> {
    try {
      const row = await this.db.getFirstAsync<{ life_number: number }>(
        'SELECT life_number FROM app_state WHERE id = 1'
      );
      return row?.life_number ?? 1;
    } catch {
      return 1;
    }
  }
}
```

### 10.2 "PAID IDENTITY" Permanent Watermark (Issue #16)

**Persistence mechanism:** The `insurance_purchases` table survives wipes. If it contains any records, the user has purchased insurance at least once.

**Performance (Issue #16):** Check `hasEverPurchased()` once on app startup, cache in React Context. Do not query DB on every render.

#### Context Provider

**Integration in `app/_layout.tsx`:**

```typescript
// Create context
export const InsuranceContext = React.createContext<{ isPaidIdentity: boolean }>({
  isPaidIdentity: false,
});

// In root component:
const [isPaidIdentity, setIsPaidIdentity] = useState(false);

useEffect(() => {
  const checkPaidStatus = async () => {
    const manager = new InsuranceManager();
    const hasPurchased = await manager.hasEverPurchased();
    setIsPaidIdentity(hasPurchased);
  };
  checkPaidStatus();
}, []);

// Wrap app in provider:
<InsuranceContext.Provider value={{ isPaidIdentity }}>
  {/* ... existing app content ... */}
</InsuranceContext.Provider>
```

#### Watermark Component

**Integration in home screen and lenses:**

```typescript
// Usage in any screen:
const { isPaidIdentity } = useContext(InsuranceContext);

// Render watermark:
{isPaidIdentity && (
  <View style={styles.paidWatermark} pointerEvents="none">
    <ThemedText style={styles.paidWatermarkText}>PAID IDENTITY</ThemedText>
  </View>
)}
```

**Watermark styles:**
```typescript
paidWatermark: {
  position: 'absolute',
  top: 60,
  right: -20,
  transform: [{ rotate: '15deg' }],
  opacity: 0.15,
  zIndex: 1000,
},
paidWatermarkText: {
  color: '#FF0000',
  fontSize: 24,
  fontWeight: '900',
  fontFamily: 'Courier New',
  letterSpacing: 6,
},
```

**Key requirements:**
- `pointerEvents="none"` ensures watermark does not block touch events
- `opacity: 0.15` makes it visible but not obstructive
- Persists across wipes (re-checked from `insurance_purchases` on each startup)

### 10.3 Analytics/Logging (Issue #18)

**New file:** `src/core/insurance/InsuranceAnalytics.ts`

```typescript
/**
 * InsuranceAnalytics
 * Local-only event logging for insurance conversion tracking.
 * No server required. Logs to console in __DEV__, optionally to persistent storage.
 */

export type InsuranceEvent =
  | 'OFFER_SHOWN'
  | 'OFFER_DECLINED'
  | 'OFFER_TIMEOUT'
  | 'PURCHASE_STARTED'
  | 'PURCHASE_COMPLETED'
  | 'PURCHASE_FAILED'
  | 'PURCHASE_CANCELLED'
  | 'INSURANCE_SKIPPED_FEATURE_DISABLED'
  | 'INSURANCE_SKIPPED_ALREADY_REVIVED'
  | 'INSURANCE_SKIPPED_IAP_UNAVAILABLE'
  | 'INSURANCE_SKIPPED_BACKUP_FAILED';

export class InsuranceAnalytics {
  static logEvent(event: InsuranceEvent, metadata?: Record<string, any>): void {
    if (__DEV__) {
      console.log(`[InsuranceAnalytics] ${event}`, metadata || '');
    }
    // Future: persist to analytics table or send to server
  }
}
```

**Integration points in death.tsx:**
- `checkInsuranceEligibility()`: log skip reasons
- Stage 3 entry: `OFFER_SHOWN`
- `handlePurchase()`: `PURCHASE_STARTED`
- Purchase success: `PURCHASE_COMPLETED`
- Purchase failure: `PURCHASE_FAILED`
- Decline button: `OFFER_DECLINED`
- Timeout: `OFFER_TIMEOUT`

### 10.4 Verification

- [ ] "PAID IDENTITY" watermark appears after insurance purchase
- [ ] Watermark persists after wipe (new life)
- [ ] Watermark does not block touch events
- [ ] InsuranceContext.isPaidIdentity is cached (no per-render DB query)
- [ ] Analytics events logged in __DEV__ mode
- [ ] InsuranceManager.hasUsedThisLife() resets to false after wipe
- [ ] InsuranceManager.hasEverPurchased() remains true after wipe

---

## 11. Phase 7: Testing & QA

> **Purpose:** Comprehensive testing of all insurance paths
> **Duration:** 2 days
> **Dependencies:** Phase 6 complete

### 11.1 Unit Tests

#### IdentityBackupManager.test.ts

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | createBackup with valid identity data | Returns true, backup matches identity |
| 2 | createBackup with empty identity table | Returns false |
| 3 | createBackup overwrites existing backup | Only 1 row in identity_backup |
| 4 | getBackup after createBackup | Returns correct BackupData |
| 5 | getBackup with no backup | Returns null |
| 6 | clearBackup removes data | hasBackup returns false |
| 7 | hasBackup true/false states | Correct boolean |
| 8 | Backup survives DELETE FROM identity | getBackup still returns data |

#### InsuranceManager.test.ts

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | hasEverPurchased with no records | false |
| 2 | hasEverPurchased with records | true |
| 3 | hasUsedThisLife initially | false |
| 4 | hasUsedThisLife after has_used_insurance=1 | true |
| 5 | hasUsedThisLife after wipe (reset) | false |
| 6 | hasEverPurchased after wipe | true (table survives) |
| 7 | getTotalPurchaseCount accuracy | Correct count |

#### IAPService.test.ts (Mocked)

| # | Test Case | Expected |
|---|-----------|----------|
| 1 | initialize succeeds | returns true |
| 2 | initialize fails | returns false, isAvailable returns false |
| 3 | getProduct returns product | localizedPrice present |
| 4 | getProduct with invalid ID | returns null |
| 5 | purchase success flow | PurchaseResult.success = true |
| 6 | purchase cancellation | PurchaseResult.success = false |
| 7 | purchase error | PurchaseResult.error present |
| 8 | finishTransaction completes | No error thrown |
| 9 | checkPendingTransactions empty | Empty array |

#### Death Flow Integration Tests

| # | Test Case | Stages Covered |
|---|-----------|----------------|
| 1 | Happy path: purchase | BACKUP->SENTENCING->WIPING_VISUAL->INSURANCE_OFFER->REVIVAL |
| 2 | Decline path | BACKUP->SENTENCING->WIPING_VISUAL->INSURANCE_OFFER->FINAL_WIPE->VOID |
| 3 | Timeout path | BACKUP->SENTENCING->WIPING_VISUAL->INSURANCE_OFFER->FINAL_WIPE->VOID |
| 4 | Feature disabled | BACKUP->SENTENCING->WIPING_VISUAL->FINAL_WIPE->VOID |
| 5 | Already revived | BACKUP->SENTENCING->WIPING_VISUAL->FINAL_WIPE->VOID |
| 6 | IAP unavailable | BACKUP->SENTENCING->WIPING_VISUAL->FINAL_WIPE->VOID |
| 7 | Backup failure | SENTENCING->WIPING_VISUAL->FINAL_WIPE->VOID |
| 8 | Interrupted flow resume | (mount)->INSURANCE_OFFER->... |
| 9 | Timer pauses during purchase | countdown frozen while isPurchasing=true |

### 11.2 Manual QA Checklist

#### iOS Sandbox Testing

- [ ] Full purchase flow with Sandbox Apple ID
- [ ] Purchase cancellation (tap Cancel in Apple Pay dialog)
- [ ] Localized price display in JPY
- [ ] Localized price display in USD (change Sandbox account region)
- [ ] Transaction finishes (no pending transactions after success)
- [ ] App kill during insurance offer -> reopen -> death screen resumes
- [ ] App kill during purchase processing -> reopen -> pending transaction recovery
- [ ] Network disconnect before purchase -> insurance skipped
- [ ] Network disconnect during purchase -> error shown, timer resumes

#### Android Testing

- [ ] Full purchase flow with test card
- [ ] Purchase cancellation
- [ ] Localized price display
- [ ] Transaction acknowledgement
- [ ] Same interrupted flow tests as iOS

#### Edge Cases

- [ ] IH reaches 0 during judgment timeout -> death screen
- [ ] IH reaches 0 during quest penalty -> death screen
- [ ] IH reaches 0 during onboarding stagnation -> death screen
- [ ] Double-tap on purchase button (should be ignored: disabled during isPurchasing)
- [ ] Double-tap on decline button (should be ignored: stage transition prevents)
- [ ] Rapid foreground/background during death sequence
- [ ] Insurance purchase -> immediate second death -> insurance not offered (has_used_insurance=1)
- [ ] Wipe -> onboarding -> new death -> insurance offered again (has_used_insurance reset)

### 11.3 Verification

- [ ] `npm test` all pass (including new tests)
- [ ] Coverage >= 80% for `src/core/insurance/` files
- [ ] iOS Sandbox all tests pass
- [ ] Android all tests pass
- [ ] No console errors in production mode

---

## 12. Phase 8: App Store Submission

> **Purpose:** IAP product registration and app submission
> **Duration:** 2-5 days (including review wait time)
> **Dependencies:** Phase 7 complete

### 12.1 App Store Connect Configuration

| Field | Value |
|-------|-------|
| **Type** | Consumable (Issue #7) |
| **Reference Name** | Data Protection Pass |
| **Product ID** | `com.nonturn.onedayos.data_protection_pass` |
| **Price** | Tier 10 (JPY 1,500 / USD 9.99) |
| **Display Name** | Data Protection Pass |
| **Description** | Protect your progress data from accidental loss. One-time use per reset cycle. |
| **Screenshot** | InsuranceModal screenshot (iPhone physical device capture required) |

### 12.2 Google Play Console Configuration

| Field | Value |
|-------|-------|
| **Type** | Managed product (consumable) |
| **Product ID** | `com.nonturn.onedayos.data_protection_pass` |
| **Name** | Data Protection Pass |
| **Description** | Protect your progress data from accidental loss. One-time use per reset cycle. |
| **Price** | $9.99 (auto-converted to local currencies) |

### 12.3 Review Notes

Include in App Store review submission:

```
This app includes an optional in-app purchase ("Data Protection Pass") that appears
only when the user's Identity Health metric reaches 0%, triggering a data reset event.

The purchase restores the user's data to 10% health. It is a consumable item that can
be used once per reset cycle.

To test: Set Identity Health to 0% by responding "NO" to all judgment prompts.
The purchase dialog will appear during the data reset animation.

Test account credentials: [provide Sandbox credentials]
```

### 12.4 Feature Flag Activation

**After all tests pass and app is ready for submission:**

**File:** `src/config/features.ts`
```typescript
INSURANCE_ENABLED: true,  // Changed from false
```

### 12.5 Production Build

```bash
# iOS
eas build --platform ios --profile production
eas submit --platform ios

# Android
eas build --platform android --profile production
eas submit --platform android
```

### 12.6 Review Risks

| Risk | Mitigation |
|------|------------|
| "Data Protection Pass" description unclear | Be specific: "Restores identity data to 10% health after a system reset event" |
| IAP only appears under specific conditions | Explain in review notes with reproduction steps + test account |
| "I AM WEAK" button text flagged as inappropriate | Review note: "Intentional UX for self-accountability app. Users set their own goals and this language reflects the app's brutalist design philosophy." |
| Rejection for "fear-based purchasing" | Emphasize: optional feature, no content locked behind paywall, app fully functional without purchase |

---

## 13. リスク管理

### 13.1 Overall Risk Matrix

| # | Risk | Probability | Impact | Mitigation |
|---|------|-------------|--------|------------|
| R1 | IAP review rejection | Medium | High | Conservative App Store naming, detailed review notes |
| R2 | react-native-iap + Expo SDK 54 incompatibility | Low | High | Pre-verify with dev build, pin version |
| R3 | Backup creation failure -> no insurance | Low | High | Skip insurance on backup failure (fail-safe) |
| R4 | Crash during purchase (pending transaction) | Low | Medium | Startup pending transaction check (Issue #10) |
| R5 | VACUUM blocks UI thread | Medium | Medium | Non-blocking VACUUM via setTimeout (Issue #11) |
| R6 | Store dialog slower than 10s timer | Medium | Medium | Timer pauses during isPurchasing (Issue #8) |
| R7 | IdentityEngine singleton stale after insurance | Medium | Medium | setCurrentIH() syncs after insurance |
| R8 | Anti-abuse bypass | Low | Low | has_used_insurance per life + insurance_purchases permanent record |
| R9 | Interrupted death sequence data corruption | Low | Medium | Backup existence check on startup, route to /death |
| R10 | Offline during death sequence | Medium | Low | IAP unavailable -> skip insurance -> normal wipe |

### 13.2 Rollback Strategy

#### Feature Flag Rollback

```typescript
// In src/config/features.ts:
INSURANCE_ENABLED: false,  // Instantly disables insurance offer
```

When disabled:
- Death screen skips Stage 3 (INSURANCE_OFFER) entirely
- Goes directly from Stage 2 (WIPING_VISUAL) to Stage 4b (FINAL_WIPE)
- Existing death flow behavior is preserved
- No code changes needed beyond the flag

#### DB Rollback

New tables (`identity_backup`, `insurance_purchases`) and columns (`has_used_insurance`, `life_number`) do not affect existing functionality. They can remain in the schema even if insurance is disabled. No migration rollback needed.

#### Full Revert

If critical issues arise, revert `app/death.tsx` to the pre-rewrite version (keeping only the Phase 0 routing fix). The feature flag ensures no insurance code paths are reached.

---

## 14. Issue Traceability Matrix

Complete mapping of all 40 review issues to their fixes.

### CRITICAL (6)

| Issue | Summary | Phase | File(s) | Section |
|-------|---------|-------|---------|---------|
| C-1 | death.tsx wipes before insurance offer | Phase 3 | `app/death.tsx` | 7.1 (executeFinalWipe at Stage 4b only) |
| C-2 | useInsurance() COALESCE on empty table | Phase 2, 3 | `IdentityBackupManager.ts`, `death.tsx` | 6.1, 7.1 (applyInsurance from backup) |
| C-3 | judgment.tsx routes to non-existent /despair | Phase 0 | `app/judgment.tsx` | 4.1 |
| A-1 | Plan/code routing mismatch | Phase 0 | `app/judgment.tsx` | 4.1 |
| B-1 | expo-dev-client + EAS Build not documented | Phase 1 | `package.json`, `app.json`, `eas.json` | 5.1 |
| B-2 | Apple Pay overlay technically impossible | Phase 5 | `InsuranceModal.tsx` | 9.1 |

### HIGH (7)

| Issue | Summary | Phase | File(s) | Section |
|-------|---------|-------|---------|---------|
| #7 | Should be Consumable not Non-consumable | Phase 4, 8 | `IAPService.ts`, Store config | 8.1 (isConsumable: true), 12.1 |
| #8 | Timer during IAP Store processing | Phase 3 | `app/death.tsx` | 7.1 (isPurchasing pauses timer) |
| #9 | App kill during insurance offer | Phase 3 | `app/death.tsx`, `app/_layout.tsx` | 7.2 |
| #10 | Pending transactions (crash during purchase) | Phase 4 | `IAPService.ts`, `app/_layout.tsx` | 8.2 |
| #11 | VACUUM blocks UI thread | Phase 3 | `WipeManager.ts` | 7.3 |
| #12 | Anti-abuse: revived-this-life check | Phase 3 | `app/death.tsx`, `app_state` schema | 7.1 (checkInsuranceEligibility) |
| #13 | IAP init failure graceful handling | Phase 3 | `app/death.tsx` | 7.1 (checkInsuranceEligibility) |

### MEDIUM (7)

| Issue | Summary | Phase | File(s) | Section |
|-------|---------|-------|---------|---------|
| #14 | Store localized price display | Phase 4, 5 | `IAPService.ts`, `InsuranceModal.tsx` | 8.1 (getProduct), 9.1 (localizedPrice prop) |
| #15 | insurance_purchases needs life_number | Phase 1 | `schema.ts` | 5.6 |
| #16 | PAID IDENTITY persistent flag (not per-render query) | Phase 6 | `InsuranceManager.ts`, `_layout.tsx` | 10.1, 10.2 (InsuranceContext) |
| #17 | Lockout contradiction (DespairModeManager vs death.tsx) | Phase 3 | `app/death.tsx` | 7.1 (lockout UI removed, immediate /onboarding) |
| #18 | Analytics/logging for conversion tracking | Phase 6 | `InsuranceAnalytics.ts` | 10.3 |
| #19 | Offline IAP handling | Phase 4 | `IAPService.ts` | 8.3 |
| #20 | i18n for insurance text | Phase 5 | `en.json`, `ja.json` | 9.2 |

### LOW (20)

| Issue Range | Summary | Resolution |
|-------------|---------|------------|
| #21-25 | Test coverage gaps | Phase 7: comprehensive unit + integration tests (11.1) |
| #26-30 | Documentation gaps | This corrected plan document addresses all documentation |
| #31-35 | Style consistency | Phase 5: Brutalist Design System adherence (9.1 styles) |
| #36-40 | Edge case coverage | Phase 7: manual QA checklist (11.2) |

---

## Implementation Timeline

| Phase | Content | Duration | Cumulative |
|-------|---------|----------|------------|
| **Phase 0** | Pre-Implementation Fixes (routing bug) | 0.5 day | 0.5 day |
| **Phase 1** | Infrastructure (IAP, EAS, flags, schema) | 1 day | 1.5 days |
| **Phase 2** | Identity Backup System | 0.5 day | 2 days |
| **Phase 3** | Death Flow Rewrite | 2 days | 4 days |
| **Phase 4** | IAP Integration | 2 days | 6 days |
| **Phase 5** | Insurance UI | 1.5 days | 7.5 days |
| **Phase 6** | Post-Purchase UX | 1 day | 8.5 days |
| **Phase 7** | Testing & QA | 2 days | 10.5 days |
| **Phase 8** | App Store Submission | 2-5 days | 12.5-15.5 days |

**Total: approximately 12.5 - 15.5 days**

Note: Phase 4 can proceed in parallel with Phase 3 (IAP wrapper is independent of death flow rewrite). This could reduce total time by up to 1.5 days.

---

## Appendix A: IdentityLifecycle.useInsurance() Deprecation Plan

The existing `IdentityLifecycle.useInsurance()` method (`src/core/identity/IdentityLifecycle.ts` L132-161) contains the C-2 bug: it uses `COALESCE((SELECT anti_vision FROM identity WHERE id = 1), '')` which returns empty strings after wipe.

**Migration:**
1. Phase 3: `death.tsx` implements `applyInsurance()` using `IdentityBackupManager` instead
2. Phase 3: `IdentityLifecycle.useInsurance()` marked with `@deprecated` JSDoc
3. Phase 3: `IdentityEngine.useInsurance()` marked with `@deprecated` JSDoc
4. Phase 7: After all tests confirm new flow works, remove deprecated methods

`death.tsx` L96-101 currently calls `engine.useInsurance()` directly. After Phase 3, this code path no longer exists (replaced by stage-based flow).

## Appendix B: DespairModeManager Status

The `DespairModeManager` (`src/core/despair/DespairModeManager.ts`) is architecturally correct:
- `canResetup()` returns `true` (immediate re-setup, no lockout)
- `getRemainingLockoutMs()` returns `0` (no lockout period)
- `hasLockoutPeriod()` returns `false`

The contradiction was in `death.tsx` (showing 24h lockout UI, Issue #17), not in `DespairModeManager`.

After Phase 3 rewrite:
- Insurance purchased -> navigate to `/` (immediate)
- Insurance declined/timeout -> wipe -> navigate to `/onboarding` (immediate)
- No lockout UI, no waiting period

`DespairModeManager` requires no changes.

## Appendix C: Security Considerations

1. **Receipt Validation:** Client-side only for initial release. The app is local-only (no server). Server-side receipt validation can be added if a backend is introduced later.

2. **Transaction Integrity:** `IAPService.finishTransaction()` is called after every successful purchase. Unfinished transactions are caught by `checkPendingTransactions()` on startup (Issue #10). Apple/Google will auto-refund unacknowledged transactions after ~3 days.

3. **Anti-Abuse:** `has_used_insurance` flag in `app_state` limits to 1 purchase per life (Issue #12). This resets on wipe, allowing purchase in subsequent lives.

4. **Data Integrity:** `identity_backup` provides atomic data preservation. If backup creation fails, insurance offer is skipped entirely (fail-safe). If insurance application fails mid-transaction, database ROLLBACK ensures consistency.

## Appendix D: File Count Summary

| Phase | New Files | Modified Files | Deleted Files |
|-------|-----------|---------------|---------------|
| 0 | 0 | 1 | 0 |
| 1 | 3 | 5 | 0 |
| 2 | 2 | 0 | 0 |
| 3 | 0 | 3 | 0 |
| 4 | 2 | 1 | 0 |
| 5 | 0 | 3 | 0 |
| 6 | 2 | 1 | 0 |
| 7 | 3 | 1 | 0 |
| 8 | 0 | 1 | 0 |
| **Total** | **12** | **16** | **0** |
