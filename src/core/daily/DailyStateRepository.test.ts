import { DailyStateRepository } from './DailyStateRepository';

// Mock DB with async methods
const createMockDb = () => ({
  runAsync: jest.fn().mockResolvedValue(undefined),
  getFirstAsync: jest.fn().mockResolvedValue(null),
  getAllAsync: jest.fn().mockResolvedValue([]),
});

describe('DailyStateRepository', () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let repository: DailyStateRepository;

  beforeEach(() => {
    mockDb = createMockDb();
    repository = new DailyStateRepository(mockDb as any);
  });

  describe('initializeDailyState', () => {
    it('should execute INSERT OR IGNORE with correct SQL', async () => {
      await repository.initializeDailyState('2024-01-15');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR IGNORE INTO daily_state'),
        ['2024-01-15']
      );
    });

    it('should not modify existing data (INSERT OR IGNORE)', async () => {
      // Calling twice should both succeed without error
      await repository.initializeDailyState('2024-01-15');
      await repository.initializeDailyState('2024-01-16');

      expect(mockDb.runAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe('getDailyState', () => {
    it('should return DailyStateRow when data exists', async () => {
      const mockRow = {
        id: 1,
        current_date: '2024-01-15',
        last_reset_at: '2024-01-15T08:00:00.000Z',
      };
      mockDb.getFirstAsync.mockResolvedValue(mockRow);

      const result = await repository.getDailyState();

      expect(result).toEqual(mockRow);
      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM daily_state WHERE id = 1')
      );
    });

    it('should return null when no data exists', async () => {
      mockDb.getFirstAsync.mockResolvedValue(null);

      const result = await repository.getDailyState();

      expect(result).toBeNull();
    });
  });

  describe('updateDailyState', () => {
    it('should update current_date and last_reset_at', async () => {
      await repository.updateDailyState('2024-01-16');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE daily_state SET current_date'),
        ['2024-01-16']
      );
    });
  });

  describe('resetDailyQuests', () => {
    it('should DELETE quests where DATE(created_at) != today', async () => {
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

    it('should pass the correct date parameter', async () => {
      await repository.resetDailyQuests('2024-02-29');

      expect(mockDb.runAsync).toHaveBeenCalledWith(
        expect.any(String),
        ['2024-02-29']
      );
    });
  });

  describe('getIncompleteQuestCount', () => {
    it('should return { total: 0, completed: 0 } when no quests exist', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ total: 0, completed: 0 });

      const result = await repository.getIncompleteQuestCount('2024-01-15');

      expect(result).toEqual({ total: 0, completed: 0 });
    });

    it('should return correct counts when all quests are completed', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ total: 3, completed: 3 });

      const result = await repository.getIncompleteQuestCount('2024-01-15');

      expect(result).toEqual({ total: 3, completed: 3 });
    });

    it('should return correct counts when some quests are incomplete', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ total: 3, completed: 1 });

      const result = await repository.getIncompleteQuestCount('2024-01-15');

      expect(result).toEqual({ total: 3, completed: 1 });
    });

    it('should return correct counts when all quests are incomplete', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ total: 3, completed: 0 });

      const result = await repository.getIncompleteQuestCount('2024-01-15');

      expect(result).toEqual({ total: 3, completed: 0 });
    });

    it('should handle null completed value (SUM returns null for no rows)', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ total: 0, completed: null });

      const result = await repository.getIncompleteQuestCount('2024-01-15');

      expect(result).toEqual({ total: 0, completed: 0 });
    });

    it('should query with correct date parameter', async () => {
      mockDb.getFirstAsync.mockResolvedValue({ total: 0, completed: 0 });

      await repository.getIncompleteQuestCount('2024-01-15');

      expect(mockDb.getFirstAsync).toHaveBeenCalledWith(
        expect.stringContaining('WHERE DATE(created_at) = ?'),
        ['2024-01-15']
      );
    });
  });
});
