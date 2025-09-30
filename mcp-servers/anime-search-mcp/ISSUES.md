# anime-search-mcp - Issues & Roadmap

## 🔴 Critical Issues

### ⚠️ MIGRATE TO V1 API
**Currently using deprecated legacy API endpoints**

**Current State**:
```typescript
const LOCAL_API_BASE = "http://localhost:3001/api/anime";  // OLD!
```

**Target State**:
```typescript
const API_BASE = "http://localhost:3001/api/v1";  // NEW!
```

**Why This Matters**:
- Legacy API (`/api/anime/*`) will be removed in v2.0.0
- v1 API has better performance and caching
- v1 API has consistent error handling
- v1 API supports multiple response formats via `?format=` parameter
- OpenAPI documentation only covers v1 API

**Migration Checklist**:
- [ ] Update all API endpoint URLs from `/api/anime/*` to `/api/v1/*`
- [ ] Update endpoint paths:
  - `/api/anime/search` → `/api/v1/anime`
  - `/api/anime/genres` → `/api/v1/genres`
  - `/api/anime/:id` → `/api/v1/anime/:id`
  - `/api/anime/:id/reviews` → `/api/v1/reviews/anime/:id`
  - etc.
- [ ] Test all 17 MCP tools with new endpoints
- [ ] Update documentation
- [ ] Test with Claude Desktop
- [ ] Update chat-client integration

**Estimated Effort**: 2-3 hours (mostly testing)

---

## ⚠️ High Priority

### Code Structure
**3500-line single file is hard to maintain**

The entire MCP server is in `src/server.ts` (3500+ lines). Should split into:
```
src/
├── server.ts          # Main entry point
├── tools/             # Tool implementations
│   ├── search.ts
│   ├── reviews.ts
│   ├── reception.ts
│   └── seasonal.ts
├── api/               # API client
│   └── client.ts
├── types/             # TypeScript types
│   └── index.ts
└── utils/             # Helper functions
    └── validation.ts
```

**Benefits**:
- Easier to navigate and maintain
- Better test coverage potential
- Clearer separation of concerns
- Easier for multiple developers

### Configuration
**Hardcoded API URL**

Currently:
```typescript
const LOCAL_API_BASE = "http://localhost:3001/api/anime";
```

Should be:
```typescript
const API_BASE = process.env.API_BASE_URL || "http://localhost:3001/api/v1";
const API_PORT = process.env.API_PORT || "3001";
```

**Benefits**:
- Can point to different environments (dev/staging/prod)
- Easier testing
- Better Docker/container support

### Error Handling
**Some API errors don't reach Claude**

When database API fails, Claude sometimes gets generic errors instead of helpful messages.

**Improvements Needed**:
- Better error context propagation
- Suggest alternatives when searches fail
- Validate parameters before API call
- Provide recovery suggestions

---

## 🟡 Medium Priority

### Performance

#### Response Caching
Cache frequently requested data:
- Genre list (rarely changes)
- Top anime lists (can cache for hours)
- Seasonal anime (can cache for days)
- Popular search results

**Implementation Ideas**:
- In-memory cache with TTL
- Redis for shared caching
- Cache invalidation strategy

#### Request Batching
When Claude asks multiple questions, batch API requests:
```typescript
// Instead of 3 separate calls
await fetch(`/api/v1/anime/1`);
await fetch(`/api/v1/anime/2`);
await fetch(`/api/v1/anime/3`);

// Do one bulk call
await fetch(`/api/v1/anime/bulk?ids=1,2,3`);
```

Already have `getBulkAnimeByIds` tool, but could use it more internally.

### Features

#### Advanced Search Strategies
- Multi-genre logic (AND vs OR)
- Exclude genres (not this genre)
- Date range filtering (between years)
- Studio-based search
- Voice actor search (when data available)

#### Better Sentiment Analysis
- Emotion detection (happy/sad/exciting/boring)
- Aspect-based sentiment (story/animation/music)
- Trend analysis (improving/declining reception)
- Community consensus detection

#### Recommendation Improvements
- Content-based filtering (similar themes)
- Collaborative filtering (users who liked X also liked Y)
- Hybrid recommendations
- Explanation for why anime is recommended

---

## 🟢 Low Priority / Nice to Have

### Documentation
- Add JSDoc comments to all functions
- Create tool usage examples
- Document response format differences
- Add troubleshooting guide

### Testing
- Unit tests for validation functions
- Integration tests for API calls
- Mock API responses for testing
- Test error scenarios
- Performance benchmarks

### Developer Experience
- Add debug mode with verbose logging
- Better error messages
- Request/response logging option
- Health check endpoint

### Features
- Watchlist integration (sync with MAL)
- Personal recommendation based on watched anime
- Notification for new episodes
- Trending anime detection
- Social features (popular with friends)

---

## ✅ Completed

- ✅ Compact response format (94% token savings)
- ✅ Bulk anime fetching
- ✅ Sentiment analysis tools
- ✅ Reception comparison
- ✅ Seasonal anime discovery
- ✅ Smart fallback strategies
- ✅ Parameter validation
- ✅ Search capabilities discovery tool

---

## 🎯 Future Enhancements

### AI-Powered Features
- Natural language search ("anime like X but darker")
- Intent detection (recommend vs search vs analyze)
- Context-aware suggestions
- Learning from user preferences

### Advanced Analytics
- Watch time estimation
- Completion prediction
- Binge-worthiness score
- Pace analysis (slow burn vs fast paced)

### Multi-Source Integration
- Cross-reference with Anilist
- Streaming availability (Crunchyroll, etc.)
- Legal streaming links
- Episode release schedules

---

## 🐛 Known Bugs

### Minor Issues
- Some genre ID validation warnings are too verbose
- Pagination limit warning appears even with valid values
- Search suggestions sometimes repeat same advice
- Empty results don't always provide helpful alternatives

### Edge Cases
- Very long search queries cause truncation
- Special characters in anime titles sometimes break search
- Some anime missing from recommendations (incomplete data)
- Seasonal search fails for very old anime (pre-2000)

---

## 📝 Technical Debt

### Code Quality
- Remove commented-out code
- Consolidate duplicate validation logic
- Standardize error response format
- Add TypeScript strict mode
- Use Zod schemas consistently

### Dependencies
- Review and update dependencies
- Remove unused imports
- Consider lighter alternatives
- Security audit (npm audit)

### Documentation
- Update inline comments
- Add architecture decision records
- Document MCP protocol usage
- Create contribution guide

---

## 💡 Ideas / Brainstorming

- Voice search integration (for voice assistants)
- Image-based search (find anime from screenshot)
- MAL URL parsing (paste MAL link, get info)
- Export recommendations to various formats
- Compare multiple anime at once
- "Random anime" generator with filters
- Anime quiz/trivia mode
- Watch together suggestions (group recommendations)

---

## 🔧 Maintenance Tasks

### Regular
- Monitor API response times
- Review error logs
- Update deprecated MCP SDK features
- Test with latest Claude Desktop

### Periodic
- Benchmark performance
- Review and optimize popular queries
- Update tool descriptions based on usage
- Collect user feedback

---

## 📊 Metrics to Track

- Most used tools
- Average response times
- Error rates per tool
- Token usage per query
- Search success rate
- Fallback strategy effectiveness

---

*Last Updated: 2025-09-30*
*Priority Focus: Migrate to v1 API, then refactor code structure*
