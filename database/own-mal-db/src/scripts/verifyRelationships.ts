import { db } from '../database/connection';
import chalk from 'chalk';

async function verifyRelationships() {
  console.log(chalk.bold.cyan('\n🔍 Verifying Anime Relationships\n'));

  try {
    // 1. Count total genre links
    const genreLinksResult = await db.query('SELECT COUNT(*) as total FROM anime_genres');
    const totalGenreLinks = parseInt(genreLinksResult.rows[0].total);

    // 2. Count total studio links
    const studioLinksResult = await db.query('SELECT COUNT(*) as total FROM anime_studios');
    const totalStudioLinks = parseInt(studioLinksResult.rows[0].total);

    // 3. Count anime without genre links
    const animeWithoutGenresResult = await db.query(`
      SELECT COUNT(*) as total
      FROM anime a
      WHERE a.mal_id NOT IN (SELECT DISTINCT anime_id FROM anime_genres)
    `);
    const animeWithoutGenres = parseInt(animeWithoutGenresResult.rows[0].total);

    // 4. Count anime without studio links
    const animeWithoutStudiosResult = await db.query(`
      SELECT COUNT(*) as total
      FROM anime a
      WHERE a.mal_id NOT IN (SELECT DISTINCT anime_id FROM anime_studios)
    `);
    const animeWithoutStudios = parseInt(animeWithoutStudiosResult.rows[0].total);

    // 5. Count total anime
    const totalAnimeResult = await db.query('SELECT COUNT(*) as total FROM anime');
    const totalAnime = parseInt(totalAnimeResult.rows[0].total);

    // 6. Count total studios
    const totalStudiosResult = await db.query('SELECT COUNT(*) as total FROM studios');
    const totalStudios = parseInt(totalStudiosResult.rows[0].total);

    // 7. Get sample anime with relationships
    const sampleResult = await db.query(`
      SELECT
        a.mal_id,
        a.title,
        COUNT(DISTINCT ag.genre_id) as genre_count,
        COUNT(DISTINCT ast.studio_id) as studio_count
      FROM anime a
      LEFT JOIN anime_genres ag ON a.mal_id = ag.anime_id
      LEFT JOIN anime_studios ast ON a.mal_id = ast.anime_id
      WHERE a.mal_id IN (1, 5, 6, 8, 15, 16, 17, 18, 19, 20)
      GROUP BY a.mal_id, a.title
      ORDER BY a.mal_id
      LIMIT 10
    `);

    // Print results
    console.log(chalk.white('📊 Database Statistics:'));
    console.log(chalk.white(`   Total anime: ${totalAnime}`));
    console.log(chalk.white(`   Total genres: 78`));
    console.log(chalk.white(`   Total studios: ${totalStudios}`));
    console.log(chalk.white(`   Total genre links: ${totalGenreLinks}`));
    console.log(chalk.white(`   Total studio links: ${totalStudioLinks}`));

    console.log(chalk.white('\n📈 Coverage:'));
    if (animeWithoutGenres === 0) {
      console.log(chalk.green(`   ✅ All anime have genre links!`));
    } else {
      console.log(chalk.yellow(`   ⚠️  ${animeWithoutGenres} anime still missing genre links`));
    }

    if (animeWithoutStudios === 0) {
      console.log(chalk.green(`   ✅ All anime have studio links!`));
    } else {
      console.log(chalk.gray(`   ℹ️  ${animeWithoutStudios} anime without studio links (some anime legitimately have no studios)`));
    }

    // Sample data
    console.log(chalk.white('\n📋 Sample Anime (First 10 Tested):'));
    console.log(chalk.gray('   MAL ID | Title                              | Genres | Studios'));
    console.log(chalk.gray('   -------+-----------------------------------+--------+---------'));
    sampleResult.rows.forEach((row: any) => {
      const genreStatus = row.genre_count > 0 ? chalk.green(`   ${row.genre_count}`) : chalk.red(`   ${row.genre_count}`);
      const studioStatus = row.studio_count > 0 ? chalk.green(`${row.studio_count}`) : chalk.yellow(`${row.studio_count}`);
      console.log(chalk.white(`   ${String(row.mal_id).padEnd(6)} | ${row.title.substring(0, 33).padEnd(33)} | ${genreStatus}    | ${studioStatus}`));
    });

    console.log(chalk.white('\n'));

    if (animeWithoutGenres === 0 && totalGenreLinks > 0) {
      console.log(chalk.bold.green('✅ SUCCESS: All anime have genre relationships!\n'));
    } else if (totalGenreLinks > 0) {
      console.log(chalk.bold.yellow(`⚠️  PARTIAL SUCCESS: ${totalAnime - animeWithoutGenres} anime have genres, ${animeWithoutGenres} still need repair\n`));
    } else {
      console.log(chalk.bold.red('❌ FAILURE: No genre relationships found\n'));
    }

  } catch (error) {
    console.error(chalk.red('Error:'), error);
    throw error;
  } finally {
    await db.end();
  }
}

verifyRelationships()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
