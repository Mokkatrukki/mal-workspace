/**
 * v1 API Routes Index
 * Mounts all v1 routes
 */

import { Router } from 'express';
import animeRoutes from './anime.routes';
import reviewsRoutes from './reviews.routes';
import receptionRoutes from './reception.routes';
import searchRoutes from './search.routes';
import genresRoutes from './stats.routes';

const router = Router();

// Mount all v1 routes
router.use('/anime', animeRoutes);
router.use('/reviews', reviewsRoutes);
router.use('/reception', receptionRoutes);
router.use('/search', searchRoutes);
router.use('/genres', genresRoutes);

// v1 API info endpoint
router.get('/', (req, res) => {
  res.json({
    version: 'v1',
    status: 'active',
    documentation: '/api/docs',
    endpoints: {
      anime: {
        search: 'GET /api/v1/anime?query=...',
        getById: 'GET /api/v1/anime/:id',
        top: 'GET /api/v1/anime/top',
        bulk: 'GET /api/v1/anime/bulk?ids=1,2,3'
      },
      reviews: {
        getByAnime: 'GET /api/v1/reviews/anime/:id',
        summary: 'GET /api/v1/reviews/anime/:id/summary',
        sample: 'GET /api/v1/reviews/anime/:id/sample'
      },
      reception: {
        getByAnime: 'GET /api/v1/reception/anime/:id',
        search: 'GET /api/v1/reception/search?sentiment_pattern=...',
        compare: 'GET /api/v1/reception/compare?anime_id_1=1&anime_id_2=2',
        insights: 'GET /api/v1/reception/insights?insight_type=...'
      },
      search: {
        capabilities: 'GET /api/v1/search/capabilities',
        seasonal: 'GET /api/v1/search/seasonal',
        current: 'GET /api/v1/search/current'
      },
      genres: {
        list: 'GET /api/v1/genres',
        stats: 'GET /api/v1/genres/stats'
      }
    },
    notes: {
      format: 'Add ?format=compact or ?format=clean to any endpoint',
      legacy_api: 'Old /api/anime/* endpoints still work but are deprecated'
    }
  });
});

export default router;