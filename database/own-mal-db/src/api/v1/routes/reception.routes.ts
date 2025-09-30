/**
 * Reception Routes (v1)
 * Reception and sentiment analysis endpoints
 */

import { Router } from 'express';
import { receptionController } from '../controllers/reception.controller';
import { formatMiddleware } from '../middleware/formatMiddleware';

const router = Router();

// Apply format middleware
router.use(formatMiddleware);

// GET /api/v1/reception/search - Search by sentiment pattern
router.get('/search', receptionController.searchBySentiment.bind(receptionController));

// GET /api/v1/reception/compare - Compare reception
router.get('/compare', receptionController.compareReception.bind(receptionController));

// GET /api/v1/reception/insights - Get insights
router.get('/insights', receptionController.getInsights.bind(receptionController));

// GET /api/v1/reception/anime/:id - Get anime reception
router.get('/anime/:id', receptionController.getReceptionByAnimeId.bind(receptionController));

export default router;