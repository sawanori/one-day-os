/**
 * Debug script to manipulate Identity Health
 * Usage: npx tsx scripts/debug-ih.ts [value]
 *
 * Examples:
 *   npx tsx scripts/debug-ih.ts 20    # Set IH to 20%
 *   npx tsx scripts/debug-ih.ts 100   # Reset IH to 100%
 *   npx tsx scripts/debug-ih.ts 0     # Set IH to 0%
 */

import * as SQLite from 'expo-sqlite';

async function setIdentityHealth(targetHealth: number) {
  try {
    // Validate input
    if (targetHealth < 0 || targetHealth > 100) {
      console.error('❌ Error: Health must be between 0 and 100');
      process.exit(1);
    }

    const db = await SQLite.openDatabaseAsync('onedayos.db');

    // Update user_status
    await db.runAsync(
      'UPDATE user_status SET identity_health = ? WHERE id = 1',
      [targetHealth]
    );

    // Verify
    const result = await db.getFirstAsync<{ identity_health: number }>(
      'SELECT identity_health FROM user_status WHERE id = 1'
    );

    if (result) {
      console.log(`✅ Identity Health set to: ${result.identity_health}%`);

      if (result.identity_health < 30) {
        console.log('⚠️  Anti-Vision Bleed will be visible');
      }
      if (result.identity_health < 50) {
        console.log('⚠️  Screen jitter and glitch effects active');
      }
      if (result.identity_health === 0) {
        console.log('💀 WARNING: IH = 0% triggers data wipe!');
      }
    } else {
      console.error('❌ Error: Could not verify health update');
      process.exit(1);
    }

    await db.closeAsync();
    console.log('\n🔄 Restart the app to see changes');

  } catch (error) {
    console.error('❌ Error updating Identity Health:', error);
    process.exit(1);
  }
}

// Parse command line argument
const targetHealth = process.argv[2] ? parseInt(process.argv[2], 10) : null;

if (targetHealth === null) {
  console.log('Usage: npx tsx scripts/debug-ih.ts [value]');
  console.log('');
  console.log('Examples:');
  console.log('  npx tsx scripts/debug-ih.ts 20    # Set IH to 20%');
  console.log('  npx tsx scripts/debug-ih.ts 50    # Set IH to 50%');
  console.log('  npx tsx scripts/debug-ih.ts 100   # Reset IH to 100%');
  process.exit(0);
}

setIdentityHealth(targetHealth);
