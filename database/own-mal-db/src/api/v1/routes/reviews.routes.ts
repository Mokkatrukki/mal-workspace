/**
 * Reviews Routes (v1)
 * Review data endpoints
 */

import { Router } from 'express';
import { reviewsController } from '../controllers/reviews.controller';
import { formatMiddleware } from '../middleware/formatMiddleware';

const router = Router();

// Apply format middleware
router.use(formatMiddleware);

// GET /api/v1/reviews/anime/:id/summary - Get review summary
router.get('/anime/:id/summary', reviewsController.getReviewSummary.bind(reviewsController));

// GET /api/v1/reviews/anime/:id/sample - Get review sample
router.get('/anime/:id/sample', reviewsController.getReviewSample.bind(reviewsController));

// GET /api/v1/reviews/anime/:id - Get reviews for anime
router.get('/anime/:id', reviewsController.getReviewsByAnimeId.bind(reviewsController));

export default router;