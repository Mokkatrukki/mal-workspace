import { db } from '../database/connection';

async function checkTVSpecial() {
  try {
    console.log('🔍 Checking TV Special anime in database...');
    
    // Count TV Special anime
    const countResult = await db.query("SELECT COUNT(*) as tv_special_count FROM anime WHERE type = 'TV Special'");
    console.log(`📊 TV Special anime count: ${countResult.rows[0].tv_special_count}`);
    
    // Get sample TV Special anime
    const sampleResult = await db.query("SELECT mal_id, title, type FROM anime WHERE type = 'TV Special' LIMIT 5");
    console.log('📝 Sample TV Special anime:');
    sampleResult.rows.forEach(row => {
      console.log(`  - ${row.mal_id}: ${row.title} (${row.type})`);
    });
    
    // Check all anime types
    const typesResult = await db.query(`
      SELECT type, COUNT(*) as count 
      FROM anime 
      WHERE type IS NOT NULL 
      GROUP BY type 
      ORDER BY count DESC
    `);
    console.log('\n📈 All anime types in database:');
    typesResult.rows.forEach(row => {
      console.log(`  - ${row.type}: ${row.count}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.end();
  }
}

checkTVSpecial(); 