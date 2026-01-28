# One Day OS 実装計画書 v1.0

## プロジェクト概要

**コア・コンセプト:** 「人生を立て直すのに、何年もいらない。必要なのは真剣な1日だけだ。」

**技術仕様:**
- Platform: React Native (Expo)
- Language: TypeScript
- Database: SQLite (expo-sqlite)
- Design: Brutalist
- Development: TDD (Test-Driven Development)

---

## 1. プロジェクト構成

```
one-day-os/
├── app/                          # Expo Router アプリケーションルート
│   ├── (tabs)/                   # タブナビゲーション
│   │   ├── index.tsx            # メイン画面（Core Identity Layer）
│   │   ├── morning.tsx          # Morning Layer
│   │   └── evening.tsx          # Evening Layer
│   ├── _layout.tsx              # ルートレイアウト
│   └── +not-found.tsx           # 404画面
│
├── src/
│   ├── core/                     # コアロジック
│   │   ├── identity/
│   │   │   ├── IdentityEngine.ts        # IH計算エンジン
│   │   │   ├── IdentityEngine.test.ts   # IHエンジンのテスト
│   │   │   ├── WipeManager.ts           # データ消去マネージャー
│   │   │   └── WipeManager.test.ts      # Wipeマネージャーのテスト
│   │   └── constants.ts          # 定数定義（IH減算値など）
│   │
│   ├── database/
│   │   ├── schema.ts             # SQLiteスキーマ定義
│   │   ├── migrations.ts         # マイグレーション管理
│   │   ├── db.ts                 # データベース接続・初期化
│   │   └── db.test.ts            # データベーステスト
│   │
│   ├── notifications/
│   │   ├── NotificationScheduler.ts      # 通知スケジューラー
│   │   ├── NotificationScheduler.test.ts # 通知スケジューラーテスト
│   │   ├── NotificationHandler.ts        # 通知応答処理
│   │   ├── NotificationHandler.test.ts   # 通知応答処理テスト
│   │   └── questions.ts          # 5つの質問定義
│   │
│   ├── ui/
│   │   ├── components/
│   │   │   ├── GlitchText.tsx           # グリッチエフェクトテキスト
│   │   │   ├── GlitchText.test.tsx      # グリッチテキストテスト
│   │   │   ├── IdentityStatement.tsx    # アイデンティティ表示
│   │   │   └── ZoomLens.tsx             # 3層レンズコンポーネント
│   │   ├── theme/
│   │   │   ├── brutalist.ts             # Brutalistデザイントークン
│   │   │   └── glitch.ts                # グリッチエフェクト定義
│   │   └── hooks/
│   │       ├── useIdentityHealth.ts     # IH状態管理フック
│   │       └── useNotifications.ts      # 通知管理フック
│   │
│   └── types/
│       ├── identity.ts           # Identity型定義
│       └── notification.ts       # Notification型定義
│
├── __tests__/                    # E2Eテスト
│   ├── identity-wipe.test.ts    # Wipe統合テスト
│   └── notification-flow.test.ts # 通知フロー統合テスト
│
├── assets/                       # 静的アセット
├── app.json                      # Expo設定
├── package.json
├── tsconfig.json
└── jest.config.js                # Jest設定
```

---

## 2. 技術スタック詳細

### 必須パッケージ

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

### 主要パッケージの役割

| パッケージ | 用途 | バージョン管理のポイント |
|-----------|------|------------------------|
| `expo-sqlite` | ローカルSQLiteデータベース | 完全ローカル、バックアップ禁止設定が必要 |
| `expo-notifications` | ローカル通知（5回/日） | バックグラウンド通知、YES/NOアクション付き |
| `expo-router` | ファイルベースルーティング | タブナビゲーション実装 |
| `jest-expo` | テスト環境 | TDD実装のためのモック機能 |

### app.json 重要設定

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
      ]
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
  `
};

// インデックス
export const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_daily_quests_date ON daily_quests(date);',
  'CREATE INDEX IF NOT EXISTS idx_notification_responses_time ON notification_responses(scheduled_time);'
];
```

### 3.2 IH計算ロジック

#### TDDテストケース（先に書く）

```typescript
// src/core/identity/IdentityEngine.test.ts

import { IdentityEngine } from './IdentityEngine';

describe('IdentityEngine', () => {
  let engine: IdentityEngine;

  beforeEach(() => {
    engine = new IdentityEngine();
  });

  describe('IH減算ロジック', () => {
    test('通知に「NO」と回答した場合、IHが15%減少する', async () => {
      const initialIH = 100;
      const result = await engine.applyNotificationResponse('NO');
      expect(result.newIH).toBe(85);
      expect(result.delta).toBe(-15);
    });

    test('通知を無視した場合、IHが15%減少する', async () => {
      const initialIH = 100;
      const result = await engine.applyNotificationResponse('IGNORED');
      expect(result.newIH).toBe(85);
    });

    test('通知に「YES」と回答した場合、IHは変化しない', async () => {
      const initialIH = 100;
      const result = await engine.applyNotificationResponse('YES');
      expect(result.newIH).toBe(100);
      expect(result.delta).toBe(0);
    });

    test('夜のクエストが未達成の場合、IHが20%減少する', async () => {
      const initialIH = 100;
      const result = await engine.applyQuestPenalty({ quest1: false, quest2: true });
      expect(result.newIH).toBe(80);
      expect(result.delta).toBe(-20);
    });

    test('IHが0を下回らない（最低値0）', async () => {
      engine.setCurrentIH(10);
      const result = await engine.applyNotificationResponse('NO');
      expect(result.newIH).toBe(0);
    });

    test('複数の減算が累積される', async () => {
      engine.setCurrentIH(100);
      await engine.applyNotificationResponse('NO'); // 85
      await engine.applyNotificationResponse('NO'); // 70
      const final = await engine.getCurrentIH();
      expect(final).toBe(70);
    });
  });

  describe('IH状態チェック', () => {
    test('IH > 0 の場合、isWipeNeeded()がfalseを返す', () => {
      engine.setCurrentIH(50);
      expect(engine.isWipeNeeded()).toBe(false);
    });

    test('IH === 0 の場合、isWipeNeeded()がtrueを返す', () => {
      engine.setCurrentIH(0);
      expect(engine.isWipeNeeded()).toBe(true);
    });

    test('IHが0になった瞬間、wipeトリガーイベントが発火する', async () => {
      const wipeCallback = jest.fn();
      engine.onWipeTrigger(wipeCallback);

      engine.setCurrentIH(15);
      await engine.applyNotificationResponse('NO');

      expect(wipeCallback).toHaveBeenCalledWith({
        reason: 'IH_ZERO',
        finalIH: 0,
        timestamp: expect.any(Number)
      });
    });
  });
});
```

#### 実装（テスト後）

```typescript
// src/core/identity/IdentityEngine.ts

import { IH_CONSTANTS } from '../constants';

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
  private currentIH: number = 100;
  private wipeCallbacks: Array<(event: WipeEvent) => void> = [];

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
    const anyIncomplete = !completion.quest1 || !completion.quest2;
    const delta = anyIncomplete ? IH_CONSTANTS.QUEST_PENALTY : 0;
    return this.updateIH(delta);
  }

  private async updateIH(delta: number): Promise<IHResponse> {
    const previousIH = this.currentIH;
    this.currentIH = Math.max(0, this.currentIH + delta);

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

  isWipeNeeded(): boolean {
    return this.currentIH === 0;
  }

  getCurrentIH(): number {
    return this.currentIH;
  }

  setCurrentIH(value: number): void {
    this.currentIH = Math.max(0, Math.min(100, value));
  }

  onWipeTrigger(callback: (event: WipeEvent) => void): void {
    this.wipeCallbacks.push(callback);
  }

  private triggerWipe(event: WipeEvent): void {
    this.wipeCallbacks.forEach(cb => cb(event));
  }
}
```

### 3.3 Wipe機構

#### TDDテストケース

```typescript
// src/core/identity/WipeManager.test.ts

import { WipeManager } from './WipeManager';
import * as SQLite from 'expo-sqlite';

jest.mock('expo-sqlite');

describe('WipeManager', () => {
  let wipeManager: WipeManager;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      execAsync: jest.fn().mockResolvedValue(undefined),
      getAllAsync: jest.fn().mockResolvedValue([])
    };
    (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue(mockDb);
    wipeManager = new WipeManager();
  });

  test('executeWipe()が全テーブルを削除する', async () => {
    await wipeManager.executeWipe('IH_ZERO', 0);

    expect(mockDb.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM identity')
    );
    expect(mockDb.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM identity_health')
    );
    expect(mockDb.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM daily_quests')
    );
  });

  test('Wipe実行後、wipe_logに記録が残る', async () => {
    await wipeManager.executeWipe('IH_ZERO', 0);

    expect(mockDb.execAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO wipe_log')
    );
  });

  test('Wipe実行後、全テーブルが空になることを検証', async () => {
    await wipeManager.executeWipe('IH_ZERO', 0);

    const tables = ['identity', 'identity_health', 'daily_quests', 'notification_responses', 'anti_vision'];

    for (const table of tables) {
      const count = await wipeManager.getTableRowCount(table);
      expect(count).toBe(0);
    }
  });

  test('Wipeは元に戻せない（不可逆性の確認）', async () => {
    // データを挿入
    await mockDb.execAsync('INSERT INTO identity (identity_statement) VALUES ("Test")');

    // Wipe実行
    await wipeManager.executeWipe('IH_ZERO', 0);

    // データが存在しないことを確認
    const result = await mockDb.getAllAsync('SELECT * FROM identity');
    expect(result.length).toBe(0);
  });

  test('バックアップ禁止フラグが設定される', async () => {
    const backupStatus = await wipeManager.isBackupEnabled();
    expect(backupStatus).toBe(false);
  });
});
```

#### 実装

```typescript
// src/core/identity/WipeManager.ts

import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

export class WipeManager {
  private db: SQLite.SQLiteDatabase | null = null;

  async initialize(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync('onedayos.db');
  }

  /**
   * 全データを物理的に消去（不可逆）
   */
  async executeWipe(reason: string, finalIH: number): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const timestamp = Date.now();

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

      COMMIT;
    `);

    // バックアップファイルが存在する場合も削除
    await this.disableBackup();
  }

  /**
   * バックアップを無効化（iOS iCloud, Android Google Drive）
   */
  private async disableBackup(): Promise<void> {
    // iOS: .nosyncフラグファイルを作成
    const dbPath = `${FileSystem.documentDirectory}SQLite/onedayos.db`;
    const noSyncPath = `${dbPath}.nosync`;

    try {
      await FileSystem.writeAsStringAsync(noSyncPath, '', {
        encoding: FileSystem.EncodingType.UTF8
      });
    } catch (error) {
      console.warn('Failed to disable backup:', error);
    }
  }

  async isBackupEnabled(): Promise<boolean> {
    const dbPath = `${FileSystem.documentDirectory}SQLite/onedayos.db`;
    const noSyncPath = `${dbPath}.nosync`;

    const info = await FileSystem.getInfoAsync(noSyncPath);
    return !info.exists;
  }

  async getTableRowCount(tableName: string): Promise<number> {
    if (!this.db) throw new Error('Database not initialized');

    const result = await this.db.getAllAsync(
      `SELECT COUNT(*) as count FROM ${tableName}`
    );
    return result[0]?.count || 0;
  }
}
```

### 3.4 定数定義

```typescript
// src/core/constants.ts

export const IH_CONSTANTS = {
  INITIAL_VALUE: 100,
  NOTIFICATION_PENALTY: -15, // NO/無視で-15%
  QUEST_PENALTY: -20,        // 夜のクエスト未達で-20%
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
```

---

## 4. Phase 2: Notification System

### 4.1 通知スケジューラー

#### TDDテストケース

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

#### 実装

```typescript
// src/notifications/NotificationScheduler.ts

import * as Notifications from 'expo-notifications';
import { NOTIFICATION_SCHEDULE } from '../core/constants';

export class NotificationScheduler {
  async initialize(): Promise<void> {
    // 通知カテゴリーを設定（YES/NOボタン）
    await this.setNotificationCategories();

    // 通知ハンドラーを設定
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
    // 権限チェック
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
          repeats: true, // 毎日繰り返し
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

### 4.2 通知応答処理

#### TDDテストケース

```typescript
// src/notifications/NotificationHandler.test.ts

import { NotificationHandler } from './NotificationHandler';
import { IdentityEngine } from '../core/identity/IdentityEngine';

jest.mock('../core/identity/IdentityEngine');

describe('NotificationHandler', () => {
  let handler: NotificationHandler;
  let mockEngine: jest.Mocked<IdentityEngine>;

  beforeEach(() => {
    mockEngine = new IdentityEngine() as jest.Mocked<IdentityEngine>;
    handler = new NotificationHandler(mockEngine);
  });

  test('YES応答でIHが減少しない', async () => {
    mockEngine.applyNotificationResponse.mockResolvedValue({
      newIH: 100,
      delta: 0,
      timestamp: Date.now()
    });

    const result = await handler.handleResponse('YES', 'notif-1');

    expect(mockEngine.applyNotificationResponse).toHaveBeenCalledWith('YES');
    expect(result.delta).toBe(0);
  });

  test('NO応答でIHが15%減少する', async () => {
    mockEngine.applyNotificationResponse.mockResolvedValue({
      newIH: 85,
      delta: -15,
      timestamp: Date.now()
    });

    const result = await handler.handleResponse('NO', 'notif-1');

    expect(mockEngine.applyNotificationResponse).toHaveBeenCalledWith('NO');
    expect(result.delta).toBe(-15);
  });

  test('15分以内に応答がない場合、IGNORED扱いでIH減少', async () => {
    jest.useFakeTimers();

    const notificationTime = Date.now();
    handler.trackNotification('notif-1', notificationTime);

    // 15分経過
    jest.advanceTimersByTime(15 * 60 * 1000);

    await handler.checkTimeouts();

    expect(mockEngine.applyNotificationResponse).toHaveBeenCalledWith('IGNORED');

    jest.useRealTimers();
  });

  test('通知応答がDBに記録される', async () => {
    const mockDb = {
      runAsync: jest.fn().mockResolvedValue({ lastInsertRowId: 1 })
    };

    await handler.saveResponse('notif-1', 'YES', -0);

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO notification_responses'),
      expect.any(Array)
    );
  });

  test('同じ通知に2回応答できない', async () => {
    await handler.handleResponse('YES', 'notif-1');

    await expect(
      handler.handleResponse('NO', 'notif-1')
    ).rejects.toThrow('Notification already responded');
  });
});
```

#### 実装

```typescript
// src/notifications/NotificationHandler.ts

import * as Notifications from 'expo-notifications';
import { IdentityEngine, IHResponse } from '../core/identity/IdentityEngine';
import * as SQLite from 'expo-sqlite';

export class NotificationHandler {
  private engine: IdentityEngine;
  private db: SQLite.SQLiteDatabase | null = null;
  private trackedNotifications: Map<string, number> = new Map();
  private respondedNotifications: Set<string> = new Set();

  constructor(engine: IdentityEngine) {
    this.engine = engine;
  }

  async initialize(): Promise<void> {
    this.db = await SQLite.openDatabaseAsync('onedayos.db');

    // 通知応答リスナーを設定
    Notifications.addNotificationResponseReceivedListener(this.onResponseReceived.bind(this));

    // タイムアウトチェックを定期実行（1分ごと）
    setInterval(() => this.checkTimeouts(), 60 * 1000);
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
    this.trackedNotifications.delete(notificationId);

    return result;
  }

  trackNotification(notificationId: string, timestamp: number): void {
    this.trackedNotifications.set(notificationId, timestamp);
  }

  async checkTimeouts(): Promise<void> {
    const now = Date.now();
    const TIMEOUT_MS = 15 * 60 * 1000; // 15分

    for (const [notificationId, timestamp] of this.trackedNotifications.entries()) {
      if (now - timestamp > TIMEOUT_MS && !this.respondedNotifications.has(notificationId)) {
        // タイムアウト = 無視扱い
        const result = await this.engine.applyNotificationResponse('IGNORED');
        await this.saveResponse(notificationId, 'IGNORED', result.delta);

        this.respondedNotifications.add(notificationId);
        this.trackedNotifications.delete(notificationId);
      }
    }
  }

  async saveResponse(
    notificationId: string,
    responseType: 'YES' | 'NO' | 'IGNORED',
    ihImpact: number
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.runAsync(
      `INSERT INTO notification_responses
       (notification_id, scheduled_time, response_type, responded_at, ih_impact)
       VALUES (?, ?, ?, ?, ?)`,
      [notificationId, Date.now(), responseType, Date.now(), ihImpact]
    );
  }
}
```

---

## 5. Phase 3: Basic UI Shell

### 5.1 Brutalistデザイントークン

```typescript
// src/ui/theme/brutalist.ts

export const BRUTALIST_THEME = {
  colors: {
    // モノクロパレット
    black: '#000000',
    white: '#FFFFFF',
    gray: '#808080',

    // アクセントカラー（警告用のみ）
    danger: '#FF0000',

    // IHレベル別
    ihCritical: '#330000',  // IH < 20
    ihWarning: '#663300',   // IH < 50
    ihNormal: '#000000',    // IH >= 50
  },

  typography: {
    // システムフォント（Brutalist原則）
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

### 5.2 グリッチエフェクト定義

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

### 5.3 グリッチテキストコンポーネント

#### TDDテストケース

```typescript
// src/ui/components/GlitchText.test.tsx

import React from 'react';
import { render } from '@testing-library/react-native';
import { GlitchText } from './GlitchText';

describe('GlitchText', () => {
  test('IH 100%の場合、グリッチエフェクトなし', () => {
    const { getByText } = render(
      <GlitchText ih={100}>Test Text</GlitchText>
    );

    const text = getByText('Test Text');
    expect(text.props.style).not.toContainEqual(
      expect.objectContaining({ textShadow: expect.any(String) })
    );
  });

  test('IH 30%の場合、MEDIUMレベルのグリッチ', () => {
    const { getByText } = render(
      <GlitchText ih={30}>Test Text</GlitchText>
    );

    const text = getByText('Test Text');
    // グリッチスタイルが適用されているか確認
    expect(text.props.style).toContainEqual(
      expect.objectContaining({ opacity: expect.any(Number) })
    );
  });

  test('IH 5%の場合、CRITICALレベルのグリッチ', () => {
    const { getByText } = render(
      <GlitchText ih={5}>Test Text</GlitchText>
    );

    const text = getByText('Test Text');
    // 最大強度のグリッチ
    expect(text.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ transform: expect.any(Array) })
      ])
    );
  });

  test('グリッチアニメーションが不規則に動作する', () => {
    jest.useFakeTimers();

    const { getByText } = render(
      <GlitchText ih={20} animate>Test Text</GlitchText>
    );

    const initialStyle = getByText('Test Text').props.style;

    // 時間経過
    jest.advanceTimersByTime(200);

    const newStyle = getByText('Test Text').props.style;
    expect(initialStyle).not.toEqual(newStyle);

    jest.useRealTimers();
  });
});
```

#### 実装

```typescript
// src/ui/components/GlitchText.tsx

import React, { useEffect, useState } from 'react';
import { Text, TextStyle, Animated } from 'react-native';
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

### 5.4 画面ナビゲーション構造

```typescript
// app/_layout.tsx

import { Tabs } from 'expo-router';
import React from 'react';
import { BRUTALIST_THEME } from '../src/ui/theme/brutalist';

export default function RootLayout() {
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
        }}
      />
    </Tabs>
  );
}
```

---

## 6. リスク・検討事項

### 6.1 技術的リスク

| リスク | 影響度 | 対策 |
|-------|--------|------|
| **通知が正確な時間に発火しない** | 高 | Expo Notificationsの`scheduleNotificationAsync`は正確だが、OSの省電力モードで遅延する可能性。Android: `SCHEDULE_EXACT_ALARM`権限を追加。iOS: 問題なし。 |
| **バックグラウンドでIH減算が動作しない** | 高 | 通知応答はフォアグラウンド復帰時に処理。タイムアウトチェックはアプリ起動時に実行。 |
| **SQLite Wipeが完全でない** | 中 | `DELETE`後に`VACUUM`を実行してデータを物理削除。テストで検証。 |
| **グリッチエフェクトが重い** | 低 | `Animated` APIではなく、間隔を空けた状態更新で実装（150ms間隔）。 |
| **iCloud/Google Driveバックアップ** | 高 | iOS: `.nosync`ファイル作成。Android: `android:allowBackup="false"`を`app.json`に追加。 |

### 6.2 UXリスク

| リスク | 影響度 | 対策 |
|-------|--------|------|
| **通知が多すぎてユーザーが無視する** | 中 | 1日5回は仕様通り。初回オンボーディングで明示。 |
| **Wipeが不意に起こる** | 高 | IH残量を常時表示。警告レベル（< 20%）で視覚的に強調。 |
| **再セットアップが面倒** | 低 | Wipe後はアンチビジョン→アイデンティティの再入力のみ。数分で完了。 |

### 6.3 法的・倫理的検討

| 項目 | 検討内容 |
|------|----------|
| **データ消去の責任** | 利用規約に「データ消去は仕様であり、復元不可」と明記。初回起動時に同意を得る。 |
| **メンタルヘルスへの影響** | 「このアプリは治療ツールではない」と免責事項を表示。過度なストレスを感じる場合は使用を中止する旨を記載。 |

---

## 7. マイルストーン

### Milestone 1: Core Engine (Week 1-2)

**目標:** Identity Health エンジンとWipe機構の完成

#### タスク
1. **環境構築** (Day 1)
   - Expoプロジェクト作成 (`npx create-expo-app@latest`)
   - 依存パッケージインストール
   - Jest設定

2. **データベース構築** (Day 2-3)
   - SQLiteスキーマ実装 (`src/database/schema.ts`)
   - マイグレーション機能
   - テスト: テーブル作成、CRUD操作

3. **IHエンジン** (Day 4-5)
   - `IdentityEngine.test.ts` 作成（TDD）
   - `IdentityEngine.ts` 実装
   - テスト: 減算ロジック、境界値（0, 100）

4. **Wipeマネージャー** (Day 6-7)
   - `WipeManager.test.ts` 作成
   - `WipeManager.ts` 実装
   - テスト: 全削除、バックアップ無効化

**完了条件:**
- [ ] 全テストがパス（カバレッジ80%以上）
- [ ] IH=0でWipeが確実に動作
- [ ] バックアップが無効化されている

---

### Milestone 2: Notification System (Week 3-4)

**目標:** 5つの定時通知とYES/NO応答処理

#### タスク
1. **通知スケジューラー** (Day 8-10)
   - `NotificationScheduler.test.ts` 作成
   - `NotificationScheduler.ts` 実装
   - テスト: 5つの通知が正確にスケジュール

2. **通知応答ハンドラー** (Day 11-12)
   - `NotificationHandler.test.ts` 作成
   - `NotificationHandler.ts` 実装
   - テスト: YES/NO/IGNOREDの各ケース

3. **タイムアウト処理** (Day 13)
   - 15分タイムアウトロジック
   - テスト: 時間経過でIGNORED扱い

4. **統合テスト** (Day 14)
   - E2Eテスト: 通知→応答→IH減算→Wipe
   - 実機テスト（iOS/Android）

**完了条件:**
- [ ] 5つの通知が毎日正確に発火
- [ ] YES/NOボタンが動作
- [ ] 無視時にIHが減少

---

### Milestone 3: UI Shell (Week 5-6)

**目標:** Brutalist UIの基本構造とグリッチエフェクト

#### タスク
1. **デザインシステム** (Day 15-16)
   - `brutalist.ts` 定義
   - `glitch.ts` 定義
   - カラー/タイポグラフィのテスト

2. **グリッチテキストコンポーネント** (Day 17-18)
   - `GlitchText.test.tsx` 作成
   - `GlitchText.tsx` 実装
   - テスト: IHレベル別エフェクト

3. **画面ナビゲーション** (Day 19-20)
   - `app/_layout.tsx` 実装
   - 3画面の基本レイアウト（Morning/Main/Evening）
   - タブナビゲーション

4. **IH表示** (Day 21)
   - IH値の視覚化（数値 + グリッチレベル）
   - リアルタイム更新

**完了条件:**
- [ ] Brutalistデザインが適用
- [ ] IHに応じてグリッチエフェクトが変化
- [ ] 3画面間のナビゲーションが動作

---

### Milestone 4: 統合・デプロイ準備 (Week 7)

#### タスク
1. **E2Eテスト** (Day 22-23)
   - フルフローテスト: 起動→通知→応答→Wipe
   - 実機での24時間テスト

2. **パフォーマンス最適化** (Day 24)
   - グリッチアニメーションの最適化
   - DB クエリの最適化

3. **ドキュメント** (Day 25)
   - README作成
   - 利用規約・免責事項
   - オンボーディング画面の文言

4. **ビルド** (Day 26-28)
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

## 付録: TDD開発フロー

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
   - 通知無視でIH減少
   - YES応答でIH維持

2. **Edge Cases（次点）**
   - IHが0を下回らない
   - IHが100を超えない
   - 同じ通知に2回応答できない

3. **Integration（最後）**
   - 通知→応答→IH更新→Wipe の全フロー
   - 24時間の動作検証

---

## まとめ

この実装計画に従い、**Phase 1（IH Engine + Wipe）**から着手してください。

**重要原則:**
1. **TDD厳守** - テストを先に書く
2. **不可逆性** - Wipeは復元不可能に実装
3. **ミニマリズム** - 余計な機能を追加しない

**最初の1行のコード:**
```typescript
// src/core/identity/IdentityEngine.test.ts
import { IdentityEngine } from './IdentityEngine';

describe('IdentityEngine', () => {
  test('通知に「NO」と回答した場合、IHが15%減少する', async () => {
    const engine = new IdentityEngine();
    const result = await engine.applyNotificationResponse('NO');
    expect(result.delta).toBe(-15);
  });
});
```

**このテストを通すところから、すべてが始まります。**
