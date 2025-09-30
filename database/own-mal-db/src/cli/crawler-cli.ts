#!/usr/bin/env node

import * as readline from 'readline';
import { CrawlerCheckpoint } from '../scripts/crawlerCheckpoint';
import { ReviewCrawler } from '../scripts/reviewCrawler';
import { ForcedReviewCrawler } from '../services/forcedReviewCrawler';
import { crawlAnimeData } from '../scripts/crawlAnime';
import { db } from '../database/connection';

interface CrawlerSession {
  showLogs: boolean;
  isRunning: boolean;
  currentOperation: string | null;
  startTime: Date | null;
  processed: number;
  errors: number;
  target: number;
}

class PracticalCrawlerCLI {
  private rl: readline.Interface;
  private animeCheckpoint: CrawlerCheckpoint;
  private reviewCrawler: ReviewCrawler;
  private forcedCrawler: ForcedReviewCrawler;
  private session: CrawlerSession;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    this.animeCheckpoint = new CrawlerCheckpoint();
    this.reviewCrawler = new ReviewCrawler();
    this.forcedCrawler = new ForcedReviewCrawler();

    this.session = {
      showLogs: true,
      isRunning: false,
      currentOperation: null,
      startTime: null,
      processed: 0,
      errors: 0,
      target: 0
    };

    process.on('SIGINT', () => {
      console.log('\n\nOperation stopped by user');
      this.rl.close();
      process.exit(0);
    });
  }

  private clearScreen(): void {
    console.clear();
  }

  private async getCurrentStats(): Promise<any> {
    try {
      // Get total anime count
      const animeCount = await db.query('SELECT COUNT(*) as count FROM anime');

      // Get anime with reviews count
      const reviewedAnime = await db.query(`
        SELECT COUNT(DISTINCT anime_id) as count
        FROM anime_reviews
      `);

      // Get total reviews
      const totalReviews = await db.query('SELECT COUNT(*) as count FROM anime_reviews');

      // Get anime without reviews (popular first)
      const noReviews = await db.query(`
        SELECT COUNT(*) as count
        FROM anime a
        LEFT JOIN anime_reviews r ON a.mal_id = r.anime_id
        WHERE r.anime_id IS NULL
          AND a.members > 1000
      `);

      return {
        totalAnime: parseInt(animeCount.rows[0].count),
        animeWithReviews: parseInt(reviewedAnime.rows[0].count),
        totalReviews: parseInt(totalReviews.rows[0].count),
        animeNeedingReviews: parseInt(noReviews.rows[0].count)
      };
    } catch (error) {
      console.log('Error getting stats:', error);
      return null;
    }
  }

  private printHeader(): void {
    console.log(`
==============================================================
                 Anime Database Crawler
==============================================================
`);
  }

  private async printCurrentState(): Promise<void> {
    const stats = await this.getCurrentStats();
    if (!stats) {
      console.log('Could not load database stats');
      return;
    }

    const avgReviews = stats.animeWithReviews > 0 ?
      (stats.totalReviews / stats.animeWithReviews).toFixed(1) : '0';

    console.log(`Current Database State:
  Total anime: ${stats.totalAnime.toLocaleString()}
  Anime with reviews: ${stats.animeWithReviews.toLocaleString()}
  Total reviews: ${stats.totalReviews.toLocaleString()}
  Average reviews per anime: ${avgReviews}
  Anime needing reviews: ${stats.animeNeedingReviews.toLocaleString()}
`);

    if (this.session.isRunning) {
      const elapsed = this.session.startTime ?
        Math.floor((Date.now() - this.session.startTime.getTime()) / 1000) : 0;
      console.log(`Current Operation: ${this.session.currentOperation}
  Processed: ${this.session.processed}/${this.session.target}
  Errors: ${this.session.errors}
  Runtime: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s
`);
    }
  }

  private printMenu(): void {
    console.log(`Main Operations:

1. Get more reviews for existing anime
   - Add reviews to anime that have few/no reviews
   - Prioritizes popular anime first
   - Specify how many anime to process

2. Add new anime to database
   - Crawl new anime from Jikan API
   - Add basic anime data (no reviews)
   - Specify how many new anime to get

3. Get reviews for new anime
   - Find anime without reviews
   - Crawl reviews for them
   - Prioritizes popular anime first

4. Show detailed statistics
5. Reset crawler progress
6. Exit

Choose operation (1-6): `);
  }

  private async askQuestion(question: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
  }

  private async getMoreReviews(): Promise<void> {
    console.log('\n=== Get More Reviews for Existing Anime ===\n');

    // Show current situation
    const lowReviewAnime = await db.query(`
      SELECT COUNT(*) as count
      FROM anime a
      LEFT JOIN (
        SELECT anime_id, COUNT(*) as review_count
        FROM anime_reviews
        GROUP BY anime_id
      ) r ON a.mal_id = r.anime_id
      WHERE COALESCE(r.review_count, 0) < 50
        AND a.members > 1000
    `);

    console.log(`Anime with less than 50 reviews: ${lowReviewAnime.rows[0].count}`);

    const targetStr = await this.askQuestion('How many anime to process? (default: 100): ');
    const target = targetStr ? parseInt(targetStr) : 100;

    const reviewsPerAnimeStr = await this.askQuestion('Target reviews per anime? (default: 50): ');
    const reviewsPerAnime = reviewsPerAnimeStr ? parseInt(reviewsPerAnimeStr) : 50;

    this.session.isRunning = true;
    this.session.currentOperation = 'Adding reviews to existing anime';
    this.session.startTime = new Date();
    this.session.processed = 0;
    this.session.errors = 0;
    this.session.target = target;

    try {
      // Get anime that need more reviews, ordered by popularity
      const animeNeedingReviews = await db.query(`
        SELECT a.mal_id, a.title, a.members, COALESCE(r.review_count, 0) as current_reviews
        FROM anime a
        LEFT JOIN (
          SELECT anime_id, COUNT(*) as review_count
          FROM anime_reviews
          GROUP BY anime_id
        ) r ON a.mal_id = r.anime_id
        WHERE COALESCE(r.review_count, 0) < $2
          AND a.members > 1000
        ORDER BY a.members DESC NULLS LAST
        LIMIT $1
      `, [target, reviewsPerAnime]);

      console.log(`\nFound ${animeNeedingReviews.rows.length} anime to process\n`);

      for (const anime of animeNeedingReviews.rows) {
        console.log(`[${this.session.processed + 1}/${target}] Processing: ${anime.title}`);
        console.log(`  Members: ${anime.members?.toLocaleString() || 'N/A'} | Current reviews: ${anime.current_reviews}`);

        try {
          const newReviews = await this.forcedCrawler.crawlReviewsForAnime(anime.mal_id, reviewsPerAnime);

          console.log(`  -> Added ${newReviews} new reviews`);
          this.session.processed++;

          // Update display every 5 anime
          if (this.session.processed % 5 === 0) {
            this.clearScreen();
            this.printHeader();
            await this.printCurrentState();
          }

        } catch (error) {
          console.log(`  -> Error: ${error}`);
          this.session.errors++;
        }
      }

      console.log(`\nOperation completed!`);
      console.log(`Processed: ${this.session.processed} anime`);
      console.log(`Errors: ${this.session.errors}`);

    } catch (error) {
      console.log(`Operation failed: ${error}`);
    } finally {
      this.session.isRunning = false;
      this.session.currentOperation = null;
    }

    await this.askQuestion('\nPress Enter to continue...');
  }

  private async addNewAnime(): Promise<void> {
    console.log('\n=== Add New Anime to Database ===\n');

    const current = this.animeCheckpoint.getProgressSummary();
    console.log(`Current anime in database: ${current.totalAnime}`);
    console.log(`Genres processed: ${current.totalGenres}/78+`);

    const targetStr = await this.askQuestion('How many new anime to add? (default: 1000): ');
    const target = targetStr ? parseInt(targetStr) : 1000;

    const genresStr = await this.askQuestion('Max genres to process? (default: 10): ');
    const maxGenres = genresStr ? parseInt(genresStr) : 10;

    const pagesStr = await this.askQuestion('Pages per genre? (default: 5): ');
    const maxPages = pagesStr ? parseInt(pagesStr) : 5;

    this.session.isRunning = true;
    this.session.currentOperation = 'Adding new anime';
    this.session.startTime = new Date();
    this.session.processed = 0;
    this.session.target = target;

    // Set environment variables for the crawler
    process.env.MAX_GENRES = maxGenres.toString();
    process.env.MAX_PAGES_PER_GENRE = maxPages.toString();

    try {
      console.log(`\nStarting anime crawl...`);
      console.log(`Target: ~${target} anime from ${maxGenres} genres (${maxPages} pages each)`);

      await crawlAnimeData();

      const newStats = this.animeCheckpoint.getProgressSummary();
      const added = newStats.totalAnime - current.totalAnime;

      console.log(`\nCrawling completed!`);
      console.log(`Added approximately ${added} new anime`);

    } catch (error) {
      console.log(`Crawling failed: ${error}`);
    } finally {
      this.session.isRunning = false;
      this.session.currentOperation = null;
    }

    await this.askQuestion('\nPress Enter to continue...');
  }

  private async getReviewsForNewAnime(): Promise<void> {
    console.log('\n=== Get Reviews for New Anime ===\n');

    // Find anime without any reviews
    const noReviewsCount = await db.query(`
      SELECT COUNT(*) as count
      FROM anime a
      LEFT JOIN anime_reviews r ON a.mal_id = r.anime_id
      WHERE r.anime_id IS NULL
        AND a.members > 1000
    `);

    console.log(`Anime without reviews: ${noReviewsCount.rows[0].count}`);

    const targetStr = await this.askQuestion('How many anime to process? (default: 200): ');
    const target = targetStr ? parseInt(targetStr) : 200;

    const reviewsStr = await this.askQuestion('Reviews per anime? (default: 50): ');
    const reviewsPerAnime = reviewsStr ? parseInt(reviewsStr) : 50;

    this.session.isRunning = true;
    this.session.currentOperation = 'Getting reviews for new anime';
    this.session.startTime = new Date();
    this.session.processed = 0;
    this.session.errors = 0;
    this.session.target = target;

    try {
      // Get anime without reviews, prioritize by popularity
      const animeWithoutReviews = await db.query(`
        SELECT a.mal_id, a.title, a.members
        FROM anime a
        LEFT JOIN anime_reviews r ON a.mal_id = r.anime_id
        WHERE r.anime_id IS NULL
          AND a.members > 1000
        ORDER BY a.members DESC NULLS LAST
        LIMIT $1
      `, [target]);

      console.log(`\nFound ${animeWithoutReviews.rows.length} anime without reviews\n`);

      for (const anime of animeWithoutReviews.rows) {
        console.log(`[${this.session.processed + 1}/${target}] Processing: ${anime.title}`);
        console.log(`  Members: ${anime.members?.toLocaleString() || 'N/A'} | Reviews: 0 -> targeting ${reviewsPerAnime}`);

        try {
          const newReviews = await this.forcedCrawler.crawlReviewsForAnime(anime.mal_id, reviewsPerAnime);

          console.log(`  -> Added ${newReviews} reviews`);
          this.session.processed++;

          // Update display every 10 anime
          if (this.session.processed % 10 === 0) {
            this.clearScreen();
            this.printHeader();
            await this.printCurrentState();
          }

        } catch (error) {
          console.log(`  -> Error: ${error}`);
          this.session.errors++;
        }
      }

      console.log(`\nOperation completed!`);
      console.log(`Processed: ${this.session.processed} anime`);
      console.log(`Errors: ${this.session.errors}`);

    } catch (error) {
      console.log(`Operation failed: ${error}`);
    } finally {
      this.session.isRunning = false;
      this.session.currentOperation = null;
    }

    await this.askQuestion('\nPress Enter to continue...');
  }

  private async showDetailedStats(): Promise<void> {
    console.log('\n=== Detailed Database Statistics ===\n');

    try {
      // Anime stats
      const animeStats = await db.query(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN score IS NOT NULL THEN 1 END) as with_scores,
          AVG(score) as avg_score,
          COUNT(CASE WHEN airing = true THEN 1 END) as airing
        FROM anime
      `);

      // Review distribution
      const reviewDist = await db.query(`
        SELECT
          COUNT(CASE WHEN review_count = 0 THEN 1 END) as no_reviews,
          COUNT(CASE WHEN review_count BETWEEN 1 AND 10 THEN 1 END) as few_reviews,
          COUNT(CASE WHEN review_count BETWEEN 11 AND 30 THEN 1 END) as some_reviews,
          COUNT(CASE WHEN review_count BETWEEN 31 AND 50 THEN 1 END) as good_reviews,
          COUNT(CASE WHEN review_count > 50 THEN 1 END) as many_reviews
        FROM (
          SELECT
            a.mal_id,
            COALESCE(COUNT(r.id), 0) as review_count
          FROM anime a
          LEFT JOIN anime_reviews r ON a.mal_id = r.anime_id
          WHERE a.members > 1000
          GROUP BY a.mal_id
        ) as review_counts
      `);

      // Top anime by reviews
      const topReviewed = await db.query(`
        SELECT a.title, COUNT(r.id) as review_count, a.members
        FROM anime a
        JOIN anime_reviews r ON a.mal_id = r.anime_id
        GROUP BY a.mal_id, a.title, a.members
        ORDER BY review_count DESC
        LIMIT 10
      `);

      console.log('Anime Statistics:');
      console.log(`  Total anime: ${animeStats.rows[0].total}`);
      console.log(`  With scores: ${animeStats.rows[0].with_scores}`);
      console.log(`  Average score: ${parseFloat(animeStats.rows[0].avg_score).toFixed(2)}`);
      console.log(`  Currently airing: ${animeStats.rows[0].airing}`);

      console.log('\nReview Distribution (anime with >1000 members):');
      console.log(`  No reviews: ${reviewDist.rows[0].no_reviews}`);
      console.log(`  1-10 reviews: ${reviewDist.rows[0].few_reviews}`);
      console.log(`  11-30 reviews: ${reviewDist.rows[0].some_reviews}`);
      console.log(`  31-50 reviews: ${reviewDist.rows[0].good_reviews}`);
      console.log(`  50+ reviews: ${reviewDist.rows[0].many_reviews}`);

      console.log('\nTop 10 Most Reviewed Anime:');
      topReviewed.rows.forEach((row, i) => {
        console.log(`  ${i + 1}. ${row.title} (${row.review_count} reviews, ${row.members?.toLocaleString()} members)`);
      });

    } catch (error) {
      console.log(`Error loading statistics: ${error}`);
    }

    await this.askQuestion('\nPress Enter to continue...');
  }

  async start(): Promise<void> {
    console.log('Initializing Anime Database Crawler...\n');

    try {
      await db.testConnection();
      console.log('Database connected successfully\n');
    } catch (error) {
      console.log('Database connection failed. Check your configuration.');
      this.rl.close();
      return;
    }

    while (true) {
      this.clearScreen();
      this.printHeader();
      await this.printCurrentState();
      this.printMenu();

      const choice = await this.askQuestion('');

      switch (choice) {
        case '1':
          await this.getMoreReviews();
          break;
        case '2':
          await this.addNewAnime();
          break;
        case '3':
          await this.getReviewsForNewAnime();
          break;
        case '4':
          await this.showDetailedStats();
          break;
        case '5':
          console.log('\nReset options:');
          const resetChoice = await this.askQuestion('Reset (a)nime crawler, (r)eview crawler, or (b)oth? ');
          if (resetChoice === 'a' || resetChoice === 'both') {
            this.animeCheckpoint.reset();
            console.log('Anime crawler reset');
          }
          if (resetChoice === 'r' || resetChoice === 'both') {
            this.reviewCrawler.reset();
            console.log('Review crawler reset');
          }
          await this.askQuestion('Press Enter to continue...');
          break;
        case '6':
          console.log('Goodbye!');
          this.rl.close();
          return;
        default:
          console.log('Invalid choice. Try again.');
          await this.askQuestion('Press Enter to continue...');
      }
    }
  }
}

async function main() {
  const cli = new PracticalCrawlerCLI();
  await cli.start();
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { PracticalCrawlerCLI };