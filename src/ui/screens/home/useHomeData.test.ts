/**
 * useHomeData Hook Tests
 *
 * Tests for the home data loading hook that fetches identity
 * and quest data from the database, redirects to onboarding
 * when no identity exists, and provides quest toggle functionality.
 */
import { renderHook, act, waitFor } from '@testing-library/react-native';

// --- Mocks ---

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
    back: jest.fn(),
  }),
  useFocusEffect: (cb: () => void) => { cb(); },
}));

const mockGetFirstAsync = jest.fn();
const mockGetAllAsync = jest.fn();
const mockRunAsync = jest.fn();

jest.mock('../../../database/client', () => ({
  getDB: () => ({
    getFirstAsync: mockGetFirstAsync,
    getAllAsync: mockGetAllAsync,
    runAsync: mockRunAsync,
  }),
}));

const mockRestoreHealth = jest.fn();
const mockGetInstance = jest.fn(() => Promise.resolve({
  restoreHealth: mockRestoreHealth,
}));

jest.mock('../../../core/identity/IdentityEngine', () => ({
  IdentityEngine: {
    get getInstance() {
      return mockGetInstance;
    },
  },
}));

import { useHomeData } from './useHomeData';

describe('useHomeData', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockPush.mockReset();
    mockGetFirstAsync.mockReset();
    mockGetAllAsync.mockReset();
    mockRunAsync.mockReset();
    mockRestoreHealth.mockReset();
    mockGetInstance.mockClear();
    mockRestoreHealth.mockResolvedValue(undefined);
    mockRunAsync.mockResolvedValue({ changes: 1 });
  });

  describe('data loading', () => {
    it('should start with isLoading true', () => {
      mockGetFirstAsync.mockResolvedValue(null);
      const { result } = renderHook(() => useHomeData());
      expect(result.current.isLoading).toBe(true);
    });

    it('should load identity and quest data on mount', async () => {
      mockGetFirstAsync.mockResolvedValue({
        identity_statement: 'I am a builder',
        anti_vision: 'Wasted potential',
        one_year_mission: 'Ship the product',
      });
      mockGetAllAsync.mockResolvedValue([
        { id: 1, quest_text: 'Build feature', is_completed: 0, created_at: '2026-01-01', completed_at: null },
      ]);

      const { result } = renderHook(() => useHomeData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.identity).toBe('I am a builder');
      expect(result.current.antiVision).toBe('Wasted potential');
      expect(result.current.mission).toBe('Ship the product');
      expect(result.current.quests).toHaveLength(1);
      expect(result.current.quests[0].quest_text).toBe('Build feature');
    });

    it('should handle null/empty fields gracefully', async () => {
      mockGetFirstAsync.mockResolvedValue({
        identity_statement: 'exists',
        anti_vision: null,
        one_year_mission: null,
      });
      mockGetAllAsync.mockResolvedValue(null);

      const { result } = renderHook(() => useHomeData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.antiVision).toBe('');
      expect(result.current.mission).toBe('');
      expect(result.current.quests).toEqual([]);
    });

    it('should query all quests ordered by id (no date filter)', async () => {
      mockGetFirstAsync.mockResolvedValue({
        identity_statement: 'I am a builder',
        anti_vision: 'Waste',
        one_year_mission: 'Ship it',
      });
      mockGetAllAsync.mockResolvedValue([]);

      renderHook(() => useHomeData());

      await waitFor(() => {
        expect(mockGetAllAsync).toHaveBeenCalledWith(
          'SELECT * FROM quests ORDER BY id ASC'
        );
      });
    });
  });

  describe('onboarding redirect', () => {
    it('should redirect to onboarding if no identity data exists', async () => {
      mockGetFirstAsync.mockResolvedValue(null);

      renderHook(() => useHomeData());

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/onboarding');
      });
    });

    it('should redirect to onboarding if identity_statement is empty', async () => {
      mockGetFirstAsync.mockResolvedValue({
        identity_statement: '',
        anti_vision: 'something',
        one_year_mission: 'something',
      });

      renderHook(() => useHomeData());

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/onboarding');
      });
    });

    it('should redirect to onboarding on database error', async () => {
      mockGetFirstAsync.mockRejectedValue(new Error('DB not initialized'));

      renderHook(() => useHomeData());

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/onboarding');
      });
    });
  });

  describe('toggleQuest', () => {
    const mockQuests = [
      { id: 1, quest_text: 'Quest A', is_completed: 0, created_at: '2026-01-01', completed_at: null },
      { id: 2, quest_text: 'Quest B', is_completed: 1, created_at: '2026-01-01', completed_at: '2026-01-01T10:00:00Z' },
    ];

    beforeEach(() => {
      mockGetFirstAsync.mockResolvedValue({
        identity_statement: 'I am a builder',
        anti_vision: 'Wasted potential',
        one_year_mission: 'Ship it',
      });
      mockGetAllAsync.mockResolvedValue([...mockQuests]);
    });

    it('should toggle quest from incomplete to complete', async () => {
      const { result } = renderHook(() => useHomeData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Verify initial quests are loaded
      expect(result.current.quests).toHaveLength(2);
      expect(result.current.quests[0].is_completed).toBe(0);

      await act(async () => {
        await result.current.toggleQuest(1);
      });

      // DB should set is_completed=1 with COALESCE to preserve existing completed_at
      expect(mockRunAsync).toHaveBeenCalledWith(
        'UPDATE quests SET is_completed = 1, completed_at = COALESCE(completed_at, ?) WHERE id = ?',
        [expect.any(String), 1]
      );
    });

    it('should toggle quest from complete to incomplete', async () => {
      const { result } = renderHook(() => useHomeData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.toggleQuest(2);
      });

      // DB should only toggle is_completed, keeping completed_at as evidence
      expect(mockRunAsync).toHaveBeenCalledWith(
        'UPDATE quests SET is_completed = 0 WHERE id = ?',
        [2]
      );
    });

    it('should NOT restore health on re-completion (toggle exploit prevention)', async () => {
      // Quest 3: uncompleted but was completed before (completed_at is set)
      const questsWithPriorCompletion = [
        ...mockQuests,
        { id: 3, quest_text: 'Quest C', is_completed: 0, created_at: '2026-01-01', completed_at: '2026-01-01T08:00:00Z' },
      ];
      mockGetAllAsync.mockResolvedValue([...questsWithPriorCompletion]);

      const { result } = renderHook(() => useHomeData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Re-complete quest 3 (completed_at already set = was completed before)
      await act(async () => {
        await result.current.toggleQuest(3);
      });

      // Should NOT restore health because quest was already completed before
      expect(mockRestoreHealth).not.toHaveBeenCalled();
    });

    it('should restore health when quest is completed', async () => {
      const { result } = renderHook(() => useHomeData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.toggleQuest(1);
      });

      expect(mockRestoreHealth).toHaveBeenCalledWith(5);
    });

    it('should NOT restore health when quest is uncompleted', async () => {
      const { result } = renderHook(() => useHomeData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.toggleQuest(2);
      });

      expect(mockRestoreHealth).not.toHaveBeenCalled();
    });

    it('should do nothing if quest id is not found', async () => {
      const { result } = renderHook(() => useHomeData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.toggleQuest(999);
      });

      expect(mockRunAsync).not.toHaveBeenCalled();
    });

    it('should handle toggle errors gracefully', async () => {
      mockRunAsync.mockRejectedValue(new Error('DB write failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const { result } = renderHook(() => useHomeData());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.toggleQuest(1);
      });

      // Should not crash, error is logged
      expect(consoleSpy).toHaveBeenCalledWith('Failed to toggle quest:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });
});
