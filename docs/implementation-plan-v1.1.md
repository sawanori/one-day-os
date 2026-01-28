# One Day OS 実装計画書 v1.1

**改訂日:** 2026-01-28
**前版:** v1.0 (2026-01-27)
**ステータス:** レビュー修正版（実装準備完了）

---

## 変更履歴（v1.0 → v1.1）

### Critical問題の修正（必須）

| # | 問題 | 修正内容 | セクション |
|---|------|----------|----------|
| 1 | 絶望モードの仕様が未定義 | DespairModeManagerを追加。仕様確認: データワイプのみ、即座に再セットアップ可能 | 3.6, 4.3 |
| 2 | IH初期化タイミングの欠落 | initializeDatabase()にINSERT OR IGNOREロジックを追加 | 3.1 |
| 3 | 通知タイムアウト検知の設計不備 | setIntervalを廃止、DBによる永続化 + AppStateリスナーに変更 | 4.2 |
| 4 | Wipe後の絶望モード遷移ロジック欠落 | WipeManagerにonWipeComplete()コールバックとナビゲーション処理を追加 | 3.3, 5.5 |

### High問題の修正（必須）

| # | 問題 | 修正内容 | セクション |
|---|------|----------|----------|
| 5 | クエストペナルティの条件が仕様と不一致 | 仕様明確化: いずれか1つでも未完了なら -20%（累積なし） | 3.2 |
| 6 | 日次リセット/IH維持ロジックの欠落 | DailyManagerを追加。IHは維持、クエストのみ日次リセット | 4.4 |
| 7 | オンボーディングフローの未定義 | オンボーディング画面構成とフローを追加 | 5.6 |
| 8 | PHASE時間帯制御ロジックの欠落 | PhaseManagerを追加。時間帯によるUI制御を実装 | 4.5 |
| 9 | バックアップ無効化の実装が不完全 | app.jsonにallowBackup: falseを追加（Android）、iOS対応を明記 | 2.2 |
| 10 | アプリ削除によるWipe条件の未実装 | 技術的制限事項として文書化（実装不可） | 9.1 |

### Medium/Low問題の対応

- **問題 #11, 12, 16, 17**: コード実装時の注意事項としてリスクセクションに追加
- **問題 #13, 14, 15**: TDDテストケースの改善版を追加
- **問題 #18, 19, 20**: Phase 4以降の追加機能として記載

---

## プロジェクト概要

**コア・コンセプト:** 「人生を立て直すのに、何年もいらない。必要なのは真剣な1日だけだ。」

**技術仕様:**
- Platform: React Native (Expo)
- Language: TypeScript
- Database: SQLite (expo-sqlite)
- Design: Brutalist
- Development: TDD (Test-Driven Development)

**仕様変更確認事項:**
- **絶望モード:** データワイプのみ。24時間の再構築不可期間は廃止（即座に再セットアップ可能）

---

## 1. プロジェクト構成

```
one-day-os/
├── app/                          # Expo Router アプリケーションルート
│   ├── _layout.tsx              # ルートレイアウト（Stack）
│   ├── (tabs)/                   # タブナビゲーショングループ
│   │   ├── _layout.tsx          # タブレイアウト定義
│   │   ├── index.tsx            # メイン画面（Core Identity Layer）
│   │   ├── morning.tsx          # Morning Layer
│   │   └── evening.tsx          # Evening Layer
│   ├── onboarding/               # オンボーディングフロー（新規）
│   │   ├── index.tsx            # ウェルカム画面
│   │   ├── anti-vision.tsx      # アンチビジョン入力
│   │   ├── identity.tsx         # アイデンティティ入力
│   │   ├── mission.tsx          # 1年ミッション入力
│   │   └── quests.tsx           # 今日のクエスト入力
│   └── +not-found.tsx           # 404画面
│
├── src/
│   ├── core/                     # コアロジック
│   │   ├── identity/
│   │   │   ├── IdentityEngine.ts        # IH計算エンジン
│   │   │   ├── IdentityEngine.test.ts   # IHエンジンのテスト
│   │   │   ├── WipeManager.ts           # データ消去マネージャー
│   │   │   ├── WipeManager.test.ts      # Wipeマネージャーのテスト
│   │   │   ├── DespairModeManager.ts    # 絶望モード管理（新規）
│   │   │   └── DespairModeManager.test.ts
│   │   ├── daily/                        # 日次処理（新規）
│   │   │   ├── DailyManager.ts
│   │   │   └── DailyManager.test.ts
│   │   ├── phase/                        # PHASE時間帯制御（新規）
│   │   │   ├── PhaseManager.ts
│   │   │   └── PhaseManager.test.ts
│   │   └── constants.ts          # 定数定義（IH減算値など）
│   │
│   ├── database/
│   │   ├── schema.ts             # SQLiteスキーマ定義
│   │   ├── migrations.ts         # マイグレーション管理
│   │   ├── db.ts                 # データベース接続・初期化（修正）
│   │   └── db.test.ts            # データベーステスト
│   │
│   ├── notifications/
│   │   ├── NotificationScheduler.ts      # 通知スケジューラー
│   │   ├── NotificationScheduler.test.ts # 通知スケジューラーテスト
│   │   ├── NotificationHandler.ts        # 通知応答処理（修正）
│   │   ├── NotificationHandler.test.ts   # 通知応答処理テスト（修正）
│   │   └── questions.ts          # 5つの質問定義
│   │
│   ├── ui/
│   │   ├── components/
│   │   │   ├── GlitchText.tsx           # グリッチエフェクトテキスト
│   │   │   ├── GlitchText.test.tsx      # グリッチテキストテスト（修正）
│   │   │   ├── IdentityStatement.tsx    # アイデンティティ表示
│   │   │   ├── ZoomLens.tsx             # 3層レンズコンポーネント
│   │   │   └── PhaseGuard.tsx           # PHASE時間帯制御UI（新規）
│   │   ├── theme/
│   │   │   ├── brutalist.ts             # Brutalistデザイントークン
│   │   │   └── glitch.ts                # グリッチエフェクト定義
│   │   └── hooks/
│   │       ├── useIdentityHealth.ts     # IH状態管理フック
│   │       ├── useNotifications.ts      # 通知管理フック
│   │       └── usePhase.ts              # PHASE状態管理フック（新規）
│   │
│   └── types/
│       ├── identity.ts           # Identity型定義
│       ├── notification.ts       # Notification型定義
│       └── phase.ts              # Phase型定義（新規）
│
├── __tests__/                    # E2Eテスト
│   ├── identity-wipe.test.ts    # Wipe統合テスト
│   ├── notification-flow.test.ts # 通知フロー統合テスト
│   ├── daily-cycle.test.ts      # 日次サイクルテスト（新規）
│   └── onboarding-flow.test.ts  # オンボーディングテスト（新規）
│
├── assets/                       # 静的アセット
├── app.json                      # Expo設定（修正）
├── package.json
├── tsconfig.json
└── jest.config.js                # Jest設定
```

---

## 2. 技術スタック詳細

### 2.1 必須パッケージ

```json
{
  "dependencies": {
    "expo": "~52.0.0",
    "expo-sqlite": "~15.0.0",
    "expo-notifications": "~0.29.0",
    "expo-router": "~4.0.0",
    "react": "18.3.1",
    "react-native": "0.76.5",
    "react-native-safe-area-context": "4.12.0",
    "react-native-screens": "~4.3.0"
  },
  "devDependencies": {
    "@types/react": "~18.3.12",
    "@types/jest": "^29.5.12",
    "jest": "^29.7.0",
    "jest-expo": "~52.0.0",
    "@testing-library/react-native": "^12.4.3",
    "typescript": "~5.3.3"
  }
}
```

### 2.2 app.json 重要設定（修正版）

```json
{
  "expo": {
    "notification": {
      "icon": "./assets/notification-icon.png",
      "androidMode": "default",
      "androidCollapsedTitle": "One Day OS"
    },
    "ios": {
      "supportsTablet": false,
      "infoPlist": {
        "UIBackgroundModes": ["remote-notification"]
      }
    },
    "android": {
      "permissions": [
        "POST_NOTIFICATIONS",
        "SCHEDULE_EXACT_ALARM"
      ],
      "allowBackup": false
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "sounds": []
        }
      ]
    ]
  }
}
```

**重要な追加:**
- `"allowBackup": false` - Androidのバックアップを無効化（Critical修正 #9）

---

## 3. Phase 1: Identity Health Engine

### 3.1 データモデル（SQLiteスキーマ）

#### `schema.ts` 定義

```typescript
// src/database/schema.ts

export const TABLES = {
  IDENTITY: `
    CREATE TABLE IF NOT EXISTS identity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identity_statement TEXT NOT NULL,
      one_year_mission TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `,

  IDENTITY_HEALTH: `
    CREATE TABLE IF NOT EXISTS identity_health (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      current_value INTEGER NOT NULL DEFAULT 100,
      last_updated INTEGER NOT NULL,
      CONSTRAINT check_ih_range CHECK (current_value >= 0 AND current_value <= 100)
    );
  `,

  DAILY_QUESTS: `
    CREATE TABLE IF NOT EXISTS daily_quests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      quest_1 TEXT NOT NULL,
      quest_2 TEXT NOT NULL,
      quest_1_completed INTEGER DEFAULT 0,
      quest_2_completed INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      CONSTRAINT check_completion CHECK (quest_1_completed IN (0, 1) AND quest_2_completed IN (0, 1))
    );
  `,

  NOTIFICATION_RESPONSES: `
    CREATE TABLE IF NOT EXISTS notification_responses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      notification_id TEXT NOT NULL,
      scheduled_time INTEGER NOT NULL,
      response_type TEXT CHECK(response_type IN ('YES', 'NO', 'IGNORED')),
      responded_at INTEGER,
      ih_impact INTEGER DEFAULT 0
    );
  `,

  ANTI_VISION: `
    CREATE TABLE IF NOT EXISTS anti_vision (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      vision_text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `,

  WIPE_LOG: `
    CREATE TABLE IF NOT EXISTS wipe_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wiped_at INTEGER NOT NULL,
      reason TEXT NOT NULL,
      final_ih_value INTEGER NOT NULL
    );
  `,

  APP_STATE: `
    CREATE TABLE IF NOT EXISTS app_state (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      last_active_date TEXT NOT NULL,
      onboarding_completed INTEGER DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `
};

// インデックス
export const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_daily_quests_date ON daily_quests(date);',
  'CREATE INDEX IF NOT EXISTS idx_notification_responses_time ON notification_responses(scheduled_time);'
];
```

**新規追加:** `APP_STATE`テーブル（日次管理、オンボーディング状態の管理用）

#### データベース初期化（修正版）

```typescript
// src/database/db.ts

import * as SQLite from 'expo-sqlite';
import { TABLES, INDEXES } from './schema';

export async function initializeDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('onedayos.db');

  // テーブル作成
  for (const tableSQL of Object.values(TABLES)) {
    await db.execAsync(tableSQL);
  }

  // インデックス作成
  for (const indexSQL of INDEXES) {
    await db.execAsync(indexSQL);
  }

  // IH初期値の挿入（存在しない場合のみ）【Critical修正 #2】
  await db.runAsync(`
    INSERT OR IGNORE INTO identity_health (id, current_value, last_updated)
    VALUES (1, 100, ?)
  `, [Date.now()]);

  // アプリ状態初期化
  await db.runAsync(`
    INSERT OR IGNORE INTO app_state (id, last_active_date, onboarding_completed, created_at, updated_at)
    VALUES (1, ?, 0, ?, ?)
  `, [new Date().toDateString(), Date.now(), Date.now()]);

  return db;
}

export async function isOnboardingComplete(db: SQLite.SQLiteDatabase): Promise<boolean> {
  const state = await db.getFirstAsync<{ onboarding_completed: number }>(
    'SELECT onboarding_completed FROM app_state WHERE id = 1'
  );
  return state?.onboarding_completed === 1;
}

export async function markOnboardingComplete(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.runAsync(
    'UPDATE app_state SET onboarding_completed = 1, updated_at = ? WHERE id = 1',
    [Date.now()]
  );
}
```

**TDDテスト追加:**

```typescript
// src/database/db.test.ts

describe('Database Initialization', () => {
  test('初回起動時にIHが100で初期化される', async () => {
    const db = await initializeDatabase();
    const row = await db.getFirstAsync<{ current_value: number }>(
      'SELECT current_value FROM identity_health WHERE id = 1'
    );
    expect(row?.current_value).toBe(100);
  });

  test('2回目の初期化でもIH値が上書きされない', async () => {
    const db = await initializeDatabase();

    // IHを変更
    await db.runAsync(
      'UPDATE identity_health SET current_value = 50 WHERE id = 1'
    );

    // 再度初期化
    await initializeDatabase();

    const row = await db.getFirstAsync<{ current_value: number }>(
      'SELECT current_value FROM identity_health WHERE id = 1'
    );
    expect(row?.current_value).toBe(50); // 100に戻らない
  });

  test('app_stateテーブルが正しく初期化される', async () => {
    const db = await initializeDatabase();
    const state = await db.getFirstAsync(
      'SELECT * FROM app_state WHERE id = 1'
    );
    expect(state).toBeDefined();
    expect(state.onboarding_completed).toBe(0);
  });
});
```

---

### 3.2 IH計算ロジック（修正版）

#### TDDテストケース（改善版）

```typescript
// src/core/identity/IdentityEngine.test.ts

import { IdentityEngine } from './IdentityEngine';

describe('IdentityEngine', () => {
  let engine: IdentityEngine;

  beforeEach(async () => {
    engine = await IdentityEngine.getInstance();
    await engine.setCurrentIH(100); // リセット
  });

  describe('IH減算ロジック', () => {
    test('通知に「NO」と回答した場合、IHが15%減少する', async () => {
      const result = await engine.applyNotificationResponse('NO');
      expect(result.newIH).toBe(85);
      expect(result.delta).toBe(-15);
    });

    test('通知を無視した場合、IHが15%減少する', async () => {
      const result = await engine.applyNotificationResponse('IGNORED');
      expect(result.newIH).toBe(85);
    });

    test('通知に「YES」と回答した場合、IHは変化しない', async () => {
      const result = await engine.applyNotificationResponse('YES');
      expect(result.newIH).toBe(100);
      expect(result.delta).toBe(0);
    });

    test('IHが0を下回らない（最低値0）', async () => {
      await engine.setCurrentIH(10);
      const result = await engine.applyNotificationResponse('NO');
      expect(result.newIH).toBe(0);
    });

    test('複数の減算が累積される', async () => {
      await engine.setCurrentIH(100);
      await engine.applyNotificationResponse('NO'); // 85
      await engine.applyNotificationResponse('NO'); // 70
      const final = await engine.getCurrentIH();
      expect(final).toBe(70);
    });
  });

  describe('クエストペナルティ【High修正 #5】', () => {
    test('quest1のみ未達成 → -20%', async () => {
      await engine.setCurrentIH(100);
      const result = await engine.applyQuestPenalty({ quest1: false, quest2: true });
      expect(result.delta).toBe(-20);
      expect(result.newIH).toBe(80);
    });

    test('quest2のみ未達成 → -20%', async () => {
      await engine.setCurrentIH(100);
      const result = await engine.applyQuestPenalty({ quest1: true, quest2: false });
      expect(result.delta).toBe(-20);
      expect(result.newIH).toBe(80);
    });

    test('両方未達成 → -20%（累積しない）', async () => {
      await engine.setCurrentIH(100);
      const result = await engine.applyQuestPenalty({ quest1: false, quest2: false });
      expect(result.delta).toBe(-20);
      expect(result.newIH).toBe(80);
    });

    test('両方達成 → 0%', async () => {
      await engine.setCurrentIH(100);
      const result = await engine.applyQuestPenalty({ quest1: true, quest2: true });
      expect(result.delta).toBe(0);
      expect(result.newIH).toBe(100);
    });
  });

  describe('IH状態チェック', () => {
    test('IH > 0 の場合、isWipeNeeded()がfalseを返す', async () => {
      await engine.setCurrentIH(50);
      expect(await engine.isWipeNeeded()).toBe(false);
    });

    test('IH === 0 の場合、isWipeNeeded()がtrueを返す', async () => {
      await engine.setCurrentIH(0);
      expect(await engine.isWipeNeeded()).toBe(true);
    });

    test('IHが0になった瞬間、wipeトリガーイベントが発火する', async () => {
      const wipeCallback = jest.fn();
      engine.onWipeTrigger(wipeCallback);

      await engine.setCurrentIH(15);
      await engine.applyNotificationResponse('NO');

      expect(wipeCallback).toHaveBeenCalledWith({
        reason: 'IH_ZERO',
        finalIH: 0,
        timestamp: expect.any(Number)
      });
    });
  });

  describe('DB同期【Medium修正 #12】', () => {
    test('IH変更がDBに永続化される', async () => {
      await engine.setCurrentIH(100);
      await engine.applyNotificationResponse('NO');

      // 新しいインスタンスで読み込み
      const newEngine = await IdentityEngine.getInstance();
      const ih = await newEngine.getCurrentIH();
      expect(ih).toBe(85);
    });

    test('アプリ再起動後もIH値が保持される', async () => {
      await engine.setCurrentIH(50);

      // シミュレート: インスタンスを破棄して再作成
      const newEngine = await IdentityEngine.getInstance();
      expect(await newEngine.getCurrentIH()).toBe(50);
    });
  });
});
```

#### 実装（修正版）

```typescript
// src/core/identity/IdentityEngine.ts

import { IH_CONSTANTS } from '../constants';
import * as SQLite from 'expo-sqlite';

export interface IHResponse {
  newIH: number;
  delta: number;
  timestamp: number;
}

export interface WipeEvent {
  reason: 'IH_ZERO' | 'QUEST_FAIL';
  finalIH: number;
  timestamp: number;
}

export class IdentityEngine {
  private static instance: IdentityEngine;
  private currentIH: number = 100;
  private db: SQLite.SQLiteDatabase | null = null;
  private wipeCallbacks: Array<(event: WipeEvent) => void> = [];

  private constructor() {}

  static async getInstance(): Promise<IdentityEngine> {
    if (!this.instance) {
      this.instance = new IdentityEngine();
      await this.instance.initialize();
    }
    return this.instance;
  }

  private async initialize(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync('onedayos.db');

    // DBからIH値を読み込み
    const row = await this.db.getFirstAsync<{ current_value: number }>(
      'SELECT current_value FROM identity_health WHERE id = 1'
    );
    this.currentIH = row?.current_value ?? 100;
  }

  async applyNotificationResponse(
    response: 'YES' | 'NO' | 'IGNORED'
  ): Promise<IHResponse> {
    const delta = response === 'YES' ? 0 : IH_CONSTANTS.NOTIFICATION_PENALTY;
    return this.updateIH(delta);
  }

  async applyQuestPenalty(completion: {
    quest1: boolean;
    quest2: boolean;
  }): Promise<IHResponse> {
    // 【High修正 #5】いずれか1つでも未達成なら -20%（累積なし）
    const anyIncomplete = !completion.quest1 || !completion.quest2;
    const delta = anyIncomplete ? IH_CONSTANTS.QUEST_PENALTY : 0;
    return this.updateIH(delta);
  }

  private async updateIH(delta: number): Promise<IHResponse> {
    if (!this.db) throw new Error('IdentityEngine not initialized');

    const previousIH = this.currentIH;
    this.currentIH = Math.max(0, this.currentIH + delta);

    // DBに永続化【Medium修正 #12】
    await this.db.runAsync(
      'UPDATE identity_health SET current_value = ?, last_updated = ? WHERE id = 1',
      [this.currentIH, Date.now()]
    );

    const response: IHResponse = {
      newIH: this.currentIH,
      delta,
      timestamp: Date.now()
    };

    // IHが0になった場合、Wipeトリガー
    if (previousIH > 0 && this.currentIH === 0) {
      this.triggerWipe({
        reason: 'IH_ZERO',
        finalIH: 0,
        timestamp: Date.now()
      });
    }

    return response;
  }

  async isWipeNeeded(): Promise<boolean> {
    return this.currentIH === 0;
  }

  async getCurrentIH(): Promise<number> {
    return this.currentIH;
  }

  async setCurrentIH(value: number): Promise<void> {
    if (!this.db) throw new Error('IdentityEngine not initialized');

    this.currentIH = Math.max(0, Math.min(100, value));

    await this.db.runAsync(
      'UPDATE identity_health SET current_value = ?, last_updated = ? WHERE id = 1',
      [this.currentIH, Date.now()]
    );
  }

  onWipeTrigger(callback: (event: WipeEvent) => void): void {
    this.wipeCallbacks.push(callback);
  }

  private triggerWipe(event: WipeEvent): void {
    this.wipeCallbacks.forEach(cb => cb(event));
  }
}
```

---

### 3.3 Wipe機構（修正版）

#### TDDテストケース（修正版）

```typescript
// src/core/identity/WipeManager.test.ts

import { WipeManager } from './WipeManager';
import * as SQLite from 'expo-sqlite';
import { initializeDatabase } from '../../database/db';

describe('WipeManager - Integration Tests', () => {
  let wipeManager: WipeManager;
  let db: SQLite.SQLiteDatabase;

  beforeEach(async () => {
    // インメモリDBを使用
    db = await SQLite.openDatabaseAsync(':memory:');
    await initializeDatabase();
    wipeManager = new WipeManager(db);
  });

  test('executeWipe()が全テーブルを削除する', async () => {
    // 事前にデータを挿入
    await db.runAsync(
      'INSERT INTO identity (identity_statement, one_year_mission, created_at, updated_at) VALUES (?, ?, ?, ?)',
      ['Test Identity', 'Test Mission', Date.now(), Date.now()]
    );

    // Wipe実行
    const result = await wipeManager.executeWipe('IH_ZERO', 0);

    expect(result.success).toBe(true);

    // 全テーブルが空になっていることを確認
    const identityRows = await db.getAllAsync('SELECT * FROM identity');
    const ihRows = await db.getAllAsync('SELECT * FROM identity_health');
    const questRows = await db.getAllAsync('SELECT * FROM daily_quests');

    expect(identityRows.length).toBe(0);
    expect(ihRows.length).toBe(0);
    expect(questRows.length).toBe(0);
  });

  test('Wipe実行後、wipe_logに記録が残る', async () => {
    await wipeManager.executeWipe('IH_ZERO', 0);

    const logs = await db.getAllAsync('SELECT * FROM wipe_log');
    expect(logs.length).toBe(1);
    expect(logs[0].reason).toBe('IH_ZERO');
    expect(logs[0].final_ih_value).toBe(0);
  });

  test('Wipe実行後、onWipeCompleteコールバックが呼ばれる【Critical修正 #4】', async () => {
    const onComplete = jest.fn();
    wipeManager.setOnWipeComplete(onComplete);

    await wipeManager.executeWipe('IH_ZERO', 0);

    expect(onComplete).toHaveBeenCalledWith({
      success: true,
      nextScreen: 'onboarding',
      timestamp: expect.any(Number)
    });
  });

  test('Wipeは元に戻せない（不可逆性の確認）', async () => {
    // データを挿入
    await db.runAsync(
      'INSERT INTO identity (identity_statement, one_year_mission, created_at, updated_at) VALUES (?, ?, ?, ?)',
      ['Original', 'Mission', Date.now(), Date.now()]
    );

    // Wipe実行
    await wipeManager.executeWipe('IH_ZERO', 0);

    // データが存在しないことを確認
    const result = await db.getAllAsync('SELECT * FROM identity');
    expect(result.length).toBe(0);

    // 新規データ挿入は可能（再セットアップ）
    await db.runAsync(
      'INSERT INTO identity (identity_statement, one_year_mission, created_at, updated_at) VALUES (?, ?, ?, ?)',
      ['New Identity', 'New Mission', Date.now(), Date.now()]
    );

    const newResult = await db.getAllAsync('SELECT * FROM identity');
    expect(newResult.length).toBe(1);
    expect(newResult[0].identity_statement).toBe('New Identity');
  });
});
```

#### 実装（修正版）

```typescript
// src/core/identity/WipeManager.ts

import * as SQLite from 'expo-sqlite';

export interface WipeResult {
  success: boolean;
  nextScreen: 'onboarding' | 'despair';
  timestamp: number;
}

export class WipeManager {
  private db: SQLite.SQLiteDatabase;
  private onWipeComplete: ((result: WipeResult) => void) | null = null;

  constructor(db: SQLite.SQLiteDatabase) {
    this.db = db;
  }

  setOnWipeComplete(callback: (result: WipeResult) => void): void {
    this.onWipeComplete = callback;
  }

  /**
   * 全データを物理的に消去（不可逆）
   * 【Critical修正 #4】Wipe後の状態遷移をコールバックで制御
   */
  async executeWipe(reason: string, finalIH: number): Promise<WipeResult> {
    const timestamp = Date.now();

    try {
      // トランザクション内で全削除
      await this.db.execAsync(`
        BEGIN TRANSACTION;

        -- Wipeログを先に記録（唯一残るデータ）
        INSERT INTO wipe_log (wiped_at, reason, final_ih_value)
        VALUES (${timestamp}, '${reason}', ${finalIH});

        -- 全データ削除
        DELETE FROM identity;
        DELETE FROM identity_health;
        DELETE FROM daily_quests;
        DELETE FROM notification_responses;
        DELETE FROM anti_vision;
        DELETE FROM app_state;

        COMMIT;
      `);

      // バックアップファイルの削除（可能な範囲で）
      await this.disableBackup();

      const result: WipeResult = {
        success: true,
        nextScreen: 'onboarding', // 即座に再セットアップ可能
        timestamp
      };

      // コールバック実行
      if (this.onWipeComplete) {
        this.onWipeComplete(result);
      }

      return result;
    } catch (error) {
      console.error('Wipe failed:', error);
      return {
        success: false,
        nextScreen: 'onboarding',
        timestamp
      };
    }
  }

  /**
   * バックアップを無効化（iOS/Android）
   * 【High修正 #9】app.jsonでのallowBackup: falseと併用
   */
  private async disableBackup(): Promise<void> {
    // iOS: 現時点ではExpoでNSURLIsExcludedFromBackupKeyを直接設定することは困難
    // 代替策: データベースを一時ディレクトリに配置するなど（Phase 2で検討）

    // Android: app.jsonの allowBackup: false で対応済み

    // 注: 完全なバックアップ無効化はネイティブモジュールが必要な場合がある
    console.warn('Backup disabling is partially implemented. See app.json for Android.');
  }

  async getTableRowCount(tableName: string): Promise<number> {
    const result = await this.db.getAllAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${tableName}`
    );
    return result[0]?.count || 0;
  }
}
```

---

### 3.4 定数定義

```typescript
// src/core/constants.ts

export const IH_CONSTANTS = {
  INITIAL_VALUE: 100,
  NOTIFICATION_PENALTY: -15, // NO/無視で-15%
  QUEST_PENALTY: -20,        // クエスト未達で-20%（いずれか1つでも）
  MIN_VALUE: 0,
  MAX_VALUE: 100,
  WIPE_THRESHOLD: 0
} as const;

export const NOTIFICATION_SCHEDULE = [
  { hour: 11, minute: 0, question: '何を避けようとしているか？' },
  { hour: 13, minute: 30, question: '観察者は君を「何を望んでいる人間」と結論づけるか？' },
  { hour: 15, minute: 15, question: '嫌いな人生か、欲しい人生か？' },
  { hour: 17, minute: 0, question: '重要でないふりをしている「最重要のこと」は？' },
  { hour: 19, minute: 30, question: '今日の行動は本当の欲求か、自己防衛か？' }
] as const;

export const PHASE_TIMES = {
  MORNING_START: { hour: 6, minute: 0 },
  MORNING_END: { hour: 9, minute: 0 },
  EVENING_START: { hour: 20, minute: 0 },
  EVENING_END: { hour: 24, minute: 0 }
} as const;

export const NOTIFICATION_TIMEOUT_MS = 15 * 60 * 1000; // 15分
```

---

### 3.5 絶望モードマネージャー（新規）

#### TDDテストケース

```typescript
// src/core/identity/DespairModeManager.test.ts

import { DespairModeManager } from './DespairModeManager';
import { WipeManager } from './WipeManager';
import * as SQLite from 'expo-sqlite';

jest.mock('expo-router');

describe('DespairModeManager【Critical修正 #1】', () => {
  let despairManager: DespairModeManager;
  let wipeManager: WipeManager;
  let db: SQLite.SQLiteDatabase;

  beforeEach(async () => {
    db = await SQLite.openDatabaseAsync(':memory:');
    wipeManager = new WipeManager(db);
    despairManager = new DespairModeManager(wipeManager);
  });

  test('Wipe後、オンボーディング画面に遷移する', async () => {
    const navigateCallback = jest.fn();
    despairManager.setNavigationCallback(navigateCallback);

    await despairManager.handleWipeEvent({
      reason: 'IH_ZERO',
      finalIH: 0,
      timestamp: Date.now()
    });

    expect(navigateCallback).toHaveBeenCalledWith('onboarding');
  });

  test('Wipe後、即座に再セットアップ可能', async () => {
    await despairManager.handleWipeEvent({
      reason: 'IH_ZERO',
      finalIH: 0,
      timestamp: Date.now()
    });

    // 再セットアップがブロックされないことを確認
    const canSetup = await despairManager.canStartOnboarding();
    expect(canSetup).toBe(true);
  });

  test('24時間の再構築不可期間は存在しない（仕様変更確認）', async () => {
    await despairManager.handleWipeEvent({
      reason: 'IH_ZERO',
      finalIH: 0,
      timestamp: Date.now()
    });

    // 即座に再セットアップ可能
    const canSetup = await despairManager.canStartOnboarding();
    expect(canSetup).toBe(true);
  });
});
```

#### 実装

```typescript
// src/core/identity/DespairModeManager.ts

import { WipeManager, WipeResult } from './WipeManager';
import { WipeEvent } from './IdentityEngine';

export class DespairModeManager {
  private wipeManager: WipeManager;
  private navigationCallback: ((screen: string) => void) | null = null;

  constructor(wipeManager: WipeManager) {
    this.wipeManager = wipeManager;
    this.setupWipeListener();
  }

  private setupWipeListener(): void {
    this.wipeManager.setOnWipeComplete((result: WipeResult) => {
      if (result.success) {
        this.navigateToOnboarding();
      }
    });
  }

  setNavigationCallback(callback: (screen: string) => void): void {
    this.navigationCallback = callback;
  }

  async handleWipeEvent(event: WipeEvent): Promise<void> {
    // Wipeを実行
    await this.wipeManager.executeWipe(event.reason, event.finalIH);

    // オンボーディングへ遷移（setOnWipeCompleteで自動実行）
  }

  private navigateToOnboarding(): void {
    if (this.navigationCallback) {
      this.navigationCallback('onboarding');
    }
  }

  /**
   * 再セットアップ可能かチェック
   * 【仕様確認】即座に再セットアップ可能（24時間制限なし）
   */
  async canStartOnboarding(): Promise<boolean> {
    return true; // 常にtrue（制限なし）
  }
}
```

---

## 4. Phase 2: Notification System

### 4.1 通知スケジューラー

#### TDDテストケース（v1.0と同様）

```typescript
// src/notifications/NotificationScheduler.test.ts

import { NotificationScheduler } from './NotificationScheduler';
import * as Notifications from 'expo-notifications';

jest.mock('expo-notifications');

describe('NotificationScheduler', () => {
  let scheduler: NotificationScheduler;

  beforeEach(() => {
    scheduler = new NotificationScheduler();
    jest.clearAllMocks();
  });

  test('5つの通知が正確な時間にスケジュールされる', async () => {
    await scheduler.scheduleDailyNotifications();

    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(5);

    // 11:00の通知を確認
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.objectContaining({
          title: '何を避けようとしているか？',
          categoryIdentifier: 'YES_NO_CATEGORY'
        }),
        trigger: expect.objectContaining({
          hour: 11,
          minute: 0,
          repeats: true
        })
      })
    );
  });

  test('通知にYES/NOアクションボタンが含まれる', async () => {
    await scheduler.setNotificationCategories();

    expect(Notifications.setNotificationCategoryAsync).toHaveBeenCalledWith(
      'YES_NO_CATEGORY',
      expect.arrayContaining([
        expect.objectContaining({ identifier: 'YES', buttonTitle: 'YES' }),
        expect.objectContaining({ identifier: 'NO', buttonTitle: 'NO' })
      ])
    );
  });

  test('既存の通知をキャンセルしてから新しい通知をスケジュールできる', async () => {
    await scheduler.rescheduleDailyNotifications();

    expect(Notifications.cancelAllScheduledNotificationsAsync).toHaveBeenCalled();
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(5);
  });

  test('通知権限がない場合、エラーを投げる', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied'
    });

    await expect(scheduler.scheduleDailyNotifications()).rejects.toThrow(
      'Notification permission not granted'
    );
  });

  test('バックグラウンドで通知が動作する', async () => {
    await scheduler.scheduleDailyNotifications();

    const trigger = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0].trigger;
    expect(trigger.repeats).toBe(true);
  });
});
```

#### 実装（v1.0と同様）

```typescript
// src/notifications/NotificationScheduler.ts

import * as Notifications from 'expo-notifications';
import { NOTIFICATION_SCHEDULE } from '../core/constants';

export class NotificationScheduler {
  async initialize(): Promise<void> {
    await this.setNotificationCategories();

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  }

  async setNotificationCategories(): Promise<void> {
    await Notifications.setNotificationCategoryAsync('YES_NO_CATEGORY', [
      {
        identifier: 'YES',
        buttonTitle: 'YES',
        options: {
          isDestructive: false,
          isAuthenticationRequired: false,
        },
      },
      {
        identifier: 'NO',
        buttonTitle: 'NO',
        options: {
          isDestructive: true,
          isAuthenticationRequired: false,
        },
      },
    ]);
  }

  async scheduleDailyNotifications(): Promise<string[]> {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      if (newStatus !== 'granted') {
        throw new Error('Notification permission not granted');
      }
    }

    const notificationIds: string[] = [];

    for (const schedule of NOTIFICATION_SCHEDULE) {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: schedule.question,
          categoryIdentifier: 'YES_NO_CATEGORY',
          data: {
            scheduledHour: schedule.hour,
            scheduledMinute: schedule.minute,
          },
        },
        trigger: {
          hour: schedule.hour,
          minute: schedule.minute,
          repeats: true,
        },
      });

      notificationIds.push(id);
    }

    return notificationIds;
  }

  async rescheduleDailyNotifications(): Promise<string[]> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    return this.scheduleDailyNotifications();
  }

  async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}
```

---

### 4.2 通知応答処理（修正版）

#### TDDテストケース（修正版）

```typescript
// src/notifications/NotificationHandler.test.ts

import { NotificationHandler } from './NotificationHandler';
import { IdentityEngine } from '../core/identity/IdentityEngine';
import * as SQLite from 'expo-sqlite';

describe('NotificationHandler', () => {
  let handler: NotificationHandler;
  let engine: IdentityEngine;
  let db: SQLite.SQLiteDatabase;

  beforeEach(async () => {
    db = await SQLite.openDatabaseAsync(':memory:');
    engine = await IdentityEngine.getInstance();
    handler = new NotificationHandler(engine, db);
  });

  test('YES応答でIHが減少しない', async () => {
    const result = await handler.handleResponse('YES', 'notif-1');

    expect(result.delta).toBe(0);
  });

  test('NO応答でIHが15%減少する', async () => {
    const result = await handler.handleResponse('NO', 'notif-1');

    expect(result.delta).toBe(-15);
  });

  test('通知応答がDBに記録される', async () => {
    await handler.handleResponse('YES', 'notif-1');

    const responses = await db.getAllAsync(
      'SELECT * FROM notification_responses WHERE notification_id = ?',
      ['notif-1']
    );

    expect(responses.length).toBe(1);
    expect(responses[0].response_type).toBe('YES');
  });

  test('同じ通知に2回応答できない', async () => {
    await handler.handleResponse('YES', 'notif-1');

    await expect(
      handler.handleResponse('NO', 'notif-1')
    ).rejects.toThrow('Notification already responded');
  });

  describe('タイムアウト検知【Critical修正 #3】', () => {
    test('15分以内に応答がない場合、IGNORED扱いでIH減少', async () => {
      const notificationTime = Date.now() - 16 * 60 * 1000; // 16分前

      // DBに未応答の通知を記録
      await db.runAsync(
        `INSERT INTO notification_responses
         (notification_id, scheduled_time, response_type, responded_at, ih_impact)
         VALUES (?, ?, NULL, NULL, 0)`,
        ['notif-timeout', notificationTime]
      );

      // タイムアウトチェック実行
      await handler.checkTimeoutsOnResume();

      // IGNORED扱いになっているか確認
      const response = await db.getFirstAsync(
        'SELECT * FROM notification_responses WHERE notification_id = ?',
        ['notif-timeout']
      );

      expect(response.response_type).toBe('IGNORED');
      expect(response.ih_impact).toBe(-15);
    });

    test('アプリ再起動後もタイムアウトチェックが動作する', async () => {
      const notificationTime = Date.now() - 20 * 60 * 1000; // 20分前

      await db.runAsync(
        `INSERT INTO notification_responses
         (notification_id, scheduled_time, response_type, responded_at, ih_impact)
         VALUES (?, ?, NULL, NULL, 0)`,
        ['notif-restart', notificationTime]
      );

      // 新しいハンドラーインスタンス（再起動をシミュレート）
      const newHandler = new NotificationHandler(engine, db);
      await newHandler.checkTimeoutsOnResume();

      const response = await db.getFirstAsync(
        'SELECT * FROM notification_responses WHERE notification_id = ?',
        ['notif-restart']
      );

      expect(response.response_type).toBe('IGNORED');
    });
  });
});
```

#### 実装（修正版）

```typescript
// src/notifications/NotificationHandler.ts

import * as Notifications from 'expo-notifications';
import { IdentityEngine, IHResponse } from '../core/identity/IdentityEngine';
import * as SQLite from 'expo-sqlite';
import { NOTIFICATION_TIMEOUT_MS } from '../core/constants';
import { AppState, AppStateStatus } from 'react-native';

export class NotificationHandler {
  private engine: IdentityEngine;
  private db: SQLite.SQLiteDatabase;
  private respondedNotifications: Set<string> = new Set();
  private appStateSubscription: any = null;

  constructor(engine: IdentityEngine, db: SQLite.SQLiteDatabase) {
    this.engine = engine;
    this.db = db;
  }

  async initialize(): Promise<void> {
    // 通知応答リスナーを設定
    Notifications.addNotificationResponseReceivedListener(this.onResponseReceived.bind(this));

    // アプリ状態変化のリスナー（フォアグラウンド復帰時にタイムアウトチェック）
    // 【Critical修正 #3】setIntervalを廃止、AppStateリスナーに変更
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange.bind(this));

    // 初回起動時にもチェック
    await this.checkTimeoutsOnResume();
  }

  cleanup(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  private async handleAppStateChange(nextAppState: AppStateStatus): Promise<void> {
    if (nextAppState === 'active') {
      await this.checkTimeoutsOnResume();
    }
  }

  private async onResponseReceived(response: Notifications.NotificationResponse): Promise<void> {
    const actionIdentifier = response.actionIdentifier;
    const notificationId = response.notification.request.identifier;

    if (actionIdentifier === 'YES' || actionIdentifier === 'NO') {
      await this.handleResponse(actionIdentifier, notificationId);
    }
  }

  async handleResponse(
    response: 'YES' | 'NO',
    notificationId: string
  ): Promise<IHResponse> {
    // 重複チェック
    if (this.respondedNotifications.has(notificationId)) {
      throw new Error('Notification already responded');
    }

    // IH更新
    const result = await this.engine.applyNotificationResponse(response);

    // DB記録
    await this.saveResponse(notificationId, response, result.delta);

    // 応答済みマーク
    this.respondedNotifications.add(notificationId);

    return result;
  }

  /**
   * 通知発火時にDBに記録（スケジューラーから呼び出される）
   */
  async trackNotification(notificationId: string, scheduledTime: number): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO notification_responses
       (notification_id, scheduled_time, response_type, responded_at, ih_impact)
       VALUES (?, ?, NULL, NULL, 0)`,
      [notificationId, scheduledTime]
    );
  }

  /**
   * アプリ起動時（フォアグラウンド復帰時）にタイムアウトをチェック
   * 【Critical修正 #3】DB永続化 + AppStateリスナー
   */
  async checkTimeoutsOnResume(): Promise<void> {
    const now = Date.now();
    const timeoutThreshold = now - NOTIFICATION_TIMEOUT_MS;

    // 未応答でタイムアウトした通知を検索
    const timedOutNotifications = await this.db.getAllAsync<{
      notification_id: string;
      scheduled_time: number;
    }>(
      `SELECT notification_id, scheduled_time
       FROM notification_responses
       WHERE response_type IS NULL
         AND scheduled_time < ?`,
      [timeoutThreshold]
    );

    for (const notif of timedOutNotifications) {
      if (!this.respondedNotifications.has(notif.notification_id)) {
        await this.handleTimeout(notif.notification_id);
      }
    }
  }

  private async handleTimeout(notificationId: string): Promise<void> {
    // IGNORED扱いでIH減算
    const result = await this.engine.applyNotificationResponse('IGNORED');
    await this.saveResponse(notificationId, 'IGNORED', result.delta);
    this.respondedNotifications.add(notificationId);
  }

  async saveResponse(
    notificationId: string,
    responseType: 'YES' | 'NO' | 'IGNORED',
    ihImpact: number
  ): Promise<void> {
    await this.db.runAsync(
      `UPDATE notification_responses
       SET response_type = ?, responded_at = ?, ih_impact = ?
       WHERE notification_id = ?`,
      [responseType, Date.now(), ihImpact, notificationId]
    );
  }
}
```

---

### 4.3 日次マネージャー（新規）

#### TDDテストケース

```typescript
// src/core/daily/DailyManager.test.ts

import { DailyManager } from './DailyManager';
import { IdentityEngine } from '../identity/IdentityEngine';
import * as SQLite from 'expo-sqlite';

describe('DailyManager【High修正 #6】', () => {
  let dailyManager: DailyManager;
  let engine: IdentityEngine;
  let db: SQLite.SQLiteDatabase;

  beforeEach(async () => {
    db = await SQLite.openDatabaseAsync(':memory:');
    engine = await IdentityEngine.getInstance();
    dailyManager = new DailyManager(db, engine);
  });

  test('新しい日の開始時にクエストがリセットされる', async () => {
    // 前日のクエストを作成
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await db.runAsync(
      `INSERT INTO daily_quests (date, quest_1, quest_2, quest_1_completed, quest_2_completed, created_at)
       VALUES (?, ?, ?, 1, 0, ?)`,
      [yesterday.toDateString(), 'Old Quest 1', 'Old Quest 2', Date.now()]
    );

    // 新しい日の処理
    await dailyManager.onNewDay(['New Quest 1', 'New Quest 2']);

    // 新しいクエストが作成されている
    const quests = await db.getAllAsync(
      'SELECT * FROM daily_quests WHERE date = ?',
      [new Date().toDateString()]
    );

    expect(quests.length).toBe(1);
    expect(quests[0].quest_1).toBe('New Quest 1');
    expect(quests[0].quest_1_completed).toBe(0);
  });

  test('IH値は日をまたいでも維持される', async () => {
    // IHを50に設定
    await engine.setCurrentIH(50);

    // 新しい日の処理
    await dailyManager.onNewDay(['Quest 1', 'Quest 2']);

    // IHが維持されている
    const ih = await engine.getCurrentIH();
    expect(ih).toBe(50);
  });

  test('日次チェックで日付変更を検知できる', async () => {
    // 前日の日付を記録
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await db.runAsync(
      'UPDATE app_state SET last_active_date = ? WHERE id = 1',
      [yesterday.toDateString()]
    );

    // 日次チェック
    const isDayChanged = await dailyManager.checkDayChange();
    expect(isDayChanged).toBe(true);
  });

  test('同じ日に複数回チェックしてもfalseを返す', async () => {
    await db.runAsync(
      'UPDATE app_state SET last_active_date = ? WHERE id = 1',
      [new Date().toDateString()]
    );

    const isDayChanged = await dailyManager.checkDayChange();
    expect(isDayChanged).toBe(false);
  });

  test('前日のクエストが未達成の場合、IHにペナルティが適用される', async () => {
    await engine.setCurrentIH(100);

    // 前日のクエストを未達成で作成
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await db.runAsync(
      `INSERT INTO daily_quests (date, quest_1, quest_2, quest_1_completed, quest_2_completed, created_at)
       VALUES (?, ?, ?, 0, 0, ?)`,
      [yesterday.toDateString(), 'Quest 1', 'Quest 2', Date.now()]
    );

    // 新しい日の処理（前日のクエストチェック込み）
    await dailyManager.onNewDay(['New Quest 1', 'New Quest 2']);

    // IHが減少している
    const ih = await engine.getCurrentIH();
    expect(ih).toBe(80); // -20%
  });
});
```

#### 実装

```typescript
// src/core/daily/DailyManager.ts

import * as SQLite from 'expo-sqlite';
import { IdentityEngine } from '../identity/IdentityEngine';

export class DailyManager {
  private db: SQLite.SQLiteDatabase;
  private engine: IdentityEngine;

  constructor(db: SQLite.SQLiteDatabase, engine: IdentityEngine) {
    this.db = db;
    this.engine = engine;
  }

  /**
   * 新しい日の開始処理
   * 【High修正 #6】IHは維持、クエストのみリセット
   */
  async onNewDay(newQuests: [string, string]): Promise<void> {
    const today = new Date().toDateString();

    // 前日のクエスト達成状況をチェック
    await this.checkPreviousDayQuests();

    // 新しいクエストを作成
    await this.db.runAsync(
      `INSERT INTO daily_quests (date, quest_1, quest_2, quest_1_completed, quest_2_completed, created_at)
       VALUES (?, ?, ?, 0, 0, ?)`,
      [today, newQuests[0], newQuests[1], Date.now()]
    );

    // 最終アクティブ日を更新
    await this.db.runAsync(
      'UPDATE app_state SET last_active_date = ?, updated_at = ? WHERE id = 1',
      [today, Date.now()]
    );
  }

  /**
   * 前日のクエストが未達成の場合、IHにペナルティを適用
   */
  private async checkPreviousDayQuests(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const previousQuests = await this.db.getFirstAsync<{
      quest_1_completed: number;
      quest_2_completed: number;
    }>(
      'SELECT quest_1_completed, quest_2_completed FROM daily_quests WHERE date = ?',
      [yesterday.toDateString()]
    );

    if (previousQuests) {
      await this.engine.applyQuestPenalty({
        quest1: previousQuests.quest_1_completed === 1,
        quest2: previousQuests.quest_2_completed === 1
      });
    }
  }

  /**
   * 日付変更をチェック
   */
  async checkDayChange(): Promise<boolean> {
    const state = await this.db.getFirstAsync<{ last_active_date: string }>(
      'SELECT last_active_date FROM app_state WHERE id = 1'
    );

    if (!state) return false;

    const today = new Date().toDateString();
    return state.last_active_date !== today;
  }

  /**
   * 最終アクティブ日を取得
   */
  async getLastActiveDate(): Promise<string> {
    const state = await this.db.getFirstAsync<{ last_active_date: string }>(
      'SELECT last_active_date FROM app_state WHERE id = 1'
    );
    return state?.last_active_date || new Date().toDateString();
  }
}
```

---

### 4.4 PHASEマネージャー（新規）

#### TDDテストケース

```typescript
// src/core/phase/PhaseManager.test.ts

import { PhaseManager, Phase } from './PhaseManager';

describe('PhaseManager【High修正 #8】', () => {
  test('AM 6:00-9:00はmorningフェーズ', () => {
    const phase = PhaseManager.getCurrentPhase(new Date('2026-01-28T06:00:00'));
    expect(phase).toBe('morning');

    const phase2 = PhaseManager.getCurrentPhase(new Date('2026-01-28T08:59:00'));
    expect(phase2).toBe('morning');
  });

  test('AM 9:00-PM 20:00はcoreフェーズ', () => {
    const phase = PhaseManager.getCurrentPhase(new Date('2026-01-28T09:00:00'));
    expect(phase).toBe('core');

    const phase2 = PhaseManager.getCurrentPhase(new Date('2026-01-28T19:59:00'));
    expect(phase2).toBe('core');
  });

  test('PM 20:00-24:00はeveningフェーズ', () => {
    const phase = PhaseManager.getCurrentPhase(new Date('2026-01-28T20:00:00'));
    expect(phase).toBe('evening');

    const phase2 = PhaseManager.getCurrentPhase(new Date('2026-01-28T23:59:00'));
    expect(phase2).toBe('evening');
  });

  test('AM 0:00-6:00はlockedフェーズ', () => {
    const phase = PhaseManager.getCurrentPhase(new Date('2026-01-28T00:00:00'));
    expect(phase).toBe('locked');

    const phase2 = PhaseManager.getCurrentPhase(new Date('2026-01-28T05:59:00'));
    expect(phase2).toBe('locked');
  });

  test('morning以外の時間帯でmorning画面にアクセスできない', () => {
    const canAccess = PhaseManager.canAccessScreen('morning', new Date('2026-01-28T10:00:00'));
    expect(canAccess).toBe(false);
  });

  test('morning時間帯でmorning画面にアクセスできる', () => {
    const canAccess = PhaseManager.canAccessScreen('morning', new Date('2026-01-28T07:00:00'));
    expect(canAccess).toBe(true);
  });

  test('core画面は常にアクセス可能', () => {
    const canAccess1 = PhaseManager.canAccessScreen('core', new Date('2026-01-28T10:00:00'));
    const canAccess2 = PhaseManager.canAccessScreen('core', new Date('2026-01-28T21:00:00'));
    expect(canAccess1).toBe(true);
    expect(canAccess2).toBe(true);
  });
});
```

#### 実装

```typescript
// src/core/phase/PhaseManager.ts

import { PHASE_TIMES } from '../constants';

export type Phase = 'morning' | 'core' | 'evening' | 'locked';

export class PhaseManager {
  /**
   * 現在のフェーズを取得
   * 【High修正 #8】時間帯によるPHASE制御
   */
  static getCurrentPhase(now: Date = new Date()): Phase {
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Morning: 6:00-9:00
    if (
      (hour > PHASE_TIMES.MORNING_START.hour ||
        (hour === PHASE_TIMES.MORNING_START.hour && minute >= PHASE_TIMES.MORNING_START.minute)) &&
      (hour < PHASE_TIMES.MORNING_END.hour ||
        (hour === PHASE_TIMES.MORNING_END.hour && minute < PHASE_TIMES.MORNING_END.minute))
    ) {
      return 'morning';
    }

    // Evening: 20:00-24:00
    if (
      (hour > PHASE_TIMES.EVENING_START.hour ||
        (hour === PHASE_TIMES.EVENING_START.hour && minute >= PHASE_TIMES.EVENING_START.minute)) &&
      hour < PHASE_TIMES.EVENING_END.hour
    ) {
      return 'evening';
    }

    // Core: 9:00-20:00
    if (hour >= PHASE_TIMES.MORNING_END.hour && hour < PHASE_TIMES.EVENING_START.hour) {
      return 'core';
    }

    // Locked: 0:00-6:00
    return 'locked';
  }

  /**
   * 指定された画面にアクセス可能かチェック
   */
  static canAccessScreen(screen: 'morning' | 'core' | 'evening', now: Date = new Date()): boolean {
    const currentPhase = this.getCurrentPhase(now);

    // core画面は常にアクセス可能
    if (screen === 'core') return true;

    // その他の画面は対応するフェーズでのみアクセス可能
    return currentPhase === screen;
  }

  /**
   * 次のフェーズまでの残り時間（ミリ秒）
   */
  static getTimeUntilNextPhase(now: Date = new Date()): number {
    const currentPhase = this.getCurrentPhase(now);
    const hour = now.getHours();
    const minute = now.getMinutes();

    switch (currentPhase) {
      case 'morning':
        return this.getMillisecondsUntil(now, PHASE_TIMES.MORNING_END.hour, PHASE_TIMES.MORNING_END.minute);
      case 'core':
        return this.getMillisecondsUntil(now, PHASE_TIMES.EVENING_START.hour, PHASE_TIMES.EVENING_START.minute);
      case 'evening':
        return this.getMillisecondsUntil(now, PHASE_TIMES.EVENING_END.hour, 0);
      case 'locked':
        return this.getMillisecondsUntil(now, PHASE_TIMES.MORNING_START.hour, PHASE_TIMES.MORNING_START.minute);
      default:
        return 0;
    }
  }

  private static getMillisecondsUntil(now: Date, targetHour: number, targetMinute: number): number {
    const target = new Date(now);
    target.setHours(targetHour, targetMinute, 0, 0);

    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    return target.getTime() - now.getTime();
  }
}
```

---

## 5. Phase 3: Basic UI Shell

### 5.1 Brutalistデザイントークン（v1.0と同様）

```typescript
// src/ui/theme/brutalist.ts

export const BRUTALIST_THEME = {
  colors: {
    black: '#000000',
    white: '#FFFFFF',
    gray: '#808080',
    danger: '#FF0000',
    ihCritical: '#330000',
    ihWarning: '#663300',
    ihNormal: '#000000',
  },

  typography: {
    fontFamily: {
      mono: 'Courier New, monospace',
      sans: 'Arial, Helvetica, sans-serif',
    },
    sizes: {
      xs: 12,
      sm: 14,
      md: 16,
      lg: 20,
      xl: 28,
      xxl: 48,
    },
    weights: {
      regular: '400',
      bold: '700',
      black: '900',
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },

  borders: {
    width: {
      thin: 1,
      medium: 2,
      thick: 4,
    },
    style: 'solid',
  },
} as const;
```

### 5.2 グリッチエフェクト定義（v1.0と同様）

```typescript
// src/ui/theme/glitch.ts

export const GLITCH_LEVELS = {
  NONE: {
    intensity: 0,
    offsetRange: 0,
    colorShift: false,
  },
  LOW: {
    intensity: 0.2,
    offsetRange: 2,
    colorShift: false,
  },
  MEDIUM: {
    intensity: 0.5,
    offsetRange: 5,
    colorShift: true,
  },
  HIGH: {
    intensity: 0.8,
    offsetRange: 10,
    colorShift: true,
  },
  CRITICAL: {
    intensity: 1.0,
    offsetRange: 20,
    colorShift: true,
  },
} as const;

export function getGlitchLevelForIH(ih: number): keyof typeof GLITCH_LEVELS {
  if (ih >= 80) return 'NONE';
  if (ih >= 50) return 'LOW';
  if (ih >= 30) return 'MEDIUM';
  if (ih >= 10) return 'HIGH';
  return 'CRITICAL';
}
```

### 5.3 グリッチテキストコンポーネント（修正版）

#### TDDテストケース（修正版）

```typescript
// src/ui/components/GlitchText.test.tsx

import React from 'react';
import { render } from '@testing-library/react-native';
import { GlitchText } from './GlitchText';
import { StyleSheet } from 'react-native';

describe('GlitchText【Medium修正 #14】', () => {
  test('IH 100%の場合、グリッチエフェクトなし', () => {
    const { getByText } = render(
      <GlitchText ih={100}>Test Text</GlitchText>
    );

    const text = getByText('Test Text');
    const flatStyle = StyleSheet.flatten(text.props.style);

    // transform が undefined
    expect(flatStyle.transform).toBeUndefined();
    // opacity が 1
    expect(flatStyle.opacity).toBe(1);
  });

  test('IH 30%の場合、MEDIUMレベルのグリッチ', () => {
    const { getByText } = render(
      <GlitchText ih={30}>Test Text</GlitchText>
    );

    const text = getByText('Test Text');
    const flatStyle = StyleSheet.flatten(text.props.style);

    // opacity が 1未満
    expect(flatStyle.opacity).toBeLessThan(1);
  });

  test('IH 5%の場合、CRITICALレベルのグリッチ', () => {
    const { getByText } = render(
      <GlitchText ih={5}>Test Text</GlitchText>
    );

    const text = getByText('Test Text');
    const flatStyle = StyleSheet.flatten(text.props.style);

    // 最大強度のグリッチ
    expect(flatStyle.opacity).toBeLessThan(0.9);
    expect(flatStyle.transform).toBeDefined();
  });

  test('グリッチアニメーションが不規則に動作する', () => {
    jest.useFakeTimers();

    const { getByText, rerender } = render(
      <GlitchText ih={20} animate>Test Text</GlitchText>
    );

    const initialStyle = StyleSheet.flatten(getByText('Test Text').props.style);

    // 時間経過
    jest.advanceTimersByTime(200);

    rerender(<GlitchText ih={20} animate>Test Text</GlitchText>);
    const newStyle = StyleSheet.flatten(getByText('Test Text').props.style);

    // transform が変化している（ランダムなので値自体は比較しない）
    expect(newStyle.transform).toBeDefined();

    jest.useRealTimers();
  });
});
```

#### 実装（v1.0と同様）

```typescript
// src/ui/components/GlitchText.tsx

import React, { useEffect, useState } from 'react';
import { Text, TextStyle } from 'react-native';
import { GLITCH_LEVELS, getGlitchLevelForIH } from '../theme/glitch';
import { BRUTALIST_THEME } from '../theme/brutalist';

interface GlitchTextProps {
  children: string;
  ih: number;
  animate?: boolean;
  style?: TextStyle;
}

export const GlitchText: React.FC<GlitchTextProps> = ({
  children,
  ih,
  animate = true,
  style,
}) => {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const level = getGlitchLevelForIH(ih);
  const glitchConfig = GLITCH_LEVELS[level];

  useEffect(() => {
    if (!animate || glitchConfig.intensity === 0) return;

    const interval = setInterval(() => {
      const randomX = (Math.random() - 0.5) * 2 * glitchConfig.offsetRange;
      const randomY = (Math.random() - 0.5) * 2 * glitchConfig.offsetRange;
      setOffset({ x: randomX, y: randomY });
    }, 150);

    return () => clearInterval(interval);
  }, [animate, glitchConfig]);

  const glitchStyle: TextStyle = {
    transform: [
      { translateX: offset.x },
      { translateY: offset.y },
    ],
    opacity: 1 - glitchConfig.intensity * 0.2,
  };

  return (
    <Text
      style={[
        {
          fontFamily: BRUTALIST_THEME.typography.fontFamily.mono,
          fontSize: BRUTALIST_THEME.typography.sizes.xl,
          color: BRUTALIST_THEME.colors.black,
        },
        glitchConfig.intensity > 0 && glitchStyle,
        style,
      ]}
    >
      {children}
    </Text>
  );
};
```

### 5.4 画面ナビゲーション構造（修正版）

#### Expo Router v4対応

```typescript
// app/_layout.tsx (ルート)

import { Stack } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { isOnboardingComplete } from '../src/database/db';

export default function RootLayout() {
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    checkOnboarding();
  }, []);

  async function checkOnboarding() {
    const db = await SQLite.openDatabaseAsync('onedayos.db');
    const done = await isOnboardingComplete(db);
    setOnboardingDone(done);
  }

  if (onboardingDone === null) {
    return null; // ローディング
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {!onboardingDone && <Stack.Screen name="onboarding" />}
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
```

```typescript
// app/(tabs)/_layout.tsx

import { Tabs } from 'expo-router';
import React from 'react';
import { BRUTALIST_THEME } from '../../src/ui/theme/brutalist';
import { PhaseManager } from '../../src/core/phase/PhaseManager';

export default function TabLayout() {
  const currentPhase = PhaseManager.getCurrentPhase();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: BRUTALIST_THEME.colors.black,
          borderTopWidth: BRUTALIST_THEME.borders.width.thick,
          borderTopColor: BRUTALIST_THEME.colors.white,
        },
        tabBarActiveTintColor: BRUTALIST_THEME.colors.white,
        tabBarInactiveTintColor: BRUTALIST_THEME.colors.gray,
      }}
    >
      <Tabs.Screen
        name="morning"
        options={{
          title: 'MORNING',
          href: currentPhase === 'morning' ? '/morning' : null,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'IDENTITY',
        }}
      />
      <Tabs.Screen
        name="evening"
        options={{
          title: 'EVENING',
          href: currentPhase === 'evening' ? '/evening' : null,
        }}
      />
    </Tabs>
  );
}
```

### 5.5 PhaseGuardコンポーネント（新規）

```typescript
// src/ui/components/PhaseGuard.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { PhaseManager, Phase } from '../../core/phase/PhaseManager';
import { BRUTALIST_THEME } from '../theme/brutalist';

interface PhaseGuardProps {
  requiredPhase: Phase;
  children: React.ReactNode;
}

export const PhaseGuard: React.FC<PhaseGuardProps> = ({ requiredPhase, children }) => {
  const currentPhase = PhaseManager.getCurrentPhase();

  if (currentPhase !== requiredPhase && requiredPhase !== 'core') {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>
          この画面は{getPhaseDisplayName(requiredPhase)}にのみアクセス可能です
        </Text>
      </View>
    );
  }

  return <>{children}</>;
};

function getPhaseDisplayName(phase: Phase): string {
  switch (phase) {
    case 'morning': return 'AM 6:00-9:00';
    case 'evening': return 'PM 20:00-24:00';
    case 'core': return '常時';
    case 'locked': return 'ロック中';
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRUTALIST_THEME.colors.black,
  },
  text: {
    color: BRUTALIST_THEME.colors.white,
    fontFamily: BRUTALIST_THEME.typography.fontFamily.mono,
    fontSize: BRUTALIST_THEME.typography.sizes.lg,
  },
});
```

### 5.6 オンボーディングフロー（新規）

#### 画面構成

```typescript
// app/onboarding/index.tsx

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { BRUTALIST_THEME } from '../../src/ui/theme/brutalist';

export default function OnboardingWelcome() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>One Day OS</Text>
      <Text style={styles.subtitle}>人生を立て直すのに、何年もいらない。</Text>
      <Text style={styles.subtitle}>必要なのは真剣な1日だけだ。</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => router.push('/onboarding/anti-vision')}
      >
        <Text style={styles.buttonText}>開始する</Text>
      </TouchableOpacity>

      <Text style={styles.warning}>
        注意: このアプリはデータを不可逆的に削除する可能性があります。
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BRUTALIST_THEME.colors.black,
    padding: BRUTALIST_THEME.spacing.xl,
  },
  title: {
    fontSize: BRUTALIST_THEME.typography.sizes.xxl,
    color: BRUTALIST_THEME.colors.white,
    fontFamily: BRUTALIST_THEME.typography.fontFamily.mono,
    fontWeight: BRUTALIST_THEME.typography.weights.black,
    marginBottom: BRUTALIST_THEME.spacing.lg,
  },
  subtitle: {
    fontSize: BRUTALIST_THEME.typography.sizes.md,
    color: BRUTALIST_THEME.colors.white,
    fontFamily: BRUTALIST_THEME.typography.fontFamily.mono,
    textAlign: 'center',
    marginBottom: BRUTALIST_THEME.spacing.sm,
  },
  button: {
    marginTop: BRUTALIST_THEME.spacing.xl,
    paddingVertical: BRUTALIST_THEME.spacing.md,
    paddingHorizontal: BRUTALIST_THEME.spacing.xl,
    borderWidth: BRUTALIST_THEME.borders.width.thick,
    borderColor: BRUTALIST_THEME.colors.white,
  },
  buttonText: {
    fontSize: BRUTALIST_THEME.typography.sizes.lg,
    color: BRUTALIST_THEME.colors.white,
    fontFamily: BRUTALIST_THEME.typography.fontFamily.mono,
  },
  warning: {
    marginTop: BRUTALIST_THEME.spacing.xl,
    fontSize: BRUTALIST_THEME.typography.sizes.sm,
    color: BRUTALIST_THEME.colors.danger,
    fontFamily: BRUTALIST_THEME.typography.fontFamily.mono,
    textAlign: 'center',
  },
});
```

```typescript
// app/onboarding/anti-vision.tsx

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { BRUTALIST_THEME } from '../../src/ui/theme/brutalist';

export default function AntiVisionScreen() {
  const router = useRouter();
  const [antiVision, setAntiVision] = useState('');

  const handleNext = () => {
    if (antiVision.trim().length > 0) {
      // DBに保存（後で実装）
      router.push('/onboarding/identity');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>アンチビジョン</Text>
      <Text style={styles.description}>
        絶対に生きたくない5年後の火曜日を書いてください。
      </Text>

      <TextInput
        style={styles.input}
        value={antiVision}
        onChangeText={setAntiVision}
        multiline
        placeholder="例: 40歳、独身、誰からも必要とされず、毎日同じルーティンを繰り返している..."
        placeholderTextColor={BRUTALIST_THEME.colors.gray}
      />

      <TouchableOpacity
        style={[styles.button, !antiVision && styles.buttonDisabled]}
        onPress={handleNext}
        disabled={!antiVision}
      >
        <Text style={styles.buttonText}>次へ</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: BRUTALIST_THEME.spacing.xl,
    backgroundColor: BRUTALIST_THEME.colors.black,
  },
  title: {
    fontSize: BRUTALIST_THEME.typography.sizes.xxl,
    color: BRUTALIST_THEME.colors.white,
    fontFamily: BRUTALIST_THEME.typography.fontFamily.mono,
    marginBottom: BRUTALIST_THEME.spacing.md,
  },
  description: {
    fontSize: BRUTALIST_THEME.typography.sizes.md,
    color: BRUTALIST_THEME.colors.white,
    fontFamily: BRUTALIST_THEME.typography.fontFamily.mono,
    marginBottom: BRUTALIST_THEME.spacing.lg,
  },
  input: {
    flex: 1,
    borderWidth: BRUTALIST_THEME.borders.width.medium,
    borderColor: BRUTALIST_THEME.colors.white,
    color: BRUTALIST_THEME.colors.white,
    fontFamily: BRUTALIST_THEME.typography.fontFamily.mono,
    fontSize: BRUTALIST_THEME.typography.sizes.md,
    padding: BRUTALIST_THEME.spacing.md,
    textAlignVertical: 'top',
  },
  button: {
    marginTop: BRUTALIST_THEME.spacing.lg,
    paddingVertical: BRUTALIST_THEME.spacing.md,
    borderWidth: BRUTALIST_THEME.borders.width.thick,
    borderColor: BRUTALIST_THEME.colors.white,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: BRUTALIST_THEME.typography.sizes.lg,
    color: BRUTALIST_THEME.colors.white,
    fontFamily: BRUTALIST_THEME.typography.fontFamily.mono,
  },
});
```

**注:** identity.tsx, mission.tsx, quests.tsx も同様のパターンで実装

---

## 6. リスク・検討事項

### 6.1 技術的リスク

| リスク | 影響度 | 対策 |
|-------|--------|------|
| **通知が正確な時間に発火しない** | 高 | Android: `SCHEDULE_EXACT_ALARM`権限を追加済み。iOS: 問題なし。 |
| **バックグラウンドでIH減算が動作しない** | 高 | 【修正済み】AppStateリスナー + DB永続化で対応。フォアグラウンド復帰時にチェック。 |
| **SQLite Wipeが完全でない** | 中 | `DELETE`後に`VACUUM`を実行してデータを物理削除（Phase 2で実装）。 |
| **グリッチエフェクトが重い** | 低 | 150ms間隔の状態更新で実装。パフォーマンステストで検証。 |
| **iCloud/Google Driveバックアップ** | 高 | 【修正済み】Android: `allowBackup: false`。iOS: 今後ネイティブモジュールで対応。 |
| **タイムゾーン変更時の通知** | 中 | 【Medium #11】AppStateリスナーで再スケジュール。 |
| **IdentityEngineとDBの同期** | 中 | 【修正済み】シングルトンパターン + IH変更時のDB永続化。 |
| **setIntervalメモリリーク** | 中 | 【修正済み】setIntervalを廃止、AppStateリスナーに変更。 |

### 6.2 UXリスク

| リスク | 影響度 | 対策 |
|-------|--------|------|
| **通知が多すぎてユーザーが無視する** | 中 | 1日5回は仕様通り。初回オンボーディングで明示。 |
| **Wipeが不意に起こる** | 高 | IH残量を常時表示。警告レベル（< 20%）で視覚的に強調。 |
| **再セットアップが面倒** | 低 | Wipe後はオンボーディングフロー（4画面）で再入力。約3-5分で完了。 |
| **PHASE時間帯外のアクセス** | 中 | 【修正済み】PhaseGuardで制御。アクセス不可時はメッセージ表示。 |

### 6.3 法的・倫理的検討

| 項目 | 検討内容 |
|------|----------|
| **データ消去の責任** | 利用規約に「データ消去は仕様であり、復元不可」と明記。初回起動時に同意を得る。 |
| **メンタルヘルスへの影響** | 「このアプリは治療ツールではない」と免責事項を表示。過度なストレスを感じる場合は使用を中止する旨を記載。 |

---

## 7. マイルストーン

### Milestone 1: Core Engine (Week 1-2)

**目標:** Identity Health エンジン、Wipe機構、DespairModeManager の完成

#### タスク
1. **環境構築** (Day 1)
   - Expoプロジェクト作成
   - 依存パッケージインストール
   - Jest設定

2. **データベース構築** (Day 2-3)
   - SQLiteスキーマ実装（修正版）
   - IH初期化ロジック追加【Critical #2】
   - テスト: テーブル作成、CRUD操作、IH初期化

3. **IHエンジン** (Day 4-5)
   - `IdentityEngine.test.ts` 作成（修正版TDD）
   - `IdentityEngine.ts` 実装（シングルトン + DB永続化）【Medium #12】
   - テスト: 減算ロジック、クエストペナルティ【High #5】

4. **Wipeマネージャー** (Day 6-7)
   - `WipeManager.test.ts` 作成（統合テスト）【Medium #15】
   - `WipeManager.ts` 実装（onWipeCompleteコールバック）【Critical #4】
   - テスト: 全削除、バックアップ無効化、Wipe後の遷移

5. **DespairModeManager** (Day 8)
   - `DespairModeManager.test.ts` 作成【Critical #1】
   - `DespairModeManager.ts` 実装
   - テスト: Wipe後のナビゲーション、再セットアップ可否

**完了条件:**
- [ ] 全テストがパス（カバレッジ80%以上）
- [ ] IH=0でWipeが確実に動作
- [ ] Wipe後にオンボーディング画面に遷移
- [ ] バックアップが無効化されている（Android）

---

### Milestone 2: Notification System (Week 3-4)

**目標:** 5つの定時通知、YES/NO応答処理、タイムアウト検知

#### タスク
1. **通知スケジューラー** (Day 9-10)
   - `NotificationScheduler.test.ts` 作成
   - `NotificationScheduler.ts` 実装
   - テスト: 5つの通知が正確にスケジュール

2. **通知応答ハンドラー** (Day 11-13)
   - `NotificationHandler.test.ts` 作成（修正版）
   - `NotificationHandler.ts` 実装（AppStateリスナー）【Critical #3】
   - テスト: YES/NO/IGNOREDの各ケース、タイムアウト検知

3. **DailyManager** (Day 14)
   - `DailyManager.test.ts` 作成【High #6】
   - `DailyManager.ts` 実装
   - テスト: 日次リセット、IH維持、クエストペナルティ

4. **PhaseManager** (Day 15)
   - `PhaseManager.test.ts` 作成【High #8】
   - `PhaseManager.ts` 実装
   - テスト: 時間帯判定、画面アクセス制御

5. **統合テスト** (Day 16)
   - E2Eテスト: 通知→応答→IH減算→Wipe
   - 実機テスト（iOS/Android）

**完了条件:**
- [ ] 5つの通知が毎日正確に発火
- [ ] YES/NOボタンが動作
- [ ] タイムアウト検知がフォアグラウンド復帰時に動作
- [ ] 日次処理でクエストがリセットされる
- [ ] PHASE時間帯制御が動作

---

### Milestone 3: UI Shell + Onboarding (Week 5-6)

**目標:** Brutalist UIの基本構造、グリッチエフェクト、オンボーディングフロー

#### タスク
1. **デザインシステム** (Day 17-18)
   - `brutalist.ts` 定義
   - `glitch.ts` 定義
   - カラー/タイポグラフィのテスト

2. **グリッチテキストコンポーネント** (Day 19)
   - `GlitchText.test.tsx` 作成（修正版）【Medium #14】
   - `GlitchText.tsx` 実装
   - テスト: IHレベル別エフェクト

3. **画面ナビゲーション** (Day 20-21)
   - `app/_layout.tsx` 実装（Expo Router v4対応）【Medium #17】
   - `app/(tabs)/_layout.tsx` 実装
   - PhaseGuardコンポーネント
   - タブナビゲーション + PHASE制御

4. **オンボーディング画面** (Day 22-24)
   - index.tsx（ウェルカム画面）
   - anti-vision.tsx
   - identity.tsx
   - mission.tsx
   - quests.tsx
   - DB保存ロジック
   - オンボーディング完了フラグ

5. **IH表示** (Day 25)
   - IH値の視覚化（数値 + グリッチレベル）
   - リアルタイム更新

**完了条件:**
- [ ] Brutalistデザインが適用
- [ ] IHに応じてグリッチエフェクトが変化
- [ ] 3画面間のナビゲーションが動作
- [ ] PHASE時間帯外の画面はアクセス不可
- [ ] オンボーディングフローが完成

---

### Milestone 4: 統合・デプロイ準備 (Week 7)

#### タスク
1. **E2Eテスト** (Day 26-27)
   - フルフローテスト: 起動→通知→応答→Wipe→オンボーディング
   - 実機での24時間テスト

2. **パフォーマンス最適化** (Day 28)
   - グリッチアニメーションの最適化
   - DB クエリの最適化

3. **ドキュメント** (Day 29)
   - README作成
   - 利用規約・免責事項
   - オンボーディング画面の文言

4. **ビルド** (Day 30-31)
   - EAS Build設定
   - TestFlight / Google Play Internal Testing

**完了条件:**
- [ ] E2Eテストが全パス
- [ ] 実機で24時間安定動作
- [ ] ビルドがエラーなく完了

---

## 8. 次のステップ

### Phase 1の開始手順

1. **プロジェクト作成**
```bash
npx create-expo-app@latest one-day-os --template blank-typescript
cd one-day-os
```

2. **依存関係インストール**
```bash
npx expo install expo-sqlite expo-notifications expo-router react-native-safe-area-context react-native-screens
npm install --save-dev jest jest-expo @testing-library/react-native @types/jest
```

3. **Jest設定**
```bash
npx jest --init
```

4. **最初のテスト作成**
```bash
mkdir -p src/core/identity
touch src/core/identity/IdentityEngine.test.ts
```

5. **TDD開始**
- `IdentityEngine.test.ts` に最初のテストを書く
- 実装 → テストパス → リファクタリング のサイクルを回す

---

## 9. 技術的制限事項

### 9.1 実装不可能な機能

#### アプリ削除によるWipeトリガー【High問題 #10】

**仕様書の記載:**
```
Evening -->|IH <= 0 または 削除| Wipe[!! 物理ワイプ実行 !!]
```

**技術的理由:**
1. iOS/Androidともに、アプリ削除時には全てのアプリデータ（SQLiteデータベース含む）が自動的に削除される
2. サーバーレス原則により、サーバー側での状態管理ができない
3. アプリ削除を検知するOSレベルのAPIは存在しない

**代替策:**
- アプリ削除によるデータ消失は、OS標準の動作として受け入れる
- ユーザーが自主的にWipeを選択できる「自己破壊ボタン」を提供（Phase 4で検討）

**ユーザーへの影響:**
- アプリを削除して再インストールすることで、ペナルティなしでリセット可能
- ただし、これは「逃げ道」として仕様の一部と見なすこともできる

---

### 9.2 部分的な実装制限

#### iOSバックアップの完全無効化

**現状の実装:**
- Android: `app.json`の`allowBackup: false`で対応済み
- iOS: `.nosync`ファイルによる対応は不完全

**完全な対応に必要な技術:**
- ネイティブモジュール（Swift/Objective-C）で`NSURLIsExcludedFromBackupKey`を設定
- Expo Configプラグインでの実装

**Phase 2以降での対応予定:**
- Expo Configプラグインを作成してiOSバックアップを無効化

---

## 10. 付録: TDD開発フロー

### Red-Green-Refactor サイクル

```
1. RED: テストを書く（失敗することを確認）
   ↓
2. GREEN: 最小限の実装でテストをパスさせる
   ↓
3. REFACTOR: コードを整理・最適化
   ↓
4. 次の機能へ（1に戻る）
```

### テスト優先順位

1. **Critical Path（最優先）**
   - IH=0でWipe発動
   - Wipe後のオンボーディング遷移【Critical #4】
   - 通知無視でIH減少（タイムアウト検知）【Critical #3】
   - YES応答でIH維持

2. **Edge Cases（次点）**
   - IHが0を下回らない
   - IHが100を超えない
   - 同じ通知に2回応答できない
   - アプリ再起動後のIH値保持【Medium #12】

3. **Integration（最後）**
   - 通知→応答→IH更新→Wipe の全フロー
   - 日次処理→クエストペナルティ→IH減算
   - 24時間の動作検証

---

## まとめ

この実装計画v1.1に従い、**Phase 1（IH Engine + Wipe + DespairModeManager）**から着手してください。

**重要原則:**
1. **TDD厳守** - テストを先に書く
2. **不可逆性** - Wipeは復元不可能に実装
3. **ミニマリズム** - 余計な機能を追加しない
4. **修正の反映** - v1.0のレビュー指摘事項を全て修正済み

**最初の1行のコード:**
```typescript
// src/core/identity/IdentityEngine.test.ts
import { IdentityEngine } from './IdentityEngine';

describe('IdentityEngine', () => {
  test('通知に「NO」と回答した場合、IHが15%減少する', async () => {
    const engine = await IdentityEngine.getInstance();
    await engine.setCurrentIH(100);
    const result = await engine.applyNotificationResponse('NO');
    expect(result.delta).toBe(-15);
  });
});
```

**このテストを通すところから、すべてが始まります。**

---

**変更承認者:** レビュアー（Claude Opus 4.5）
**実装開始準備:** 完了
**次のアクション:** Milestone 1 Day 1の実施
