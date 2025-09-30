# Requirements for anime-search-mcp Integration

This document outlines the features and enhancements needed in the **anime-search-mcp** project to support the anime recommendation system.

## Current Status
The anime-search-mcp already provides excellent search capabilities with clean JSON responses, review intelligence, and local database integration. The recommendation system needs additional discovery and analysis features.

## Required Enhancements

### 1. Enhanced Search for Recommendation Context

**New MCP Tools Needed:**
```typescript
searchSimilarAnime(anime_id, similarity_type?)
  // Find anime similar to a specific title
  // similarity_type: 'genre', 'studio', 'theme', 'user_ratings', 'all'
  // Returns: ranked list of similar anime with similarity scores

searchByMultipleGenres(genre_combinations, logic?)
  // Advanced genre filtering with AND/OR logic
  // genre_combinations: [['Action', 'Drama'], ['Romance', 'Comedy']]
  // logic: 'AND', 'OR', 'EXCLUDE'

searchByUserProfile(user_preferences)
  // Search anime based on user preference profile
  // user_preferences: weighted genre/studio/theme preferences
  // Returns: personalized search results
```

### 2. Advanced Filtering for Recommendations

**New Features:**
- **Mood-Based Filtering** - Search by emotional tone and atmosphere
- **Viewing Context** - Filter by episode count, duration, complexity
- **Temporal Patterns** - Search by release periods and seasonal trends
- **Community Reception** - Filter by reception patterns and controversy levels

**Implementation:**
```typescript
searchByMood(mood_profile, filters?)
  // mood_profile: { energy: 'high', emotion: 'uplifting', complexity: 'light' }
  // Returns: anime matching emotional requirements

searchByViewingContext(context, filters?)
  // context: { time_available: '30min', setting: 'binge', mood: 'relaxed' }
  // Returns: anime suitable for specific viewing situations

searchByReceptionPattern(pattern_type, filters?)
  // pattern_type: 'hidden_gems', 'polarizing', 'universally_loved', 'underrated'
  // Returns: anime with specific community reception patterns
```

### 3. Recommendation-Specific Metadata

**Enhanced Anime Details:**
```typescript
getAnimeForRecommendation(anime_id)
  // Extended anime details optimized for recommendation algorithms
  // Returns: standard details + recommendation-specific metadata

getAnimeThemeAnalysis(anime_id)
  // Deep analysis of anime themes and appeal factors
  // Returns: theme weights, target audience, emotional tone

getAnimeRecommendationMetadata(anime_id)
  // Metadata specifically for recommendation algorithms
  // Returns: similarity vectors, genre weights, appeal factors
```

**Expected Response Format:**
```json
{
  "basic_info": { /* standard anime data */ },
  "recommendation_data": {
    "theme_weights": {
      "friendship": 0.8,
      "coming_of_age": 0.9,
      "action": 0.6,
      "mystery": 0.3
    },
    "appeal_factors": {
      "animation_quality": 0.9,
      "story_depth": 0.8,
      "character_development": 0.9,
      "world_building": 0.7
    },
    "target_audience": {
      "age_groups": ["teen", "young_adult"],
      "experience_level": ["beginner", "intermediate"],
      "genre_familiarity": ["action", "shounen"]
    },
    "viewing_context": {
      "binge_worthy": true,
      "casual_viewing": false,
      "discussion_potential": true,
      "emotional_investment": "high"
    }
  }
}
```

### 4. Similarity Analysis Tools

**New MCP Tools:**
```typescript
calculateAnimeSimilarity(anime_id1, anime_id2, similarity_metrics?)
  // Calculate similarity between two specific anime
  // similarity_metrics: ['genre', 'theme', 'studio', 'reception', 'user_ratings']
  // Returns: similarity scores and explanation

findAnimeClusters(anime_ids, clustering_method?)
  // Group anime into similar clusters
  // clustering_method: 'genre', 'theme', 'reception', 'hybrid'
  // Returns: clustered groups with similarity explanations

getAnimeRecommendationGraph(anime_id, depth?)
  // Get recommendation network around specific anime
  // depth: how many recommendation levels to explore
  // Returns: graph of related anime with relationship strengths
```

### 5. Enhanced Discovery Features

**Intelligent Discovery:**
```typescript
discoverHiddenGems(user_profile, discovery_settings?)
  // Find underrated anime matching user preferences
  // discovery_settings: risk_tolerance, popularity_threshold, min_score
  // Returns: ranked hidden gems with appeal explanations

suggestExplorationPaths(current_anime, exploration_type?)
  // Suggest anime progression paths from current position
  // exploration_type: 'genre_expansion', 'studio_deep_dive', 'theme_exploration'
  // Returns: curated progression suggestions

getSeasonalPersonalized(user_profile, season, year?)
  // Personalized seasonal recommendations
  // Returns: current/upcoming seasonal anime ranked by user fit
```

### 6. Advanced Review Intelligence

**Enhanced Review Analysis:**
```typescript
getReviewBasedSimilarity(anime_id1, anime_id2)
  // Compare anime based on review content similarity
  // Returns: similarity score based on review themes and sentiment

analyzeUserReviewPatterns(anime_ids, user_preferences?)
  // Analyze review patterns relevant to user preferences
  // Returns: insights about how anime align with user taste

getRecommendationExplanations(anime_id, user_profile)
  // Generate natural language explanations for why anime is recommended
  // Returns: personalized recommendation explanations
```

## Technical Requirements

### Database Query Enhancements

**New Query Capabilities:**
- **Weighted Genre Searches** - Search with genre preference weights
- **Multi-Criteria Filtering** - Complex filtering with multiple simultaneous criteria
- **Similarity Joins** - Efficient anime-to-anime similarity queries
- **Personalization Queries** - User-profile-aware search optimization

### Response Format Extensions

**Enhanced Metadata:**
```typescript
interface RecommendationAnimeData extends CleanAnimeData {
  recommendation_score?: number;
  similarity_explanation?: string;
  appeal_match?: {
    genre_match: number;
    theme_match: number;
    studio_match: number;
    overall_fit: number;
  };
  discovery_context?: {
    discovery_type: string;
    novelty_score: number;
    exploration_value: number;
  };
}
```

### Performance Optimizations

**Caching Strategy:**
- **Similarity Matrices** - Pre-calculated anime similarity scores
- **User Profile Matches** - Cached searches for common user profiles
- **Recommendation Networks** - Pre-computed recommendation graphs
- **Theme Analysis** - Cached theme and appeal factor analysis

## Integration Points

### Data Exchange with Recommendation System

**Required API Endpoints:**
```typescript
// New endpoints needed in anime-search-mcp
POST /recommendation/batch-similarity
  // Calculate similarity for multiple anime pairs efficiently

GET /recommendation/anime/:id/vectors
  // Get anime feature vectors for similarity calculations

POST /recommendation/personalized-search
  // Search with user profile weights and preferences

GET /recommendation/discovery/:type
  // Get curated discovery sets (hidden gems, trending, etc.)
```

### SQLite Integration for User Context

**User Context Caching:**
```typescript
// Cache user search patterns and preferences locally
interface UserSearchContext {
  username: string;
  recent_searches: SearchHistory[];
  preference_hints: GenreWeights;
  discovery_progress: ExplorationPath;
  cached_recommendations: CachedResults[];
}
```

## Implementation Priority

### Phase 1: Core Similarity Features (High Priority)
- `searchSimilarAnime()`
- `calculateAnimeSimilarity()`
- `getAnimeRecommendationMetadata()`

### Phase 2: Advanced Discovery (Medium Priority)
- `searchByMood()`
- `discoverHiddenGems()`
- `getRecommendationExplanations()`

### Phase 3: Complex Analysis (Lower Priority)
- `findAnimeClusters()`
- `getAnimeRecommendationGraph()`
- `analyzeUserReviewPatterns()`

## Configuration Requirements

### Environment Variables
```bash
# Recommendation system integration
RECOMMENDATION_SYSTEM_URL="http://localhost:3001"
ENABLE_RECOMMENDATION_FEATURES=true

# Performance optimization
ENABLE_SIMILARITY_CACHING=true
SIMILARITY_CACHE_SIZE=10000
RECOMMENDATION_CACHE_TTL=3600

# Advanced features
ENABLE_AI_EXPLANATIONS=true
OPENAI_API_KEY="your_key_for_explanations"
ENABLE_MOOD_ANALYSIS=true
```

### New Dependencies
```json
{
  "dependencies": {
    "ml-matrix": "^6.10.4",    // For similarity calculations
    "natural": "^6.1.0",      // For text analysis and similarity
    "compromise": "^14.10.0"   // For natural language processing
  }
}
```

## Algorithm Requirements

### Similarity Calculation Methods

**Multi-Factor Similarity:**
```typescript
interface SimilarityFactors {
  genre_similarity: number;      // Jaccard similarity of genres
  theme_similarity: number;      // Semantic similarity of themes
  studio_similarity: number;     // Studio overlap and style similarity
  reception_similarity: number;  // Review sentiment and rating patterns
  demographic_similarity: number; // Target audience overlap
}

// Weighted combination for overall similarity
const overall_similarity = (factors: SimilarityFactors, weights: Weights) => {
  return Object.entries(factors).reduce((sum, [factor, value]) =>
    sum + (value * weights[factor]), 0
  );
};
```

### Mood-Based Filtering

**Mood Mapping:**
```typescript
interface MoodProfile {
  energy_level: 'low' | 'medium' | 'high';
  emotional_tone: 'uplifting' | 'neutral' | 'melancholic' | 'intense';
  complexity: 'light' | 'moderate' | 'complex';
  engagement: 'passive' | 'active' | 'immersive';
}

// Map moods to anime characteristics
const mood_to_anime_mapping = {
  'tired_evening': { energy: 'low', tone: 'uplifting', complexity: 'light' },
  'weekend_binge': { energy: 'high', engagement: 'immersive', complexity: 'complex' },
  'casual_background': { engagement: 'passive', complexity: 'light' }
};
```

## Testing Requirements

### Unit Tests
- Similarity calculation algorithms
- Mood-based filtering logic
- Search ranking algorithms
- Recommendation explanation generation

### Integration Tests
- Database query performance with new features
- API response format consistency
- Caching mechanism efficiency
- Cross-service data synchronization

### Performance Tests
- Large-scale similarity calculations
- Complex multi-criteria searches
- Recommendation generation speed
- Memory usage during batch operations

## Documentation Updates

### README.md Additions
- New recommendation-focused tools
- Advanced search capabilities
- Integration guide with recommendation system
- Performance considerations

### API Documentation
- Detailed tool descriptions for recommendation features
- Similarity algorithm explanations
- Mood-based search examples
- Discovery feature usage patterns

## Privacy and Data Considerations

### User Data Handling
- **Search Privacy** - Option to disable search history tracking
- **Preference Learning** - Transparent preference inference
- **Data Minimization** - Only collect necessary recommendation data
- **User Control** - Allow users to view and modify inferred preferences

### Performance Monitoring
- **Query Performance** - Monitor complex search performance
- **Cache Efficiency** - Track recommendation cache hit rates
- **Resource Usage** - Monitor memory and CPU usage for similarity calculations
- **API Response Times** - Ensure recommendation features don't slow down basic search