/**
 * Zod validation schemas for anime endpoints
 * Extracted from route handlers for reusability
 */

import { z } from 'zod';

export const animeIdSchema = z.object({
  id: z.coerce.number().int().positive()
});

export const bulkAnimeSchema = z.object({
  ids: z.string().transform((str) => {
    const ids = str.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id) && id > 0);
    if (ids.length === 0) {
      throw new Error('No valid anime IDs provided');
    }
    if (ids.length > 100) {
      throw new Error('Too many IDs. Maximum 100 IDs allowed per request');
    }
    return ids;
  }),
  compact: z.coerce.boolean().optional().default(false)
});