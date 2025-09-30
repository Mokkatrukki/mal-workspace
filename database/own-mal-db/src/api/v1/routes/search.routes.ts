/**
 * Search Routes (v1)
 * Search and discovery endpoints
 */

import { Router } from 'express';
import { searchController } from '../controllers/search.controller';
import { formatMiddleware } from '../middleware/formatMiddleware';

const router = Router();

// Apply format middleware
router.use(formatMiddleware);

// GET /api/v1/search/capabilities - Get search capabilities
router.get('/capabilities', searchController.getCapabilities.bind(searchController));

// GET /api/v1/search/seasonal - Get seasonal anime
router.get('/seasonal', searchController.getSeasonalAnime.bind(searchController));

// GET /api/v1/search/current - Get currently airing anime
router.get('/current', searchController.getCurrentAnime.bind(searchController));

export default router;