# own-mal-db - Issues & Roadmap

## 🔴 Critical Issues

None currently.

## ⚠️ High Priority

### API Migration Needed
**MCP servers using legacy API endpoints** - All MCP servers need to migrate to v1 API

**Affected Components**:
- `anime-search-mcp` - Currently uses old Jikan API directly (not even our database!)
- `anime-recommendation-mcp` - May use legacy local API endpoints

**Action Required**:
1. Update `anime-search-mcp` to use `/api/v1/*` endpoints
2. Update `anime-recommendation-mcp` to use `/api/v1/*` endpoints
3. Remove old `/api/anime/*` endpoints after migration complete
4. Update documentation and examples

**Benefits**:
- Consistent response formats (clean/compact)
- Better error handling
- OpenAPI documentation alignment
- Better performance with new optimized queries

---

## 🟡 Medium Priority

### Performance Optimization
- Add Redis caching layer for hot queries (top anime, genres list)
- Optimize full-text search queries (currently can be slow on large results)
- Add query result pagination caching
- Database connection pooling tuning

### Data Quality
- Some anime missing English titles
- Review sentiment scores need validation/retraining
- Missing data for older/obscure anime
- Studio/producer data incomplete for some entries

### Scraper Improvements
- Add resume-from-checkpoint validation (verify data integrity)
- Implement parallel scraping (respect rate limits)
- Add scraper for character/staff data
- Add scraper for forum/discussion data
- Better error logging and notification

### API Features
- GraphQL API layer (for flexible queries)
- WebSocket support for real-time updates
- Bulk operations API (batch insert/update)
- API rate limiting and authentication
- CORS configuration improvements

---

## 🟢 Low Priority / Nice to Have

### Documentation
- Add more API usage examples to OpenAPI spec
- Create Postman collection
- Add integration testing guide
- Document database optimization strategies

### Developer Experience
- Add database seeding with sample data
- Improve migration rollback support
- Add database backup/restore scripts
- Docker compose profiles (dev/prod)

### Analytics
- Track API endpoint usage statistics
- Monitor database query performance
- Add health check endpoints with detailed status
- Database growth tracking and visualization

### Data Enrichment
- Scrape streaming availability data
- Add cross-platform ratings (IMDB, Anilist, etc.)
- Character/voice actor data
- Episode titles and summaries
- Franchise/sequel relationships

---

## ✅ Completed

- ✅ v1 API with OpenAPI documentation
- ✅ Multiple response formats (standard/clean/compact)
- ✅ Review sentiment analysis
- ✅ Reception insights and polarization metrics
- ✅ Full-text search implementation
- ✅ Docker containerization
- ✅ Migration system
- ✅ Interactive API documentation (Scalar)

---

## 🎯 Future Enhancements

### Advanced Features
- Machine learning models for better recommendations
- User preference learning system integration
- Trend analysis (rising/falling popularity)
- Seasonal comparison analytics
- Community pattern detection

### Integrations
- MyAnimeList official API integration (for real-time data)
- Crunchyroll API integration
- AniList API integration
- Discord bot integration
- Telegram bot integration

### Infrastructure
- Multi-region deployment support
- CDN for image serving
- Elasticsearch for advanced search
- Message queue for async processing
- Monitoring and alerting system

---

## 📝 Technical Debt

### Code Quality
- Refactor legacy route handlers to match v1 structure
- Add more comprehensive unit tests
- Add integration tests for all v1 endpoints
- Type safety improvements (stricter TypeScript)
- Error handling standardization

### Database
- Review and optimize indexes (some may be redundant)
- Implement database sharding strategy for scale
- Add database versioning metadata
- Improve migration scripts (more granular)
- Archive old/unused data

### Configuration
- Move hardcoded values to environment variables
- Implement feature flags system
- Better secrets management
- Environment-specific configurations

---

## 🐛 Known Bugs

### Minor Issues
- Some anime images returning 404 (external MAL URLs)
- Search ranking sometimes inconsistent for partial matches
- Date parsing fails for some "aired_from" dates
- JSONB fields not properly validated on insert

### Edge Cases
- Very long anime titles cause UI issues in some consumers
- Special characters in titles sometimes break full-text search
- Null episode counts for ongoing anime cause filtering issues
- Season detection fails for year-crossing anime

---

## 💡 Ideas / Brainstorming

- AI-generated anime summaries (TL;DR versions)
- Comparison tool (side-by-side anime analysis)
- "Similar to X but with Y" semantic search
- Watch time calculator and statistics
- Mood-based seasonal recommendations
- Community watching trends and patterns
- Social features (watchlists, comments, ratings)

---

## 📊 Metrics to Track

- Database size growth over time
- API response times (p50, p95, p99)
- Most popular endpoints
- Search query patterns
- Scraper success/failure rates
- Review sentiment distribution
- Genre popularity trends

---

## 🔧 Maintenance Tasks

### Regular
- Run scrapers weekly for new anime
- Review and update deprecated endpoints
- Monitor database size and performance
- Update dependencies monthly
- Backup database weekly

### Periodic
- Database vacuum and analyze (PostgreSQL maintenance)
- Review and archive old logs
- Update OpenAPI documentation
- Security audit and updates
- Performance benchmarking

---

## 📞 Help Wanted

Areas where collaboration would be valuable:
- ML model for better sentiment analysis
- UI/UX for admin dashboard
- Better scraper algorithms
- Performance optimization expertise
- Security review and hardening

---

*Last Updated: 2025-09-30*
