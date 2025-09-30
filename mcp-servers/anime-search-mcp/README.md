# Anime Search MCP Server

A Model Context Protocol (MCP) server that provides comprehensive anime search and information retrieval using the MyAnimeList database. Features intelligent search suggestions, comprehensive error handling, and rich metadata responses.

## 🎯 New Features (v2.0)

### 🧠 **Intelligent Search Capabilities**
- **`getSearchCapabilities()`** - Discover all available features and parameters
- **`suggestSearchStrategy()`** - Analyze natural language queries and suggest optimal search parameters
- **Smart parameter validation** with helpful error messages and suggestions
- **Rich response metadata** with optimization tips and next steps

### 🛡️ **Enhanced Error Handling**
- **Detailed error messages** with specific suggestions for fixes
- **Parameter validation** with clear guidance on valid values
- **Fallback strategies** suggested when searches fail
- **Transparent feedback** about what the tool is doing

### 📊 **Rich Metadata & Transparency**
- **Search metadata** in all responses showing strategy used and parameters applied
- **Optimization suggestions** for improving search results
- **Next steps recommendations** for related functions to try
- **Result count tracking** and pagination information

## ✨ Core Features

### 🎯 Clean JSON Responses
- **Structured Data**: Returns clean, well-structured JSON instead of overwhelming raw API responses
- **Essential Information**: Only includes the most relevant anime data for better performance
- **Primary Image Extraction**: Automatically extracts the best available image URL from Jikan's complex image structure
- **LLM-Friendly**: JSON format is much easier for LLMs to parse and work with than formatted text

### 🖼️ Image Handling
The server intelligently extracts primary image URLs with the following priority:
1. `large_image_url` (JPG) → `image_url` (JPG) → `small_image_url` (JPG)
2. Falls back to WEBP versions if JPG not available
3. Returns a single clean `image_url` field instead of the complex nested image object

### 🔧 Enhanced Tools

#### `searchAnime`
- Searches for anime by title, character, or keyword
- Returns structured list with essential metadata
- Limits results to top 10 for performance

#### `getAnimeDetails`
- Provides comprehensive information about a specific anime
- Includes all relevant fields in clean JSON structure
- Direct MyAnimeList URL included

#### `getAnimeRecommendations`
- Shows top 5 recommendations based on an anime
- Includes voting information and structured anime data

#### `getTopAnime`
- Browse top anime by various filters (airing, upcoming, popularity, favorites)
- Clear categorization in response metadata

#### `getAnimeReviews`
- Shows recent reviews with complete review data
- User information and reaction counts included

#### `getAnimeGenres`
- Lists all available genres with IDs and anime counts
- Use genre IDs in searchAnime tool for filtering

#### `getSeasonalAnimeRecommendations`
- Current and upcoming seasonal anime
- Filter by type (TV, movie, OVA, etc.)

### 🧠 Review Intelligence Tools ✅ **FULLY WORKING**

#### `getAnimeReception`
- ✅ Comprehensive reception analysis with sentiment and polarization scores
- ✅ Review patterns, engagement metrics, and insight summaries
- ✅ Based on 111K+ analyzed reviews from local database

#### `searchByReviewSentiment`
- ✅ Find anime by sentiment patterns: 'mostly_positive', 'highly_polarizing', 'underrated', etc.
- ✅ Filter by minimum review count and result limit
- ✅ Discover hidden gems and controversial titles

#### `getReviewInsights`
- ✅ Database-wide sentiment distributions and polarization trends
- ✅ Review engagement statistics and coverage metrics
- ✅ Overview of 5.9K+ anime with review analysis

#### `compareAnimeReception`
- ✅ Side-by-side reception comparison between two anime
- ✅ Sentiment, polarization, and engagement differences
- ✅ Understand relative community opinions

## 🚀 Quick Start Guide

### 1. **Discover Capabilities**
```json
{"tool": "getSearchCapabilities", "arguments": {}}
```
Returns comprehensive information about all available functions and parameters.

### 2. **Smart Search Strategy**
```json
{"tool": "suggestSearchStrategy", "arguments": {"user_query": "best action anime from recent years"}}
```
Analyzes your query and suggests optimal search parameters.

### 3. **Execute Search**
```json
{"tool": "searchAnime", "arguments": {"genres": "1", "min_score": 8.0, "order_by": "score", "sort": "desc", "limit": 15}}
```
Performs the search with intelligent parameter validation and rich metadata.

## 📚 **Documentation**

- **[Complete Usage Guide](USAGE_GUIDE.md)** - Comprehensive documentation with examples and workflows
- **[Quick Reference](QUICK_REFERENCE.md)** - Essential commands and common patterns

## 🎯 Usage Examples

### Natural Language Query Analysis
```
"I want to find the best romantic comedy anime from recent years"
```
→ Uses `suggestSearchStrategy` to analyze intent and suggest parameters

### Genre-Based Discovery
```
"Find highly-rated action anime"
```
→ Uses `getAnimeGenres` first, then `searchAnime` with genre filtering

### Similarity Search
```
"Find anime similar to Attack on Titan"
```
→ Uses `searchAnime` to find the anime, then `getAnimeRecommendations`

## 📦 Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Build the server: `npm run build`
4. Configure in Claude Desktop or your MCP client
5. **Important**: If you have a `.mcp.json` file with secrets, ensure it's not committed to version control

## 🔧 Configuration

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "anime-search": {
      "command": "node",
      "args": ["/path/to/anime-search-mcp/build/server.js"]
    }
  }
}
```

**Important**: Never commit your `.mcp.json` file if it contains sensitive configuration. This file is automatically ignored by git.

## 🎨 Response Format Examples

### Search Results (New Clean Format)
```json
{
  "total_results": 820,
  "showing": 3,
  "current_page": 1,
  "last_page": 82,
  "has_next_page": true,
  "items_per_page": 3,
  "pagination": {
    "current_page": 1,
    "last_page": 82,
    "has_next_page": true,
    "items_per_page": 3,
    "total_items": 820
  },
  "results": [
    {
      "mal_id": 45576,
      "title": "Mushoku Tensei: Isekai Ittara Honki Dasu Part 2",
      "title_english": "Mushoku Tensei: Jobless Reincarnation Part 2",
      "title_japanese": "無職転生 ～異世界行ったら本気だす～ 第2クール",
      "image_url": "https://cdn.myanimelist.net/images/anime/1028/117777l.jpg",
      "score": 8.63,
      "rank": 84,
      "episodes": 12,
      "year": 2021,
      "season": "fall",
      "status": "Finished Airing",
      "type": "TV",
      "genres": [
        {"id": 2, "name": "Adventure"},
        {"id": 9, "name": "Ecchi"}
      ],
      "studios": [
        {"id": 1993, "name": "Studio Bind"}
      ],
      "url": "https://myanimelist.net/anime/45576"
    }
  ]
}
```

### Detailed Information
```json
{
  "mal_id": 16498,
  "title": "Shingeki no Kyojin",
  "title_english": "Attack on Titan",
  "title_japanese": "進撃の巨人",
  "image_url": "https://cdn.myanimelist.net/images/anime/10/47347l.jpg",
  "score": 9.0,
  "scored_by": 1654532,
  "rank": 1,
  "popularity": 3,
  "synopsis": "Several hundred years ago, humans were nearly exterminated by Titans...",
  "episodes": 25,
  "duration": "24 min per ep",
  "year": 2013,
  "season": "spring",
  "status": "Finished Airing",
  "rating": "R - 17+ (violence & profanity)",
  "genres": [
    {"id": 1, "name": "Action"},
    {"id": 8, "name": "Drama"},
    {"id": 10, "name": "Fantasy"}
  ],
  "studios": [
    {"id": 858, "name": "Wit Studio"}
  ],
  "url": "https://myanimelist.net/anime/16498"
}
```

### Recommendations
```json
{
  "total_recommendations": 10,
  "showing": 5,
  "recommendations": [
    {
      "anime": {
        "mal_id": 1535,
        "title": "Death Note",
        "image_url": "https://cdn.myanimelist.net/images/anime/9/9453l.jpg",
        "score": 9.0,
        "episodes": 37,
        "url": "https://myanimelist.net/anime/1535"
      },
      "votes": 125,
      "url": "https://myanimelist.net/recommendations/anime/16498-1535"
    }
  ]
}
```

## 🛠️ Technical Architecture

1. **Pure MCP Server**: No Express web server, just MCP protocol tools
2. **Clean Data Structure**: Simplified, essential fields only
3. **Local Database Storage**: Fast access to anime data without external API limits
4. **Consistent Schema**: All responses follow predictable structure
5. **Error Handling**: Structured error responses with clear messages
6. **No Rate Limiting**: Uses local database for unlimited access
7. **Local API Integration**: Uses clean local API endpoints for better performance
8. **Review Intelligence**: Sentiment analysis and reception patterns from local database

## 🔄 Comparison: Before vs After

### Before (Raw Jikan Response - 200+ lines)
```json
{
  "data": {
    "mal_id": 45576,
    "images": {
      "jpg": {
        "image_url": "https://cdn.myanimelist.net/images/anime/1028/117777.jpg",
        "small_image_url": "https://cdn.myanimelist.net/images/anime/1028/117777t.jpg",
        "large_image_url": "https://cdn.myanimelist.net/images/anime/1028/117777l.jpg"
      },
      "webp": {
        "image_url": "https://cdn.myanimelist.net/images/anime/1028/117777.webp",
        "small_image_url": "https://cdn.myanimelist.net/images/anime/1028/117777t.webp",
        "large_image_url": "https://cdn.myanimelist.net/images/anime/1028/117777l.webp"
      }
    },
    "trailer": {
      "youtube_id": "BbbRytVhaDs",
      "images": {
        "image_url": "https://img.youtube.com/vi/BbbRytVhaDs/default.jpg",
        "small_image_url": "https://img.youtube.com/vi/BbbRytVhaDs/sddefault.jpg",
        "medium_image_url": "https://img.youtube.com/vi/BbbRytVhaDs/mqdefault.jpg",
        "large_image_url": "https://img.youtube.com/vi/BbbRytVhaDs/hqdefault.jpg",
        "maximum_image_url": "https://img.youtube.com/vi/BbbRytVhaDs/maxresdefault.jpg"
      }
    },
    "approved": true,
    "titles": [
      {"type": "Default", "title": "Mushoku Tensei: Isekai Ittara Honki Dasu Part 2"},
      {"type": "Japanese", "title": "無職転生 ～異世界行ったら本気だす～ 第2クール"},
      {"type": "English", "title": "Mushoku Tensei: Jobless Reincarnation Part 2"}
    ],
    "producers": [
      {"mal_id": 61, "type": "anime", "name": "Frontier Works", "url": "..."},
      {"mal_id": 245, "type": "anime", "name": "TOHO", "url": "..."}
      // ... many more
    ],
    "licensors": [/* array of complex objects */],
    "aired": {
      "from": "2021-10-04T00:00:00+00:00",
      "to": "2021-12-20T00:00:00+00:00",
      "prop": {
        "from": {"day": 4, "month": 10, "year": 2021},
        "to": {"day": 20, "month": 12, "year": 2021}
      },
      "string": "Oct 4, 2021 to Dec 20, 2021"
    },
    "broadcast": {
      "day": "Mondays",
      "time": "00:00",
      "timezone": "Asia/Tokyo",
      "string": "Mondays at 00:00 (JST)"
    }
    // ... hundreds more lines of nested data
  }
}
```

### After (Clean Structure - 25 lines)
```json
{
  "mal_id": 45576,
  "title": "Mushoku Tensei: Isekai Ittara Honki Dasu Part 2",
  "title_english": "Mushoku Tensei: Jobless Reincarnation Part 2",
  "title_japanese": "無職転生 ～異世界行ったら本気だす～ 第2クール",
  "image_url": "https://cdn.myanimelist.net/images/anime/1028/117777l.jpg",
  "score": 8.63,
  "rank": 84,
  "episodes": 12,
  "year": 2021,
  "season": "fall",
  "status": "Finished Airing",
  "type": "TV",
  "genres": [{"id": 9, "name": "Ecchi"}],
  "studios": [{"id": 1993, "name": "Studio Bind"}],
  "url": "https://myanimelist.net/anime/45576"
}
```

**Key Improvements:**
- **Local Database**: No external API dependencies or rate limits
- **Essential Data Only**: 90% size reduction from original API responses
- **Clean Genres/Studios**: Only ID and name, no URLs
- **Better Pagination**: Simplified structure
- **LLM-Friendly**: Easy to parse and work with
- **Review Intelligence**: Sentiment analysis from local database

## 🚀 Benefits for MCP Clients

1. **Easy Parsing**: Clean JSON structure that LLMs can reliably process
2. **Local Database Access**: Direct access to comprehensive anime data
3. **Focused Data**: Only essential information, reducing token usage
4. **Consistent Schema**: Predictable structure across all responses
5. **Error Handling**: Structured error responses with clear messages
6. **Performance**: Faster processing with reduced data size

## 🤝 Contributing

Feel free to submit issues and enhancement requests. This MCP server demonstrates best practices for:
- Data simplification and cleaning
- Local database optimization
- Structured JSON responses
- LLM-friendly data formatting

## 📄 License

MIT License - See LICENSE file for details.
