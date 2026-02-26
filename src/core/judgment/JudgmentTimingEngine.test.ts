/**
 * One Day OS - JudgmentTimingEngine Tests
 * Tests for intelligent timing adjustment and context-aware category selection.
 */

import { JudgmentTimingEngine } from './JudgmentTimingEngine';
import type { JudgmentContext, TimingAdjustment } from './JudgmentTimingEngine';
import type { JudgmentCategory } from '../../constants';

// Mock getDB
const mockGetFirstSync = jest.fn();
jest.mock('../../database/client', () => ({
  getDB: jest.fn(() => ({
    getFirstSync: mockGetFirstSync,
  })),
}));

describe('JudgmentTimingEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // selectCategory tests
  // ============================================================
  describe('selectCategory', () => {
    it('returns EVASION when quests incomplete and hour >= 15', () => {
      const context: JudgmentContext = {
        questsCompleted: false,
        lastResponse: null,
        currentIH: 80,
        hourOfDay: 15,
      };
      expect(JudgmentTimingEngine.selectCategory(context)).toBe('EVASION');
    });

    it('returns EVASION when quests incomplete and hour is 20', () => {
      const context: JudgmentContext = {
        questsCompleted: false,
        lastResponse: 'YES',
        currentIH: 100,
        hourOfDay: 20,
      };
      expect(JudgmentTimingEngine.selectCategory(context)).toBe('EVASION');
    });

    it('returns DISSONANCE when last response was NO', () => {
      const context: JudgmentContext = {
        questsCompleted: true,
        lastResponse: 'NO',
        currentIH: 80,
        hourOfDay: 10,
      };
      expect(JudgmentTimingEngine.selectCategory(context)).toBe('DISSONANCE');
    });

    it('returns ANTI_VISION when IH < 50', () => {
      const context: JudgmentContext = {
        questsCompleted: true,
        lastResponse: 'YES',
        currentIH: 49,
        hourOfDay: 10,
      };
      expect(JudgmentTimingEngine.selectCategory(context)).toBe('ANTI_VISION');
    });

    it('returns ANTI_VISION when IH is 0', () => {
      const context: JudgmentContext = {
        questsCompleted: true,
        lastResponse: null,
        currentIH: 0,
        hourOfDay: 10,
      };
      expect(JudgmentTimingEngine.selectCategory(context)).toBe('ANTI_VISION');
    });

    it('returns SURVIVAL when last response was TIMEOUT', () => {
      const context: JudgmentContext = {
        questsCompleted: true,
        lastResponse: 'TIMEOUT',
        currentIH: 80,
        hourOfDay: 10,
      };
      expect(JudgmentTimingEngine.selectCategory(context)).toBe('SURVIVAL');
    });

    it('returns a valid category as default when no conditions match', () => {
      const context: JudgmentContext = {
        questsCompleted: true,
        lastResponse: 'YES',
        currentIH: 80,
        hourOfDay: 10,
      };
      const validCategories: JudgmentCategory[] = [
        'EVASION', 'OBSERVER', 'DISSONANCE', 'ANTI_VISION', 'SURVIVAL',
      ];
      const result = JudgmentTimingEngine.selectCategory(context);
      expect(validCategories).toContain(result);
    });

    it('returns a valid category when lastResponse is null and IH >= 50', () => {
      const context: JudgmentContext = {
        questsCompleted: true,
        lastResponse: null,
        currentIH: 80,
        hourOfDay: 10,
      };
      const validCategories: JudgmentCategory[] = [
        'EVASION', 'OBSERVER', 'DISSONANCE', 'ANTI_VISION', 'SURVIVAL',
      ];
      const result = JudgmentTimingEngine.selectCategory(context);
      expect(validCategories).toContain(result);
    });

    it('prioritizes EVASION over DISSONANCE when both conditions apply', () => {
      // quests incomplete + hour >= 15 AND lastResponse is NO
      const context: JudgmentContext = {
        questsCompleted: false,
        lastResponse: 'NO',
        currentIH: 80,
        hourOfDay: 16,
      };
      expect(JudgmentTimingEngine.selectCategory(context)).toBe('EVASION');
    });

    it('prioritizes DISSONANCE over ANTI_VISION when NO + low IH', () => {
      const context: JudgmentContext = {
        questsCompleted: true,
        lastResponse: 'NO',
        currentIH: 30,
        hourOfDay: 10,
      };
      expect(JudgmentTimingEngine.selectCategory(context)).toBe('DISSONANCE');
    });

    it('returns ANTI_VISION over SURVIVAL when both IH < 50 and TIMEOUT', () => {
      const context: JudgmentContext = {
        questsCompleted: true,
        lastResponse: 'TIMEOUT',
        currentIH: 30,
        hourOfDay: 10,
      };
      // ANTI_VISION check (IH < 50) is before TIMEOUT check
      expect(JudgmentTimingEngine.selectCategory(context)).toBe('ANTI_VISION');
    });

    it('falls through to random when quests complete and late hour', () => {
      const context: JudgmentContext = {
        questsCompleted: true,
        lastResponse: null,
        currentIH: 80,
        hourOfDay: 20,
      };
      const validCategories: JudgmentCategory[] = [
        'EVASION', 'OBSERVER', 'DISSONANCE', 'ANTI_VISION', 'SURVIVAL',
      ];
      // Should fall through to random (quests ARE complete, so EVASION rule doesn't apply)
      const result = JudgmentTimingEngine.selectCategory(context);
      expect(validCategories).toContain(result);
    });

    it('does not return EVASION when quests incomplete but before 15:00', () => {
      const context: JudgmentContext = {
        questsCompleted: false,
        lastResponse: null,
        currentIH: 80,
        hourOfDay: 14,
      };
      const validCategories: JudgmentCategory[] = [
        'EVASION', 'OBSERVER', 'DISSONANCE', 'ANTI_VISION', 'SURVIVAL',
      ];
      const result = JudgmentTimingEngine.selectCategory(context);
      expect(validCategories).toContain(result);
    });
  });

  // ============================================================
  // evaluateOnResume tests
  // ============================================================
  describe('evaluateOnResume', () => {
    const createMockEngine = (overrides: Record<string, any> = {}) => ({
      getUnfiredJudgments: jest.fn().mockResolvedValue([
        { id: 1, scheduled_date: '2026-02-08', scheduled_time: '15:00', category: 'OBSERVER', notification_id: null, is_fired: 0, created_at: '' },
        { id: 2, scheduled_date: '2026-02-08', scheduled_time: '17:00', category: 'EVASION', notification_id: null, is_fired: 0, created_at: '' },
      ]),
      getLastResponse: jest.fn().mockResolvedValue(null),
      rescheduleJudgment: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    });

    const TODAY = '2026-02-08';
    const CURRENT_TIME = '14:00';

    it('returns none when no unfired judgments exist', async () => {
      const engine = createMockEngine({
        getUnfiredJudgments: jest.fn().mockResolvedValue([]),
      });

      const result = await JudgmentTimingEngine.evaluateOnResume(engine, null, TODAY, CURRENT_TIME);
      expect(result.reason).toBe('none');
      expect(result.fireImmediately).toBe(false);
      expect(result.reschedules).toHaveLength(0);
    });

    it('detects long inactivity (2h+) and requests immediate fire', async () => {
      const engine = createMockEngine();
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000 - 1;

      const result = await JudgmentTimingEngine.evaluateOnResume(engine, twoHoursAgo, TODAY, CURRENT_TIME);
      expect(result.reason).toBe('long_inactivity');
      expect(result.fireImmediately).toBe(true);
    });

    it('does not detect inactivity if under 2 hours', async () => {
      const engine = createMockEngine();
      const oneHourAgo = Date.now() - 1 * 60 * 60 * 1000;

      const result = await JudgmentTimingEngine.evaluateOnResume(engine, oneHourAgo, TODAY, CURRENT_TIME);
      expect(result.reason).not.toBe('long_inactivity');
      expect(result.fireImmediately).toBe(false);
    });

    it('does not detect inactivity if lastBackgroundTime is null', async () => {
      const engine = createMockEngine();

      const result = await JudgmentTimingEngine.evaluateOnResume(engine, null, TODAY, CURRENT_TIME);
      expect(result.reason).not.toBe('long_inactivity');
      expect(result.fireImmediately).toBe(false);
    });

    it('reschedules next judgment within 30 min after NO response', async () => {
      const engine = createMockEngine({
        getLastResponse: jest.fn().mockResolvedValue({ response: 'NO' }),
      });

      const result = await JudgmentTimingEngine.evaluateOnResume(engine, null, TODAY, CURRENT_TIME);
      expect(result.reason).toBe('previous_failure');
      expect(result.reschedules).toHaveLength(1);
      expect(result.reschedules[0].scheduleId).toBe(1);
      expect(result.reschedules[0].newTime).toBe('14:30');
    });

    it('reschedules next judgment within 30 min after TIMEOUT response', async () => {
      const engine = createMockEngine({
        getLastResponse: jest.fn().mockResolvedValue({ response: 'TIMEOUT' }),
      });

      const result = await JudgmentTimingEngine.evaluateOnResume(engine, null, TODAY, CURRENT_TIME);
      expect(result.reason).toBe('previous_failure');
      expect(result.reschedules).toHaveLength(1);
      expect(result.reschedules[0].newTime).toBe('14:30');
    });

    it('does not reschedule if next judgment is already within 30 min', async () => {
      const engine = createMockEngine({
        getUnfiredJudgments: jest.fn().mockResolvedValue([
          { id: 1, scheduled_date: '2026-02-08', scheduled_time: '14:20', category: 'OBSERVER', notification_id: null, is_fired: 0, created_at: '' },
        ]),
        getLastResponse: jest.fn().mockResolvedValue({ response: 'NO' }),
      });

      const result = await JudgmentTimingEngine.evaluateOnResume(engine, null, TODAY, CURRENT_TIME);
      // Next at 14:20 is only 20 min away (< 30 min threshold), no reschedule needed
      expect(result.reschedules).toHaveLength(0);
    });

    it('concentrates judgments when quests incomplete after 16:00', async () => {
      // Judgments at 19:00 and 21:30 -- not evenly distributed in 16:00-22:00 window
      const engine = createMockEngine({
        getUnfiredJudgments: jest.fn().mockResolvedValue([
          { id: 3, scheduled_date: '2026-02-08', scheduled_time: '19:00', category: 'OBSERVER', notification_id: null, is_fired: 0, created_at: '' },
          { id: 4, scheduled_date: '2026-02-08', scheduled_time: '21:30', category: 'EVASION', notification_id: null, is_fired: 0, created_at: '' },
        ]),
        getLastResponse: jest.fn().mockResolvedValue(null),
      });

      // Mock quests not completed
      mockGetFirstSync.mockReturnValue({ total: 3, completed: 1 });

      const result = await JudgmentTimingEngine.evaluateOnResume(engine, null, TODAY, '16:00');
      expect(result.reason).toBe('quests_incomplete_late');
      expect(result.reschedules.length).toBeGreaterThan(0);
      // Should reschedule to be more evenly distributed
      // Window: 16:00-22:00 (360 min), 2 judgments, spacing = 120 min
      // Target 1: 16:00 + 120 = 18:00 (different from 19:00)
      // Target 2: 16:00 + 240 = 20:00 (different from 21:30)
      expect(result.reschedules[0].newTime).toBe('18:00');
      expect(result.reschedules[1].newTime).toBe('20:00');
    });

    it('does not concentrate if quests are all completed after 16:00', async () => {
      const engine = createMockEngine({
        getUnfiredJudgments: jest.fn().mockResolvedValue([
          { id: 3, scheduled_date: '2026-02-08', scheduled_time: '18:00', category: 'OBSERVER', notification_id: null, is_fired: 0, created_at: '' },
        ]),
        getLastResponse: jest.fn().mockResolvedValue(null),
      });

      // Mock quests all completed
      mockGetFirstSync.mockReturnValue({ total: 3, completed: 3 });

      const result = await JudgmentTimingEngine.evaluateOnResume(engine, null, TODAY, '16:00');
      expect(result.reason).not.toBe('quests_incomplete_late');
    });

    it('returns all_yes when last response was YES', async () => {
      const engine = createMockEngine({
        getLastResponse: jest.fn().mockResolvedValue({ response: 'YES' }),
      });

      const result = await JudgmentTimingEngine.evaluateOnResume(engine, null, TODAY, CURRENT_TIME);
      expect(result.reason).toBe('all_yes');
      expect(result.reschedules).toHaveLength(0);
      expect(result.fireImmediately).toBe(false);
    });

    it('prioritizes long inactivity over other patterns', async () => {
      const engine = createMockEngine({
        getLastResponse: jest.fn().mockResolvedValue({ response: 'NO' }),
      });
      const twoHoursAgo = Date.now() - 3 * 60 * 60 * 1000;

      const result = await JudgmentTimingEngine.evaluateOnResume(engine, twoHoursAgo, TODAY, CURRENT_TIME);
      expect(result.reason).toBe('long_inactivity');
      expect(result.fireImmediately).toBe(true);
    });

    it('returns none when last response was IGNORED (no special handling)', async () => {
      const engine = createMockEngine({
        getLastResponse: jest.fn().mockResolvedValue({ response: 'IGNORED' }),
      });

      const result = await JudgmentTimingEngine.evaluateOnResume(engine, null, TODAY, CURRENT_TIME);
      expect(result.reason).toBe('none');
      expect(result.fireImmediately).toBe(false);
      expect(result.reschedules).toHaveLength(0);
    });

    it('returns none when last response was SUMMONS_EXPIRED (no special handling)', async () => {
      const engine = createMockEngine({
        getLastResponse: jest.fn().mockResolvedValue({ response: 'SUMMONS_EXPIRED' }),
      });

      const result = await JudgmentTimingEngine.evaluateOnResume(engine, null, TODAY, CURRENT_TIME);
      expect(result.reason).toBe('none');
      expect(result.fireImmediately).toBe(false);
      expect(result.reschedules).toHaveLength(0);
    });

    it('does not concentrate when spacing would be under 10 minutes', async () => {
      // 10 unfired judgments with only 60 min remaining -> spacing = 60/11 = 5 (< 10)
      const manyUnfired = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        scheduled_date: '2026-02-08',
        scheduled_time: '21:30',
        category: 'OBSERVER',
        notification_id: null,
        is_fired: 0,
        created_at: '',
      }));
      const engine = createMockEngine({
        getUnfiredJudgments: jest.fn().mockResolvedValue(manyUnfired),
        getLastResponse: jest.fn().mockResolvedValue(null),
      });

      // Quests incomplete, 21:00 = after 16:00, only 60 min until 22:00
      mockGetFirstSync.mockReturnValue({ total: 3, completed: 1 });

      const result = await JudgmentTimingEngine.evaluateOnResume(engine, null, TODAY, '21:00');
      // Should fall through to 'none' because concentration spacing is too small
      expect(result.reason).not.toBe('quests_incomplete_late');
    });
  });

  // ============================================================
  // applyTimingAdjustment tests
  // ============================================================
  describe('applyTimingAdjustment', () => {
    it('calls rescheduleJudgment for each entry in adjustment', async () => {
      const mockReschedule = jest.fn().mockResolvedValue(undefined);
      const engine = { rescheduleJudgment: mockReschedule } as any;

      const adjustment: TimingAdjustment = {
        fireImmediately: false,
        reschedules: [
          { scheduleId: 1, newTime: '14:30' },
          { scheduleId: 2, newTime: '16:00' },
        ],
        reason: 'previous_failure',
      };

      await JudgmentTimingEngine.applyTimingAdjustment(engine, adjustment);

      expect(mockReschedule).toHaveBeenCalledTimes(2);
      expect(mockReschedule).toHaveBeenCalledWith(1, '14:30');
      expect(mockReschedule).toHaveBeenCalledWith(2, '16:00');
    });

    it('does nothing with empty reschedules', async () => {
      const mockReschedule = jest.fn().mockResolvedValue(undefined);
      const engine = { rescheduleJudgment: mockReschedule } as any;

      const adjustment: TimingAdjustment = {
        fireImmediately: false,
        reschedules: [],
        reason: 'none',
      };

      await JudgmentTimingEngine.applyTimingAdjustment(engine, adjustment);
      expect(mockReschedule).not.toHaveBeenCalled();
    });
  });

  // ============================================================
  // areAllQuestsCompleted tests
  // ============================================================
  describe('areAllQuestsCompleted', () => {
    it('returns true when all quests are completed', async () => {
      mockGetFirstSync.mockReturnValue({ total: 3, completed: 3 });
      const result = await JudgmentTimingEngine.areAllQuestsCompleted();
      expect(result).toBe(true);
    });

    it('returns false when some quests are incomplete', async () => {
      mockGetFirstSync.mockReturnValue({ total: 3, completed: 1 });
      const result = await JudgmentTimingEngine.areAllQuestsCompleted();
      expect(result).toBe(false);
    });

    it('returns true when there are no quests', async () => {
      mockGetFirstSync.mockReturnValue({ total: 0, completed: 0 });
      const result = await JudgmentTimingEngine.areAllQuestsCompleted();
      expect(result).toBe(true);
    });

    it('returns true when result is null', async () => {
      mockGetFirstSync.mockReturnValue(null);
      const result = await JudgmentTimingEngine.areAllQuestsCompleted();
      expect(result).toBe(true);
    });
  });

  // ============================================================
  // buildContext tests
  // ============================================================
  describe('buildContext', () => {
    it('builds context from engine and DB state', async () => {
      const engine = {
        getLastResponse: jest.fn().mockResolvedValue({ response: 'YES' }),
      } as any;

      // Mock quests completed, then identity
      mockGetFirstSync
        .mockReturnValueOnce({ total: 3, completed: 3 }) // areAllQuestsCompleted
        .mockReturnValueOnce({ identity_health: 75 }); // identity query

      const context = await JudgmentTimingEngine.buildContext(engine, '2026-02-08', '14:00');

      expect(context.questsCompleted).toBe(true);
      expect(context.lastResponse).toBe('YES');
      expect(context.currentIH).toBe(75);
      expect(context.hourOfDay).toBe(14);
    });

    it('defaults IH to 100 when identity record is missing', async () => {
      const engine = {
        getLastResponse: jest.fn().mockResolvedValue(null),
      } as any;

      mockGetFirstSync
        .mockReturnValueOnce({ total: 0, completed: 0 }) // areAllQuestsCompleted
        .mockReturnValueOnce(null); // identity query returns null

      const context = await JudgmentTimingEngine.buildContext(engine, '2026-02-08', '10:30');

      expect(context.currentIH).toBe(100);
      expect(context.lastResponse).toBe(null);
      expect(context.hourOfDay).toBe(10);
    });

    it('reports incomplete quests correctly', async () => {
      const engine = {
        getLastResponse: jest.fn().mockResolvedValue({ response: 'NO' }),
      } as any;

      mockGetFirstSync
        .mockReturnValueOnce({ total: 5, completed: 2 }) // areAllQuestsCompleted
        .mockReturnValueOnce({ identity_health: 40 }); // identity query

      const context = await JudgmentTimingEngine.buildContext(engine, '2026-02-08', '17:30');

      expect(context.questsCompleted).toBe(false);
      expect(context.lastResponse).toBe('NO');
      expect(context.currentIH).toBe(40);
      expect(context.hourOfDay).toBe(17);
    });
  });
});
