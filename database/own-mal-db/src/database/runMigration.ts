import { db } from './connection';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  try {
    console.log('🔄 Running migration to add TV Special type...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '002_add_tv_special_type.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await db.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📝 Added "TV Special" to anime_type enum');
    
    // Test the new enum value
    const result = await db.query(`
      SELECT unnest(enum_range(NULL::anime_type)) as anime_type
      ORDER BY anime_type
    `);
    
    console.log('🎯 Available anime types:');
    result.rows.forEach(row => {
      console.log(`  - ${row.anime_type}`);
    });
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await db.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('Migration finished successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { runMigration }; 