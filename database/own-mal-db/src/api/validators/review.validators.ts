/**
 * Zod validation schemas for review endpoints
 * Extracted from route handlers for reusability
 */

import { z } from 'zod';

export const reviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(25).optional().default(10),
  preliminary: z.coerce.boolean().optional(),
  spoilers: z.coerce.boolean().optional(),
  sort: z.enum(['date', 'helpful', 'score']).optional().default('date'),
  order: z.enum(['asc', 'desc']).optional().default('desc')
});

export const sentimentPatternSchema = z.object({
  sentiment_pattern: z.enum([
    "mostly_positive", "mostly_negative", "highly_polarizing",
    "universally_loved", "underrated", "overrated", "mixed_reception"
  ]),
  min_reviews: z.coerce.number().int().positive().optional().default(10),
  limit: z.coerce.number().int().positive().max(50).optional().default(20)
});

export const insightTypeSchema = z.object({
  insight_type: z.enum([
    "sentiment_distribution", "polarization_trends", "review_engagement",
    "genre_sentiment", "database_overview"
  ]),
  genre_filter: z.string().optional()
});

export const compareReceptionSchema = z.object({
  anime_id_1: z.coerce.number().int().positive(),
  anime_id_2: z.coerce.number().int().positive()
});