# API v1 Refactoring & Documentation Plan

## Overview
This document tracks the refactoring of the anime database API from a monolithic structure to a clean, versioned, and well-documented API. The refactoring maintains backwards compatibility while providing a better foundation for future growth.

## Goals
1. Create clean v1 API with RESTful structure
2. Maintain backwards compatibility with existing API
3. Add comprehensive OpenAPI documentation
4. Separate concerns (routes, controllers, repositories, validators)
5. Standardize response formats
6. Provide clear migration path for API consumers

---

## Project Structure

### Current Structure
```
src/api/
└── routes/
    └── anime.ts (1400+ lines - everything in one file)
```

### Target Structure
```
src/api/
├── v1/
│   ├── routes/
│   │   ├── index.ts              # Mount all v1 routes
│   │   ├── anime.routes.ts       # Core anime CRUD
│   │   ├── search.routes.ts      # Search endpoints
│   │   ├── reviews.routes.ts     # Review endpoints
│   │   ├── reception.routes.ts   # Reception/sentiment analysis
│   │   └── stats.routes.ts       # Statistics/insights
│   ├── controllers/
│   │   ├── anime.controller.ts
│   │   ├── search.controller.ts
│   │   ├── reviews.controller.ts
│   │   ├── reception.controller.ts
│   │   └── stats.controller.ts
│   └── middleware/
│       ├── formatMiddleware.ts   # Handle format query param
│       └── validateRequest.ts    # Generic Zod validator
├── validators/
│   ├── anime.validators.ts       # All anime-related Zod schemas
│   ├── review.validators.ts      # Review validation schemas
│   └── search.validators.ts      # Search parameter schemas
├── repositories/
│   ├── animeRepository.ts        # Anime database operations
│   ├── reviewRepository.ts       # Review database operations
│   └── receptionRepository.ts    # Reception/sentiment DB operations
├── types/
│   └── api.ts                    # Standardized API response types
├── routes/
│   └── anime.ts                  # LEGACY - keep for backwards compatibility
└── docs.ts                       # Scalar UI mounting
```

---

## Phase 1: Foundation (Tasks 1-3)
**Goal:** Set up new structure without breaking existing API

### ✅ Task 1: Create project structure
- [ ] Create directory structure
- [ ] Create placeholder files with basic exports
- [ ] No functionality yet, just scaffolding

### ✅ Task 2: Extract Zod validators
- [ ] Create `src/api/validators/anime.validators.ts`
- [ ] Create `src/api/validators/review.validators.ts`
- [ ] Create `src/api/validators/search.validators.ts`
- [ ] Move all schemas from `anime.ts` to validator files
- [ ] Export schemas for use in routes
- [ ] No logic changes, just extraction

### ✅ Task 3: Create repository layer
- [ ] Create `src/api/repositories/animeRepository.ts`
- [ ] Create `src/api/repositories/reviewRepository.ts`
- [ ] Create `src/api/repositories/receptionRepository.ts`
- [ ] Extract all direct DB queries from route handlers
- [ ] Move to appropriate repository methods
- [ ] Keep same functionality, just reorganized

**Checkpoint:** After Phase 1, you have clean separation of data access from routes.

---

## Phase 2: v1 Implementation (Tasks 4-8)
**Goal:** Build clean v1 API alongside existing API

### ✅ Task 4: Create controller layer
- [ ] Create controller files for each domain
- [ ] Move business logic from routes to controllers
- [ ] Controllers use repositories and validators
- [ ] Clean, testable business logic layer

### ✅ Task 5: Create v1 route files
- [ ] Implement new RESTful URL structure
- [ ] Wire up controllers to routes
- [ ] Use extracted validators
- [ ] **Keep old API untouched**

### ✅ Task 6: Add format middleware
- [ ] Create `formatMiddleware.ts`
- [ ] Handle `?format=compact|clean|standard` query param
- [ ] Transform responses based on format
- [ ] Eliminates need for `/compact/*` and `/clean/*` endpoints

### ✅ Task 7: Create standardized API response types
- [ ] Define `ApiResponse<T>` interface
- [ ] Define `ApiError` interface
- [ ] Define `ApiMeta` interface
- [ ] Consistent success/error format across all endpoints

### ✅ Task 8: Mount v1 routes in main app
- [ ] Update `src/index.ts`
- [ ] Add `/api/v1/*` routes
- [ ] Keep existing `/api/anime/*` working
- [ ] Update health check endpoint with v1 info

**Checkpoint:** After Phase 2, v1 API is fully functional and old API still works.

---

## Phase 3: Deprecation & Documentation (Tasks 9-11)
**Goal:** Guide users to v1 and document everything

### ✅ Task 9: Add deprecation notices to old API endpoints
- [ ] Add `X-API-Deprecation` header to old endpoints
- [ ] Add `deprecated: true` field in response meta
- [ ] Add `migration_url` pointing to documentation
- [ ] Update old endpoint responses with migration hints

### ✅ Task 10: Create OpenAPI spec for both v1 and legacy endpoints
- [ ] Create `docs/api/openapi.yaml`
- [ ] Document all v1 endpoints
- [ ] Document legacy endpoints (marked deprecated)
- [ ] Include schemas, examples, descriptions
- [ ] Add migration notes

### ✅ Task 11: Add Scalar UI for interactive API documentation
- [ ] Install `@scalar/express-api-reference`
- [ ] Create `src/api/docs.ts`
- [ ] Mount Scalar UI at `/api/docs`
- [ ] Beautiful interactive documentation

**Checkpoint:** After Phase 3, API is fully documented and users have clear migration path.

---

## Phase 4: Quality & Documentation (Tasks 12-13)
**Goal:** Ensure everything works and is documented

### ✅ Task 12: Test all endpoints and verify backwards compatibility
- [ ] Manual test all v1 endpoints
- [ ] Verify old API still works
- [ ] Test format transformations (compact/clean/standard)
- [ ] Test error handling
- [ ] Test pagination
- [ ] Document any issues found

### ✅ Task 13: Update README with API documentation and migration guide
- [ ] Add API overview section
- [ ] Add quick start examples
- [ ] Add migration guide (old → v1)
- [ ] Link to interactive docs
- [ ] Update installation instructions

**Checkpoint:** Project complete! Clean v1 API with full documentation.

---

## URL Mapping Reference

### Anime Endpoints
| Old URL | New v1 URL | Notes |
|---------|------------|-------|
| `GET /api/anime/search` | `GET /api/v1/anime?query=...` | Main search endpoint |
| `GET /api/anime/clean/search` | `GET /api/v1/anime?format=clean` | Use format query param |
| `GET /api/anime/compact/search` | `GET /api/v1/anime?format=compact` | Use format query param |
| `GET /api/anime/:id` | `GET /api/v1/anime/:id` | Get single anime |
| `GET /api/anime/clean/:id` | `GET /api/v1/anime/:id?format=clean` | Use format query param |
| `GET /api/anime/top/:limit?` | `GET /api/v1/anime/top?limit=50` | Top anime |
| `GET /api/anime/clean/top/:limit?` | `GET /api/v1/anime/top?format=clean&limit=50` | Use format query param |
| `GET /api/anime/bulk` | `GET /api/v1/anime/bulk?ids=1,2,3` | Bulk fetch |

### Genre Endpoints
| Old URL | New v1 URL | Notes |
|---------|------------|-------|
| `GET /api/anime/genres` | `GET /api/v1/genres` | List all genres |
| `GET /api/anime/stats/by-genre` | `GET /api/v1/genres/stats` | Genre statistics |

### Review Endpoints
| Old URL | New v1 URL | Notes |
|---------|------------|-------|
| `GET /api/anime/reviews/:id` | `GET /api/v1/reviews/anime/:id` | Get reviews |
| `GET /api/anime/reviews/:id/summary` | `GET /api/v1/reviews/anime/:id/summary` | Quick summary |
| `GET /api/anime/reviews/:id/sample` | `GET /api/v1/reviews/anime/:id/sample` | Balanced sample |

### Reception/Sentiment Endpoints
| Old URL | New v1 URL | Notes |
|---------|------------|-------|
| `GET /api/anime/reception/:id` | `GET /api/v1/reception/anime/:id` | Reception analysis |
| `GET /api/anime/sentiment/search` | `GET /api/v1/reception/search` | Search by sentiment |
| `GET /api/anime/compare-reception` | `GET /api/v1/reception/compare` | Compare two anime |
| `GET /api/anime/insights` | `GET /api/v1/reception/insights` | Database insights |

### Search/Discovery Endpoints
| Old URL | New v1 URL | Notes |
|---------|------------|-------|
| `GET /api/anime/capabilities` | `GET /api/v1/search/capabilities` | Search capabilities |
| `GET /api/anime/compact/seasonal` | `GET /api/v1/search/seasonal?format=compact` | Seasonal anime |
| `GET /api/anime/compact/current` | `GET /api/v1/search/current?format=compact` | Currently airing |

---

## Key Principles

1. **No breaking changes** - Old API continues to work exactly as before
2. **Progressive enhancement** - v1 is cleaner, not functionally different
3. **Clear deprecation path** - Users know exactly what to migrate to
4. **Resume-friendly** - Can stop after any phase/task
5. **Documentation-first** - OpenAPI spec for all endpoints
6. **Separation of concerns** - Routes → Controllers → Repositories → Database

---

## Response Format Changes

### Old Format (Inconsistent)
```json
// Some endpoints
{
  "success": true,
  "data": {...}
}

// Others
{
  "success": true,
  "data": {...},
  "note": "Some note"
}

// Others
{
  "success": true,
  "total_results": 10,
  "data": [...]
}
```

### New Format (Standardized)
```json
{
  "success": true,
  "data": {...},
  "meta": {
    "format": "standard",
    "page": 1,
    "limit": 25,
    "total": 100,
    "note": "Optional note"
  }
}
```

### Error Format
```json
{
  "success": false,
  "error": {
    "message": "Validation error",
    "code": "VALIDATION_ERROR",
    "details": [...]
  }
}
```

---

## Format Query Parameter

Instead of separate endpoints for different formats, use `?format=` query parameter:

- `?format=standard` (default) - Full data with all fields
- `?format=clean` - LLM-optimized, essential fields only
- `?format=compact` - Ultra-compact for MCP tools, minimal token usage

**Example:**
```
GET /api/v1/anime?query=naruto&format=compact
GET /api/v1/anime/5?format=clean
GET /api/v1/reviews/anime/5?format=standard
```

---

## Testing Checklist

### v1 API Tests
- [ ] GET /api/v1/anime (search)
- [ ] GET /api/v1/anime/:id
- [ ] GET /api/v1/anime/top
- [ ] GET /api/v1/anime/bulk
- [ ] GET /api/v1/genres
- [ ] GET /api/v1/genres/stats
- [ ] GET /api/v1/reviews/anime/:id
- [ ] GET /api/v1/reviews/anime/:id/summary
- [ ] GET /api/v1/reviews/anime/:id/sample
- [ ] GET /api/v1/reception/anime/:id
- [ ] GET /api/v1/reception/search
- [ ] GET /api/v1/reception/compare
- [ ] GET /api/v1/reception/insights
- [ ] GET /api/v1/search/capabilities
- [ ] GET /api/v1/search/seasonal
- [ ] GET /api/v1/search/current

### Format Tests
- [ ] ?format=standard
- [ ] ?format=clean
- [ ] ?format=compact

### Legacy API Tests (Backwards Compatibility)
- [ ] All old endpoints still work
- [ ] Deprecation headers present
- [ ] Response format unchanged

### Error Handling Tests
- [ ] Invalid parameters return 400
- [ ] Not found returns 404
- [ ] Server errors return 500
- [ ] Validation errors include details

---

## Progress Tracking

### Phase 1: Foundation
- [ ] Task 1: Project structure
- [ ] Task 2: Extract validators
- [ ] Task 3: Create repositories

### Phase 2: Implementation
- [ ] Task 4: Controllers
- [ ] Task 5: v1 routes
- [ ] Task 6: Format middleware
- [ ] Task 7: Response types
- [ ] Task 8: Mount routes

### Phase 3: Documentation
- [ ] Task 9: Deprecation notices
- [ ] Task 10: OpenAPI spec
- [ ] Task 11: Scalar UI

### Phase 4: Quality
- [ ] Task 12: Testing
- [ ] Task 13: README

---

## Notes & Decisions

### Date: 2025-09-30
- Started refactoring plan
- Decided on hybrid approach: v1 + legacy with deprecation
- Using Scalar for documentation UI
- Format middleware instead of separate endpoints

---

## Future Enhancements (Post-v1)

- [ ] Rate limiting
- [ ] API key authentication
- [ ] Caching layer
- [ ] GraphQL endpoint
- [ ] WebSocket for real-time updates
- [ ] Automated tests (Jest/Supertest)
- [ ] CI/CD pipeline
- [ ] Remove legacy API (v2.0.0)

---

Last updated: 2025-09-30