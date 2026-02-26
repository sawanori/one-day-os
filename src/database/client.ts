
import { dbResult, initDatabase } from './schema';
import { getLocalDatetime } from '../utils/date';

export const getDB = () => dbResult;
export const databaseInit = initDatabase;

/**
 * Get current app state
 */
export async function getAppState(): Promise<'onboarding' | 'active' | 'despair'> {
  const db = getDB();
  const result = await db.getFirstAsync<{ state: string }>(`
    SELECT state FROM app_state WHERE id = 1
  `);

  return (result?.state as 'onboarding' | 'active' | 'despair') || 'onboarding';
}

/**
 * Update app state
 */
export async function updateAppState(state: 'onboarding' | 'active' | 'despair'): Promise<void> {
  const db = getDB();
  const now = getLocalDatetime();

  await db.runAsync(`
    UPDATE app_state
    SET state = ?, updated_at = ?
    WHERE id = 1
  `, [state, now]);
}
