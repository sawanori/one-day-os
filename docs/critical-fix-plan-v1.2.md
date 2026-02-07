# One Day OS クリティカル修正計画 v1.2

**作成日:** 2026-02-08
**前版:** v1.1 (critical-fix-plan-v1.1.md)
**レビュー反映:** critical-fix-plan-v1.1-review.md の重大問題 3件 + 中程度 8件 + 新規発見 8件を全て反映
**対象バージョン:** main ブランチ (commit: 1be7c34)
**総課題数:** CRITICAL 8件 / HIGH 12件 / MEDIUM 17件 = 合計37件
**推定工数:** 5フェーズ / 約62タスク
**expo-sqlite バージョン:** ~16.0.10

---

## v1.1 → v1.2 変更概要

| # | v1.1 レビュー指摘 | v1.2 での対応 |
|---|-----------------|-------------|
| B1 | `openDatabaseSync`/`openDatabaseAsync` 戻り値型互換性が未検証 | **タスク 0-0 を新設**: Phase 0 冒頭に型互換性検証ステップを追加。expo-sqlite v16 では両APIとも `SQLiteDatabase` 型を返すことを検証スクリプトで確認する |
| B2 | 旧IdentityEngine移行マップに `app/evening.tsx`, `app/judgment.tsx`, `app/morning.tsx` の具体的修正内容が不足 | 移行マップに3ファイルの **具体的なメソッド呼び出し箇所と変更パターン** を追加 |
| B3 | NotificationHandler.test.ts のモック修正量が過小評価 | タスク 0-1 に **サブタスク 0-1-F** を追加: テストモック構造の全面差し替え手順を明記 |
| M4 | useInsurance() 後の identity_statement 空文字列依存の明示 | 1-3-B に `app/index.tsx` 82行目の判定ロジックへの依存を明記 |
| M5 | killUser() の WipeManager 委譲の具体的コードが不足 | 1-3-A に具体的な実装コードを追加 |
| M8 | StressContainer 二重使用のスコープが `app/index.tsx` のみ | M1 タスクに `app/evening.tsx`, `app/judgment.tsx`, `app/morning.tsx` の StressContainer 削除も追加 |
| M9 | QuestCompletion インターフェース名と UI コンポーネント名の混同リスク | H5 タスクでペナルティ用インターフェースを `QuestCompletionStatus` に改名 |
| M11 | notificationId 型変更の連鎖影響が未整理 | 4-2 に NotificationData, NotificationScheduler への連鎖変更を追加 |
| N1-N7 | 新規発見8件（StressContainer多重ネスト、WipeAnimation経路、resetDatabase移行等） | 各該当タスクに統合 |
| N8 | db.test.ts の削除が計画に含まれていない | タスク 0-1 の廃止対象に `db.test.ts` を追加 |

---

## v1.0 → v1.1 変更概要（参考）

| # | v1.0 レビュー指摘 | v1.1 での対応 |
|---|-----------------|-------------|
| 1-A | DB統一で非同期化を推奨 → `runInTransaction` と全呼び出し元が壊れる | **同期API維持 + DB名統一のみ** に方針転換 |
| 1-B | 旧IdentityEngineをクラスとして誤認 | **オブジェクトリテラル** であることを正確に反映。呼び出しパターン差異を明記 |
| 1-C | `getDB()` の同期/非同期混在が未整理 | `getDB()` は同期関数。不要な `await` 箇所を洗い出して整理対象に追加 |
| 1-D | `useInsurance()` の復活後データフロー未定義 | Insurance 機能の設計原則との矛盾を整理。**DELETE方式 + UPDATE** に統一 |
| 1-E | `getAppState`/`updateAppState` の移行先未記載 | **`client.ts` に移行** する具体的手順を追加 |
| 2-A | `tabs_backup/` の処理方針が不明確 | **明示的に削除対象** として記載 |
| 2-B | lineHeight の使用方法が乗数・直接値の両方ある | 全使用箇所を調査済み。**乗数として使われている** ことを確認。ヘルパー関数アプローチ維持 |
| 2-C | WipeManager/DespairModeManager のDB接続統一 | DB接続の統一チェーンを Phase 0 に含める |
| 2-D | FIVE_QUESTIONS の6件→5件判断を保留 | 6通知:6質問の1:1対応を確認。**定数名を `REFLECTION_QUESTIONS` に変更** |
| 2-E | 循環依存リスク未対策 | 一方向依存設計を Phase 0 に明記 |
| 2-F | テスト修正の具体性不足 | 各タスクにテスト修正の具体的内容を追加 |
| 2-G | 3つのDB接続パターンの深刻度 | データ分断リスクを Phase 0 で最優先対応として強調 |
| 2-H | Phase 3/4 の並行実行可能性 | 並行可能タスクを特定し、ブランチ戦略を改訂 |
| 3-D | ブランチ直列チェーンの懸念 | **逐次マージ方式** に変更 |
| 4-A | `_layout.tsx` の Web用 dead code | Phase 4 に dead code 削除タスクを追加 |
| 4-B | StressContainer 二重使用 | Phase 3 M1 タスクに統合 |
| 4-C | `getDB()` の不要な await | Phase 0 の DB統一タスクに統合 |

---

## 目次

1. [課題サマリーと依存関係グラフ](#1-課題サマリーと依存関係グラフ)
2. [Phase 0: 基盤統一](#phase-0-基盤統一)
3. [Phase 1: クリティカルルーティング・セキュリティ修正](#phase-1-クリティカルルーティングセキュリティ修正)
4. [Phase 2: ペナルティ・仕様整合性修正](#phase-2-ペナルティ仕様整合性修正)
5. [Phase 3: UIコンポーネント・メモリリーク修正](#phase-3-uiコンポーネントメモリリーク修正)
6. [Phase 4: 型安全性・デザイン一貫性修正](#phase-4-型安全性デザイン一貫性修正)
7. [リスクアセスメント](#リスクアセスメント)
8. [ロールバック戦略（全体）](#ロールバック戦略全体)

---

## 1. 課題サマリーと依存関係グラフ

### 現在のDB接続状況（v1.1 新規追加: 全体像の明確化）

```
現在の3つのDB接続パターン:

[旧IdentityEngine / StressContainer / Lenses / transaction.ts]
  → getDB() (client.ts) → openDatabaseSync('onedayos_master.db') [同期]

[新IdentityEngine / OnboardingManager / DespairModeManager]
  → openDatabase() (db.ts) → openDatabaseAsync('onedayos.db') [非同期]

[NotificationHandler]
  → SQLite.openDatabaseAsync('onedayos.db') [直接呼び出し、非同期]
```

**問題:** `onedayos_master.db` と `onedayos.db` が並存しており、データが分断されている。`app/index.tsx` では旧IdentityEngine で `onedayos_master.db` の IH を読み、新IdentityEngine で `onedayos.db` に IH を書き込む二重運用が発生中。

### 現在のIdentityEngine状況（v1.1 修正: オブジェクトリテラル）

```
旧 IdentityEngine (src/core/IdentityEngine.ts):
  → export const IdentityEngine = { ... }  [オブジェクトリテラル]
  → 呼び出し: IdentityEngine.checkHealth()  [直接メソッド呼び出し]
  → DB: getDB() → onedayos_master.db [同期]

新 IdentityEngine (src/core/identity/IdentityEngine.ts):
  → export class IdentityEngine { ... }  [シングルトンクラス]
  → 呼び出し: const engine = await IdentityEngine.getInstance(); engine.method()
  → DB: openDatabase() → onedayos.db [非同期]
```

### フェーズ間依存関係

```
Phase 0 (基盤統一)
  ├── C1: DB名統一 (同期API維持)
  ├── C2: IdentityEngine統一 (オブジェクトリテラル→クラスへの移行)
  └── C8: OnboardingFlow / DespairModeManager のDB移行
       │
       ▼
Phase 1 (ルーティング・セキュリティ)
  ├── C3: /(tabs) ルート修正 + tabs_backup 削除
  ├── C6: SQLインジェクション修正
  └── C7: Insurance方針決定と修正
       │
       ▼
Phase 2 (ペナルティ・仕様整合性)  ←── Phase 3/4 と部分的に並行可能
  ├── C4: DespairModeManager仕様修正
  ├── C5: MISSED_NOTIFICATION_PENALTY適用
  ├── H1-H5: 通知・ペナルティ関連
       │
       ▼
Phase 3 (UI・メモリリーク)  ←── Phase 4 と並行可能
  ├── H6-H12: コンポーネント修正
  └── M1-M9: パフォーマンス・UI修正

Phase 4 (型安全性・デザイン)  ←── Phase 3 と並行可能
  └── M10-M17: 型・デザイン修正
```

### フェーズ間ブロッキング依存

| 後続タスク | 先行タスク (ブロッカー) | 理由 |
|-----------|----------------------|------|
| Phase 1 全体 | Phase 0 (C1, C2) | DB・エンジン統一後でないと修正先が不明確 |
| C7 (Insurance修正) | C1 (DB統一) | killUser/useInsuranceがDB操作するため |
| C5 (ペナルティ修正) | C2 (エンジン統一) | どのIdentityEngineを修正するか確定必要 |
| H1 (is_missed更新) | C1 (DB統一) | NotificationHandlerのDB接続先が確定必要 |
| H3 (レース条件) | C2 (エンジン統一) | 統一後のエンジンでロック実装 |
| M1 (ポーリング集約) | C2 (エンジン統一) | IH取得ロジック統一後に集約可能 |
| Phase 3/4 の独立タスク | Phase 0, 1 | 一部は Phase 2 と並行可能 |

---

## Phase 0: 基盤統一

### 目的

アプリケーション全体で**単一のデータベースファイル** (`onedayos.db`) と**単一のIdentityEngine** (`src/core/identity/IdentityEngine.ts`) を使用するように統一する。

### v1.1 重要方針変更: DB統一は同期API維持

**v1.0 の方針（却下）:**
`openDatabaseAsync` への完全非同期化。全呼び出し元で `await getDB()` が必要になり、`runInTransaction` の再設計も必要。影響範囲が20箇所以上で Phase 0 のスコープとして過大。

**v1.1 の方針（採用）:**
`openDatabaseSync('onedayos.db')` で DB名のみ統一。同期API (`getDB()`) を維持し、非同期APIのみ使用していたモジュール (`db.ts` / 新IdentityEngine / NotificationHandler) を同期APIに移行する。

**理由:**
1. `getDB()` は同期関数であり、7箇所で `const db = getDB()` として同期呼び出しされている
2. `runInTransaction` (transaction.ts 34行目) が `getDB()` を同期呼び出ししており、非同期化するとトランザクション制御が壊れる
3. `app/index.tsx` (76行目) と `app/death.tsx` (42行目, 93行目) で `await getDB()` としているのは、同期関数の戻り値を不要に await しているだけ（動作はするがコードの意図が不明確）
4. `openDatabaseSync` はメインスレッドブロックの懸念があるが、SQLite の初期接続は軽量であり、React Native では実質的な問題にならない

### 影響範囲

- `src/database/` 配下全ファイル
- `src/core/IdentityEngine.ts`（削除対象）
- `src/core/identity/IdentityEngine.ts`（統一先）
- `src/core/despair/DespairModeManager.ts`
- `src/core/onboarding/OnboardingManager.ts`
- `src/notifications/NotificationHandler.ts`
- `src/ui/screens/onboarding/OnboardingFlow.tsx`
- `app/index.tsx`, `app/death.tsx`, `app/evening.tsx`, `app/judgment.tsx`, `app/morning.tsx`
- `src/ui/lenses/IdentityLens.tsx`, `MissionLens.tsx`, `QuestLens.tsx`
- `src/ui/layout/StressContainer.tsx`
- `src/database/transaction.ts`

---

### タスク 0-0: DB API 型互換性の事前検証 (v1.2 新設)

**複雑度:** S（小）
**目的:** `openDatabaseSync()` の戻り値が非同期メソッド群をサポートすることを実証する
**ブロッカー対応:** v1.1 レビュー重大問題 #1

**背景:**
計画の DB 統一方針では `openDatabaseSync('onedayos.db')` に全モジュールを統一する。現在、NotificationHandler と新 IdentityEngine は `openDatabaseAsync` の戻り値に対して `.getFirstAsync()`, `.runAsync()`, `.getAllAsync()`, `.execAsync()` を呼び出している。`openDatabaseSync` の戻り値でもこれらのメソッドが利用可能であることを確認する必要がある。

**検証方法:**

expo-sqlite v16.0.10 では、`openDatabaseSync()` と `openDatabaseAsync()` はいずれも `SQLiteDatabase` 型のインスタンスを返す（後者は `Promise<SQLiteDatabase>`）。この `SQLiteDatabase` クラスは以下のメソッドを全て持つ:
- `execAsync(source: string): Promise<void>`
- `runAsync(source: string, ...params): Promise<SQLiteRunResult>`
- `getFirstAsync<T>(source: string, ...params): Promise<T | null>`
- `getAllAsync<T>(source: string, ...params): Promise<T[]>`

**検証スクリプト（Phase 0 実装開始前に実行）:**

```typescript
// scripts/verify-db-api.ts
import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('verify_test.db');

// 以下のメソッドが全てエラーなく呼び出せることを確認
async function verify() {
  await db.execAsync('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, value TEXT)');
  const runResult = await db.runAsync('INSERT INTO test (value) VALUES (?)', ['hello']);
  console.log('runAsync OK:', runResult);
  const first = await db.getFirstAsync<{ id: number; value: string }>('SELECT * FROM test WHERE id = ?', [runResult.lastInsertRowId]);
  console.log('getFirstAsync OK:', first);
  const all = await db.getAllAsync<{ id: number; value: string }>('SELECT * FROM test');
  console.log('getAllAsync OK:', all);
  await db.execAsync('DROP TABLE test');
  console.log('ALL METHODS VERIFIED SUCCESSFULLY');
}

verify().catch(console.error);
```

**代替検証（実機不要）:**
expo-sqlite v16 の型定義ファイル (`node_modules/expo-sqlite/build/SQLiteDatabase.d.ts`) で `SQLiteDatabase` クラスの公開メソッドを直接確認する:
```bash
grep -E '(execAsync|runAsync|getFirstAsync|getAllAsync)' node_modules/expo-sqlite/build/SQLiteDatabase.d.ts
```

**完了条件:** 4メソッド全ての存在が確認できれば、タスク 0-1 に進む。確認できない場合は DB 統一方針を再検討する。

**テスト検証方法:** 既存テスト `npm test` が全パスすることを確認（DB 接続はモックのため型検証のみ）

---

### タスク 0-1: データベースファイルの統一 (C1)

**複雑度:** L（大）
**目的:** 3つのDB接続パターンを1つに統一し、全データを `onedayos.db` に集約する

**対象ファイル・行番号:**
- `src/database/schema.ts` 4行目: `openDatabaseSync('onedayos_master.db')` → DB名変更
- `src/database/client.ts` 2-5行目: schema.ts からの re-export → `getAppState`/`updateAppState` 追加
- `src/database/db.ts` 全体 → 廃止（関数を client.ts に移行後に削除）
- `src/database/transaction.ts` 34行目: `getDB()` 同期呼び出し → 変更不要（同期維持）
- `src/notifications/NotificationHandler.ts` 58行目: `openDatabaseAsync('onedayos.db')` 直接接続 → `getDB()` に変更
- `app/index.tsx` 76行目, 127行目: `await getDB()` → 不要な `await` を削除
- `app/death.tsx` 42行目, 93行目: `await getDB()` → 不要な `await` を削除

**具体的な修正内容:**

#### 0-1-A: schema.ts の DB名変更

```typescript
// 修正前 (schema.ts 4行目):
export const dbResult = SQLite.openDatabaseSync('onedayos_master.db');

// 修正後:
export const dbResult = SQLite.openDatabaseSync('onedayos.db');
```

`openDatabaseSync` を維持し、DB名のみを `onedayos.db` に変更する。

#### 0-1-B: client.ts に `getAppState` / `updateAppState` を追加

`db.ts` 廃止に伴い、DespairModeManager と OnboardingFlow が依存する `getAppState` / `updateAppState` を `client.ts` にエクスポートとして追加する。

```typescript
// 修正後の client.ts (全体):
import { dbResult, initDatabase } from './schema';

export const getDB = () => dbResult;
export const databaseInit = initDatabase;

/**
 * Get current app state (migrated from db.ts)
 * 同期DBインスタンスを使用
 */
export async function getAppState(): Promise<'onboarding' | 'active' | 'despair'> {
  const db = getDB();
  const result = await db.getFirstAsync<{ state: string }>(
    'SELECT state FROM app_state WHERE id = 1'
  );
  return (result?.state as 'onboarding' | 'active' | 'despair') || 'onboarding';
}

/**
 * Update app state (migrated from db.ts)
 * 同期DBインスタンスを使用
 */
export async function updateAppState(state: 'onboarding' | 'active' | 'despair'): Promise<void> {
  const db = getDB();
  await db.runAsync(
    'UPDATE app_state SET state = ?, updated_at = datetime(\'now\') WHERE id = 1',
    [state]
  );
}
```

**注意:** これらの関数は `async` だが、DBインスタンス取得は同期 (`getDB()`)。非同期は `getFirstAsync` / `runAsync` のクエリ実行部分のみ。

#### 0-1-C: db.ts の廃止

`db.ts` を削除し、全インポート元を更新する。

**db.ts の関数の移行先:**

| db.ts の関数 | 移行先 | 備考 |
|-------------|-------|------|
| `openDatabase()` | 廃止 | 新IdentityEngine が `getDB()` を直接使用するように変更 |
| `initializeDatabase()` | `schema.ts` の `initDatabase()` が同等機能を持つ | スキーマ定義は schema.ts に統一 |
| `getAppState()` | `client.ts` | 上記 0-1-B で追加 |
| `updateAppState()` | `client.ts` | 上記 0-1-B で追加 |
| `resetDatabase()` | `client.ts` | grep で使用箇所を確認し、使用されていれば移行。テスト環境のみで使用の場合はテストヘルパーに移動 |
| `closeDatabase()` | 廃止 | expo-sqlite は明示的なクローズ不要 |

**影響するインポート元と修正内容:**

| ファイル | 修正前のインポート | 修正後 |
|---------|------------------|-------|
| `src/core/identity/IdentityEngine.ts` 6行目 | `import { openDatabase } from '../../database/db'` | `import { getDB } from '../../database/client'` |
| `src/core/onboarding/OnboardingManager.ts` 6行目 | `import { openDatabase, initializeDatabase } from '../../database/db'` | `import { getDB, databaseInit } from '../../database/client'` |
| `src/core/despair/DespairModeManager.ts` 13行目 | `import { getAppState, updateAppState } from '../../database/db'` | `import { getAppState, updateAppState } from '../../database/client'` |
| `src/ui/screens/onboarding/OnboardingFlow.tsx` 16行目 | `import { updateAppState } from '../../../database/db'` | `import { updateAppState } from '../../../database/client'` |
| `src/core/identity/WipeManager.test.ts` 11行目 | `import { openDatabase, initializeDatabase } from '../../database/db'` | テスト用モック更新 |
| `src/core/despair/DespairModeManager.test.ts` 17行目 | `import { ... } from '../../database/db'` | テスト用モック更新 |

#### 0-1-D: NotificationHandler.ts の直接DB接続を削除

```typescript
// 修正前 (NotificationHandler.ts 58行目):
this.db = await SQLite.openDatabaseAsync('onedayos.db');

// 修正後:
import { getDB } from '../database/client';
// ...
this.db = getDB();  // 同期呼び出し
```

**注意:** `this.db` の型は `SQLite.SQLiteDatabase` のまま。`getDB()` は `openDatabaseSync` の戻り値（`SQLiteDatabase` 型）を返すため、型互換性に問題はない。

#### 0-1-E: 不要な `await getDB()` の削除

`getDB()` は同期関数であるため、`await` は不要。動作には影響しないが、コードの意図を明確にするために修正する。

| ファイル | 行 | 修正前 | 修正後 |
|---------|---|--------|-------|
| `app/index.tsx` | 76 | `const db = await getDB()` | `const db = getDB()` |
| `app/index.tsx` | 127 | `const db = await getDB()` | `const db = getDB()` |
| `app/death.tsx` | 42 | `const db = await getDB()` | `const db = getDB()` |
| `app/death.tsx` | 93 | `const db = await getDB()` | `const db = getDB()` |

#### 0-1-F: 新 IdentityEngine の DB接続を同期化

新 IdentityEngine (`src/core/identity/IdentityEngine.ts`) は `openDatabase()` (db.ts) を使用して非同期にDBを取得している。これを `getDB()` (同期) に変更する。

```typescript
// 修正前 (IdentityEngine.ts 6行目, 83行目):
import { openDatabase } from '../../database/db';
// ...
this.db = await openDatabase();

// 修正後:
import { getDB } from '../../database/client';
// ...
this.db = getDB();  // 同期でDBインスタンス取得
```

#### 0-1-G: WipeManager / DespairModeManager のDB接続統一確認

WipeManager はコンストラクタで `db: SQLite.SQLiteDatabase` を受け取り、DespairModeManager 経由で使用される。Phase 0 完了後は、このDBインスタンスが `getDB()` で取得された統一インスタンスであることを保証する。

```
依存チェーン:
  app起動 → getDB() [onedayos.db] → IdentityEngine.initialize()
                                    → WipeManager(db)
                                    → DespairModeManager(db, wipeManager)
```

**確認事項:** 新 IdentityEngine が WipeManager を生成する場合、`this.db` (= `getDB()` の戻り値) を渡すこと。

**修正順序:**
1. `schema.ts` の DB名を `onedayos.db` に変更
2. `client.ts` に `getAppState` / `updateAppState` を追加
3. 新 IdentityEngine の DB接続を `getDB()` に変更 (0-1-F)
4. 全インポート元を `db.ts` → `client.ts` に更新
5. NotificationHandler.ts の直接接続を `getDB()` に変更
6. 不要な `await getDB()` を削除
7. **NotificationHandler.test.ts のモック構造を更新 (0-1-H)**
8. `db.ts` と `db.test.ts` を削除
9. 全テスト実行

#### 0-1-H: NotificationHandler.test.ts のモック構造変更 (v1.2 新設)

**ブロッカー対応:** v1.1 レビュー重大問題 #3

現在の NotificationHandler.test.ts は `expo-sqlite` の `openDatabaseAsync` を直接モックしている。DB接続を `getDB()` (client.ts) に変更するため、テストのモック構造を全面差し替えする必要がある。

**修正前 (NotificationHandler.test.ts):**
```typescript
// 16-18行目:
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

// 58-63行目 (beforeEach内):
mockDb = {
  runAsync: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 }),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  getAllAsync: jest.fn().mockResolvedValue([]),
  execAsync: jest.fn().mockResolvedValue(undefined),
} as any;

// 65行目:
(SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);

// 658行目 (テスト内):
expect(SQLite.openDatabaseAsync).toHaveBeenCalled();
```

**修正後:**
```typescript
// expo-sqlite モックを削除し、client.ts の getDB モックに差し替え:
jest.mock('../database/client', () => ({
  getDB: jest.fn(),
}));

import { getDB } from '../database/client';

// beforeEach内:
mockDb = {
  runAsync: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowId: 1 }),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  getAllAsync: jest.fn().mockResolvedValue([]),
  execAsync: jest.fn().mockResolvedValue(undefined),
} as any;

(getDB as jest.Mock).mockReturnValue(mockDb);  // 注: mockResolvedValue ではなく mockReturnValue（同期）

// 658行目のアサーション修正:
expect(getDB).toHaveBeenCalled();  // openDatabaseAsync → getDB に変更
```

**重要な差異:**
- `mockResolvedValue(mockDb)` → `mockReturnValue(mockDb)`: `getDB()` は同期関数のため
- `SQLite.openDatabaseAsync` → `getDB`: インポート元の変更
- expo-sqlite のモック自体が不要になる（NotificationHandler が直接使わなくなるため）

#### 0-1-I: db.test.ts の削除 (v1.2 新設)

`src/database/db.ts` の廃止に伴い、`src/database/db.test.ts`（存在する場合）も削除対象とする。

**テスト検証方法:**
- `npm test` で全テストがパス
- `getDB()` が常に同一インスタンスを返すことを単体テストで検証
- `transaction.ts` のトランザクションテスト (同期 `getDB()` のまま変更なし)
- NotificationHandler.test.ts のパス確認（**モック構造変更後**）
- DespairModeManager.test.ts のモック更新後にパス確認
- アプリ起動時に identity テーブルのデータが正しく読めることを確認
- **新規テスト:** `getAppState()` / `updateAppState()` が `client.ts` 経由で動作すること

---

### タスク 0-2: IdentityEngine の統一 (C2)

**複雑度:** L（大）
**目的:** 2つの IdentityEngine を1つに統一し、全呼び出し元を移行する

**対象ファイル・行番号:**
- `src/core/IdentityEngine.ts` 全体（137行）— 削除対象 (**オブジェクトリテラル**)
- `src/core/identity/IdentityEngine.ts` 全体（282行）— 統一先 (**シングルトンクラス**)

#### v1.1 修正: 旧 IdentityEngine はオブジェクトリテラルである

**旧 IdentityEngine の実際の構造:**
```typescript
// src/core/IdentityEngine.ts (オブジェクトリテラル)
export const IdentityEngine = {
  async checkHealth() { ... },
  async applyDamage(amount: number = 10) { ... },
  async restoreHealth(amount: number = 5) { ... },
  async killUser() { ... },
  async useInsurance() { ... },
  async getAntiVision(): Promise<string> { ... },
};
```

**呼び出しパターンの違い:**
```typescript
// 旧 (オブジェクトリテラル): 直接呼び出し
import { IdentityEngine } from '../src/core/IdentityEngine';
const status = await IdentityEngine.checkHealth();
await IdentityEngine.applyDamage(10);
await IdentityEngine.restoreHealth(5);
await IdentityEngine.killUser();
await IdentityEngine.useInsurance();
const av = await IdentityEngine.getAntiVision();

// 新 (シングルトンクラス): getInstance() 経由
import { IdentityEngine } from '../src/core/identity/IdentityEngine';
const engine = await IdentityEngine.getInstance();
const ih = await engine.getCurrentIH();
await engine.applyNotificationResponse('NO');
```

#### 0-2-A: 旧IdentityEngineの機能を新IdentityEngineに移植

旧 IdentityEngine にあって新 IdentityEngine にない機能:

| メソッド | 旧 (オブジェクトリテラル) | 新 (クラス) | 対応方針 |
|---------|----------------------|-----------|---------|
| `checkHealth()` | `IdentityEngine.checkHealth()` | `getCurrentIH()` + `isWipeNeeded()` で代替可 | 新に `checkHealth()` を追加 |
| `applyDamage(amount)` | `IdentityEngine.applyDamage(10)` | `applyNotificationResponse()` / `applyQuestPenalty()` | 汎用ダメージメソッドとして新に追加 |
| `restoreHealth(amount)` | `IdentityEngine.restoreHealth(5)` | `setCurrentIH()` で代替可 | 新に `restoreHealth()` を追加 |
| `killUser()` | `IdentityEngine.killUser()` — **DROP TABLE使用** | `onWipeTrigger` コールバック | WipeManagerに委譲 |
| `useInsurance()` | `IdentityEngine.useInsurance()` | なし | 新に追加 (C7と連携) |
| `getAntiVision()` | `IdentityEngine.getAntiVision()` — **anti_visionテーブル参照** | なし | 新に追加（**identityテーブル参照に修正**） |

**getAntiVision() のテーブル参照修正 (v1.1 新規):**
```typescript
// 旧 (src/core/IdentityEngine.ts 129-135行目):
// anti_vision テーブルの content カラムを参照 → レガシーテーブル
const result = await db.getFirstAsync<{ content: string }>(
  'SELECT content FROM anti_vision WHERE id = 1'
);

// 新 (修正後): identity テーブルの anti_vision カラムを参照
const result = await db.getFirstAsync<{ anti_vision: string }>(
  'SELECT anti_vision FROM identity WHERE id = 1'
);
```

#### 0-2-B: 呼び出し元の移行マップ（v1.1 修正: 呼び出しパターン差異を明記）

**移行戦略:** 旧IdentityEngine はオブジェクトリテラルで `IdentityEngine.method()` として直接呼び出しされている。新IdentityEngine はシングルトンクラスで `await getInstance()` が必要。

移行を最小侵襲にするため、**ラッパーモジュール** を作成して旧APIの呼び出しパターンを維持する選択肢もあるが、コードの明確さを優先し、**全呼び出し元を `await getInstance()` パターンに移行** する。

| ファイル | 旧の呼び出しパターン | 修正後 |
|---------|-------------------|-------|
| `app/index.tsx` 51行目 | `IdentityEngine.checkHealth()` | `const engine = await IdentityEngine.getInstance(); await engine.checkHealth()` |
| `app/index.tsx` 142行目 | `IdentityEngine.restoreHealth(5)` | `const engine = await IdentityEngine.getInstance(); await engine.restoreHealth(5)` |
| `app/index.tsx` 12-13行目 | 両方インポート (IdentityEngineNew + IdentityEngine) | 新IdentityEngineのみ |
| `app/index.tsx` 150-154行目 | `IdentityEngineNew.getInstance()` + `IdentityEngine.checkHealth()` | 新IdentityEngineのみ使用 |
| `app/death.tsx` 7行目 | `IdentityEngine.useInsurance()` (87行目) | `const engine = await IdentityEngine.getInstance(); await engine.useInsurance()` |
| `app/evening.tsx` 7行目 | `IdentityEngine.restoreHealth(10)` (19行目), `IdentityEngine.applyDamage(20)` (21行目) | `const engine = await IdentityEngine.getInstance(); await engine.restoreHealth(10)` / `await engine.applyDamage(20)` |
| `app/judgment.tsx` 7行目 | `IdentityEngine.applyDamage(10)` (66行目), `IdentityEngine.restoreHealth(2)` (75行目), `IdentityEngine.applyDamage(5)` (78行目) | `const engine = await IdentityEngine.getInstance(); await engine.applyDamage(10)` / `await engine.restoreHealth(2)` / `await engine.applyDamage(5)` |
| `app/morning.tsx` 7行目 | インポートのみ（メソッド呼び出しなし） | インポートを新IdentityEngineに変更。未使用の場合はインポート自体を削除 |
| `src/ui/lenses/IdentityLens.tsx` 8行目 | `IdentityEngine.checkHealth()` | `const engine = await IdentityEngine.getInstance(); await engine.checkHealth()` |
| `src/ui/lenses/MissionLens.tsx` 9行目 | `IdentityEngine.checkHealth()` | 同上 |
| `src/ui/lenses/QuestLens.tsx` 7行目 | `IdentityEngine.restoreHealth(5)` | 同上 |
| `src/ui/layout/StressContainer.tsx` 4行目 | `IdentityEngine.checkHealth()` / `getAntiVision()` | 同上 |
| `src/notifications/NotificationHandler.ts` 8行目 | 新 IdentityEngine 使用 | 維持 |
| `src/ui/screens/onboarding/ExcavationPhase.tsx` 19行目 | 新 IdentityEngine 使用 | 維持 |

**テスト移行:**

| テストファイル | 修正内容 |
|-------------|---------|
| `src/core/IdentityEngine.test.ts` | 旧エンジンのテストを新エンジン用に移植。`jest.mock` のパスを `'../../core/identity/IdentityEngine'` に変更 |
| `app/death.test.tsx` 18-19行目 | `jest.mock('../src/core/IdentityEngine')` → `jest.mock('../src/core/identity/IdentityEngine')` + モック構造変更 |
| `app/judgment.test.tsx` 11-12行目 | 同上 |
| `src/ui/layout/StressContainer.test.tsx` 12-13行目 | 同上 |

**テストモック構造の変更:**
```typescript
// 修正前 (オブジェクトリテラル用モック):
jest.mock('../src/core/IdentityEngine', () => ({
  IdentityEngine: {
    checkHealth: jest.fn().mockResolvedValue({ health: 100, isDead: false }),
    useInsurance: jest.fn().mockResolvedValue(undefined),
  },
}));

// 修正後 (シングルトンクラス用モック):
jest.mock('../src/core/identity/IdentityEngine', () => ({
  IdentityEngine: {
    getInstance: jest.fn().mockResolvedValue({
      checkHealth: jest.fn().mockResolvedValue({ health: 100, isDead: false }),
      useInsurance: jest.fn().mockResolvedValue(undefined),
      getCurrentIH: jest.fn().mockResolvedValue(100),
      restoreHealth: jest.fn().mockResolvedValue(undefined),
      applyDamage: jest.fn().mockResolvedValue(undefined),
      getAntiVision: jest.fn().mockResolvedValue('test anti-vision'),
    }),
    resetInstance: jest.fn(),
  },
}));
```

#### 0-2-C: app/index.tsx のデュアルインポートと二重エンジン使用の解消

```typescript
// 修正前 (app/index.tsx 12-13行目):
import { IdentityEngine as IdentityEngineNew } from '../src/core/identity/IdentityEngine';
import { IdentityEngine } from '../src/core/IdentityEngine';

// 修正後:
import { IdentityEngine } from '../src/core/identity/IdentityEngine';
```

```typescript
// 修正前 (app/index.tsx 50-53行目): 旧エンジンで IH をポーリング
const status = await IdentityEngine.checkHealth();
setHealth(status.health);

// 修正後:
const engine = await IdentityEngine.getInstance();
const status = await engine.checkHealth();
setHealth(status.health);
```

```typescript
// 修正前 (app/index.tsx 150-155行目): 二重エンジン使用
const engine = await IdentityEngineNew.getInstance();
await engine.setCurrentIH(100);
const status = await IdentityEngine.checkHealth(); // 旧エンジンで確認 = 別DB

// 修正後:
const engine = await IdentityEngine.getInstance();
await engine.setCurrentIH(100);
const health = await engine.getCurrentIH();
setHealth(health);
```

#### 0-2-D: 循環依存の防止設計（v1.1 新規追加）

統一後の依存方向を一方向に整理する:

```
IdentityEngine (IH計算のみ)
  ↓ onWipeTrigger callback
WipeManager (ワイプ実行 = DELETE FROM)
  ↓ 結果通知
DespairModeManager (状態管理 = app_state 更新)
```

**原則:**
- IdentityEngine は WipeManager を直接参照しない。ワイプはコールバック経由でトリガー
- WipeManager は IdentityEngine を参照しない
- DespairModeManager は WipeManager を保持するが、IdentityEngine は参照しない
- `killUser()` と `useInsurance()` は IdentityEngine のメソッドではなく、上位のオーケストレーションレイヤー（`app/death.tsx` 等）で WipeManager と IdentityEngine を組み合わせて実行する

**ただし、旧 API 互換性のため:**
新 IdentityEngine に `killUser()` / `useInsurance()` をラッパーとして追加する場合は、内部で WipeManager を呼び出す実装とする。この場合 IdentityEngine → WipeManager の片方向依存のみ。

**修正順序:**
1. 新 IdentityEngine に不足メソッドを追加
2. 新 IdentityEngine の DB接続を `getDB()` に変更 (タスク 0-1-F と同時)
3. テストの更新・追加
4. 呼び出し元を1ファイルずつ移行（テスト実行しながら）
5. 全移行完了後に旧ファイルを削除

**テスト検証方法:**
- `npm test -- src/core/identity/IdentityEngine.test.ts` で新メソッドのテスト
- 旧 `src/core/IdentityEngine.test.ts` のテストケースを新エンジン用に移植
- 全 `npm test` パス
- `app/index.tsx` で IH表示が正しく動作
- **新規テスト:** `checkHealth()`, `applyDamage()`, `restoreHealth()`, `getAntiVision()` の動作確認
- **新規テスト:** `getAntiVision()` が `identity` テーブル（レガシー `anti_vision` テーブルではなく）を参照すること

---

### タスク 0-3: OnboardingFlow / DespairModeManager の DB書き込み先修正 (C8)

**複雑度:** M（中）
**目的:** `db.ts` 廃止に伴い、OnboardingFlow と DespairModeManager のインポートを `client.ts` に更新する

**対象ファイル・行番号:**
- `src/ui/screens/onboarding/OnboardingFlow.tsx` 16行目: `import { updateAppState } from '../../../database/db'`
- `src/core/onboarding/OnboardingManager.ts` 6行目: `import { openDatabase, initializeDatabase } from '../../database/db'`
- `src/core/despair/DespairModeManager.ts` 13行目: `import { getAppState, updateAppState } from '../../database/db'`

**具体的な修正内容:**

#### 0-3-A: OnboardingFlow.tsx

```typescript
// 修正前 (16行目):
import { updateAppState } from '../../../database/db';

// 修正後:
import { updateAppState } from '../../../database/client';
```

#### 0-3-B: OnboardingManager.ts

```typescript
// 修正前 (6行目):
import { openDatabase, initializeDatabase } from '../../database/db';

// 修正後:
import { getDB, databaseInit } from '../../database/client';
```

OnboardingManager 内で `this.db = await openDatabase()` としている箇所を `this.db = getDB()` (同期) に変更。

#### 0-3-C: DespairModeManager.ts

```typescript
// 修正前 (13行目):
import { getAppState, updateAppState } from '../../database/db';

// 修正後:
import { getAppState, updateAppState } from '../../database/client';
```

**注意:** `getAppState` / `updateAppState` は `client.ts` に移行済み（タスク 0-1-B）。関数シグネチャは同一のため、インポートパスの変更のみで動作する。

**修正順序:** タスク 0-1 完了後に実施。0-1-B で `client.ts` に関数を追加し、0-3 でインポート元を更新する。

**テスト検証方法:**
- OnboardingManager のテストで DB書き込みが正しい DB に行われることを確認
- オンボーディング完了後に `app_state` が `active` に変わることを確認
- DespairModeManager.test.ts のモックを更新し、`client.ts` からのインポートに変更
- `app/index.tsx` でオンボーディング完了状態を正しく検出できることを確認

---

### Phase 0 ロールバック戦略

- ブランチ: `fix/phase-0-foundation-unification` (main から作成)
- 各タスク完了ごとにコミット
- 問題発生時は `git revert` でコミット単位のロールバック
- DB名変更によりローカルの `onedayos_master.db` データは失われる → 開発環境ではアプリ再インストールで対応
- **v1.0 リリース前のため、マイグレーション戦略は不要**
- Phase 0 完了後に main にマージ。Phase 1 のブランチは main から新規作成

---

## Phase 1: クリティカルルーティング・セキュリティ修正

### 目的

オンボーディング完了後の画面遷移が機能すること、SQLインジェクション脆弱性を排除すること、Insurance 機能の方針を確定し正しく実装すること。

### 影響範囲

- `src/ui/screens/onboarding/OnboardingFlow.tsx`
- `app/` ディレクトリ構成
- `src/core/onboarding/OnboardingManager.ts`
- `src/core/identity/IdentityEngine.ts`（統一後）
- `app/tabs_backup/` （削除対象）

---

### タスク 1-1: `/(tabs)` ルートの修正 (C3)

**複雑度:** M（中）
**目的:** 存在しない `/(tabs)` ルートへの遷移を修正し、レガシーファイルを削除する

**対象ファイル・行番号:**
- `src/ui/screens/onboarding/OnboardingFlow.tsx` 73行目: `router.replace('/(tabs)')`
- `src/ui/screens/onboarding/OnboardingFlow.tsx` 116行目: `router.replace('/(tabs)')`
- `app/tabs_backup/` ディレクトリ（削除対象）

**ルート構造の確認:**
`app/_layout.tsx` (131行目) では `Stack` ナビゲーターを使用しており、タブナビゲーションは使用していない。`app/(tabs)/` ディレクトリは存在しない。`app/tabs_backup/` は以前のタブナビゲーション時代の残骸。

**具体的な修正内容:**

```typescript
// 修正前 (73行目):
router.replace('/(tabs)');

// 修正後:
router.replace('/');
```

```typescript
// 修正前 (116行目):
router.replace('/(tabs)');

// 修正後:
router.replace('/');
```

#### 1-1-B: `app/tabs_backup/` の削除（v1.1 明確化）

`app/tabs_backup/` は明確に削除対象とする。内容:
- `_layout.tsx` — 旧タブレイアウト
- `evening.tsx` — 旧イブニング画面
- `index.tsx` — 旧インデックス画面
- `morning.tsx` — 旧モーニング画面

これらは git で untracked 状態であり、混乱の原因となるため削除する。

**テスト検証方法:**
- OnboardingFlow のテストで `router.replace` が `'/'` で呼ばれることを確認
- 手動テスト: オンボーディング完了後にメイン画面に遷移できること

---

### タスク 1-2: SQLインジェクション脆弱性の修正 (C6)

**複雑度:** S（小）
**目的:** `persistCurrentStep()` のテンプレートリテラル SQL を パラメータ化クエリに変更する

**対象ファイル・行番号:**
- `src/core/onboarding/OnboardingManager.ts` 498-507行目: `persistCurrentStep()`

**具体的な修正内容:**

```typescript
// 修正前 (504-507行目):
await this.db.execAsync(
  `INSERT OR REPLACE INTO onboarding_state (id, current_step, updated_at)
   VALUES (1, '${this.currentStep}', datetime('now'))`
);

// 修正後:
await this.db.runAsync(
  'INSERT OR REPLACE INTO onboarding_state (id, current_step, updated_at) VALUES (1, ?, datetime(\'now\'))',
  [this.currentStep]
);
```

**テスト検証方法:**
- `npm test -- src/core/onboarding` で OnboardingManager テストがパス
- 手動: オンボーディング各ステップが正常に保存されること

---

### タスク 1-3: Insurance 機能の方針決定と修正 (C7)

**複雑度:** M（中）
**目的:** Insurance 復活機能の設計原則との整合性を確保し、データフローを正しく実装する

**対象ファイル・行番号:**
- `src/core/IdentityEngine.ts` (旧) 71-91行目: `killUser()` — DROP TABLE使用
- `src/core/IdentityEngine.ts` (旧) 98-123行目: `useInsurance()` — UPDATEが空テーブルに適用
- `src/core/identity/WipeManager.ts` 63-131行目: `executeWipe()` — DELETE使用（正しい）

#### v1.1 新規: Insurance 機能の設計方針決定

**設計原則との矛盾:**
CLAUDE.md は「No recovery mechanism - Wipe is final」「No backup prompts - No warnings before data loss」と規定しているが、旧 IdentityEngine には `useInsurance()` メソッドが存在し、IH=50%で復活させる機能がある。

**決定:** Insurance 機能を**有効な機能として維持**する。理由:
- マネタイゼーション (課金) 機能として設計されている
- 「ワイプは最終的」の原則は無課金ユーザーに対して適用
- Insurance は有料の例外措置として位置づける
- ただし、Insurance 使用後はオンボーディングへ遷移（データは消えている、IH=50%で新規開始）

#### 1-3-A: killUser() の修正

```
修正方針:
  - DROP TABLE ではなく WipeManager.executeWipe() に委譲
  - WipeManager は DELETE FROM を使用（テーブル構造を維持）
  - app_state を 'despair' に更新
```

#### 1-3-B: useInsurance() の修正（v1.1 修正: データフロー定義）

**問題点の整理:**
1. 旧 `killUser()` が `DROP TABLE` を使用 → テーブル自体が消失
2. `useInsurance()` が `initDatabase()` でテーブル再作成 → 空テーブル
3. `UPDATE identity SET identity_health = 50 WHERE id = 1` → 0行に影響（レコードなし）

**修正後のフロー:**
```
useInsurance() {
  1. WipeManager が DELETE FROM を使用していれば、テーブルは存在する
     (killUser() を WipeManager に委譲済みのため)
  2. app_state を 'active' に更新
  3. identity テーブルに IH=50 のレコードを INSERT OR REPLACE
     - anti_vision, identity_statement, one_year_mission は空文字列
     - これにより app/index.tsx が identity データなしを検出 → オンボーディングへ遷移
  4. 結果的に: IH=50% + オンボーディング再実行
}
```

**具体的な修正:**
```typescript
// 新 IdentityEngine に追加する useInsurance():
async useInsurance(): Promise<void> {
  if (!this.db) throw new Error('Database not initialized');

  // app_state を 'onboarding' に更新（Insurance後は再セットアップ）
  await this.db.runAsync(
    'UPDATE app_state SET state = ?, updated_at = datetime(\'now\') WHERE id = 1',
    ['onboarding']
  );

  // IH=50%で identity レコードを作成（空のidentity情報で）
  // app/index.tsx が identity_statement を検出し、空なら onboarding に遷移
  await this.db.runAsync(
    `INSERT OR REPLACE INTO identity (id, anti_vision, identity_statement, one_year_mission, identity_health, created_at, updated_at)
     VALUES (1, '', '', '', 50, datetime('now'), datetime('now'))`,
    []
  );

  this.currentIH = 50;
}
```

**テスト検証方法:**
- `useInsurance()` 後に identity テーブルに id=1 のレコードが存在し、IH=50であること
- `useInsurance()` 後に `app_state` が `onboarding` であること
- `useInsurance()` 後にアプリがオンボーディング画面に遷移すること（identity_statement が空のため）
- killUser() → useInsurance() のフローが正常に動作すること

---

### Phase 1 ロールバック戦略

- ブランチ: `fix/phase-1-routing-security` (Phase 0 マージ後の main から作成)
- 各タスクごとにコミット
- C3 (ルーティング) は独立してロールバック可能
- C6 (SQLインジェクション) は独立してロールバック可能
- C7 (Insurance) は Phase 0 のエンジン統一に依存

---

## Phase 2: ペナルティ・仕様整合性修正

### 目的

DespairModeManager の仕様と実装の矛盾を解消し、ペナルティ計算を仕様書通りに修正し、通知システムの信頼性を向上させる。

### 影響範囲

- `src/core/despair/DespairModeManager.ts`
- `src/core/identity/IdentityEngine.ts`
- `src/notifications/NotificationHandler.ts`
- `src/types/identity.ts`
- `src/core/identity/WipeManager.ts`

---

### タスク 2-1: DespairModeManager の仕様矛盾解消 (C4)

**複雑度:** M（中）
**目的:** ファイルヘッダーの仕様（ロックアウトなし）と実装（24時間ロックアウト）の矛盾を解消する

**対象ファイル・行番号:**
- `src/core/despair/DespairModeManager.ts` 1-9行目: ファイルヘッダーコメント「No 24-hour lockout period」
- `src/core/despair/DespairModeManager.ts` 144-163行目: `canResetup()` — 24時間ロックアウトを強制
- `src/core/despair/DespairModeManager.ts` 169-171行目: `hasLockoutPeriod()` — `return true`
- `src/core/despair/DespairModeManager.ts` 177-195行目: `getRemainingLockoutMs()`

**決定: ヘッダーの仕様（ロックアウトなし）に合わせる**

**具体的な修正内容:**

```typescript
// 修正前 (canResetup, 144-163行目):
async canResetup(): Promise<boolean> {
  const state = await getAppState();
  if (state !== 'despair') { return true; }
  const wipeLog = await this.wipeManager.getWipeLog();
  if (wipeLog.length === 0) { return true; }
  const mostRecentWipe = wipeLog[0];
  const wipedAt = mostRecentWipe.timestamp;
  const now = Date.now();
  const hoursSinceWipe = (now - wipedAt) / (1000 * 60 * 60);
  return hoursSinceWipe >= 24;
}

// 修正後:
async canResetup(): Promise<boolean> {
  // 仕様: 即時再セットアップ常に可能
  return true;
}
```

```typescript
// 修正前 (hasLockoutPeriod, 169-171行目):
hasLockoutPeriod(): boolean {
  return true;
}

// 修正後:
hasLockoutPeriod(): boolean {
  return false;
}
```

```typescript
// 修正前 (getRemainingLockoutMs, 177-195行目):
async getRemainingLockoutMs(): Promise<number> {
  // ... 24時間計算ロジック
}

// 修正後:
async getRemainingLockoutMs(): Promise<number> {
  return 0; // ロックアウトなし
}
```

**テスト検証方法:**
- `npm test -- src/core/despair/DespairModeManager.test.ts`
- テストケース: wipe直後でも `canResetup()` が `true` を返すこと
- テストケース: `hasLockoutPeriod()` が `false` を返すこと
- テストケース: `getRemainingLockoutMs()` が `0` を返すこと
- **v1.1 追加:** 既存テストのモック構造を確認。レビューで指摘された「モックの副作用で誤ってパスしている」テストケースを特定し修正

---

### タスク 2-2: MISSED_NOTIFICATION_PENALTY の適用 (C5)

**複雑度:** S（小）
**目的:** タイムアウト (IGNORED) のペナルティを仕様通り -20% に修正する

**対象ファイル・行番号:**
- `src/core/identity/IdentityEngine.ts` 133-139行目: `applyNotificationResponse()` 内の分岐

**具体的な修正内容:**

```typescript
// 修正前 (134-139行目):
if (response === 'YES') {
  delta = 0;
} else if (response === 'NO' || response === 'IGNORED') {
  delta = -IH_CONSTANTS.NOTIFICATION_PENALTY; // -15 for both
}

// 修正後:
if (response === 'YES') {
  delta = 0; // No penalty for YES
} else if (response === 'NO') {
  delta = -IH_CONSTANTS.NOTIFICATION_PENALTY; // -15 for explicit NO
} else if (response === 'IGNORED') {
  delta = -IH_CONSTANTS.MISSED_NOTIFICATION_PENALTY; // -20 for timeout/ignored
}
```

**テスト検証方法:**
- `npm test -- src/core/identity/IdentityEngine.test.ts`
- テストケース: YES → delta = 0
- テストケース: NO → delta = -15
- テストケース: IGNORED → delta = -20
- **v1.1 追加:** 既存テストで `IGNORED` のペナルティが `-15` を期待しているテストケースを特定し、`-20` に修正

---

### タスク 2-3: is_missed カラムの更新漏れ修正 (H1)

**複雑度:** S（小）
**目的:** タイムアウト時に `is_missed` カラムを `1` に更新する

**対象ファイル・行番号:**
- `src/notifications/NotificationHandler.ts` 201-205行目: タイムアウト時のDB更新

**具体的な修正内容:**

```typescript
// 修正前 (201-204行目):
await this.db!.runAsync(
  'UPDATE notifications SET timeout_at = ? WHERE id = ?',
  [timeoutTime, notification.id]
);

// 修正後:
await this.db!.runAsync(
  'UPDATE notifications SET timeout_at = ?, is_missed = 1 WHERE id = ?',
  [timeoutTime, notification.id]
);
```

**テスト検証方法:**
- `npm test -- src/notifications/NotificationHandler.test.ts`
- テストケース: タイムアウト後に `is_missed = 1` であること

---

### タスク 2-4: タイムアウト処理のレース条件保護 (H2)

**複雑度:** M（中）
**目的:** `checkTimeoutsOnResume()` の並行呼び出しによる二重ペナルティを防止する

**対象ファイル・行番号:**
- `src/notifications/NotificationHandler.ts` 182-213行目: `checkTimeoutsOnResume()`

**具体的な修正内容:**

```typescript
private isProcessingTimeouts = false;

async checkTimeoutsOnResume(): Promise<void> {
  if (this.isProcessingTimeouts) return;
  this.isProcessingTimeouts = true;
  try {
    this.ensureInitialized();
    const now = Date.now();
    const pending = await this.db!.getAllAsync<NotificationRecord>(
      'SELECT * FROM notifications WHERE responded_at IS NULL'
    );

    for (const notification of pending) {
      const scheduledTime = new Date(notification.scheduled_time).getTime();
      const elapsed = now - scheduledTime;

      if (elapsed > NOTIFICATION_SCHEDULE.TIMEOUT_MS) {
        const timeoutTime = new Date().toISOString();
        // 冪等性保証: is_missed = 0 AND responded_at IS NULL の条件追加
        const result = await this.db!.runAsync(
          'UPDATE notifications SET timeout_at = ?, is_missed = 1 WHERE id = ? AND is_missed = 0 AND responded_at IS NULL',
          [timeoutTime, notification.id]
        );
        // changes が 0 なら既に処理済みなのでペナルティをスキップ
        if (result.changes > 0) {
          await this.engine!.applyNotificationResponse('IGNORED');
          await HapticEngine.punishmentHeartbeat();
        }
      }
    }
  } finally {
    this.isProcessingTimeouts = false;
  }
}
```

**テスト検証方法:**
- 並行呼び出しテスト: `checkTimeoutsOnResume()` を同時に2回呼び出し、ペナルティが1回のみ適用されること

---

### タスク 2-5: IdentityEngine 並行ペナルティのレース条件 (H3)

**複雑度:** M（中）
**目的:** 並行呼び出し時のIH更新をアトミックにする

**対象ファイル・行番号:**
- `src/core/identity/IdentityEngine.ts` 122-157行目: `applyNotificationResponse()`

**具体的な修正内容:**

```
修正方針:
  - メモリ上の read-modify-write ではなく、DB上でアトミックに更新
  1. UPDATE identity SET identity_health = MAX(0, identity_health - ?) WHERE id = 1
  2. SELECT identity_health FROM identity WHERE id = 1 でメモリ値を同期
  3. ワイプ判定は更新後の値で行う
```

**テスト検証方法:**
- 並行ペナルティ適用テスト
- IH=30 で2つの -20 ペナルティ → IH=0 (ワイプ発動) が正しく動作すること

---

### タスク 2-6: WipeEvent 型定義の統一 (H4)

**複雑度:** S（小）
**目的:** WipeEvent の重複定義を types/identity.ts に統一する

**対象ファイル・行番号:**
- `src/types/identity.ts` 12-16行目: `WipeEvent` (timestamp: string)
- `src/core/identity/IdentityEngine.ts` 23-27行目: `WipeEvent` (timestamp: number, reason: 'IH_ZERO')
- `src/core/identity/WipeManager.ts` 8行目: `WipeReason`

**具体的な修正内容:**

```typescript
// types/identity.ts に統一:
export type WipeReason = 'IH_ZERO' | 'QUEST_FAIL' | 'USER_REQUEST';

export interface WipeEvent {
  timestamp: number;  // Unix ms に統一
  finalIH: number;
  reason: WipeReason;
}
```

IdentityEngine.ts と WipeManager.ts は `types/identity.ts` からインポート。

**テスト検証方法:**
- TypeScript コンパイルが通ること
- 関連テストがパスすること

---

### タスク 2-7: QuestCompletion の動的クエスト数対応 (H5)

**複雑度:** S（小）
**目的:** QuestCompletion をハードコードされた2クエストから動的クエスト数に変更する

**対象ファイル・行番号:**
- `src/core/identity/IdentityEngine.ts` 32-35行目: `QuestCompletion`
- `src/core/identity/IdentityEngine.ts` 162-190行目: `applyQuestPenalty()`

**具体的な修正内容:**

```typescript
// 修正前:
export interface QuestCompletion {
  quest1: boolean;
  quest2: boolean;
}

// 修正後:
export interface QuestCompletion {
  completedCount: number;
  totalCount: number;
}

// applyQuestPenalty 内:
const anyIncomplete = completion.completedCount < completion.totalCount;
```

**テスト検証方法:**
- 2, 3, 5 クエストそれぞれで `applyQuestPenalty` が正しく動作すること
- 全完了時はペナルティなし、1つでも未完了で -20% であること

---

### Phase 2 ロールバック戦略

- ブランチ: `fix/phase-2-penalty-consistency` (Phase 1 マージ後の main から作成)
- 各タスクは独立してロールバック可能
- C5 の変更は既存テストの期待値変更を伴うため、テストとセットでコミット

---

## Phase 3: UIコンポーネント・メモリリーク修正

### 目的

UIコンポーネントのメモリリーク、stale closure、無限再レンダリングを修正し、パフォーマンスを改善する。

### 影響範囲

- `src/ui/effects/` 配下
- `src/ui/lenses/` 配下
- `src/ui/screens/onboarding/` 配下
- `src/ui/layout/StressContainer.tsx`
- `app/index.tsx`

### Phase 3/4 並行可能タスク（v1.1 新規追加）

以下のタスクは Phase 2 完了を待たずに着手可能:

| タスク | 依存関係 | 並行可能 |
|-------|---------|---------|
| H6 (AntiVisionFragments) | なし | Phase 2 と並行可 |
| H7 (useLensGesture) | なし | Phase 2 と並行可 |
| H8 (Animated._value) | なし | Phase 2 と並行可 |
| H9 (LensSyncPhase) | なし | Phase 2 と並行可 |
| H10 (QuestCompletion useEffect) | なし | Phase 2 と並行可 |
| H12 (welcome step保存) | なし | Phase 2 と並行可 |
| M2 (SubliminalFlash) | なし | Phase 2 と並行可 |
| M3 (UnifiedLensView) | なし | Phase 2 と並行可 |
| M4 (lineHeight) | なし | Phase 2 と並行可 |
| M1 (ポーリング集約) | **C2 (エンジン統一)** | Phase 2 と並行可、Phase 0 後 |

---

### タスク 3-1: AntiVisionFragments のメモリリーク修正 (H6)

**複雑度:** S（小）
**目的:** `setTimeout` のクリーンアップを追加し、アンマウント後の状態更新を防止する

**対象ファイル:** `src/ui/effects/AntiVisionFragments.tsx` 57-77行目

**具体的な修正内容:**
```typescript
useEffect(() => {
  const timeoutIds: ReturnType<typeof setTimeout>[] = [];

  newFragments.forEach((fragment) => {
    const delay = Math.random() * 2000;
    const timeoutId = setTimeout(() => {
      Animated.sequence([...]).start();
    }, delay);
    timeoutIds.push(timeoutId);
  });

  return () => {
    timeoutIds.forEach(id => clearTimeout(id));
  };
}, [health, antiVision]);
```

**テスト検証方法:**
- コンポーネントのマウント/アンマウントテストでメモリリーク警告が出ないこと

---

### タスク 3-2: useLensGesture の stale closure 修正 (H7)

**複雑度:** M（中）
**目的:** PanResponder 内の `onLensChange` が常に最新のコールバックを参照するようにする

**対象ファイル:** `src/ui/lenses/useLensGesture.ts` 19-75行目

**具体的な修正内容:**
```typescript
const onLensChangeRef = useRef(onLensChange);
useEffect(() => {
  onLensChangeRef.current = onLensChange;
}, [onLensChange]);

// PanResponder内:
onPanResponderRelease: () => {
  // ...
  .start(() => {
    onLensChangeRef.current(targetLens);
  });
}
```

**テスト検証方法:**
- `npm test -- src/ui/lenses/useLensGesture.test.tsx`

---

### タスク 3-3: Animated.Value._value の内部API使用修正 (H8)

**複雑度:** S（小）
**目的:** `_value` 内部APIを公開APIに置き換える

**対象ファイル:** `src/ui/lenses/useLensGesture.ts` 46行目

**具体的な修正内容:**
```typescript
const currentScaleValue = useRef(0.5);

// onPanResponderMove内:
scale.setValue(scaleValue);
currentScaleValue.current = scaleValue;

// onPanResponderRelease内:
const finalScale = currentScaleValue.current;
```

**テスト検証方法:**
- ピンチジェスチャーのスナップが正しく動作すること

---

### タスク 3-4: LensSyncPhase の stale closure 修正 (H9)

**複雑度:** S（小）
**目的:** `handleLensChange` が常に最新の state を参照するようにする

**対象ファイル:** `src/ui/screens/onboarding/LensSyncPhase.tsx` 33-51行目

**具体的な修正内容:**
```typescript
// useCallback + 正しい依存配列、または state 更新関数の関数形式を使用
```

**テスト検証方法:**
- `npm test -- src/ui/screens/onboarding/LensSyncPhase.test.tsx`

---

### タスク 3-5: QuestCompletion の useEffect 複数発火修正 (H10)

**複雑度:** S（小）
**対象ファイル:** `src/ui/screens/quest/QuestCompletion.tsx` 73行目付近

**具体的な修正内容:**
- インライン関数を `useCallback` でメモ化

**テスト検証方法:**
- useEffect が不要に複数回発火しないことをテストで確認

---

### タスク 3-6: ExcavationPhase の未確認メソッド呼び出し確認 (H11)

**複雑度:** S（小）
**対象ファイル:** `src/ui/screens/onboarding/ExcavationPhase.tsx` 46行目

**確認結果:**
`applyOnboardingStagnationPenalty()` は新 IdentityEngine (`src/core/identity/IdentityEngine.ts` 196-216行目) に存在する。ExcavationPhase は既に新 IdentityEngine をインポートしている (19行目)。Phase 0 のエンジン統一後もこのメソッドは維持されるため、修正不要。

**テスト検証方法:**
- `npm test -- src/ui/screens/onboarding/ExcavationPhase.test.tsx`

---

### タスク 3-7: OnboardingManager welcome step 保存漏れ修正 (H12)

**複雑度:** S（小）
**対象ファイル:** `src/core/onboarding/OnboardingManager.ts` 181-183行目

**具体的な修正内容:**
```typescript
// 修正前:
if (step !== 'welcome') {
  await this.persistCurrentStep();
}

// 修正後:
await this.persistCurrentStep();
```

**テスト検証方法:**
- welcome step 完了後にマネージャー再初期化して anti-vision ステップから再開すること

---

### タスク 3-8: StressContainer + レンズ群のポーリング集約 (M1)

**複雑度:** M（中）
**目的:** 4箇所の独立ポーリングを1つに集約し、パフォーマンスを改善する

**対象ファイル:**
- `src/ui/layout/StressContainer.tsx` — 2秒ポーリング
- `src/ui/lenses/IdentityLens.tsx` — 2秒ポーリング
- `src/ui/lenses/MissionLens.tsx` — 2秒ポーリング
- `app/index.tsx` 56行目 — 2秒ポーリング

**v1.1 追加: StressContainer 二重使用の解消**

`app/_layout.tsx` (129行目) で `StressContainer` がグローバルに使用され、以下のファイルでもう一度使用されている。これにより StressContainer のポーリングが多重に実行されている。ポーリング集約時にこの多重使用も解消する。

**v1.2 追加: StressContainer 多重ネストの全スコープ**

| ファイル | 行 | 状況 |
|---------|---|------|
| `app/_layout.tsx` | 129行目 | グローバルラップ（**これを残す**） |
| `app/index.tsx` | 283行目 | 二重使用 → **削除** |
| `app/evening.tsx` | 8行目 (import) | 二重使用 → **削除** |
| `app/judgment.tsx` | 9行目 (import) | 二重使用 → **削除** |
| `app/morning.tsx` | (要確認) | 使用していれば **削除** |

**具体的な修正内容:**
```
修正方針:
  1. IH値の購読メカニズム（EventEmitter or React Context）を導入
  2. 単一のポーリングソース（_layout.tsx の StressContainer）がIH値を更新
  3. 子コンポーネントは Context or props 経由でIH値を受け取る
  4. 個別ポーリングを廃止
  5. app/index.tsx, app/evening.tsx, app/judgment.tsx, app/morning.tsx の StressContainer を削除
```

**テスト検証方法:**
- DBクエリ頻度の減少確認
- 全コンポーネントでIH値が一貫していること

---

### タスク 3-9: SubliminalFlash の無限再レンダリング修正 (M2)

**複雑度:** S（小）
**対象ファイル:** `src/ui/effects/SubliminalFlash.tsx`

**具体的な修正内容:**
- `intervalRange` 配列を `useMemo` でメモ化

**テスト検証方法:**
- `npm test -- src/ui/effects/SubliminalFlash.test.tsx`

---

### タスク 3-10: UnifiedLensView の非推奨API修正 (M3)

**複雑度:** S（小）
**対象ファイル:** `src/ui/lenses/UnifiedLensView.tsx`

**具体的な修正内容:**
- `removeListener` を `addListener`/`removeListener` ペアに変更
- フレーム毎再レンダリングを throttle

**テスト検証方法:**
- 非推奨API警告が出ないこと

---

### タスク 3-11: lineHeight の単位修正 (M4)

**複雑度:** S（小）

**対象ファイル:** `src/ui/theme/theme.ts` 159-163行目

**v1.1 修正: 使用状況の調査結果**

全ての `theme.typography.lineHeight` 使用箇所を調査した結果:

| ファイル | 使用方法 |
|---------|---------|
| `OnboardingFlow.tsx` 427行目 | `fontSize.body * lineHeight.relaxed` = 16 * 1.8 = 28.8 (乗数として使用) |
| `OnboardingFlow.tsx` 524行目 | `fontSize.caption * lineHeight.relaxed` (乗数として使用) |
| `OnboardingFlow.tsx` 538行目 | `fontSize.caption * lineHeight.relaxed` (乗数として使用) |

**結論:** 現在の使用箇所は全て乗数として正しく使用されている。ただし、将来的に `lineHeight: theme.typography.lineHeight.normal` のように直接値として使われるリスクがある。

**修正方針:** ヘルパー関数アプローチを採用し、`theme.ts` の値を乗数として維持:
```typescript
export const getLineHeight = (fontSize: number, multiplier: number) => Math.round(fontSize * multiplier);
```

**テスト検証方法:**
- テキストの表示が正しいことを視覚的に確認

---

### タスク 3-12: ih プロパティの non-enumerable 問題修正 (M5)

**複雑度:** S（小）
**対象ファイル:** `src/ui/theme/theme.ts` 114-124行目

**具体的な修正内容:**
- `Object.defineProperty` を使わず、colors オブジェクトに直接 `ih` プロパティを追加

**テスト検証方法:**
- `{ ...theme.colors }` で `ih` プロパティが存在すること

---

### タスク 3-13: death.tsx の setTimeout クリーンアップ (M6)

**複雑度:** S（小）
**対象ファイル:** `app/death.tsx`

**具体的な修正内容:**
- 全ての setTimeout の ID を収集し、useEffect クリーンアップで clearTimeout

**テスト検証方法:**
- `npm test -- app/death.test.tsx`

---

### タスク 3-14: DespairScreen の無限再レンダリング修正 (M7)

**複雑度:** S（小）
**対象ファイル:** `src/ui/screens/DespairScreen.tsx`

**具体的な修正内容:**
- `onLockoutEnd` を `useCallback` でメモ化

**テスト検証方法:**
- `npm test -- src/ui/screens/DespairScreen.test.tsx`

---

### タスク 3-15: GapInterrogation の正規表現修正 (M8)

**複雑度:** S（小）
**対象ファイル:** `src/ui/screens/onboarding/` 内の GapInterrogation 関連

**具体的な修正内容:**
- 日本語のあいまい表現に対応した正規表現の修正

---

### タスク 3-16: LensSyncPhase の removeAllListeners 過剰修正 (M9)

**複雑度:** S（小）
**対象ファイル:** `src/ui/screens/onboarding/LensSyncPhase.tsx`

**具体的な修正内容:**
- `addListener` で返されるリスナーIDを保持し、`removeListener(id)` で個別削除

**テスト検証方法:**
- `npm test -- src/ui/screens/onboarding/LensSyncPhase.test.tsx`

---

### Phase 3 ロールバック戦略

- ブランチ: `fix/phase-3-ui-memory-leaks` (Phase 1 マージ後の main から作成)
- **Phase 2 と並行作業可能** (M1 を除く)
- 各タスクは独立しており、個別にロールバック可能
- M1 (ポーリング集約) は広範な変更のため、サブブランチで管理推奨

---

## Phase 4: 型安全性・デザイン一貫性修正

### 目的

型の冗長性・不整合を解消し、デザインシステムの一貫性を確保する。

### 影響範囲

- `src/notifications/NotificationHandler.ts`
- `src/types/`
- `app.json`
- `src/constants/index.ts`
- `src/ui/screens/onboarding/CovenantPhase.tsx`
- `src/ui/theme/colors.ts`
- `src/ui/theme/theme.ts`
- `src/ui/effects/PersistentNoise.tsx`
- `app/_layout.tsx`

---

### タスク 4-1: HandleResponseResult の冗長フィールド修正 (M10)

**複雑度:** S（小）
**対象ファイル:** `src/notifications/NotificationHandler.ts` 27-33行目

**具体的な修正内容:**
```typescript
// 修正後:
export interface HandleResponseResult {
  success: boolean;
  delta: number;        // IH変化量（ihDelta を削除し統一）
  newIH: number;
  wipeTriggered: boolean;
}
```

**テスト検証方法:**
- `HandleResponseResult` を使用している全箇所を更新
- テストの期待値を修正

---

### タスク 4-2: NotificationData.id の型不整合修正 (M11)

**複雑度:** S（小）
**対象ファイル:** `src/notifications/NotificationHandler.ts` 97行目

**具体的な修正内容:**
- `notificationId: string` → `notificationId: number` に変更
- `recordNotificationFired` の `_notificationId: string` も `number` に変更

**テスト検証方法:**
- 型チェックがパスすること
- DB検索が正しく動作すること

---

### タスク 4-3: app.json スプラッシュ画面の背景色修正 (M12)

**複雑度:** S（小）
**対象ファイル:** `app.json` 15行目, 32行目

**具体的な修正内容:**
```json
// 修正前:
"backgroundColor": "#ffffff"

// 修正後:
"backgroundColor": "#000000"
```

**テスト検証方法:**
- アプリ起動時にスプラッシュ画面が黒背景であること（視覚的確認）

---

### タスク 4-4: FIVE_QUESTIONS の名前と件数の不整合修正 (M13)

**複雑度:** S（小）
**対象ファイル:** `src/constants/index.ts` 35-42行目

**v1.1 修正: 判断の確定**

**調査結果:** 6通知 (6:00, 9:00, 12:00, 15:00, 18:00, 21:00) に対して6つの質問が存在し、意図的な1:1対応である可能性が高い。6番目の質問「何を避けようとしているか？」は anti-vision に直接関連しており、設計上有用。

**決定:** 定数名を `REFLECTION_QUESTIONS` に変更し、6件を維持する。

```typescript
// 修正前:
export const FIVE_QUESTIONS = [
  "あなたは誰か？",
  "あなたは何をしているか？",
  "なぜそれをしているのか？",
  "それはあなたのアイデンティティと一致しているか？",
  "次に何をするか？",
  "何を避けようとしているか？",
] as const;

// 修正後:
export const REFLECTION_QUESTIONS = [
  "あなたは誰か？",
  "あなたは何をしているか？",
  "なぜそれをしているのか？",
  "それはあなたのアイデンティティと一致しているか？",
  "次に何をするか？",
  "何を避けようとしているか？",
] as const;
```

**テスト検証方法:**
- `FIVE_QUESTIONS` を参照している全箇所を `REFLECTION_QUESTIONS` に更新
- 通知スケジュールとの整合性確認

---

### タスク 4-5: CovenantPhase の fake timers 非互換修正 (M14)

**複雑度:** S（小）
**対象ファイル:** `src/ui/screens/onboarding/CovenantPhase.tsx`

**具体的な修正内容:**
- テストで `requestAnimationFrame` をモック
- または `setTimeout(fn, 0)` で代替

**テスト検証方法:**
- `npm test -- src/ui/screens/onboarding/CovenantPhase.test.tsx`

---

### タスク 4-6: カラーシステムの不一致修正 (M15)

**複雑度:** M（中）
**対象ファイル:**
- `src/ui/theme/colors.ts` 25行目: `accent: '#D4AF37'` (金)
- `src/ui/theme/theme.ts` 104行目: `accent: '#FF0000'` (赤)

**具体的な修正内容:**
- ブルータリストデザインシステム (`theme.ts`) を正とする
- `colors.ts` の `Colors.dark` を以下に変更:
  - `accent: '#FF0000'` (赤に統一)
  - `background: '#000000'` (theme.ts と一致)
  - `error: '#FF0000'` (theme.ts と一致)

**テスト検証方法:**
- アプリ全体でアクセントカラーが赤で統一されていること

---

### タスク 4-7: PersistentNoise のランダムインターバル修正 (M16)

**複雑度:** S（小）
**対象ファイル:** `src/ui/effects/PersistentNoise.tsx`

**具体的な修正内容:**
- `setInterval` → `setTimeout` の再帰呼び出しでランダム間隔を実現

**テスト検証方法:**
- `npm test -- src/ui/effects/PersistentNoise.test.tsx`

---

### タスク 4-8: _layout.tsx の Web用 dead code 削除 (M17)（v1.1 新規追加）

**複雑度:** S（小）
**目的:** モバイル専用アプリにおける Web 用 dead code を削除する

**対象ファイル:** `app/_layout.tsx` 87-108行目

**具体的な修正内容:**
```typescript
// 削除対象 (87-108行目):
// window.addEventListener('unhandledrejection', ...) は Platform.OS === 'web' ガードがあるが、
// モバイル専用アプリでは dead code。
// Platform.OS === 'web' 分岐内のコードを全て削除。
```

**注意:** `WebNotSupported` コンポーネント (21-69行目) と最終行の `Platform.OS === 'web' ? WebNotSupported : RootLayout` (147行目) は、expo-router の Web ビルドを完全に無効化できない場合の安全策として残す。

**テスト検証方法:**
- モバイルビルドが正常に動作すること
- エラーハンドリングがモバイル環境で機能すること

---

### Phase 4 ロールバック戦略

- ブランチ: `fix/phase-4-type-safety-design` (Phase 1 マージ後の main から作成)
- **Phase 2, Phase 3 と並行作業可能** (Phase 0, 1 のみに依存するタスクが大部分)
- 全タスクが独立しており、個別ロールバック可能
- M15 (カラーシステム統一) は視覚的変更が大きいため、慎重にテスト

---

## リスクアセスメント

### 高リスクタスク

| タスク | リスク | 影響 | 対策 |
|-------|-------|------|------|
| 0-1 (DB名統一) | **高** | 全データアクセスに影響。`onedayos_master.db` のデータにアクセス不可 | v1.0 リリース前のため、マイグレーション不要。開発環境は再インストール |
| 0-2 (エンジン統一) | **高** | IH計算の全フローに影響。呼び出しパターン変更が広範 | 1ファイルずつ移行、テスト実行しながら進める |
| H3 (レース条件) | **高** | 並行実行時にIHが不正確になる | DBアトミック操作によるロックフリー設計 |
| M1 (ポーリング集約) | **中** | コンポーネント間のデータフローが大幅変更 | React Context の導入、段階的移行 |

### 中リスクタスク

| タスク | リスク | 影響 | 対策 |
|-------|-------|------|------|
| C7 (Insurance) | **中** | 復活機能が壊れるとユーザーが永久にロック | INSERT OR REPLACE の動作確認テスト。onboarding 遷移の確認 |
| C3 (ルーティング) | **中** | 画面遷移の失敗 | ルーティングテスト、手動確認 |
| M15 (カラー統一) | **中** | 視覚的な変更が広範 | スクリーンショット比較 |
| 2-7 (QuestCompletion) | **中** | インターフェース変更が広範に影響 | 全呼び出し元の更新確認 |

### 低リスクタスク

| タスク | リスク |
|-------|-------|
| C6 (SQLインジェクション) | 低 — パラメータ化のみの変更 |
| H1 (is_missed更新) | 低 — 1行追加 |
| H6 (setTimeout) | 低 — クリーンアップ追加のみ |
| M12 (app.json) | 低 — 設定値変更のみ |
| M13 (REFLECTION_QUESTIONS) | 低 — 定数名変更のみ |
| M17 (dead code削除) | 低 — Web用コード削除のみ |

### 全体的なリスク

1. **データマイグレーション:** Phase 0 で DB名が `onedayos_master.db` → `onedayos.db` に変わるため、既存のローカルデータにアクセスできなくなる。v1.0 リリース前であれば問題ないが、テスター環境では再オンボーディングが必要。

2. **テストの信頼性:** DespairModeManager.test.ts がモックの副作用で誤ってパスしている可能性 (C4)。テスト修正時に実際のバグが露呈する可能性。

3. **循環依存:** エンジン統一時の依存方向を一方向に整理（タスク 0-2-D）。IdentityEngine → WipeManager → DespairModeManager の片方向チェーンを保証。

4. **旧エンジンの呼び出しパターン変更:** `IdentityEngine.method()` → `(await IdentityEngine.getInstance()).method()` の変更は全てのファイルで必要。移行漏れは実行時エラーになる。

---

## ロールバック戦略（全体）

### ブランチ戦略（v1.1 修正: 逐次マージ方式）

```
main → fix/phase-0 → main にマージ
main → fix/phase-1 → main にマージ
main → fix/phase-2 ─────────────────→ main にマージ
main → fix/phase-3 (Phase 2 と並行) → main にマージ
main → fix/phase-4 (Phase 2 と並行) → main にマージ
```

**v1.0 の直列チェーン方式を廃止。** 各 Phase を main からのブランチとし、前 Phase マージ後に次 Phase のブランチを作成する。これにより、コンフリクトのリスクを最小化する。

### 各フェーズのロールバック方法

1. **Phase単位のロールバック:** 各Phaseのブランチをmainにマージする前に、全テストがパスすることを確認。問題があればブランチごと破棄。

2. **タスク単位のロールバック:** 各タスクは独立したコミットで管理。`git revert <commit>` で個別にロールバック可能。

3. **緊急ロールバック:** main ブランチの最新安定コミットに戻す（最終手段）。

### マージ順序

1. Phase 0 → main にマージ（全テストパス確認後）
2. Phase 1 → main にマージ（Phase 0 完了後）
3. Phase 2, 3, 4 → Phase 0, 1 完了後に並行作業可能
   - Phase 2 は独立して main にマージ
   - Phase 3 は M1 以外を Phase 2 と並行、M1 は Phase 0 後
   - Phase 4 は全て独立してマージ可能

### テスト戦略

各マージ前に以下を実施:

```bash
# 全テスト実行
npm test

# TypeScriptコンパイルチェック
npx tsc --noEmit

# Expo ビルドチェック（オプション）
npx expo prebuild --clean
```

---

## 付録: タスク複雑度サマリー

| Phase | タスクID | 課題 | 複雑度 | 並行可能 |
|-------|---------|------|--------|---------|
| 0 | 0-1 | DB名統一 (C1) [同期維持] | L | - |
| 0 | 0-2 | IdentityEngine統一 (C2) [オブジェクトリテラル→クラス] | L | - |
| 0 | 0-3 | OnboardingFlow/DespairModeManager DB修正 (C8) | M | - |
| 1 | 1-1 | /(tabs) ルート修正 + tabs_backup 削除 (C3) | M | - |
| 1 | 1-2 | SQLインジェクション修正 (C6) | S | - |
| 1 | 1-3 | Insurance方針決定と修正 (C7) | M | - |
| 2 | 2-1 | DespairModeManager仕様修正 (C4) | M | Phase 3/4 |
| 2 | 2-2 | MISSED_NOTIFICATION_PENALTY (C5) | S | Phase 3/4 |
| 2 | 2-3 | is_missed更新 (H1) | S | Phase 3/4 |
| 2 | 2-4 | タイムアウトレース条件 (H2) | M | Phase 3/4 |
| 2 | 2-5 | 並行ペナルティレース条件 (H3) | M | Phase 3/4 |
| 2 | 2-6 | WipeEvent型統一 (H4) | S | Phase 3/4 |
| 2 | 2-7 | QuestCompletion動的化 (H5) | S | Phase 3/4 |
| 3 | 3-1 | AntiVisionFragmentsメモリリーク (H6) | S | Phase 2/4 |
| 3 | 3-2 | useLensGesture stale closure (H7) | M | Phase 2/4 |
| 3 | 3-3 | Animated._value修正 (H8) | S | Phase 2/4 |
| 3 | 3-4 | LensSyncPhase stale closure (H9) | S | Phase 2/4 |
| 3 | 3-5 | QuestCompletion useEffect (H10) | S | Phase 2/4 |
| 3 | 3-6 | ExcavationPhaseメソッド確認 (H11) | S | - |
| 3 | 3-7 | OnboardingManager welcome保存 (H12) | S | Phase 2/4 |
| 3 | 3-8 | ポーリング集約 + StressContainer二重使用 (M1) | M | Phase 0 後 |
| 3 | 3-9 | SubliminalFlash再レンダリング (M2) | S | Phase 2/4 |
| 3 | 3-10 | UnifiedLensView非推奨API (M3) | S | Phase 2/4 |
| 3 | 3-11 | lineHeight単位修正 (M4) | S | Phase 2/4 |
| 3 | 3-12 | ihプロパティenumerable (M5) | S | Phase 2/4 |
| 3 | 3-13 | death.tsx setTimeout (M6) | S | Phase 2/4 |
| 3 | 3-14 | DespairScreen再レンダリング (M7) | S | Phase 2/4 |
| 3 | 3-15 | GapInterrogation正規表現 (M8) | S | Phase 2/4 |
| 3 | 3-16 | removeAllListeners (M9) | S | Phase 2/4 |
| 4 | 4-1 | ihDelta/delta冗長 (M10) | S | Phase 2/3 |
| 4 | 4-2 | NotificationData.id型 (M11) | S | Phase 2/3 |
| 4 | 4-3 | スプラッシュ背景色 (M12) | S | Phase 2/3 |
| 4 | 4-4 | REFLECTION_QUESTIONS名称変更 (M13) | S | Phase 2/3 |
| 4 | 4-5 | CovenantPhase fake timers (M14) | S | Phase 2/3 |
| 4 | 4-6 | カラーシステム統一 (M15) | M | Phase 2/3 |
| 4 | 4-7 | PersistentNoiseインターバル (M16) | S | Phase 2/3 |
| 4 | 4-8 | _layout.tsx Web用 dead code 削除 (M17) | S | Phase 2/3 |

**複雑度分布:** S: 26件 / M: 10件 / L: 2件
**総タスク数:** 38件（v1.0 の 36件 + M17 新規 + 各タスクの修正内容追加）

---

*本ドキュメントは Phase 0 から順に実行し、各フェーズの完了後にレビューを行うこと。Phase 2/3/4 は Phase 0, 1 完了後に並行実行可能。フェーズ内のタスクは依存関係がない限り並行実行可能。*
