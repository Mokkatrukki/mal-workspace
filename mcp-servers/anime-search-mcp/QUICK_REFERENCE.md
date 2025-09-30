# Anime Search MCP - Quick Reference

## 🚀 Essential Commands

### Discovery & Setup
```json
// Learn what the tool can do
{"tool": "getSearchCapabilities", "arguments": {}}

// Get all available genres with IDs
{"tool": "getAnimeGenres", "arguments": {}}

// Analyze a natural language query
{"tool": "suggestSearchStrategy", "arguments": {"user_query": "best action anime"}}
```

### Basic Searches
```json
// Simple text search
{"tool": "searchAnime", "arguments": {"query": "attack on titan", "limit": 10}}

// High-quality anime only
{"tool": "searchAnime", "arguments": {"min_score": 8.0, "order_by": "score", "sort": "desc", "limit": 15}}

// Genre-specific search (get genre IDs first!)
{"tool": "searchAnime", "arguments": {"genres": "1,4", "min_score": 7.0, "limit": 20}}
```

### Popular & Trending
```json
// Most popular anime
{"tool": "getTopAnime", "arguments": {"filter": "bypopularity", "limit": 25}}

// Currently airing
{"tool": "getTopAnime", "arguments": {"filter": "airing", "limit": 20}}

// Current season anime
{"tool": "getSeasonalAnimeRecommendations", "arguments": {"season": "now", "limit": 20}}
```

### Deep Dive
```json
// Detailed anime information
{"tool": "getAnimeDetails", "arguments": {"id": 16498}}

// Find similar anime
{"tool": "getAnimeRecommendations", "arguments": {"id": 16498}}

// Read user reviews
{"tool": "getAnimeReviews", "arguments": {"id": 16498, "spoilers": false}}
```

### Review Intelligence (NEW)
```json
// Get sentiment analysis and reception patterns
{"tool": "getAnimeReception", "arguments": {"id": 16498}}

// Find anime by sentiment patterns
{"tool": "searchByReviewSentiment", "arguments": {"sentiment_pattern": "mostly_positive", "limit": 10}}

// Database-wide review insights
{"tool": "getReviewInsights", "arguments": {"insight_type": "sentiment_distribution"}}

// Compare reception between two anime
{"tool": "compareAnimeReception", "arguments": {"anime_id_1": 1, "anime_id_2": 16498}}
```

## 🎯 Common Patterns

### "Find me something like X"
1. `searchAnime` with `query: "anime name"`
2. `getAnimeRecommendations` with the found ID

### "Best anime in genre X"
1. `getAnimeGenres` to find genre ID
2. `searchAnime` with `genres: "ID"` + `min_score: 8.0`

### "What's popular now?"
1. `getTopAnime` with `filter: "bypopularity"`
2. OR `getSeasonalAnimeRecommendations` with `season: "now"`

### "Short anime I can binge"
1. `searchAnime` with `order_by: "episodes"` + `sort: "asc"`

### "Find underrated gems"
1. `searchByReviewSentiment` with `sentiment_pattern: "underrated"`

### "Check if an anime is controversial"
1. `getAnimeReception` to see polarization scores
2. OR `searchByReviewSentiment` with `sentiment_pattern: "highly_polarizing"`

## 📊 Key Parameters

| Parameter | Values | Purpose |
|-----------|--------|---------|
| `min_score` | 0-10 | Quality filter (7.0+ recommended) |
| `genres` | "1,4,22" | Genre IDs (comma-separated) |
| `order_by` | score, popularity, year, episodes | Sort field |
| `sort` | desc, asc | Sort direction |
| `sfw` | true, false | Content filter |
| `limit` | 1-25 | Results per page |

## 🔥 Pro Tips

- **Always start with** `getSearchCapabilities()` to learn the tool
- **Use** `getAnimeGenres()` before genre filtering
- **Add** `min_score: 7.0+` for quality results
- **Check response metadata** for optimization tips
- **Combine strategies** for better discovery

## 🚨 Quick Fixes

| Problem | Solution |
|---------|----------|
| No results | Remove/reduce `min_score`, use broader genres |
| Too many results | Add `min_score: 8.0+`, use specific genres |
| Wrong results | Use `suggestSearchStrategy()` first |
| Don't know genres | Call `getAnimeGenres()` first |

## 📱 Mobile-Friendly Examples

### Find highly-rated action anime:
```json
{"tool": "searchAnime", "arguments": {"genres": "1", "min_score": 8.0, "limit": 10}}
```

### Get current popular anime:
```json
{"tool": "getTopAnime", "arguments": {"filter": "bypopularity", "limit": 15}}
```

### Analyze complex query:
```json
{"tool": "suggestSearchStrategy", "arguments": {"user_query": "romantic comedy anime from recent years"}}
```

---
*Quick reference for the enhanced anime-search MCP tool. For detailed documentation, see USAGE_GUIDE.md* 