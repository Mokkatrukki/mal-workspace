import { db } from '../database/connection';
import { ReviewAnalyzer } from '../services/reviewAnalyzer';

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

export class ForcedReviewCrawler {
  private analyzer: ReviewAnalyzer;
  private requestTimes: number[] = [];
  private readonly maxRequestsPerSecond = 3;

  constructor() {
    this.analyzer = new ReviewAnalyzer();
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    this.requestTimes = this.requestTimes.filter(time => now - time < 1000);

    if (this.requestTimes.length >= this.maxRequestsPerSecond) {
      const oldestRequest = this.requestTimes[0];
      const waitTime = 1000 - (now - oldestRequest) + 100;
      console.log(`    Rate limiting: waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.waitForRateLimit();
    }

    this.requestTimes.push(now);
  }

  private async fetchWithRetry(url: string, retryCount = 0): Promise<Response> {
    await this.waitForRateLimit();

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Own-MAL-DB-ReviewCrawler/1.0'
        }
      });

      if (response.status === 429 && retryCount < 3) {
        const backoffTime = Math.pow(2, retryCount) * 5000;
        console.log(`    429 error, backing off for ${backoffTime/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return this.fetchWithRetry(url, retryCount + 1);
      }

      return response;
    } catch (error) {
      if (retryCount < 3) {
        const backoffTime = Math.pow(2, retryCount) * 2000;
        console.log(`    Network error, retrying in ${backoffTime/1000}s...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return this.fetchWithRetry(url, retryCount + 1);
      }
      throw error;
    }
  }

  async crawlReviewsForAnime(animeId: number, targetReviews: number = 50): Promise<number> {
    console.log(`  Fetching reviews for anime ${animeId}...`);

    // Check current review count
    const currentCount = await db.query(
      'SELECT COUNT(*) as count FROM anime_reviews WHERE anime_id = $1',
      [animeId]
    );
    const existing = parseInt(currentCount.rows[0].count);

    if (existing >= targetReviews) {
      console.log(`  Already has ${existing} reviews (target: ${targetReviews})`);
      return 0;
    }

    console.log(`  Current: ${existing} reviews, target: ${targetReviews}`);

    try {
      let savedCount = 0;
      let page = 1;
      let hasMore = true;
      const needed = targetReviews - existing;

      while (hasMore && savedCount < needed) {
        console.log(`    Fetching page ${page}...`);

        const url = `https://api.jikan.moe/v4/anime/${animeId}/reviews?page=${page}&preliminary=true`;
        const response = await this.fetchWithRetry(url);

        if (!response.ok) {
          if (response.status === 404) {
            console.log(`    No reviews found for anime ${animeId}`);
            break;
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as JikanReviewResponse;

        if (!data.data || data.data.length === 0) {
          console.log(`    No more reviews on page ${page}`);
          break;
        }

        console.log(`    Processing ${data.data.length} reviews from page ${page}...`);

        for (const review of data.data) {
          if (savedCount >= needed) break;

          try {
            // Check if review already exists
            const exists = await db.query(
              'SELECT id FROM anime_reviews WHERE anime_id = $1 AND username = $2',
              [animeId, review.user.username]
            );

            if (exists.rows.length > 0) {
              console.log(`    Skipping duplicate review from ${review.user.username}`);
              continue;
            }

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
            console.log(`    Saved review ${savedCount}/${needed} from ${review.user.username}`);

          } catch (error) {
            console.log(`    Error processing review from ${review.user.username}: ${error}`);
          }
        }

        hasMore = data.pagination?.has_next_page || false;
        page++;

        if (hasMore && savedCount < needed) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      // Update anime reception data if we have new reviews
      if (savedCount > 0) {
        try {
          await this.analyzer.updateAnimeReceptionData(animeId);
          console.log(`    Updated reception data`);
        } catch (error) {
          console.log(`    Failed to update reception data: ${error}`);
        }
      }

      return savedCount;

    } catch (error) {
      console.log(`    Error crawling reviews for anime ${animeId}: ${error}`);
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
}