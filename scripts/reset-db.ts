/**
 * One Day OS - Database Reset Script
 * Resets all data to allow fresh onboarding experience
 */

import { resetDatabase } from '../src/database/db';

async function main() {
  console.log('🔄 Resetting database...');

  try {
    await resetDatabase();
    console.log('✅ Database reset complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Restart the app');
    console.log('2. You will see the onboarding flow');
    console.log('');
  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  }
}

main();
