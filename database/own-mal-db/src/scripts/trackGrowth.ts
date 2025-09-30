import { db } from '../database/connection';

async function trackGrowth() {
  try {
    console.log('📊 Real-time Database Growth Tracker');
    console.log('====================================');
    
    // Total anime count
    const totalResult = await db.query('SELECT COUNT(*) as total FROM anime');
    console.log(`🎯 Total anime: ${totalResult.rows[0].total}`);
    
    // Anime by type
    const typesResult = await db.query(`
      SELECT type, COUNT(*) as count 
      FROM anime 
      WHERE type IS NOT NULL 
      GROUP BY type 
      ORDER BY count DESC
    `);
    console.log('\n📈 Anime by type:');
    typesResult.rows.forEach(row => {
      console.log(`  ${row.type}: ${row.count}`);
    });
    
    // Recent additions (last 100)
    const recentResult = await db.query(`
      SELECT title, type, year, score 
      FROM anime 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log('\n🆕 Recently added anime:');
    recentResult.rows.forEach(row => {
      console.log(`  - ${row.title} (${row.type}, ${row.year}, ⭐${row.score || 'N/A'})`);
    });
    
    // Genre coverage
    const genreResult = await db.query(`
      SELECT COUNT(DISTINCT genre_id) as genres_with_anime 
      FROM anime_genres
    `);
    console.log(`\n🎭 Genres with anime: ${genreResult.rows[0].genres_with_anime}/78`);
    
    // Top rated anime
    const topRatedResult = await db.query(`
      SELECT title, score, type, year 
      FROM anime 
      WHERE score IS NOT NULL 
      ORDER BY score DESC 
      LIMIT 3
    `);
    console.log('\n🏆 Top rated anime:');
    topRatedResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.title} (⭐${row.score}, ${row.type}, ${row.year})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await db.end();
  }
}

trackGrowth(); 