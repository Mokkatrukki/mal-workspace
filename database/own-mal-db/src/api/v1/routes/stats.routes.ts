/**
 * Stats Routes (v1)
 * Statistics and genre endpoints - mounted at /api/v1/genres
 */

import { Router } from 'express';
import { statsController } from '../controllers/stats.controller';
import { formatMiddleware } from '../middleware/formatMiddleware';

const router = Router();

// Apply format middleware
router.use(formatMiddleware);

// GET /api/v1/genres/stats - Get genre statistics
router.get('/stats', statsController.getGenreStats.bind(statsController));

// GET /api/v1/genres - Get all genres
router.get('/', statsController.getAllGenres.bind(statsController));

export default router;