import { db } from '../database/connection';
import { ReviewAnalyzer } from '../services/reviewAnalyzer';
import * as fs from 'fs';
import * as path from 'path';

interface ReviewCrawlConfig {
  maxReviewsPerAnime: number;
  includePreliminary: boolean;
  priorityAnimeList?: number[];
  batchSize: number;
  delayBetweenRequests: number;
  delayBetweenAnime: number;
}

interface JikanReview {
  mal_id: number;
  user: {
    username: string;
    url: string;
  };
  score: number | null;
  review: string;
  votes: number;
  is_preliminary: boolean;
  date: string;
}

interface JikanReviewResponse {
  data: JikanReview[];
  pagination: {
    last_visible_page: number;
    has_next_page: boolean;
  };
}

interface ReviewCrawlerProgress {
  startTime: string;
  lastUpdateTime: string;
  totalAnimeProcessed: number;
  totalReviewsProcessed: number;
  currentAnime?: {
    id: number;
    title: string;
    reviewsProcessed: number;
  };
  processedAnimeIds: Set<number>;
  errors: Array<{
    timestamp: string;
    type: 'anime_error' | 'api_error' | 'review_error';
    animeId?: number;
    error: string;
  }>;
  config: ReviewCrawlConfig;
}

export class ReviewCrawler {
  private analyzer: ReviewAnalyzer;
  private checkpointFile: string;
  private progress: ReviewCrawlerProgress;
  private requestTimes: number[] = [];
  private readonly maxRequestsPerSecond = 3; // Match Jikan API limit
  private readonly maxRequestsPerMinute = 60; // Match Jikan API limit
  private minuteRequestTimes: number[] = [];

  constructor(checkpointDir: string = './crawler-data') {
    this.analyzer = new ReviewAnalyzer();

    // Ensure checkpoint directory exists
    if (!fs.existsSync(checkpointDir)) {
      fs.mkdirSync(checkpointDir, { recursive: true });
    }

    this.checkpointFile = path.join(checkpointDir, 'review-crawler-progress.json');
    this.progress = this.loadProgress();
  }

  private loadProgress(): ReviewCrawlerProgress {
    try {
      if (fs.existsSync(this.checkpointFile)) {
        const data = fs.readFileSync(this.checkpointFile, 'utf8');
        const parsed = JSON.parse(data);

        // Convert processedAnimeIds array back to Set
        parsed.processedAnimeIds = new Set(parsed.processedAnimeIds || []);

        console.log(`📂 Loaded review crawler checkpoint: ${parsed.totalReviewsProcessed} reviews processed, ${parsed.totalAnimeProcessed} anime completed`);
        return parsed;
      }
    } catch (error) {
      console.warn('⚠️ Could not load review crawler checkpoint, starting fresh:', error);
    }

    // Return fresh progress
    return {
      startTime: new Date().toISOString(),
      lastUpdateTime: new Date().toISOString(),
      totalAnimeProcessed: 0,
      totalReviewsProcessed: 0,
      processedAnimeIds: new Set(),
      errors: [],
      config: {
        maxReviewsPerAnime: 50,
        includePreliminary: true,
        batchSize: 10,
        delayBetweenRequests: 1500, // 1.5 seconds
        delayBetweenAnime: 3000 // 3 seconds
      }
    };
  }

  private saveProgress(): void {
    try {
      const toSave = {
        ...this.progress,
        processedAnimeIds: Array.from(this.progress.processedAnimeIds),
        lastUpdateTime: new Date().toISOString()
      };

      fs.writeFileSync(this.checkpointFile, JSON.stringify(toSave, null, 2));
    } catch (error) {
      console.error('❌ Failed to save review crawler checkpoint:', error);
    }
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();

    // Remove old requests
    this.requestTimes = this.requestTimes.filter(time => now - time < 1000);
    this.minuteRequestTimes = this.minuteRequestTimes.filter(time => now - time < 60000);

    // Check minute limit
    if (this.minuteRequestTimes.length >= this.maxRequestsPerMinute) {
      const oldestRequest = this.minuteRequestTimes[0];
      const waitTime = 60000 - (now - oldestRequest) + 50;
      console.log(`⏱️ Minute rate limit reached, waiting ${Math.round(waitTime/1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.waitForRateLimit();
    }

    // Check second limit
    if (this.requestTimes.length >= this.maxRequestsPerSecond) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = 1000 - (now - oldestRequest) + 50;
      // Only log if waiting more than 200ms to reduce spam
      if (waitTime > 200) {
        console.log(`⏱️ Second rate limit reached, waiting ${waitTime}ms...`);
      }
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.waitForRateLimit();
    }

    // Add current request
    const currentTime = Date.now();
    this.requestTimes.push(currentTime);
    this.minuteRequestTimes.push(currentTime);
  }

  private async fetchWithRetry(url: string, retryCount = 0): Promise<Response> {
    await this.waitForRateLimit();

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Own-MAL-DB-ReviewCrawler/1.0'
        }
      });

      // Handle 429 Too Many Requests
      if (response.status === 429 && retryCount < 3) {
        const backoffTime = Math.pow(2, retryCount) * 5000; // 5s, 10s, 20s
        console.log(`🚫 429 Too Many Requests. Backing off for ${backoffTime/1000}s (attempt ${retryCount + 1}/3)...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return this.fetchWithRetry(url, retryCount + 1);
      }

      return response;
    } catch (error) {
      if (retryCount < 3) {
        const backoffTime = Math.pow(2, retryCount) * 2000;
        console.log(`⚠️ Network error, retrying in ${backoffTime/1000}s (attempt ${retryCount + 1}/3)...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return this.fetchWithRetry(url, retryCount + 1);
      }
      throw error;
    }
  }

  async crawlReviewsForAnime(animeId: number, config: ReviewCrawlConfig): Promise<number> {
    console.log(`🔍 Crawling reviews for anime ${animeId}`);

    // Check if already processed
    if (this.progress.processedAnimeIds.has(animeId)) {
      console.log(`⏭️ Skipping anime ${animeId} - already processed`);
      return 0;
    }

    // Get anime title for progress tracking
    const animeQuery = await db.query('SELECT title FROM anime WHERE mal_id = $1', [animeId]);
    const animeTitle = animeQuery.rows[0]?.title || `Anime ${animeId}`;

    this.progress.currentAnime = {
      id: animeId,
      title: animeTitle,
      reviewsProcessed: 0
    };

    try {
      let savedCount = 0;
      let page = 1;
      let hasMore = true;

      while (hasMore && savedCount < config.maxReviewsPerAnime) {
        try {
          console.log(`  📄 Fetching page ${page} for ${animeTitle}...`);

          const url = `https://api.jikan.moe/v4/anime/${animeId}/reviews?page=${page}&preliminary=${config.includePreliminary}`;
          const response = await this.fetchWithRetry(url);

          if (!response.ok) {
            if (response.status === 404) {
              console.log(`  ℹ️ No reviews found for anime ${animeId}`);
              break;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json() as JikanReviewResponse;

          if (!data.data || data.data.length === 0) {
            console.log(`  ℹ️ No more reviews on page ${page}`);
            break;
          }

          // Process each review
          for (const review of data.data) {
            if (savedCount >= config.maxReviewsPerAnime) break;

            try {
              // Analyze sentiment
              const sentiment = await this.analyzer.analyzeSentiment(review.review || '');

              // Save to database
              await this.saveReview({
                anime_id: animeId,
                username: review.user.username,
                user_score: review.score,
                review_text: review.review,
                helpful_count: review.votes || 0,
                is_preliminary: review.is_preliminary || false,
                date_posted: review.date ? new Date(review.date) : null,
                review_length: review.review?.length || 0,
                sentiment_score: sentiment.score,
                sentiment_label: sentiment.label
              });

              savedCount++;
              this.progress.totalReviewsProcessed++;
              this.progress.currentAnime.reviewsProcessed++;

              // Save progress every 10 reviews
              if (savedCount % 10 === 0) {
                this.saveProgress();
              }

            } catch (error) {
              this.progress.errors.push({
                timestamp: new Date().toISOString(),
                type: 'review_error',
                animeId,
                error: `Failed to process review from ${review.user.username}: ${error}`
              });
              console.error(`  ❌ Error processing review from ${review.user.username}:`, error);
            }
          }

          // Check if there are more pages
          hasMore = data.pagination?.has_next_page || false;
          page++;

          console.log(`  ✅ Page ${page - 1} completed. Reviews saved: ${savedCount} / ${config.maxReviewsPerAnime}`);

          // Delay between pages
          if (hasMore && savedCount < config.maxReviewsPerAnime) {
            await new Promise(resolve => setTimeout(resolve, config.delayBetweenRequests));
          }

        } catch (error) {
          this.progress.errors.push({
            timestamp: new Date().toISOString(),
            type: 'api_error',
            animeId,
            error: `Failed to fetch page ${page}: ${error}`
          });
          console.error(`  ❌ Error fetching page ${page}:`, error);
          break;
        }
      }

      // Mark anime as processed
      this.progress.processedAnimeIds.add(animeId);
      this.progress.totalAnimeProcessed++;
      this.progress.currentAnime = undefined;

      console.log(`✅ Completed anime ${animeId} (${animeTitle}): ${savedCount} reviews saved`);

      // Update anime reception data if we have reviews
      if (savedCount > 0) {
        try {
          await this.analyzer.updateAnimeReceptionData(animeId);
          console.log(`  📊 Reception data updated for ${animeTitle}`);
        } catch (error) {
          console.error(`  ⚠️ Failed to update reception data for ${animeTitle}:`, error);
        }
      }

      this.saveProgress();
      return savedCount;

    } catch (error) {
      this.progress.errors.push({
        timestamp: new Date().toISOString(),
        type: 'anime_error',
        animeId,
        error: `Failed to crawl anime: ${error}`
      });
      console.error(`❌ Error crawling reviews for anime ${animeId}:`, error);
      return 0;
    }
  }

  private async saveReview(reviewData: any): Promise<void> {
    const query = `
      INSERT INTO anime_reviews (
        anime_id, username, user_score, review_text, helpful_count,
        is_preliminary, date_posted, review_length, sentiment_score, sentiment_label
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (anime_id, username) DO UPDATE SET
        user_score = EXCLUDED.user_score,
        review_text = EXCLUDED.review_text,
        helpful_count = EXCLUDED.helpful_count,
        sentiment_score = EXCLUDED.sentiment_score,
        sentiment_label = EXCLUDED.sentiment_label,
        updated_at = NOW()
    `;

    await db.query(query, [
      reviewData.anime_id,
      reviewData.username,
      reviewData.user_score,
      reviewData.review_text,
      reviewData.helpful_count,
      reviewData.is_preliminary,
      reviewData.date_posted,
      reviewData.review_length,
      reviewData.sentiment_score,
      reviewData.sentiment_label
    ]);
  }

  async crawlPriorityAnime(config?: Partial<ReviewCrawlConfig>): Promise<void> {
    const finalConfig: ReviewCrawlConfig = {
      ...this.progress.config,
      ...config
    };

    this.progress.config = finalConfig;
    this.progress.startTime = new Date().toISOString();
    this.saveProgress();

    console.log('🎯 Starting priority anime review crawling...');
    console.log('Config:', finalConfig);

    const priorityAnime = await this.identifyPriorityAnime();
    console.log(`🎯 Found ${priorityAnime.length} priority anime for review crawling`);

    for (const anime of priorityAnime) {
      // Skip if already processed
      if (this.progress.processedAnimeIds.has(anime.mal_id)) {
        continue;
      }

      await this.crawlReviewsForAnime(anime.mal_id, finalConfig);

      // Delay between anime
      await new Promise(resolve => setTimeout(resolve, finalConfig.delayBetweenAnime));
    }

    console.log('🎉 Priority anime review crawling completed!');
    this.exportProgress();
  }

  private async identifyPriorityAnime(): Promise<Array<{ mal_id: number; title: string; score: number; members: number }>> {
    // Get anime that would benefit most from review analysis
    const query = `
      SELECT mal_id, title, score, members, airing
      FROM anime
      WHERE
        -- Currently airing anime (need preliminary reviews)
        (airing = true) OR
        -- Popular anime with potential for taste matching
        (members > 50000 AND score IS NOT NULL) OR
        -- Hidden gems (high score, low members)
        (score >= 8.0 AND members BETWEEN 1000 AND 100000) OR
        -- Polarizing anime (around 7.0 score - mixed reception)
        (score BETWEEN 6.5 AND 7.5 AND members > 20000)
      ORDER BY
        CASE WHEN airing THEN 1 ELSE 2 END,
        members DESC
      LIMIT 200
    `;

    const result = await db.query(query);
    return result.rows;
  }

  getProgressSummary(): {
    totalAnime: number;
    totalReviews: number;
    currentAnime?: string;
    errors: number;
    averageReviewsPerAnime: number;
  } {
    return {
      totalAnime: this.progress.totalAnimeProcessed,
      totalReviews: this.progress.totalReviewsProcessed,
      currentAnime: this.progress.currentAnime?.title,
      errors: this.progress.errors.length,
      averageReviewsPerAnime: this.progress.totalAnimeProcessed > 0
        ? this.progress.totalReviewsProcessed / this.progress.totalAnimeProcessed
        : 0
    };
  }

  reset(): void {
    this.progress = {
      startTime: new Date().toISOString(),
      lastUpdateTime: new Date().toISOString(),
      totalAnimeProcessed: 0,
      totalReviewsProcessed: 0,
      processedAnimeIds: new Set(),
      errors: [],
      config: {
        maxReviewsPerAnime: 50,
        includePreliminary: true,
        batchSize: 10,
        delayBetweenRequests: 1500,
        delayBetweenAnime: 3000
      }
    };

    if (fs.existsSync(this.checkpointFile)) {
      fs.unlinkSync(this.checkpointFile);
    }

    console.log('🔄 Review crawler checkpoint reset');
  }

  exportProgress(): void {
    const exportFile = this.checkpointFile.replace('.json', '-export.json');
    const exportData = {
      ...this.progress,
      processedAnimeIds: Array.from(this.progress.processedAnimeIds),
      summary: this.getProgressSummary()
    };

    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
    console.log(`📤 Review crawler progress exported to: ${exportFile}`);
  }
}

// CLI interface
if (require.main === module) {
  const crawler = new ReviewCrawler();
  const command = process.argv[2];

  if (command === 'priority') {
    crawler.crawlPriorityAnime()
      .then(() => console.log('✅ Priority anime review crawling completed'))
      .catch(console.error);
  } else if (command === 'anime' && process.argv[3]) {
    const animeId = parseInt(process.argv[3]);
    crawler.crawlReviewsForAnime(animeId, {
      maxReviewsPerAnime: 50,
      includePreliminary: true,
      batchSize: 10,
      delayBetweenRequests: 1500,
      delayBetweenAnime: 3000
    })
      .then(() => console.log(`✅ Review crawling completed for anime ${animeId}`))
      .catch(console.error);
  } else if (command === 'status') {
    const summary = crawler.getProgressSummary();
    console.log('📊 Review Crawler Status:');
    console.log(`  • Total anime processed: ${summary.totalAnime}`);
    console.log(`  • Total reviews processed: ${summary.totalReviews}`);
    console.log(`  • Average reviews per anime: ${summary.averageReviewsPerAnime.toFixed(1)}`);
    console.log(`  • Current anime: ${summary.currentAnime || 'None'}`);
    console.log(`  • Errors: ${summary.errors}`);
  } else if (command === 'reset') {
    crawler.reset();
  } else if (command === 'export') {
    crawler.exportProgress();
  } else {
    console.log('Usage:');
    console.log('  npm run crawl:reviews priority     # Crawl priority anime');
    console.log('  npm run crawl:reviews anime <id>   # Crawl specific anime');
    console.log('  npm run crawl:reviews status       # Show progress');
    console.log('  npm run crawl:reviews reset        # Reset progress');
    console.log('  npm run crawl:reviews export       # Export progress');
  }
}