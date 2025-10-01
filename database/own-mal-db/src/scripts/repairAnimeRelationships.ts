import { db } from '../database/connection';
import chalk from 'chalk';

/**
 * Repair Script for Anime Relationships
 *
 * This script fixes the broken anime-genre and anime-studio relationships
 * for all existing anime in the database.
 *
 * Problem: 16,457 anime exist but have 0 genre/studio relationships
 * Solution: Re-fetch relationship data from Jikan API and populate tables
 *
 * Rate Limit: 2 req/sec = ~2.3 hours for all 16,457 anime
 */

// Simple checkpoint system for resuming
interface RepairCheckpoint {
  lastProcessedId: number;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  skippedCount: number;
  startTime: number;
  errors: Array<{ animeId: number; error: string }>;
}

// Rate limiter (2 req/sec to be safe)
class RateLimiter {
  private requestTimes: number[] = [];
  private readonly maxRequestsPerSecond = 2;
  private readonly secondWindow = 1000;

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    this.requestTimes = this.requestTimes.filter(time => now - time < this.secondWindow);

    if (this.requestTimes.length >= this.maxRequestsPerSecond) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = this.secondWindow - (now - oldestRequest) + 50;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.waitForSlot();
    }

    this.requestTimes.push(Date.now());
  }
}

const rateLimiter = new RateLimiter();

// Fetch anime details from Jikan API with retry logic
async function fetchAnimeFromJikan(malId: number, retryCount = 0): Promise<any | null> {
  await rateLimiter.waitForSlot();

  const url = `https://api.jikan.moe/v4/anime/${malId}`;

  try {
    const response = await fetch(url);

    // Handle 429 Too Many Requests
    if (response.status === 429 && retryCount < 3) {
      const backoffTime = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
      console.log(chalk.yellow(`  ⚠️  429 error, backing off ${backoffTime/1000}s...`));
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      return fetchAnimeFromJikan(malId, retryCount + 1);
    }

    // Handle 404 (anime deleted from MAL)
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json() as { data: any };
    return data.data;

  } catch (error) {
    throw new Error(`Failed to fetch: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Store genre relationships for an anime
async function storeGenreRelationships(animeId: number, jikanData: any): Promise<number> {
  let linksCreated = 0;

  // Store genres
  if (jikanData.genres && jikanData.genres.length > 0) {
    for (const genre of jikanData.genres) {
      await db.query(
        'INSERT INTO anime_genres (anime_id, genre_id, genre_type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [animeId, genre.mal_id, 'genre']
      );
      linksCreated++;
    }
  }

  // Store themes
  if (jikanData.themes && jikanData.themes.length > 0) {
    for (const theme of jikanData.themes) {
      await db.query(
        'INSERT INTO anime_genres (anime_id, genre_id, genre_type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [animeId, theme.mal_id, 'theme']
      );
      linksCreated++;
    }
  }

  // Store demographics
  if (jikanData.demographics && jikanData.demographics.length > 0) {
    for (const demo of jikanData.demographics) {
      await db.query(
        'INSERT INTO anime_genres (anime_id, genre_id, genre_type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [animeId, demo.mal_id, 'demographic']
      );
      linksCreated++;
    }
  }

  return linksCreated;
}

// Store studio relationships for an anime
async function storeStudioRelationships(animeId: number, jikanData: any): Promise<number> {
  let linksCreated = 0;

  // Store studios
  if (jikanData.studios && jikanData.studios.length > 0) {
    for (const studio of jikanData.studios) {
      // First ensure studio exists
      await db.query(
        'INSERT INTO studios (id, name, url, type) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, url = EXCLUDED.url',
        [studio.mal_id, studio.name, studio.url, 'studio']
      );

      // Then create relationship
      await db.query(
        'INSERT INTO anime_studios (anime_id, studio_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [animeId, studio.mal_id, 'studio']
      );
      linksCreated++;
    }
  }

  // Store producers
  if (jikanData.producers && jikanData.producers.length > 0) {
    for (const producer of jikanData.producers) {
      // Ensure producer exists
      await db.query(
        'INSERT INTO studios (id, name, url, type) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, url = EXCLUDED.url',
        [producer.mal_id, producer.name, producer.url, 'producer']
      );

      // Create relationship
      await db.query(
        'INSERT INTO anime_studios (anime_id, studio_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [animeId, producer.mal_id, 'producer']
      );
      linksCreated++;
    }
  }

  // Store licensors
  if (jikanData.licensors && jikanData.licensors.length > 0) {
    for (const licensor of jikanData.licensors) {
      // Ensure licensor exists
      await db.query(
        'INSERT INTO studios (id, name, url, type) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, url = EXCLUDED.url',
        [licensor.mal_id, licensor.name, licensor.url, 'licensor']
      );

      // Create relationship
      await db.query(
        'INSERT INTO anime_studios (anime_id, studio_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
        [animeId, licensor.mal_id, 'licensor']
      );
      linksCreated++;
    }
  }

  return linksCreated;
}

// Process a single anime
async function processAnime(animeId: number): Promise<{ success: boolean; error?: string; genreLinks: number; studioLinks: number }> {
  try {
    // Check if this anime already has relationships (skip if so)
    const checkQuery = await db.query(
      'SELECT COUNT(*) as genre_count FROM anime_genres WHERE anime_id = $1',
      [animeId]
    );

    if (parseInt(checkQuery.rows[0].genre_count) > 0) {
      return { success: true, genreLinks: 0, studioLinks: 0 }; // Already has relationships
    }

    // Fetch from Jikan
    const jikanData = await fetchAnimeFromJikan(animeId);

    if (!jikanData) {
      return { success: false, error: '404 - Anime not found on MAL', genreLinks: 0, studioLinks: 0 };
    }

    // Store relationships
    const genreLinks = await storeGenreRelationships(animeId, jikanData);
    const studioLinks = await storeStudioRelationships(animeId, jikanData);

    return { success: true, genreLinks, studioLinks };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      genreLinks: 0,
      studioLinks: 0
    };
  }
}

// Format time estimate
function formatTimeEstimate(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

// Main repair function
export async function repairAllAnimeRelationships(options: {
  limit?: number;
  startFrom?: number;
  testMode?: boolean;
} = {}): Promise<void> {
  const { limit, startFrom = 0, testMode = false } = options;

  console.log(chalk.bold.cyan('\n🔧 Anime Relationship Repair Script\n'));

  if (testMode) {
    console.log(chalk.yellow('🧪 TEST MODE: Will process only a small sample\n'));
  }

  try {
    // Get all anime IDs that need fixing
    const query = `
      SELECT a.mal_id, a.title
      FROM anime a
      WHERE a.mal_id NOT IN (SELECT DISTINCT anime_id FROM anime_genres)
      ORDER BY a.mal_id
      ${limit ? `LIMIT ${limit}` : ''}
      ${startFrom > 0 ? `OFFSET ${startFrom}` : ''}
    `;

    const result = await db.query(query);
    const animeToFix = result.rows;

    console.log(chalk.white(`Found ${chalk.bold(animeToFix.length)} anime without genre relationships\n`));

    if (animeToFix.length === 0) {
      console.log(chalk.green('✅ All anime already have relationships!'));
      return;
    }

    // Time estimate (2 req/sec)
    const estimatedSeconds = animeToFix.length / 2;
    console.log(chalk.gray(`Estimated time: ${formatTimeEstimate(estimatedSeconds)}\n`));

    // Checkpoint tracking
    const checkpoint: RepairCheckpoint = {
      lastProcessedId: 0,
      totalProcessed: 0,
      successCount: 0,
      errorCount: 0,
      skippedCount: 0,
      startTime: Date.now(),
      errors: []
    };

    let totalGenreLinks = 0;
    let totalStudioLinks = 0;

    // Process each anime
    for (let i = 0; i < animeToFix.length; i++) {
      const { mal_id, title } = animeToFix[i];
      const progress = `[${i + 1}/${animeToFix.length}]`;

      console.log(chalk.cyan(`${progress} Processing anime ${mal_id}: ${title}`));

      const result = await processAnime(mal_id);

      checkpoint.lastProcessedId = mal_id;
      checkpoint.totalProcessed++;

      if (result.success) {
        if (result.genreLinks === 0 && result.studioLinks === 0) {
          checkpoint.skippedCount++;
          console.log(chalk.gray(`  ⏭️  Already has relationships, skipped`));
        } else {
          checkpoint.successCount++;
          totalGenreLinks += result.genreLinks;
          totalStudioLinks += result.studioLinks;
          console.log(chalk.green(`  ✅ Created ${result.genreLinks} genre links, ${result.studioLinks} studio links`));
        }
      } else {
        checkpoint.errorCount++;
        checkpoint.errors.push({ animeId: mal_id, error: result.error || 'Unknown error' });
        console.log(chalk.red(`  ❌ Error: ${result.error}`));
      }

      // Progress summary every 50 anime
      if ((i + 1) % 50 === 0) {
        const elapsed = (Date.now() - checkpoint.startTime) / 1000;
        const rate = checkpoint.totalProcessed / elapsed;
        const remaining = animeToFix.length - (i + 1);
        const eta = remaining / rate;

        console.log(chalk.bold.yellow(`\n📊 Progress Summary:`));
        console.log(chalk.white(`   Processed: ${checkpoint.totalProcessed}`));
        console.log(chalk.green(`   Success: ${checkpoint.successCount}`));
        console.log(chalk.gray(`   Skipped: ${checkpoint.skippedCount}`));
        console.log(chalk.red(`   Errors: ${checkpoint.errorCount}`));
        console.log(chalk.white(`   Genre links: ${totalGenreLinks}`));
        console.log(chalk.white(`   Studio links: ${totalStudioLinks}`));
        console.log(chalk.cyan(`   Rate: ${rate.toFixed(2)} anime/sec`));
        console.log(chalk.cyan(`   ETA: ${formatTimeEstimate(eta)}\n`));
      }
    }

    // Final summary
    const totalTime = (Date.now() - checkpoint.startTime) / 1000;

    console.log(chalk.bold.green('\n✅ Repair Complete!\n'));
    console.log(chalk.white('📊 Final Statistics:'));
    console.log(chalk.white(`   Total processed: ${checkpoint.totalProcessed}`));
    console.log(chalk.green(`   ✅ Success: ${checkpoint.successCount}`));
    console.log(chalk.gray(`   ⏭️  Skipped: ${checkpoint.skippedCount}`));
    console.log(chalk.red(`   ❌ Errors: ${checkpoint.errorCount}`));
    console.log(chalk.white(`   Genre links created: ${totalGenreLinks}`));
    console.log(chalk.white(`   Studio links created: ${totalStudioLinks}`));
    console.log(chalk.cyan(`   Total time: ${formatTimeEstimate(totalTime)}\n`));

    if (checkpoint.errors.length > 0) {
      console.log(chalk.red(`\n⚠️  Errors encountered (${checkpoint.errors.length}):`));
      checkpoint.errors.slice(0, 10).forEach(({ animeId, error }) => {
        console.log(chalk.red(`   Anime ${animeId}: ${error}`));
      });
      if (checkpoint.errors.length > 10) {
        console.log(chalk.red(`   ... and ${checkpoint.errors.length - 10} more errors`));
      }
    }

  } catch (error) {
    console.error(chalk.bold.red('\n❌ Fatal error:'), error);
    throw error;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const testMode = args.includes('--test');
  const limit = testMode ? 10 : undefined;

  repairAllAnimeRelationships({ limit, testMode })
    .then(() => {
      console.log(chalk.green('\n✅ Script completed successfully'));
      process.exit(0);
    })
    .catch((error) => {
      console.error(chalk.red('\n❌ Script failed:'), error);
      process.exit(1);
    });
}
