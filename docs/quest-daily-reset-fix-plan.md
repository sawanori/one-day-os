# クエスト日次リセットバグ 修正実装計画

**作成日:** 2026-02-26
**対象バージョン:** One Day OS (React Native 0.81.5 + Expo SDK 54)
**優先度:** Critical（コア機能の根本的欠陥）

---

## 1. バグ概要

### 症状

日付が変わっても、クエストの `is_completed` フラグが `true` のまま残り続ける。ユーザーは毎朝新しいクエストを再実行すべきであるにもかかわらず、前日の完了済みクエストがそのまま表示され続ける。

### 影響範囲

- **IH（Identity Health）計算の完全な誤動作**: ペナルティが正しく適用されない
- **毎日の説明責任サイクルの破綻**: 本アプリのコアバリューが機能しない
- **タイムゾーン不一致**: クエストのカウントが日付をまたいで誤る可能性

---

## 2. 根本原因分析

### H1（主要因）: `DailyManager.checkDateChange()` にクエストリセットSQLが存在しない

**ファイル:** `src/core/daily/DailyManager.ts` (行 76-116)

```typescript
// 現状の checkDateChange() — 問題のある部分
if (appState !== 'onboarding' && previousDate) {
  const questCount = await this.repository.getIncompleteQuestCount(previousDate);
  if (questCount.total > 0 && questCount.completed < questCount.total) {
    const engine = await IdentityEngine.getInstance();
    await engine.applyQuestPenalty({ ... });
    penaltyApplied = true;
  }
}

// ← ここでクエストリセットSQL (DELETE FROM quests) が完全に欠落している
await this.repository.updateDailyState(today);
```

**問題:** 日付変更を検知してペナルティを適用した後、`daily_state` テーブルのみ更新されるが、`quests` テーブルへの操作が一切行われない。

---

### H2: `morning.tsx` が DELETE なしに INSERT し、`useHomeData` に日付フィルターがない

**ファイル:** `app/morning.tsx` (行 42-47)

```typescript
// 現状 — 前日のクエストを削除せずに INSERT する
const saveMorningData = async () => {
  const db = getDB();
  if (quests.quest1) {
    await db.runAsync(
      'INSERT INTO quests (quest_text, is_completed, created_at) VALUES (?, 0, datetime(\'now\'))',
      [quests.quest1]
    );
  }
  if (quests.quest2) {
    await db.runAsync(
      'INSERT INTO quests (quest_text, is_completed, created_at) VALUES (?, 0, datetime(\'now\'))',
      [quests.quest2]
    );
  }
};
```

**問題:** 毎朝 INSERT するが、前日のクエストを削除しないため、古いクエストが蓄積される。

**ファイル:** `src/ui/screens/home/useHomeData.ts` (行 45)

```typescript
// 現状 — 全クエストを返す（日付フィルターなし）
const questsData = await db.getAllAsync<Quest>('SELECT * FROM quests');
```

**問題:** `WHERE DATE(created_at) = ?` の条件がなく、全日付のクエストが一括返却される。

---

### H3: `onDateChange` コールバックを登録しているコンポーネントがゼロ

**ファイル:** `app/_layout.tsx` (行 104)

```typescript
// 現状 — インスタンスを取得するだけでコールバック登録なし
dailyManager = await DailyManager.getInstance();
// dailyManager.onDateChange(/* 何も登録しない */);
```

**問題:** 日付変更イベントが発火しても、UIをリフレッシュするリスナーが存在しない。

---

### H4: タイムゾーン不一致

**`getTodayString()`** (`DailyManager.ts` 行 137-143): JSのローカル時刻を使用

```typescript
private getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();         // ローカル時刻
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

**`getIncompleteQuestCount()`** (`DailyStateRepository.ts` 行 29-41): SQLiteの `DATE()` はUTC解釈

```sql
-- datetime('now') は UTC で保存される
-- DATE(created_at) も UTC 日付を返す
-- 一方 getTodayString() はローカル日付 → 不一致の可能性
SELECT COUNT(*) as total, ...
FROM quests WHERE DATE(created_at) = ?
```

**問題:** JST（UTC+9）では、UTC的には前日の23:00-23:59に保存されたクエストが、ローカル日付では翌日扱いになり、カウントが0になる可能性がある。

---

## 3. 修正方針

### 設計原則

1. **DELETE戦略 (is_completed リセットではなく削除)**: `morning.tsx` は毎朝新しいクエストを INSERT するため、前日のクエストは DELETE して完全に消去する
2. **タイムゾーン統一**: `created_at` 保存と日付比較を両方ローカル時刻のISO文字列ベースに統一する
3. **コールバック活用**: 既存の `onDateChange` 仕組みを `_layout.tsx` で正しくワイヤリングする
4. **後方互換性維持**: `getIncompleteQuestCount` のSQLも合わせて修正し、ペナルティ計算の正確性を保つ

---

## 4. 修正詳細

### Fix 1: `DailyStateRepository` に `resetDailyQuests()` メソッドを追加

**ファイル:** `src/core/daily/DailyStateRepository.ts`

**変更前:**
```typescript
export class DailyStateRepository {
  constructor(private db: SQLiteDatabase) {}

  async initializeDailyState(today: string): Promise<void> { ... }
  async getDailyState(): Promise<DailyStateRow | null> { ... }
  async updateDailyState(today: string): Promise<void> { ... }
  async getIncompleteQuestCount(date: string): Promise<{ total: number; completed: number }> { ... }
}
```

**変更後:**
```typescript
export class DailyStateRepository {
  constructor(private db: SQLiteDatabase) {}

  async initializeDailyState(today: string): Promise<void> { ... }
  async getDailyState(): Promise<DailyStateRow | null> { ... }
  async updateDailyState(today: string): Promise<void> { ... }
  async getIncompleteQuestCount(date: string): Promise<{ total: number; completed: number }> { ... }

  /**
   * 前日以前のクエストを全て削除する。
   * morning.tsx が当日の新しいクエストを INSERT するため、
   * リセット（is_completed = 0 の更新）ではなく DELETE を使用する。
   * @param today - YYYY-MM-DD 形式の当日日付（ローカル時刻）
   */
  async resetDailyQuests(today: string): Promise<void> {
    await this.db.runAsync(
      `DELETE FROM quests WHERE DATE(created_at) != ?`,
      [today]
    );
  }
}
```

**補足:** `DATE(created_at) != today` により当日分を残し、前日以前を削除する。タイムゾーン問題を解消するため、Fix 4 で `created_at` の保存形式も変更する。

---

### Fix 2: `DailyManager.checkDateChange()` で `resetDailyQuests()` を呼び出す

**ファイル:** `src/core/daily/DailyManager.ts`

**変更前（行 76-97）:**
```typescript
// Date has changed
let penaltyApplied = false;

const appState = await getAppState();

if (appState !== 'onboarding' && previousDate) {
  const questCount = await this.repository.getIncompleteQuestCount(previousDate);

  if (questCount.total > 0 && questCount.completed < questCount.total) {
    const engine = await IdentityEngine.getInstance();
    await engine.applyQuestPenalty({
      completedCount: questCount.completed,
      totalCount: questCount.total,
    });
    penaltyApplied = true;
  }
}

// Update daily_state to today
await this.repository.updateDailyState(today);
```

**変更後:**
```typescript
// Date has changed
let penaltyApplied = false;

const appState = await getAppState();

if (appState !== 'onboarding' && previousDate) {
  const questCount = await this.repository.getIncompleteQuestCount(previousDate);

  if (questCount.total > 0 && questCount.completed < questCount.total) {
    const engine = await IdentityEngine.getInstance();
    await engine.applyQuestPenalty({
      completedCount: questCount.completed,
      totalCount: questCount.total,
    });
    penaltyApplied = true;
  }
}

// ペナルティ計算後、前日のクエストを削除してリセット
// morning.tsx が当日の新しいクエストを INSERT するため DELETE を使用
await this.repository.resetDailyQuests(today);

// Update daily_state to today
await this.repository.updateDailyState(today);
```

**重要:** `resetDailyQuests()` は `getIncompleteQuestCount()` の**後**、`updateDailyState()` の**前**に呼び出す。ペナルティ計算に前日データが必要なため、削除は計算完了後に行う。

---

### Fix 3: `useHomeData` に当日フィルターを追加

**ファイル:** `src/ui/screens/home/useHomeData.ts`

**変更前（行 45）:**
```typescript
const questsData = await db.getAllAsync<Quest>('SELECT * FROM quests');
```

**変更後:**
```typescript
// ローカル日付を YYYY-MM-DD 形式で取得する関数
const getTodayString = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ...

const today = getTodayString();
const questsData = await db.getAllAsync<Quest>(
  `SELECT * FROM quests WHERE DATE(created_at) = ? ORDER BY id ASC`,
  [today]
);
```

**補足:** `ORDER BY id ASC` を追加してクエストの表示順を固定する。Fix 4 でタイムゾーン問題を解消した後は `DATE(created_at)` が正しく機能する。

---

### Fix 4: タイムゾーン統一 — `created_at` をローカル時刻で保存

**問題:** `datetime('now')` (SQLite) と `new Date().toISOString()` (JavaScript) は両方UTCを返す。一方 `getTodayString()` はローカル時刻を返す。これにより深夜帯（JST 0:00-9:00）にクエストを作成すると、DATE(created_at)がUTC的には前日になり不一致が生じる。

**解決策:** `morning.tsx` でのクエストINSERT時に、ローカル日付のISO文字列を `created_at` として渡す。

**ファイル:** `app/morning.tsx`

**変更前（行 38-49）:**
```typescript
const saveMorningData = async () => {
  const db = getDB();

  if (quests.quest1) {
    await db.runAsync(
      'INSERT INTO quests (quest_text, is_completed, created_at) VALUES (?, 0, datetime(\'now\'))',
      [quests.quest1]
    );
  }
  if (quests.quest2) {
    await db.runAsync(
      'INSERT INTO quests (quest_text, is_completed, created_at) VALUES (?, 0, datetime(\'now\'))',
      [quests.quest2]
    );
  }
};
```

**変更後:**
```typescript
const saveMorningData = async () => {
  const db = getDB();

  // ローカル時刻のISO文字列を使用してタイムゾーン不一致を防ぐ
  // DATE() 関数でローカル日付として正しく抽出される
  const now = new Date();
  // SQLiteのDATE()がローカル日付として解釈できるよう、
  // タイムゾーンオフセットを含むISO文字列を生成する
  const localISOString = getLocalISOString(now);

  if (quests.quest1) {
    await db.runAsync(
      'INSERT INTO quests (quest_text, is_completed, created_at) VALUES (?, 0, ?)',
      [quests.quest1, localISOString]
    );
  }
  if (quests.quest2) {
    await db.runAsync(
      'INSERT INTO quests (quest_text, is_completed, created_at) VALUES (?, 0, ?)',
      [quests.quest2, localISOString]
    );
  }
};

/**
 * タイムゾーンオフセットを反映したISO文字列を返す。
 * SQLiteのDATE()はISO文字列の先頭10文字（YYYY-MM-DD）を使用するため、
 * ローカル日付が正しく抽出されるよう +09:00 等のオフセットを付与する。
 */
const getLocalISOString = (date: Date): string => {
  const tzOffset = -date.getTimezoneOffset(); // 分単位（JST = +540）
  const sign = tzOffset >= 0 ? '+' : '-';
  const absOffset = Math.abs(tzOffset);
  const hours = String(Math.floor(absOffset / 60)).padStart(2, '0');
  const minutes = String(absOffset % 60).padStart(2, '0');

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${h}:${m}:${s}${sign}${hours}:${minutes}`;
};
```

**補足:** SQLiteの `DATE()` 関数はISO文字列の先頭10文字 `YYYY-MM-DD` を取り出す。タイムゾーンオフセット付きの文字列（例: `2026-02-26T01:30:00+09:00`）を渡せば、`DATE()` は `2026-02-26` を正しく返す。

**代替案:** `getLocalISOString` ヘルパーを `src/utils/dateUtils.ts` として共通化し、`DailyManager.getTodayString()` と同じロジックを使い回す方法も検討できる。

---

### Fix 5: `_layout.tsx` で `onDateChange` コールバックをワイヤリング

**ファイル:** `app/_layout.tsx`

**変更前（行 100-104）:**
```typescript
databaseInit()
  .then(async () => {
    setDbReady(true);

    dailyManager = await DailyManager.getInstance();
    // コールバック未登録
```

**変更後:**
```typescript
databaseInit()
  .then(async () => {
    setDbReady(true);

    dailyManager = await DailyManager.getInstance();

    // 日付変更時にUIをリフレッシュするコールバックを登録
    // これにより、アプリ再開時に日付変更が検知されると
    // 各スクリーンが最新のクエストデータを取得できる
    dailyManager.onDateChange((event) => {
      console.log('[Layout] Date changed:', event.previousDate, '->', event.newDate);
      // React NavigationのrefreshによりuseHomeDataの再実行をトリガー
      // 注: expo-routerでは画面遷移でuseEffectが再実行されるため、
      // アプリ再開→画面フォーカス時に自然にリフレッシュされる
      // 追加のリフレッシュが必要な場合は EventEmitter パターンを検討する
    });
```

**追加考慮事項:** `useHomeData` の `useEffect` に `focus` イベントリスナーを追加することで、画面にフォーカスが戻るたびにデータを再取得できる。

**ファイル:** `src/ui/screens/home/useHomeData.ts` への追加変更:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';  // 追加
import { IdentityEngine } from '../../../core/identity/IdentityEngine';
import { getDB } from '../../../database/client';

export const useHomeData = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  // ...

  const loadData = useCallback(async () => {
    try {
      const db = getDB();
      const identityData = await db.getFirstAsync<any>('SELECT * FROM identity WHERE id = 1');
      if (!identityData || !identityData.identity_statement) {
        router.replace('/onboarding');
        return;
      }

      const today = getTodayString();
      const questsData = await db.getAllAsync<Quest>(
        `SELECT * FROM quests WHERE DATE(created_at) = ? ORDER BY id ASC`,
        [today]
      );

      setMission(identityData.one_year_mission || '');
      setAntiVision(identityData.anti_vision || '');
      setIdentity(identityData.identity_statement || '');
      setQuests(questsData || []);
      setIsLoading(false);
    } catch (error) {
      router.replace('/onboarding');
    }
  }, [router]);

  // 画面初回マウント時にデータ取得
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 画面にフォーカスが戻るたびにデータを再取得（日付変更後のリフレッシュ）
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // ...
};
```

---

### Fix 6: `DailyStateRepository.getIncompleteQuestCount()` のSQL修正

**ファイル:** `src/core/daily/DailyStateRepository.ts`

Fix 4でローカルISOString形式で保存するようになった場合、`DATE(created_at)` はローカル日付を正しく返すため、既存のSQLは機能する。ただし既存データ（UTC保存）との互換性を考慮し、明示的に対応する。

**現状（問題なし—Fix 4 適用後）:**
```typescript
async getIncompleteQuestCount(date: string): Promise<{ total: number; completed: number }> {
  const result = await this.db.getFirstAsync<{ total: number; completed: number }>(
    `SELECT
      COUNT(*) as total,
      SUM(CASE WHEN is_completed = 1 THEN 1 ELSE 0 END) as completed
    FROM quests WHERE DATE(created_at) = ?`,
    [date]
  );
  return {
    total: result?.total ?? 0,
    completed: result?.completed ?? 0,
  };
}
```

Fix 4適用後は `created_at` がローカルタイムゾーン付きで保存されるため、`DATE()` がローカル日付を正しく返す。このメソッドへの変更は不要。

---

## 5. 変更ファイル一覧

| ファイル | 変更種別 | 変更内容 |
|---------|---------|---------|
| `src/core/daily/DailyStateRepository.ts` | 機能追加 | `resetDailyQuests(today: string)` メソッド追加 |
| `src/core/daily/DailyManager.ts` | バグ修正 | `checkDateChange()` 内で `resetDailyQuests()` 呼び出し追加 |
| `src/ui/screens/home/useHomeData.ts` | バグ修正 | `getTodayString()` 追加、クエストクエリに日付フィルター追加、`useFocusEffect` でリフレッシュ追加 |
| `app/morning.tsx` | バグ修正 | `getLocalISOString()` ヘルパー追加、`created_at` をローカルISOString形式で保存 |
| `app/_layout.tsx` | 機能追加 | `dailyManager.onDateChange()` コールバック登録 |
| `src/core/daily/DailyStateRepository.test.ts` | テスト追加 | `resetDailyQuests()` のテスト追加 |
| `src/core/daily/DailyManager.test.ts` | テスト追加 | 日付変更時に `resetDailyQuests()` が呼ばれるテスト追加 |
| `src/ui/screens/home/useHomeData.test.ts` | テスト追加 | 日付フィルタークエリのテスト追加 |

---

## 6. テスト追加計画

### 6-1. `DailyStateRepository.test.ts` への追加

```typescript
describe('resetDailyQuests', () => {
  it('should DELETE quests with DATE(created_at) != today', async () => {
    await repository.resetDailyQuests('2024-01-15');

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('DELETE FROM quests WHERE DATE(created_at) != ?'),
      ['2024-01-15']
    );
  });

  it('should call runAsync exactly once', async () => {
    await repository.resetDailyQuests('2024-01-15');
    expect(mockDb.runAsync).toHaveBeenCalledTimes(1);
  });

  it('should pass correct date parameter', async () => {
    await repository.resetDailyQuests('2024-02-29');

    expect(mockDb.runAsync).toHaveBeenCalledWith(
      expect.any(String),
      ['2024-02-29']
    );
  });
});
```

### 6-2. `DailyManager.test.ts` への追加

まず `mockRepository` に `resetDailyQuests` を追加:

```typescript
// beforeEach の mockRepository 定義を更新
mockRepository = {
  initializeDailyState: jest.fn().mockResolvedValue(undefined),
  getDailyState: jest.fn().mockResolvedValue(null),
  updateDailyState: jest.fn().mockResolvedValue(undefined),
  getIncompleteQuestCount: jest.fn().mockResolvedValue({ total: 0, completed: 0 }),
  resetDailyQuests: jest.fn().mockResolvedValue(undefined),  // 追加
};
```

テストケースを追加:

```typescript
describe('quest reset on date change', () => {
  it('should call resetDailyQuests when date changes', async () => {
    mockRepository.getDailyState.mockResolvedValue({
      id: 1, current_date: '2024-01-14', last_reset_at: '2024-01-14T08:00:00',
    });
    mockRepository.getIncompleteQuestCount.mockResolvedValue({ total: 0, completed: 0 });

    const manager = await DailyManager.getInstance();

    expect(mockRepository.resetDailyQuests).toHaveBeenCalledWith('2024-01-15');
  });

  it('should NOT call resetDailyQuests when same day', async () => {
    mockRepository.getDailyState.mockResolvedValue({
      id: 1, current_date: '2024-01-15', last_reset_at: '2024-01-15T08:00:00',
    });

    mockRepository.resetDailyQuests.mockClear();
    const manager = await DailyManager.getInstance();

    // checkDateChange is called during initialization but should NOT reset
    await manager.checkDateChange();

    expect(mockRepository.resetDailyQuests).not.toHaveBeenCalled();
  });

  it('should call resetDailyQuests AFTER getIncompleteQuestCount (penalty first)', async () => {
    const callOrder: string[] = [];

    mockRepository.getDailyState.mockResolvedValue({
      id: 1, current_date: '2024-01-14', last_reset_at: '2024-01-14T08:00:00',
    });
    mockRepository.getIncompleteQuestCount.mockImplementation(async () => {
      callOrder.push('getIncompleteQuestCount');
      return { total: 2, completed: 0 };
    });
    mockRepository.resetDailyQuests.mockImplementation(async () => {
      callOrder.push('resetDailyQuests');
    });
    mockRepository.updateDailyState.mockImplementation(async () => {
      callOrder.push('updateDailyState');
    });

    await DailyManager.getInstance();

    expect(callOrder).toEqual([
      'getIncompleteQuestCount',
      'resetDailyQuests',
      'updateDailyState',
    ]);
  });

  it('should call resetDailyQuests even during onboarding (quests should still clear)', async () => {
    getAppState.mockResolvedValue('onboarding');
    mockRepository.getDailyState.mockResolvedValue({
      id: 1, current_date: '2024-01-14', last_reset_at: '2024-01-14T08:00:00',
    });

    await DailyManager.getInstance();

    // onboarding中でもリセットは実行する（ペナルティなし + リセットあり）
    expect(mockRepository.resetDailyQuests).toHaveBeenCalledWith('2024-01-15');
  });

  it('should still update daily_state even if resetDailyQuests fails', async () => {
    mockRepository.getDailyState.mockResolvedValue({
      id: 1, current_date: '2024-01-14', last_reset_at: '2024-01-14T08:00:00',
    });
    mockRepository.getIncompleteQuestCount.mockResolvedValue({ total: 0, completed: 0 });
    mockRepository.resetDailyQuests.mockRejectedValue(new Error('DB error'));

    const manager = await DailyManager.getInstance();

    // エラーが起きてもupdateDailyStateは呼ばれるべきか？
    // 現在の実装ではtry/catchで全体をラップしているため、
    // resetDailyQuestsのエラーはcheckDateChangeのエラーとして処理される
    // これは許容範囲内とする（エラー時は次のアプリ起動で再試行）
  });
});
```

### 6-3. `useHomeData.test.ts` への追加

```typescript
it('should query quests with today date filter', async () => {
  // useHomeDataが日付フィルター付きのSQLを発行することを確認
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const todayString = `${year}-${month}-${day}`;

  mockDb.getAllAsync.mockResolvedValue([]);
  // ...（useHomeDataのrenderを実行）

  expect(mockDb.getAllAsync).toHaveBeenCalledWith(
    expect.stringContaining('WHERE DATE(created_at) = ?'),
    [todayString]
  );
});

it('should NOT return quests from previous days', async () => {
  const yesterday = '2024-01-14';
  const yesterdayQuest = {
    id: 1, quest_text: 'Old quest', is_completed: 1,
    created_at: `${yesterday}T10:00:00+09:00`, completed_at: null
  };

  mockDb.getAllAsync.mockResolvedValue([]); // 日付フィルター後は空
  // ...

  // 今日のクエストのみ（空配列）が返ることを確認
  expect(quests).toHaveLength(0);
});
```

---

## 7. 実装順序

```
Step 1: DailyStateRepository.ts — resetDailyQuests() 追加
        ↓
Step 2: DailyManager.ts — checkDateChange() に resetDailyQuests() 呼び出し追加
        ↓
Step 3: morning.tsx — getLocalISOString() ヘルパー追加 + INSERT修正
        ↓
Step 4: useHomeData.ts — getTodayString() 追加 + 日付フィルター + useFocusEffect
        ↓
Step 5: _layout.tsx — onDateChange コールバック登録
        ↓
Step 6: テスト追加・既存テスト修正（mockRepository に resetDailyQuests 追加）
        ↓
Step 7: npm test で全テスト通過確認
```

---

## 8. エッジケースと考慮事項

### 8-1. 既存データ（UTC保存クエスト）との後方互換性

既存ユーザーのDBには `datetime('now')` (UTC) で保存されたクエストが存在する可能性がある。

**対応:**
- Fix 1 の `resetDailyQuests()` は `DATE(created_at) != today` で削除するため、日付不一致のデータは全て削除される
- これはバグ修正として意図的な動作であり、古いUTCデータは不正確なため削除が正しい

### 8-2. オンボーディング中の日付変更

オンボーディング中に日付変更が起きた場合:
- **ペナルティ**: スキップ（既存ロジックに変更なし）
- **クエストリセット**: 実行する（オンボーディング完了前にクエストが存在するケースは稀だが、クリーンな状態を保つために削除する）

実装では `resetDailyQuests()` の呼び出しを `if (appState !== 'onboarding' && previousDate)` ブロックの**外**に配置する。

### 8-3. `resetDailyQuests` 失敗時のロールバック

現在の `checkDateChange()` は単一の try/catch で全処理をラップしている。`resetDailyQuests()` が失敗した場合、`updateDailyState()` も実行されず、次のアプリ起動時に再度実行される。これはアクセプタブルな挙動とする。

より堅牢な実装が必要な場合は、以下のように個別 try/catch を追加できる:

```typescript
// resetDailyQuests のみ個別エラーハンドリング（将来の改善案）
try {
  await this.repository.resetDailyQuests(today);
} catch (resetError) {
  console.error('DailyManager: resetDailyQuests failed:', resetError);
  // ログのみ記録し、処理継続（updateDailyStateは実行する）
}
await this.repository.updateDailyState(today);
```

### 8-4. `useFocusEffect` の依存関係

`useFocusEffect` で `loadData` を呼び出す際、`loadData` が `useCallback` で適切にメモ化されていることを確認する。`router` の参照が変わらない限り、不要な再レンダリングは発生しない。

### 8-5. IH回復ロジックとの整合性

`useHomeData.ts` の `toggleQuest` では、`wasAlreadyCompletedBefore` のチェック（`quest.completed_at !== null`）でIH回復の重複適用を防いでいる。Fix 3でクエストを日次リセット（DELETE）するため、前日の `completed_at` 付きクエストは存在しなくなる。これにより毎日正しく1回だけIH回復が適用される。

---

## 9. 確認すべき関連ファイル

実装前に以下のファイルも確認し、修正が必要か検討すること:

| ファイル | 確認内容 |
|---------|---------|
| `src/core/daily/index.ts` | `DailyStateRepository` の export 確認 |
| `src/ui/screens/home/index.ts` | `useHomeData` の export 確認 |
| `app/evening.tsx` | クエスト完了処理がある場合、同様の日付フィルターが必要か確認 |
| `app/judgment.tsx` | クエスト参照がある場合の確認 |

---

## 10. レビューチェックリスト

### 実装完了後の確認項目

- [ ] `DailyStateRepository.resetDailyQuests()` が追加された
- [ ] `DailyManager.checkDateChange()` が `getIncompleteQuestCount()` 後に `resetDailyQuests()` を呼ぶ
- [ ] `morning.tsx` がローカルタイムゾーン付き `created_at` で INSERT する
- [ ] `useHomeData.ts` が `DATE(created_at) = today` フィルターを使用する
- [ ] `useHomeData.ts` が `useFocusEffect` でデータ再取得する
- [ ] `_layout.tsx` が `onDateChange` コールバックを登録する
- [ ] 既存テスト（`DailyManager.test.ts`）の `mockRepository` に `resetDailyQuests` が追加されている
- [ ] 新規テスト: 日付変更時に `resetDailyQuests` が呼ばれる
- [ ] 新規テスト: 同日の場合は `resetDailyQuests` が呼ばれない
- [ ] 新規テスト: ペナルティ計算後にリセットが実行される順序の確認
- [ ] `npm test` で全テストがパスする
- [ ] 手動テスト: 日付を変えてアプリを起動し、前日クエストが消えることを確認

---

## 11. ロールバック計画

修正後に予期しない問題が発生した場合:

1. `DailyManager.ts` の `resetDailyQuests()` 呼び出しをコメントアウト（最小限のロールバック）
2. `useHomeData.ts` の日付フィルターを削除して `SELECT * FROM quests` に戻す
3. `morning.tsx` の `created_at` 保存を `datetime('now')` に戻す

完全なロールバックはgit revertで対応可能。修正は既存機能を削除しておらず、新機能追加と既存ロジック修正のみのため、ロールバックリスクは低い。
