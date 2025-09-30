import { db } from '../database/connection';

async function checkRemainingGenres() {
  try {
    console.log('🔍 Checking remaining genres to process...');
    
    const totalGenres = await db.query('SELECT COUNT(*) as total FROM genres');
    const processedGenres = await db.query('SELECT COUNT(DISTINCT genre_id) as processed FROM anime_genres');
    
    console.log(`📊 Total genres in database: ${totalGenres.rows[0].total}`);
    console.log(`✅ Genres with anime: ${processedGenres.rows[0].processed}`);
    console.log(`⏳ Remaining genres: ${totalGenres.rows[0].total - processedGenres.rows[0].processed}`);
    
    const unprocessed = await db.query(`
      SELECT g.id, g.name, g.type 
      FROM genres g 
      LEFT JOIN anime_genres ag ON g.id = ag.genre_id 
      WHERE ag.genre_id IS NULL 
      ORDER BY g.id LIMIT 20
    `);
    
    console.log('\n📝 Sample unprocessed genres:');
    unprocessed.rows.forEach(row => {
      console.log(`  - ${row.id}: ${row.name} (${row.type})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.end();
  }
}

checkRemainingGenres(); 