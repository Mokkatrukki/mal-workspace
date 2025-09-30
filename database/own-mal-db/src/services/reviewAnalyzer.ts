import { db } from '../database/connection';

export interface SentimentAnalysis {
  score: number; // -1 (negative) to 1 (positive)
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

export interface ReceptionProfile {
  anime_id: number;
  review_count: number;
  score_variance: number;
  polarization_score: number;
  sentiment_ratio: number;
  preliminary_review_count: number;
  avg_review_length: number;
  common_complaints: string[];
  common_praises: string[];
}

export class ReviewAnalyzer {

  async analyzeSentiment(reviewText: string): Promise<SentimentAnalysis> {
    if (!reviewText || reviewText.length < 10) {
      return { score: 0, label: 'neutral', confidence: 0 };
    }

    // Enhanced keyword-based sentiment analysis
    const positiveWords = [
      'amazing', 'excellent', 'fantastic', 'brilliant', 'masterpiece',
      'beautiful', 'perfect', 'incredible', 'outstanding', 'wonderful',
      'love', 'adore', 'enjoy', 'great', 'awesome', 'superb', 'stunning',
      'captivating', 'engaging', 'entertaining', 'hilarious', 'touching',
      'emotional', 'gripping', 'compelling', 'satisfying', 'phenomenal',
      'breathtaking', 'marvelous', 'spectacular', 'impressive', 'charming',
      'delightful', 'refreshing', 'unique', 'innovative', 'creative'
    ];

    const negativeWords = [
      'terrible', 'awful', 'horrible', 'boring', 'disappointing',
      'waste', 'trash', 'bad', 'worst', 'hate', 'annoying',
      'stupid', 'ridiculous', 'pointless', 'overrated', 'underwhelming',
      'painful', 'cringe', 'bland', 'dull', 'mediocre', 'weak',
      'confusing', 'messy', 'rushed', 'poorly', 'lacking', 'forced',
      'awkward', 'predictable', 'cliche', 'generic', 'uninspired'
    ];

    const intensifiers = ['very', 'extremely', 'absolutely', 'incredibly', 'totally', 'completely'];
    const negators = ['not', 'never', 'no', 'hardly', 'barely', 'scarcely'];

    const text = reviewText.toLowerCase();
    const sentences = text.split(/[.!?]+/);

    let totalScore = 0;
    let sentimentWordCount = 0;

    for (const sentence of sentences) {
      const words = sentence.split(/\W+/);

      for (let i = 0; i < words.length; i++) {
        const word = words[i];
        let score = 0;
        let multiplier = 1;

        // Check for sentiment words
        if (positiveWords.includes(word)) {
          score = 1;
        } else if (negativeWords.includes(word)) {
          score = -1;
        }

        if (score !== 0) {
          sentimentWordCount++;

          // Check for intensifiers before sentiment word
          if (i > 0 && intensifiers.includes(words[i - 1])) {
            multiplier = 1.5;
          }

          // Check for negators before sentiment word
          if (i > 0 && negators.includes(words[i - 1])) {
            score = -score;
          }

          totalScore += score * multiplier;
        }
      }
    }

    if (sentimentWordCount === 0) {
      return { score: 0, label: 'neutral', confidence: 0.1 };
    }

    const normalizedScore = totalScore / sentimentWordCount;
    const confidence = Math.min(sentimentWordCount / (reviewText.split(/\W+/).length * 0.1), 1);

    let label: 'positive' | 'negative' | 'neutral';
    if (normalizedScore > 0.3) label = 'positive';
    else if (normalizedScore < -0.3) label = 'negative';
    else label = 'neutral';

    return {
      score: Math.max(-1, Math.min(1, normalizedScore)),
      label,
      confidence: Math.max(0.1, confidence)
    };
  }

  async analyzeAnimeReception(animeId: number): Promise<ReceptionProfile> {
    const query = `
      SELECT
        user_score,
        review_text,
        is_preliminary,
        sentiment_score,
        review_length
      FROM anime_reviews
      WHERE anime_id = $1
    `;

    const result = await db.query(query, [animeId]);
    const reviews = result.rows;

    if (reviews.length === 0) {
      throw new Error(`No reviews found for anime ${animeId}`);
    }

    // Calculate reception metrics
    const scores = reviews.map(r => r.user_score).filter(s => s !== null);
    const meanScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - meanScore, 2), 0) / scores.length;

    const positiveReviews = reviews.filter(r => r.sentiment_score > 0.2).length;
    const negativeReviews = reviews.filter(r => r.sentiment_score < -0.2).length;
    const sentimentRatio = positiveReviews / Math.max(negativeReviews, 1);

    const preliminaryCount = reviews.filter(r => r.is_preliminary).length;
    const avgReviewLength = reviews.reduce((sum, r) => sum + (r.review_length || 0), 0) / reviews.length;

    // Extract common themes (simplified)
    const allReviewText = reviews.map(r => r.review_text || '').join(' ').toLowerCase();
    const commonComplaints = this.extractCommonThemes(allReviewText, 'negative');
    const commonPraises = this.extractCommonThemes(allReviewText, 'positive');

    return {
      anime_id: animeId,
      review_count: reviews.length,
      score_variance: variance,
      polarization_score: variance, // Simple approximation
      sentiment_ratio: sentimentRatio,
      preliminary_review_count: preliminaryCount,
      avg_review_length: avgReviewLength,
      common_complaints: commonComplaints,
      common_praises: commonPraises
    };
  }

  private extractCommonThemes(text: string, type: 'positive' | 'negative'): string[] {
    // Enhanced theme extraction with more specific categories
    const themes = {
      positive: [
        'animation', 'art style', 'visuals', 'soundtrack', 'music', 'ost',
        'story', 'plot', 'narrative', 'storytelling', 'world building',
        'character development', 'characters', 'protagonist', 'voice acting',
        'action scenes', 'fight scenes', 'comedy', 'humor', 'romance',
        'emotional', 'touching', 'deep', 'meaningful', 'original',
        'unique', 'creative', 'well written', 'pacing', 'ending'
      ],
      negative: [
        'pacing', 'slow pacing', 'rushed', 'animation quality', 'bad animation',
        'plot holes', 'confusing plot', 'weak story', 'boring story',
        'character development', 'flat characters', 'annoying characters',
        'bad ending', 'disappointing ending', 'filler episodes', 'filler',
        'fan service', 'fanservice', 'cliche', 'generic', 'predictable',
        'overrated', 'overhyped', 'repetitive', 'dragged out', 'inconsistent'
      ]
    };

    const foundThemes = themes[type].filter(theme => {
      const variations = [
        theme,
        theme.replace(' ', ''),
        theme.replace(' ', '-'),
        theme.split(' ').join('.*')
      ];

      return variations.some(variation => {
        const regex = new RegExp(`\\b${variation}\\b`, 'i');
        return regex.test(text);
      });
    });

    // Count frequency and return top themes
    const themeFrequency = foundThemes.map(theme => ({
      theme,
      count: (text.match(new RegExp(`\\b${theme}\\b`, 'gi')) || []).length
    }));

    return themeFrequency
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(item => item.theme);
  }

  async updateAnimeReceptionData(animeId: number): Promise<void> {
    try {
      const receptionProfile = await this.analyzeAnimeReception(animeId);

      const receptionData = {
        review_count: receptionProfile.review_count,
        score_variance: receptionProfile.score_variance,
        polarization_score: receptionProfile.polarization_score,
        sentiment_ratio: receptionProfile.sentiment_ratio,
        preliminary_review_count: receptionProfile.preliminary_review_count,
        avg_review_length: receptionProfile.avg_review_length,
        common_complaints: receptionProfile.common_complaints,
        common_praises: receptionProfile.common_praises,
        last_analyzed: new Date().toISOString()
      };

      await db.query(
        'UPDATE anime SET reception_data = $1 WHERE mal_id = $2',
        [JSON.stringify(receptionData), animeId]
      );
    } catch (error) {
      console.error(`Failed to update reception data for anime ${animeId}:`, error);
      throw error;
    }
  }

  async batchAnalyzeReviews(limit: number = 100): Promise<number> {
    // Find anime with reviews but no analyzed reception data
    const query = `
      SELECT DISTINCT ar.anime_id
      FROM anime_reviews ar
      LEFT JOIN anime a ON ar.anime_id = a.mal_id
      WHERE a.reception_data IS NULL
        OR (a.reception_data->>'last_analyzed')::timestamp < NOW() - INTERVAL '7 days'
      LIMIT $1
    `;

    const result = await db.query(query, [limit]);
    const animeIds = result.rows.map(row => row.anime_id);

    let processed = 0;
    for (const animeId of animeIds) {
      try {
        await this.updateAnimeReceptionData(animeId);
        processed++;

        // Small delay to avoid overwhelming the database
        if (processed % 10 === 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Failed to analyze reception for anime ${animeId}:`, error);
      }
    }

    return processed;
  }
}