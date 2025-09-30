/**
 * Zod validation schemas for search endpoints
 * Extracted from route handlers for reusability
 */

import { z } from 'zod';

export const searchParamsSchema = z.object({
  query: z.string().optional(),
  genres: z.string().optional(),
  min_score: z.coerce.number().min(0).max(10).optional(),
  max_score: z.coerce.number().min(0).max(10).optional(),

  // Year filtering
  year: z.coerce.number().int().min(1900).max(2030).optional(),
  min_year: z.coerce.number().int().min(1900).max(2030).optional(),
  max_year: z.coerce.number().int().min(1900).max(2030).optional(),
  decade: z.string().regex(/^\d{4}s$/).optional(), // e.g., "1990s", "2000s"

  // Popularity filtering
  min_popularity: z.coerce.number().int().positive().optional(),
  max_popularity: z.coerce.number().int().positive().optional(),
  exclude_very_popular: z.coerce.boolean().optional(),

  // Status and airing filtering
  airing_status: z.enum(['airing', 'finished', 'upcoming']).optional(),
  current_year_only: z.coerce.boolean().optional(),
  season: z.enum(['winter', 'spring', 'summer', 'fall']).optional(),

  // Episode count filtering
  min_episodes: z.coerce.number().int().positive().optional(),
  max_episodes: z.coerce.number().int().positive().optional(),

  // Type filtering
  type: z.enum(['TV', 'Movie', 'OVA', 'Special', 'ONA', 'Music']).optional(),

  order_by: z.enum([
    'mal_id', 'title', 'type', 'rating', 'start_date', 'end_date',
    'episodes', 'score', 'scored_by', 'rank', 'popularity', 'members', 'favorites'
  ]).optional().default('mal_id'),
  sort: z.enum(['desc', 'asc']).optional().default('desc'),
  sfw: z.coerce.boolean().optional().default(true),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(25).optional().default(25)
});