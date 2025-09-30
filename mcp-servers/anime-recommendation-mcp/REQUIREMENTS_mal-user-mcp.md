# Requirements for mal-user-mcp Integration

This document outlines the features and enhancements needed in the **mal-user-mcp** project to support the anime recommendation system.

## Current Status
The mal-user-mcp already provides excellent MyAnimeList account integration with OAuth authentication and list management. The recommendation system needs additional features to gather user preference data.

## Required Enhancements

### 1. Enhanced User Profile Data Export

**New MCP Tools Needed:**
```typescript
mal_export_user_preferences()
  // Export comprehensive user data for recommendation analysis
  // Returns: watching patterns, genre preferences, score distributions

mal_get_detailed_ratings()
  // Get user's ratings with timestamps and context
  // Returns: rated anime with scores, dates, and watching order

mal_analyze_watching_patterns()
  // Analyze user's viewing habits and preferences
  // Returns: favorite genres, studios, seasonal patterns, score tendencies
```

### 2. Historical Data Analysis

**New Features:**
- **Watching History Timeline** - Track when user watched specific anime
- **Score Evolution** - How user's scoring patterns change over time
- **Seasonal Preferences** - Which seasons/years user was most active
- **Genre Progression** - How user's genre preferences evolved

**Implementation:**
```typescript
mal_get_watching_timeline(username, date_range?)
  // Get chronological watching history

mal_analyze_score_patterns(username)
  // Analyze how user scores anime (harsh/lenient, genre bias, etc.)

mal_get_seasonal_activity(username, years?)
  // Get user's activity patterns by season/year
```

### 3. Preference Learning Integration

**New MCP Tools:**
```typescript
mal_sync_preference_data(username)
  // Export user data to recommendation system's SQLite database
  // One-way sync: MAL → Recommendation System

mal_get_list_statistics(username)
  // Detailed statistics about user's anime list
  // Returns: completion rates, drop rates, favorite studios/genres

mal_compare_with_average(username, anime_id)
  // Compare user's rating with MAL average for specific anime
  // Helps identify user's relative preferences
```

### 4. Enhanced List Analysis

**Required Features:**
- **Genre Affinity Scores** - Calculate user's preference strength for each genre
- **Studio Preferences** - Identify favorite animation studios
- **Rating Calibration** - Understand if user scores high/low relative to community
- **Completion Patterns** - Which types of anime user tends to complete vs drop

**Implementation:**
```typescript
mal_calculate_genre_affinity(username)
  // Calculate weighted preference scores for each genre
  // Based on ratings, completion rates, and time spent

mal_get_studio_preferences(username)
  // Rank studios by user preference (ratings + completion)

mal_get_rating_calibration(username)
  // Compare user's scores with MAL averages to understand bias
```

### 5. Social Features for Similarity

**New MCP Tools:**
```typescript
mal_find_similar_users(username, similarity_threshold?)
  // Find MAL users with similar taste patterns
  // Returns: usernames and similarity scores

mal_compare_lists(username1, username2)
  // Detailed comparison between two users' lists
  // Returns: shared anime, rating differences, preference alignment

mal_get_friend_recommendations(username)
  // Get recommendations based on MAL friends' lists
  // Requires friend list access via MAL API
```

### 6. Data Integration Helpers

**Required Utilities:**
```typescript
mal_map_to_local_ids(mal_anime_list)
  // Map MAL anime IDs to local database IDs
  // Handles cases where anime might not exist in local DB

mal_export_for_recommendation_system(username)
  // Complete data export in format expected by recommendation MCP
  // Returns structured data ready for SQLite import

mal_validate_data_sync(username)
  // Verify data consistency between MAL and recommendation system
  // Returns sync status and any discrepancies
```

## Technical Requirements

### Authentication Enhancements
- **Expanded Scopes** - Request additional permissions for detailed analytics
- **Bulk Data Access** - Efficient fetching of large user lists
- **Rate Limit Optimization** - Smart caching for preference analysis

### Data Processing
- **Statistical Analysis** - Built-in functions for preference calculations
- **Temporal Analysis** - Time-series analysis of user behavior
- **Comparison Algorithms** - User similarity calculations

### Integration Points
```typescript
// Expected data format for recommendation system
interface UserPreferenceExport {
  username: string;
  mal_user_id: number;
  preferences: {
    genres: { [genre_id: number]: number }; // Affinity scores 0-1
    studios: { [studio_id: number]: number };
    themes: { [theme_id: number]: number };
    demographics: { [demo_id: number]: number };
  };
  patterns: {
    completion_rate: number;
    average_score: number;
    score_variance: number;
    watching_speed: number; // episodes per day
    seasonal_activity: { [season: string]: number };
  };
  ratings: Array<{
    anime_id: number;
    score: number;
    status: string;
    start_date?: string;
    finish_date?: string;
    episodes_watched: number;
  }>;
}
```

## Configuration Requirements

### Environment Variables
```bash
# Enhanced permissions for detailed data access
MAL_SCOPES="read:user,read:anime_list,read:anime_statistics"

# Recommendation system integration
RECOMMENDATION_SYSTEM_URL="http://localhost:3001"
ENABLE_DATA_EXPORT=true
SYNC_INTERVAL_HOURS=24

# Analytics features
ENABLE_SIMILARITY_ANALYSIS=true
ENABLE_PREFERENCE_LEARNING=true
CACHE_USER_ANALYTICS=true
```

### New Dependencies
```json
{
  "dependencies": {
    "sqlite3": "^5.1.6",  // For local preference caching
    "lodash": "^4.17.21", // For statistical calculations
    "date-fns": "^2.29.3" // For temporal analysis
  }
}
```

## Implementation Priority

### Phase 1: Basic Data Export (High Priority)
- `mal_export_user_preferences()`
- `mal_get_detailed_ratings()`
- `mal_sync_preference_data()`

### Phase 2: Pattern Analysis (Medium Priority)
- `mal_analyze_watching_patterns()`
- `mal_calculate_genre_affinity()`
- `mal_get_rating_calibration()`

### Phase 3: Social Features (Lower Priority)
- `mal_find_similar_users()`
- `mal_compare_lists()`
- `mal_get_friend_recommendations()`

## Testing Requirements

### Unit Tests
- Preference calculation algorithms
- Data export/import functions
- Statistical analysis functions

### Integration Tests
- MAL API data fetching
- Recommendation system data sync
- User preference accuracy validation

### Performance Tests
- Large list processing (1000+ anime)
- Bulk user comparison operations
- Memory usage during statistical calculations

## Documentation Updates

### README.md Additions
- New MCP tools documentation
- Integration guide with recommendation system
- Data export format specifications
- Privacy considerations for preference data

### API Documentation
- Detailed tool descriptions
- Parameter specifications
- Return value formats
- Error handling examples

## Privacy Considerations

### Data Handling
- **User Consent** - Clear disclosure of preference analysis
- **Data Minimization** - Only export necessary data for recommendations
- **Local Storage** - Option to keep preference data local only
- **Data Retention** - Configurable retention policies for cached data

### Security
- **Secure Export** - Encrypted data transfer to recommendation system
- **Access Control** - User-controlled data sharing permissions
- **Audit Logging** - Track data access and export operations