/**
 * Anime Routes (v1)
 * Core anime CRUD operations
 */

import { Router } from 'express';
import { animeController } from '../controllers/anime.controller';
import { formatMiddleware } from '../middleware/formatMiddleware';

const router = Router();

// Apply format middleware to all routes
router.use(formatMiddleware);

// GET /api/v1/anime - Search anime
router.get('/', animeController.searchAnime.bind(animeController));

// GET /api/v1/anime/top - Get top anime
router.get('/top', animeController.getTopAnime.bind(animeController));

// GET /api/v1/anime/bulk - Get multiple anime by IDs
router.get('/bulk', animeController.getBulkAnime.bind(animeController));

// GET /api/v1/anime/:id - Get anime by ID (must be last)
router.get('/:id', animeController.getAnimeById.bind(animeController));

export default router;