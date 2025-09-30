import { Request, Response, NextFunction } from 'express';

// Configuration
const DEPRECATION_DATE = process.env.API_DEPRECATION_DATE || '2025-09-30';
const DOCS_BASE_URL = process.env.DOCS_BASE_URL || process.env.BASE_URL || 'http://localhost:3001';
const MIGRATION_GUIDE = process.env.MIGRATION_GUIDE_URL || `${DOCS_BASE_URL}/api/docs`;

/**
 * Middleware that adds deprecation headers and metadata to legacy API responses
 * Guides users to migrate to the v1 API
 */
export function deprecationMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Add deprecation headers
  res.setHeader('X-API-Deprecation', 'true');
  res.setHeader('X-API-Deprecation-Date', DEPRECATION_DATE);
  res.setHeader('X-API-Deprecation-Info', 'This endpoint is deprecated. Please migrate to /api/v1/* endpoints.');
  res.setHeader('X-API-Migration-Guide', MIGRATION_GUIDE);

  // Store original json method
  const originalJson = res.json.bind(res);

  // Override res.json to inject deprecation metadata
  res.json = function(body: any): Response {
    // Only modify successful responses that have our standard format
    if (body && typeof body === 'object' && body.success !== false) {
      // Add deprecation metadata
      body.deprecated = true;
      body.deprecation_info = {
        message: 'This API endpoint is deprecated and will be removed in a future version.',
        deprecated_since: DEPRECATION_DATE,
        migration_guide: MIGRATION_GUIDE,
        new_endpoint: getV1Equivalent(req.path),
        docs_url: `${DOCS_BASE_URL}/api/docs`
      };
    }

    return originalJson(body);
  };

  next();
}

/**
 * Maps legacy endpoints to their v1 equivalents
 */
function getV1Equivalent(legacyPath: string): string {
  const mappings: Record<string, string> = {
    // Search endpoints
    '/api/anime/search': '/api/v1/anime?query=...',
    '/api/anime/clean/search': '/api/v1/anime?query=...&format=clean',
    '/api/anime/compact/search': '/api/v1/anime?query=...&format=compact',

    // Top anime
    '/api/anime/top': '/api/v1/anime/top',
    '/api/anime/clean/top': '/api/v1/anime/top?format=clean',

    // Genres
    '/api/anime/genres': '/api/v1/genres',
    '/api/anime/stats/by-genre': '/api/v1/genres/stats',

    // Reviews
    '/api/anime/reviews': '/api/v1/reviews/anime/:id',

    // Reception
    '/api/anime/reception': '/api/v1/reception/anime/:id',
    '/api/anime/sentiment/search': '/api/v1/reception/search',
    '/api/anime/compare-reception': '/api/v1/reception/compare',
    '/api/anime/insights': '/api/v1/reception/insights',

    // Search capabilities
    '/api/anime/capabilities': '/api/v1/search/capabilities',
    '/api/anime/compact/seasonal': '/api/v1/search/seasonal?format=compact',
    '/api/anime/compact/current': '/api/v1/search/current?format=compact',

    // Bulk
    '/api/anime/bulk': '/api/v1/anime/bulk',
  };

  // Handle dynamic routes
  if (legacyPath.match(/^\/api\/anime\/\d+$/)) {
    return '/api/v1/anime/:id';
  }
  if (legacyPath.match(/^\/api\/anime\/clean\/\d+$/)) {
    return '/api/v1/anime/:id?format=clean';
  }
  if (legacyPath.match(/^\/api\/anime\/reviews\/\d+/)) {
    return '/api/v1/reviews/anime/:id';
  }
  if (legacyPath.match(/^\/api\/anime\/reception\/\d+/)) {
    return '/api/v1/reception/anime/:id';
  }

  return mappings[legacyPath] || '/api/v1';
}