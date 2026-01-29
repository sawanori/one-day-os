
import { getDB } from '../database/client';
import { runInTransaction } from '../database/transaction';

export const IdentityEngine = {
    /**
     * Calculates current Identity Health based on missed judgments and failures.
     * If IH <= 0, triggers The End.
     */
    async checkHealth() {
        const db = getDB();
        const result = await db.getFirstAsync<{ identity_health: number; is_dead: number }>(
            'SELECT identity_health, is_dead FROM user_status WHERE id = 1'
        );

        if (!result) return { health: 100, isDead: false };

        if (result.identity_health <= 0 && !result.is_dead) {
            await this.killUser();
            return { health: 0, isDead: true };
        }

        return { health: result.identity_health, isDead: !!result.is_dead };
    },

    /**
     * Punishment: Apply damage to Identity Health.
     * @param amount Damage amount (default 10 for missed notifications)
     */
    async applyDamage(amount: number = 10) {
        return runInTransaction(async () => {
            const db = getDB();
            await db.runAsync(
                'UPDATE user_status SET identity_health = MAX(0, identity_health - ?) WHERE id = 1',
                [amount]
            );

            return this.checkHealth();
        });
    },

    /**
     * Reward: Restore Identity Health (capped at 100).
     * @param amount Healing amount
     */
    async restoreHealth(amount: number = 5) {
        return runInTransaction(async () => {
            const db = getDB();
            await db.runAsync(
                'UPDATE user_status SET identity_health = MIN(100, identity_health + ?) WHERE id = 1',
                [amount]
            );
        });
    },

    /**
     * THE NUCLEAR OPTION
     * Irreversibly wipes all user content tables.
     * Leaves user_status to mark as "DEAD".
     */
    async killUser() {
        return runInTransaction(async () => {
            const db = getDB();
            console.warn('EXECUTING IDENTITY WIPE...');

            await db.execAsync(`
        DROP TABLE IF EXISTS quests;
        DROP TABLE IF EXISTS anti_vision;
        DROP TABLE IF EXISTS identity_core;
        DROP TABLE IF EXISTS daily_judgments;
      `);

            // Mark user as dead
            await db.runAsync(
                'UPDATE user_status SET is_dead = ?, identity_health = ? WHERE id = 1',
                [1, 0]
            );
        });
    },

    /**
     * "Identity Insurance" Purchase (Monetization)
     * Revives the user if they are dead or near death.
     */
    async useInsurance() {
        return runInTransaction(async () => {
            const db = getDB();
            // In a real app, verify purchase here.
            await db.runAsync(
                'UPDATE user_status SET is_dead = ?, identity_health = ? WHERE id = 1',
                [0, 50]
            );
        });
    },

    /**
     * Get current Anti-Vision content
     * Used for Anti-Vision Bleed effect
     */
    async getAntiVision(): Promise<string> {
        const db = getDB();
        const result = await db.getFirstAsync<{ content: string }>(
            'SELECT content FROM anti_vision WHERE id = 1'
        );
        return result?.content || '';
    }
};
