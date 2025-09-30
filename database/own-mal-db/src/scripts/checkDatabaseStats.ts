import { db } from '../database/connection';

async function checkDatabaseStats() {
  try {
    console.log('📊 Database Statistics Report');
    console.log('============================\n');
    
    // 1. Total anime count
    const totalResult = await db.query('SELECT COUNT(*) as total FROM anime');
    const totalAnime = parseInt(totalResult.rows[0].total);
    console.log(`🎯 Total anime in database: ${totalAnime.toLocaleString()}`);
    
    // 2. Anime by type
    const typesResult = await db.query(`
      SELECT type, COUNT(*) as count 
      FROM anime 
      WHERE type IS NOT NULL 
      GROUP BY type 
      ORDER BY count DESC
    `);
    console.log('\n📈 Anime by type:');
    typesResult.rows.forEach(row => {
      console.log(`  ${row.type}: ${parseInt(row.count).toLocaleString()}`);
    });
    
    // 3. Genre coverage
    const genreStatsResult = await db.query(`
      SELECT 
        COUNT(DISTINCT g.id) as total_genres,
        COUNT(DISTINCT ag.genre_id) as genres_with_anime
      FROM genres g
      LEFT JOIN anime_genres ag ON g.id = ag.genre_id
    `);
    const genreStats = genreStatsResult.rows[0];
    console.log(`\n🎭 Genre coverage: ${genreStats.genres_with_anime}/${genreStats.total_genres} genres have anime`);
    
    // 4. Top genres by anime count
    const topGenresResult = await db.query(`
      SELECT g.name, COUNT(ag.anime_id) as anime_count
      FROM genres g
      LEFT JOIN anime_genres ag ON g.id = ag.genre_id
      GROUP BY g.id, g.name
      HAVING COUNT(ag.anime_id) > 0
      ORDER BY anime_count DESC
      LIMIT 10
    `);
    console.log('\n🏆 Top 10 genres by anime count:');
    topGenresResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.name}: ${parseInt(row.anime_count).toLocaleString()} anime`);
    });
    
    // 5. Score distribution
    const scoreStatsResult = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE score IS NOT NULL) as scored_anime,
        ROUND(AVG(score), 2) as avg_score,
        MAX(score) as max_score,
        MIN(score) as min_score
      FROM anime
    `);
    const scoreStats = scoreStatsResult.rows[0];
    console.log(`\n⭐ Score statistics:`);
    console.log(`  Anime with scores: ${parseInt(scoreStats.scored_anime).toLocaleString()}`);
    console.log(`  Average score: ${scoreStats.avg_score}`);
    console.log(`  Score range: ${scoreStats.min_score} - ${scoreStats.max_score}`);
    
    // 6. Year distribution (recent years)
    const yearStatsResult = await db.query(`
      SELECT year, COUNT(*) as count
      FROM anime
      WHERE year IS NOT NULL AND year >= 2020
      GROUP BY year
      ORDER BY year DESC
    `);
    console.log('\n📅 Recent years (2020+):');
    yearStatsResult.rows.forEach(row => {
      console.log(`  ${row.year}: ${parseInt(row.count).toLocaleString()} anime`);
    });
    
    // 7. Top rated anime (sample)
    const topRatedResult = await db.query(`
      SELECT title, score, type, year, rank
      FROM anime 
      WHERE score IS NOT NULL 
      ORDER BY score DESC 
      LIMIT 5
    `);
    console.log('\n🏅 Top 5 highest rated anime:');
    topRatedResult.rows.forEach((row, index) => {
      console.log(`  ${index + 1}. ${row.title} (⭐${row.score}, ${row.type}, ${row.year})`);
    });
    
    // 8. Studio statistics
    const studioStatsResult = await db.query(`
      SELECT COUNT(DISTINCT studio_id) as total_studios
      FROM anime_studios
    `);
    console.log(`\n🏢 Total studios: ${studioStatsResult.rows[0].total_studios}`);
    
    // 9. Data freshness
    const freshnessResult = await db.query(`
      SELECT 
        MIN(last_scraped) as oldest_scrape,
        MAX(last_scraped) as newest_scrape,
        COUNT(*) FILTER (WHERE last_scraped >= NOW() - INTERVAL '1 day') as scraped_today
      FROM anime
      WHERE last_scraped IS NOT NULL
    `);
    const freshness = freshnessResult.rows[0];
    console.log(`\n🕒 Data freshness:`);
    console.log(`  Oldest scrape: ${new Date(freshness.oldest_scrape).toLocaleDateString()}`);
    console.log(`  Newest scrape: ${new Date(freshness.newest_scrape).toLocaleDateString()}`);
    console.log(`  Scraped today: ${parseInt(freshness.scraped_today).toLocaleString()}`);
    
    // 10. Completeness check
    const completenessResult = await db.query(`
      SELECT 
        COUNT(*) FILTER (WHERE synopsis IS NOT NULL AND synopsis != '') as with_synopsis,
        COUNT(*) FILTER (WHERE image_url IS NOT NULL) as with_images,
        COUNT(*) FILTER (WHERE score IS NOT NULL) as with_scores,
        COUNT(*) as total
      FROM anime
    `);
    const completeness = completenessResult.rows[0];
    console.log(`\n📋 Data completeness:`);
    console.log(`  With synopsis: ${parseInt(completeness.with_synopsis).toLocaleString()}/${totalAnime.toLocaleString()} (${Math.round(completeness.with_synopsis/totalAnime*100)}%)`);
    console.log(`  With images: ${parseInt(completeness.with_images).toLocaleString()}/${totalAnime.toLocaleString()} (${Math.round(completeness.with_images/totalAnime*100)}%)`);
    console.log(`  With scores: ${parseInt(completeness.with_scores).toLocaleString()}/${totalAnime.toLocaleString()} (${Math.round(completeness.with_scores/totalAnime*100)}%)`);
    
    console.log('\n✅ Database statistics complete!');
    
  } catch (error) {
    console.error('❌ Error checking database stats:', error);
  } finally {
    await db.end();
  }
}

// Run if executed directly
if (require.main === module) {
  checkDatabaseStats().catch(console.error);
}

export { checkDatabaseStats }; 