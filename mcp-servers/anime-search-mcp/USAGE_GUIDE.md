# Anime Search MCP - Complete Usage Guide

## 🎯 Overview

The Anime Search MCP is a comprehensive tool for discovering and exploring anime using the MyAnimeList database. This guide covers all features, workflows, and best practices for getting the most out of the tool.

## 🚀 Quick Start

### 1. Discover Available Features
Always start by understanding what the tool can do:

```json
{
  "tool": "getSearchCapabilities",
  "arguments": {}
}
```

This returns comprehensive information about all available functions, parameters, and workflows.

### 2. Get Available Genres
Before using genre filters, discover what genres are available:

```json
{
  "tool": "getAnimeGenres", 
  "arguments": {}
}
```

### 3. Basic Search
Start with a simple search:

```json
{
  "tool": "searchAnime",
  "arguments": {
    "query": "attack on titan",
    "limit": 10
  }
}
```

## 🧠 Smart Search Workflows

### Workflow 1: Natural Language Query Analysis
For complex or unclear requests, use the strategy suggestion tool:

```json
{
  "tool": "suggestSearchStrategy",
  "arguments": {
    "user_query": "I want to find the best action anime from recent years"
  }
}
```

**Response includes:**
- Detected search intent
- Suggested parameters
- Alternative strategies
- Expected result count

### Workflow 2: Genre-Based Discovery
1. **Get genres first:**
```json
{
  "tool": "getAnimeGenres",
  "arguments": {}
}
```

2. **Search with specific genres:**
```json
{
  "tool": "searchAnime",
  "arguments": {
    "genres": "1,4",  // Action + Comedy
    "min_score": 7.5,
    "order_by": "score",
    "sort": "desc",
    "limit": 15
  }
}
```

### Workflow 3: Quality-Focused Search
Find highly-rated anime:

```json
{
  "tool": "searchAnime",
  "arguments": {
    "min_score": 8.0,
    "order_by": "score",
    "sort": "desc",
    "limit": 20
  }
}
```

### Workflow 4: Popularity-Based Discovery
Find trending or popular anime:

```json
{
  "tool": "getTopAnime",
  "arguments": {
    "filter": "bypopularity",
    "limit": 25
  }
}
```

### Workflow 5: Seasonal Discovery
Find current or upcoming anime:

```json
{
  "tool": "getSeasonalAnimeRecommendations",
  "arguments": {
    "season": "now",
    "filter": "tv",
    "limit": 20
  }
}
```

## 📋 Complete Function Reference

### Core Search Functions

#### `searchAnime`
**Purpose:** Main search function with comprehensive filtering
**Best for:** Specific searches with known criteria

**Key Parameters:**
- `query`: Text search (titles, characters, keywords)
- `genres`: Comma-separated genre IDs (use `getAnimeGenres` first)
- `min_score`: Quality filter (0-10, recommend 7.0+ for good anime)
- `order_by`: Sort field (score, popularity, year, etc.)
- `sort`: Direction ("desc" for highest first, "asc" for lowest)
- `sfw`: Content filter (true for family-friendly)
- `page`/`limit`: Pagination (max 25 per page)

**Example - Find highly-rated romance anime:**
```json
{
  "tool": "searchAnime",
  "arguments": {
    "genres": "22",  // Romance genre ID
    "min_score": 8.0,
    "order_by": "score",
    "sort": "desc",
    "limit": 10
  }
}
```

#### `getAnimeDetails`
**Purpose:** Get comprehensive information about a specific anime
**Best for:** Deep-diving into anime found through search

```json
{
  "tool": "getAnimeDetails",
  "arguments": {
    "id": 16498  // Attack on Titan MAL ID
  }
}
```

#### `getTopAnime`
**Purpose:** Get popular and trending anime lists
**Best for:** Discovering mainstream hits

**Filters:**
- `"airing"`: Currently broadcasting
- `"upcoming"`: Not yet aired
- `"bypopularity"`: Most popular
- `"favorite"`: Most favorited

```json
{
  "tool": "getTopAnime",
  "arguments": {
    "filter": "airing",
    "limit": 15
  }
}
```

### Discovery Functions

#### `getSeasonalAnimeRecommendations`
**Purpose:** Find anime from current or upcoming seasons
**Best for:** Staying current with new releases

```json
{
  "tool": "getSeasonalAnimeRecommendations",
  "arguments": {
    "season": "now",
    "filter": "tv",
    "sfw": true,
    "limit": 20
  }
}
```

#### `getAnimeRecommendations`
**Purpose:** Find anime similar to one you like
**Best for:** Expanding from known preferences

```json
{
  "tool": "getAnimeRecommendations",
  "arguments": {
    "id": 11061  // Hunter x Hunter MAL ID
  }
}
```

#### `getAnimeReviews`
**Purpose:** Read user reviews and opinions
**Best for:** Understanding community sentiment

```json
{
  "tool": "getAnimeReviews",
  "arguments": {
    "id": 5114,  // Fullmetal Alchemist: Brotherhood
    "spoilers": false,
    "preliminary": false
  }
}
```

### Utility Functions

#### `getSearchCapabilities`
**Purpose:** Understand all available features and parameters
**Best for:** Learning the tool or troubleshooting

#### `suggestSearchStrategy`
**Purpose:** Analyze natural language queries and suggest optimal parameters
**Best for:** Complex or unclear search requirements

#### `getAnimeGenres`
**Purpose:** Get all available genres with their IDs
**Best for:** Setting up genre-based searches

## 🧠 Review Intelligence Functions (NEW)

The anime database includes advanced review intelligence capabilities with sentiment analysis across 111K+ reviews.

### Core Review Intelligence Tools

#### `getAnimeReception`
**Purpose:** Get comprehensive reception analysis for a specific anime
**Best for:** Understanding community sentiment, polarization, and review patterns

```json
{
  "tool": "getAnimeReception",
  "arguments": {
    "id": 16498  // Attack on Titan MAL ID
  }
}
```

**Returns:**
- Sentiment ratio (positive/negative review balance)
- Polarization score (how divided opinions are)
- Common complaints and praises
- Review engagement metrics
- Overall sentiment classification

#### `searchByReviewSentiment`
**Purpose:** Find anime based on review sentiment patterns
**Best for:** Discovering hidden gems, controversial anime, or universally loved series

```json
{
  "tool": "searchByReviewSentiment",
  "arguments": {
    "sentiment_pattern": "mostly_positive",  // or "underrated", "highly_polarizing", etc.
    "min_reviews": 15,
    "limit": 10
  }
}
```

**Available sentiment patterns:**
- `"mostly_positive"` - High positive sentiment (ratio > 2.0)
- `"mostly_negative"` - Predominantly negative sentiment
- `"highly_polarizing"` - High score variance, divided opinions
- `"universally_loved"` - High positive sentiment + low polarization
- `"underrated"` - Good sentiment but lower MAL scores (hidden gems)
- `"overrated"` - High MAL scores but more negative reviews
- `"mixed_reception"` - Balanced but polarized reception

#### `getReviewInsights`
**Purpose:** Get database-wide review patterns and sentiment distributions
**Best for:** Understanding anime landscape trends and patterns

```json
{
  "tool": "getReviewInsights",
  "arguments": {
    "insight_type": "sentiment_distribution"  // or "polarization_trends", "database_overview"
  }
}
```

**Insight types:**
- `"sentiment_distribution"` - How anime are distributed across sentiment categories
- `"polarization_trends"` - Patterns in controversial vs consensus anime
- `"database_overview"` - General statistics about review coverage

#### `compareAnimeReception`
**Purpose:** Compare reception analysis between two anime
**Best for:** Understanding relative community opinions and preferences

```json
{
  "tool": "compareAnimeReception",
  "arguments": {
    "anime_id_1": 1,      // Cowboy Bebop
    "anime_id_2": 16498   // Attack on Titan
  }
}
```

**Returns side-by-side comparison of:**
- Sentiment ratios and differences
- Polarization scores
- Review engagement metrics
- Analysis of which is more positively received

### Review Intelligence Workflows

#### Workflow 1: "Find underrated anime"
```json
// Search for anime with positive sentiment but lower MAL scores
{
  "tool": "searchByReviewSentiment",
  "arguments": {
    "sentiment_pattern": "underrated",
    "min_reviews": 20,
    "limit": 15
  }
}
```

#### Workflow 2: "Check if an anime is controversial"
```json
// Step 1: Get reception analysis
{
  "tool": "getAnimeReception",
  "arguments": {
    "id": 14719  // JoJo's Bizarre Adventure (example)
  }
}

// Step 2: Compare with similar anime to understand relative polarization
{
  "tool": "searchByReviewSentiment",
  "arguments": {
    "sentiment_pattern": "highly_polarizing",
    "limit": 5
  }
}
```

#### Workflow 3: "Discover universally loved anime"
```json
{
  "tool": "searchByReviewSentiment",
  "arguments": {
    "sentiment_pattern": "universally_loved",
    "min_reviews": 25,
    "limit": 10
  }
}
```

#### Workflow 4: "Compare popular series"
```json
{
  "tool": "compareAnimeReception",
  "arguments": {
    "anime_id_1": 11061,  // Hunter x Hunter (2011)
    "anime_id_2": 38000   // Demon Slayer
  }
}
```

## 🎯 Common Use Cases & Examples

### Use Case 1: "I want something like [specific anime]"
```json
// Step 1: Search for the anime
{
  "tool": "searchAnime",
  "arguments": {
    "query": "demon slayer",
    "limit": 5
  }
}

// Step 2: Get recommendations based on the ID
{
  "tool": "getAnimeRecommendations", 
  "arguments": {
    "id": 38000  // Demon Slayer MAL ID from search
  }
}
```

### Use Case 2: "Best anime in a specific genre"
```json
// Step 1: Get available genres
{
  "tool": "getAnimeGenres",
  "arguments": {}
}

// Step 2: Search with high quality filter
{
  "tool": "searchAnime",
  "arguments": {
    "genres": "10",  // Fantasy
    "min_score": 8.0,
    "order_by": "score",
    "sort": "desc",
    "limit": 15
  }
}
```

### Use Case 3: "What's popular right now?"
```json
// Option 1: Top popular anime
{
  "tool": "getTopAnime",
  "arguments": {
    "filter": "bypopularity",
    "limit": 20
  }
}

// Option 2: Currently airing anime
{
  "tool": "getSeasonalAnimeRecommendations",
  "arguments": {
    "season": "now",
    "limit": 20
  }
}
```

### Use Case 4: "Short anime I can finish quickly"
```json
{
  "tool": "searchAnime",
  "arguments": {
    "min_score": 7.0,
    "order_by": "episodes",
    "sort": "asc",  // Shortest first
    "limit": 20
  }
}
```

### Use Case 5: "Classic anime from the past"
```json
{
  "tool": "searchAnime",
  "arguments": {
    "min_score": 8.0,
    "order_by": "year",
    "sort": "asc",  // Oldest first
    "limit": 15
  }
}
```

### Use Case 6: "Find hidden gems that are underrated" (NEW)
```json
{
  "tool": "searchByReviewSentiment",
  "arguments": {
    "sentiment_pattern": "underrated",
    "min_reviews": 20,
    "limit": 15
  }
}
```

### Use Case 7: "Check if an anime is controversial before watching" (NEW)
```json
// Step 1: Get detailed reception analysis
{
  "tool": "getAnimeReception",
  "arguments": {
    "id": 32281  // Kimi no Na wa (Your Name) - example
  }
}

// Step 2: Compare with known controversial anime
{
  "tool": "searchByReviewSentiment",
  "arguments": {
    "sentiment_pattern": "highly_polarizing",
    "limit": 5
  }
}
```

### Use Case 8: "Compare two popular anime to decide what to watch" (NEW)
```json
{
  "tool": "compareAnimeReception",
  "arguments": {
    "anime_id_1": 38000,  // Demon Slayer
    "anime_id_2": 40748   // Jujutsu Kaisen
  }
}
```

## 🛠️ Advanced Tips & Best Practices

### 1. Parameter Optimization
- **Always use `min_score`**: Filter out low-quality anime (7.0+ recommended)
- **Combine genres wisely**: Use 1-3 genres max for best results
- **Use appropriate limits**: 10-25 results for browsing, 5-10 for focused searches

### 2. Error Handling
The tool provides detailed error messages with suggestions:
- Invalid parameters → Specific validation errors
- No results → Alternative search strategies
- API errors → Fallback recommendations

### 3. Pagination Strategy
```json
{
  "tool": "searchAnime",
  "arguments": {
    "genres": "1,27",  // Action + Shounen
    "min_score": 7.5,
    "page": 1,
    "limit": 25
  }
}
```

### 4. Content Filtering
- `"sfw": true` (default): Family-friendly content only
- `"sfw": false`: Include all content ratings

### 5. Sorting Strategies
- **By score**: `"order_by": "score", "sort": "desc"` (highest rated first)
- **By popularity**: `"order_by": "popularity", "sort": "asc"` (most popular first)
- **By year**: `"order_by": "year", "sort": "desc"` (newest first)
- **By episodes**: `"order_by": "episodes", "sort": "asc"` (shortest first)

## 🔍 Understanding Response Metadata

All search responses include helpful metadata:

```json
{
  "search_metadata": {
    "strategy_used": "direct_api_search",
    "parameters_applied": {...},
    "total_results": 150,
    "results_shown": 25,
    "search_tips": [...],
    "optimization_suggestions": [...]
  }
}
```

**Use this metadata to:**
- Understand what parameters were actually applied
- Get suggestions for improving your search
- Learn about related functions to try next

## 🚨 Common Pitfalls & Solutions

### Problem: "No results found"
**Solutions:**
1. Remove or reduce `min_score` filter
2. Use broader genre categories
3. Try text search instead of genre filtering
4. Check if genre IDs are valid

### Problem: "Too many results, hard to choose"
**Solutions:**
1. Add `min_score` filter (8.0+ for top quality)
2. Use more specific genre combinations
3. Sort by score or popularity
4. Reduce `limit` to focus on top results

### Problem: "Results don't match what I want"
**Solutions:**
1. Use `suggestSearchStrategy` to analyze your query
2. Try different sorting options
3. Use `getAnimeRecommendations` based on known preferences
4. Combine multiple search strategies

### Problem: "Don't know what genres to use"
**Solutions:**
1. Always call `getAnimeGenres` first
2. Use `suggestSearchStrategy` for natural language analysis
3. Start with broad searches, then narrow down
4. Look at genres of anime you already like

## 📊 Response Structure Guide

### Search Results
```json
{
  "data": [...],  // Array of anime results
  "pagination": {
    "current_page": 1,
    "total_pages": 10,
    "total_results": 250
  },
  "search_metadata": {
    "strategy_used": "...",
    "parameters_applied": {...},
    "search_tips": [...],
    "optimization_suggestions": [...]
  }
}
```

### Individual Anime Object
```json
{
  "mal_id": 16498,
  "title": "Attack on Titan",
  "title_english": "Attack on Titan",
  "score": 9.0,
  "scored_by": 1500000,
  "rank": 1,
  "popularity": 1,
  "members": 2000000,
  "genres": [
    {"id": 1, "name": "Action"},
    {"id": 8, "name": "Drama"}
  ],
  "synopsis": "...",
  "episodes": 25,
  "status": "Finished Airing",
  "year": 2013,
  "image_url": "..."
}
```

## 🎓 Learning Path for New Users

### Beginner (First 5 searches)
1. `getSearchCapabilities()` - Learn what's available
2. `getAnimeGenres()` - Understand genre system
3. `searchAnime()` with basic parameters
4. `getAnimeDetails()` on interesting results
5. `getTopAnime()` for popular recommendations

### Intermediate (Exploring features)
1. `suggestSearchStrategy()` for complex queries
2. Genre combination searches
3. Quality-based filtering with `min_score`
4. `getSeasonalAnimeRecommendations()` for current anime
5. `getAnimeRecommendations()` for similar anime

### Advanced (Power user techniques)
1. Multi-parameter optimization
2. Strategic pagination for large searches
3. Combining multiple search strategies
4. Using metadata for search refinement
5. Review intelligence and sentiment analysis
6. Reception comparison workflows
7. Building custom workflows for specific needs

## 🔗 Integration Examples

### For AI Assistants
```markdown
When a user asks about anime:
1. Use suggestSearchStrategy() to understand their request
2. Execute the suggested search strategy
3. Present results with context from metadata
4. Offer next steps based on response suggestions
```

### For Applications
```javascript
// Example workflow for "find similar anime"
async function findSimilarAnime(animeName) {
  // 1. Search for the anime
  const searchResult = await mcp.call('searchAnime', {
    query: animeName,
    limit: 5
  });
  
  // 2. Get the first result's ID
  const animeId = searchResult.data[0]?.mal_id;
  
  // 3. Get recommendations
  const recommendations = await mcp.call('getAnimeRecommendations', {
    id: animeId
  });
  
  return recommendations;
}
```

## 📈 Performance Tips

1. **Use appropriate limits**: Don't request more results than needed
2. **Cache genre data**: `getAnimeGenres()` results don't change often
3. **Validate parameters**: Use the built-in validation to avoid API errors
4. **Follow rate limits**: The tool handles rate limiting automatically
5. **Use metadata**: Response metadata helps optimize future searches

## 🆘 Troubleshooting

### Tool Not Responding
- Check MCP server connection
- Verify tool is properly registered
- Check for network connectivity

### Unexpected Results
- Use `getSearchCapabilities()` to verify available parameters
- Check response metadata for applied parameters
- Validate input parameters match expected format

### Performance Issues
- Reduce `limit` parameter
- Use more specific search criteria
- Avoid overly broad searches

---

## 📞 Support & Resources

- **Tool Capabilities**: Use `getSearchCapabilities()` for comprehensive documentation
- **Search Help**: Use `suggestSearchStrategy()` for query analysis
- **Genre Reference**: Use `getAnimeGenres()` for current genre list
- **Error Messages**: All errors include specific suggestions for resolution

---

*This guide covers the enhanced anime-search MCP tool with intelligent search suggestions, comprehensive error handling, and rich metadata responses. The tool is designed to be discoverable and helpful for both AI assistants and direct users.* 