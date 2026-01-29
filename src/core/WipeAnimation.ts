
import { getDB } from '../database/client';

export const WipeAnimation = {
    /**
     * Executes the "Death" logic.
     * 1. Drops content tables.
     * 2. Sets user as dead in user_status (PERSISTENT DEATH).
     * 3. Does NOT delete user_status, preventing resurrection by restart.
     */
    async executeWipe() {
        const db = getDB();
        console.log("EXECUTING WIPE SEQUENCE...");

        await db.execAsync(`
      BEGIN TRANSACTION;
      
      -- Delete Content Tables (The "Self")
      DROP TABLE IF EXISTS quests;
      DROP TABLE IF EXISTS anti_vision;
      DROP TABLE IF EXISTS identity_core;
      DROP TABLE IF EXISTS daily_judgments;
      
      -- Mark as Dead (The "Gravestore")
      UPDATE user_status 
      SET is_dead = 1, 
          identity_health = 0,
          current_lens = 1.0 
      WHERE id = 1;
      
      COMMIT;
    `);

        console.log("WIPE COMPLETE. USER IS DEAD.");
    }
};
