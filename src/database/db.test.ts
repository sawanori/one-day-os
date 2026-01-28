/**
 * One Day OS - Database Tests
 */

import * as SQLite from 'expo-sqlite';

// Mock expo-sqlite module
jest.mock('expo-sqlite');

import { initializeDatabase, getAppState, updateAppState } from './db';

describe('Database Module', () => {
  let mockExecAsync: jest.Mock;
  let mockRunAsync: jest.Mock;
  let mockGetFirstAsync: jest.Mock;
  let mockGetAllAsync: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup fresh mocks for each test
    mockExecAsync = jest.fn(() => Promise.resolve());
    mockRunAsync = jest.fn(() => Promise.resolve({ changes: 1 }));
    mockGetFirstAsync = jest.fn(() => Promise.resolve({ state: 'onboarding' }));
    mockGetAllAsync = jest.fn(() => Promise.resolve([]));

    // Mock the openDatabaseAsync function
    (SQLite.openDatabaseAsync as jest.Mock).mockResolvedValue({
      execAsync: mockExecAsync,
      runAsync: mockRunAsync,
      getFirstAsync: mockGetFirstAsync,
      getAllAsync: mockGetAllAsync,
    });
  });

  describe('initializeDatabase', () => {
    it('should initialize database without errors', async () => {
      await expect(initializeDatabase()).resolves.not.toThrow();
      expect(mockExecAsync).toHaveBeenCalled();
    });
  });

  describe('App State', () => {
    it('should default to onboarding state', async () => {
      mockGetFirstAsync.mockResolvedValueOnce({ state: 'onboarding' });
      const state = await getAppState();
      expect(['onboarding', 'active', 'despair']).toContain(state);
    });

    it('should update app state', async () => {
      await expect(updateAppState('active')).resolves.not.toThrow();
      expect(mockRunAsync).toHaveBeenCalled();
    });
  });
});
