/**
 * Transaction Utility Tests
 */
import { runInTransaction } from './transaction';
import { getDB } from './client';

// Mock getDB
jest.mock('./client', () => ({
  getDB: jest.fn(),
}));

describe('runInTransaction', () => {
  let mockDB: any;

  beforeEach(() => {
    mockDB = {
      execAsync: jest.fn().mockResolvedValue(undefined),
      runAsync: jest.fn().mockResolvedValue(undefined),
      getFirstAsync: jest.fn().mockResolvedValue({ value: 100 }),
    };
    (getDB as jest.Mock).mockReturnValue(mockDB);
  });

  it('should execute operations in a transaction successfully', async () => {
    const result = await runInTransaction(async () => {
      await mockDB.runAsync(
        'UPDATE test_table SET value = ? WHERE id = ?',
        [200, 1]
      );
      return 'success';
    });

    expect(result).toBe('success');
    expect(mockDB.execAsync).toHaveBeenCalledWith('BEGIN TRANSACTION;');
    expect(mockDB.execAsync).toHaveBeenCalledWith('COMMIT;');
    expect(mockDB.runAsync).toHaveBeenCalled();
  });

  it('should rollback on error', async () => {
    try {
      await runInTransaction(async () => {
        await mockDB.runAsync(
          'UPDATE test_table SET value = ? WHERE id = ?',
          [300, 1]
        );

        // Simulate error
        throw new Error('Test error');
      });

      // Should not reach here
      fail('Should have thrown error');
    } catch (error: any) {
      expect(error.message).toBe('Test error');
    }

    // Should have called ROLLBACK
    expect(mockDB.execAsync).toHaveBeenCalledWith('BEGIN TRANSACTION;');
    expect(mockDB.execAsync).toHaveBeenCalledWith('ROLLBACK;');
  });

  it('should call BEGIN and COMMIT in correct order', async () => {
    await runInTransaction(async () => {
      await mockDB.runAsync('UPDATE test_table SET value = ? WHERE id = ?', [400, 1]);
      return 'result';
    });

    const calls = mockDB.execAsync.mock.calls;
    expect(calls[0][0]).toBe('BEGIN TRANSACTION;');
    expect(calls[1][0]).toBe('COMMIT;');
  });

  it('should handle multiple concurrent transactions', async () => {
    // Run multiple transactions concurrently
    const results = await Promise.all([
      runInTransaction(async () => {
        await mockDB.runAsync('UPDATE test_table SET value = value + 1 WHERE id = ?', [1]);
        return 1;
      }),
      runInTransaction(async () => {
        await mockDB.runAsync('UPDATE test_table SET value = value + 1 WHERE id = ?', [2]);
        return 2;
      }),
      runInTransaction(async () => {
        await mockDB.runAsync('UPDATE test_table SET value = value + 1 WHERE id = ?', [3]);
        return 3;
      }),
    ]);

    expect(results).toEqual([1, 2, 3]);
    expect(mockDB.execAsync).toHaveBeenCalledTimes(6); // 3 BEGIN + 3 COMMIT
  });

  it('should preserve return value', async () => {
    const result = await runInTransaction(async () => {
      return { success: true, value: 42 };
    });

    expect(result).toEqual({ success: true, value: 42 });
  });
});
