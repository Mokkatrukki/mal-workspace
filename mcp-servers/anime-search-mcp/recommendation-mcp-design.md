# Recommendation MCP Design Document

## Overview
A sophisticated anime recommendation system MCP that provides personalized suggestions based on user preferences, mood, similarity analysis, and cross-platform data integration.

## Core Philosophy
- **Personalized**: Learn individual user tastes through questions and feedback
- **Context-Aware**: Consider current mood, time, viewing situation
- **Community-Driven**: Find users with similar tastes for recommendations
- **Multi-Platform**: Integrate ratings from MAL, Crunchyroll, YouTube, etc.
- **AI-Enhanced**: Generate intelligent series analyses and summaries

## MCP Tool Calls

### User Profile Management
```
createUserProfile(username, preferences?)
  - Initialize new user profile
  - Optional initial preferences object

getUserProfile(username)
  - Get complete user profile and taste data

updateUserPreferences(username, preferences)
  - Update genre preferences, mood settings, etc.

deleteUserProfile(username)
  - Remove user profile and associated data
```

### Taste Profiling & Learning
```
askTasteQuestions(username, category?)
  - Present dynamic questions about anime preferences
  - Categories: genres, themes, studios, eras, etc.
  - Returns questions tailored to user's current profile gaps

recordUserFeedback(username, anime_id, feedback)
  - Record user's feelings about specific anime
  - feedback: { rating, sentiment, comparison_to?, mood_when_watched?, notes? }

findSimilarUsers(username, limit?)
  - Find users with similar taste profiles
  - Returns similarity scores and common preferences

analyzeTastePattern(username)
  - Deep dive into user's preference patterns
  - Identify favorite studios, themes, hidden preferences
```

### Mood-Based Recommendations
```
setCurrentMood(username, mood_data)
  - mood_data: { energy_level, emotional_state, time_available, viewing_context }
  - Stores for recommendation context

getRecommendationsByMood(username, mood?, filters?)
  - Get recommendations based on current/specified mood
  - Consider time of day, energy level, emotional needs

getMoodBasedGenres(mood_data)
  - Suggest genres based on specific mood
  - "Feeling down? Try these uplifting comedies"
```

### Advanced Recommendation Algorithms
```
getPersonalizedRecommendations(username, count?, strategy?)
  - Main recommendation engine
  - Strategies: similarity_users, taste_pattern, mood_based, surprise_me

getRecommendationExplanation(username, anime_id)
  - Explain WHY this anime was recommended
  - "Users like you who loved X also enjoyed this"
  - "Matches your preference for dark themes + great animation"

findHiddenGems(username, filters?)
  - Discover underrated anime matching user taste
  - Focus on lower popularity but high user compatibility

getSeasonalPersonalized(username, year?, season?)
  - Personalized seasonal anime recommendations
  - Based on user's historical preferences for seasonal shows
```

### Community & Similarity Analysis
```
analyzeUserCompatibility(username, target_username)
  - Compare two users' tastes in detail
  - Show agreement/disagreement patterns

getRecommendationsFromSimilarUsers(username, count?)
  - Get what similar users are watching/loving right now
  - Weighted by similarity scores

findUsersByAnimeOpinion(anime_id, opinion_type)
  - Find users who loved/hated specific anime
  - opinion_type: loved, hated, mixed, similar_to_me
```

### AI Analysis Tools
```
generateAnimeAnalysis(anime_id, analysis_type?)
  - Create AI analysis of anime themes, appeal, target audience
  - analysis_type: themes, appeal, comparison, review_summary

updateAISummaries(anime_ids?)
  - Refresh AI-generated analyses for specified anime
  - If no IDs provided, update stale analyses

getAIRecommendationInsights(username, anime_id)
  - AI analysis of why this anime fits user's profile
  - Generate natural language explanations
```

### Cross-Platform Data Integration
```
importExternalRatings(platform, anime_list)
  - Import ratings from other platforms
  - Platforms: crunchyroll, youtube, anilist, kitsu, etc.

getNormalizedRatings(anime_id)
  - Get ratings normalized across platforms
  - Accounts for platform-specific bias (MAL elitism, etc.)

compareRatingPlatforms(anime_id)
  - Show how anime is rated across different platforms
  - Identify scoring discrepancies

updateExternalData()
  - Refresh external platform data
  - Background job for keeping data current
```

### Review Pattern Analysis
```
analyzeReviewPatterns(anime_id)
  - Extract patterns from reviews: common complaints, praise
  - "Users often compare this to X"
  - "Common complaint: slow pacing"

findReviewBasedRecommendations(review_text)
  - Analyze user's written review to suggest similar anime
  - Parse sentiment and specific elements they liked/disliked

getComparativeRecommendations(anime_id, comparison_type)
  - "Better than X", "Similar to X but different", "If you liked X"
  - comparison_type: better_than, similar_but, progression_from
```

## Database Schema Additions

### New Tables Required
```sql
-- User taste profiles
CREATE TABLE user_taste_profiles (
  username VARCHAR(100) PRIMARY KEY,
  preference_data JSONB,
  learning_data JSONB,
  mood_history JSONB,
  last_active TIMESTAMP,
  profile_completeness FLOAT
);

-- User similarity matrix
CREATE TABLE user_similarity_matrix (
  user1 VARCHAR(100),
  user2 VARCHAR(100),
  similarity_score FLOAT,
  common_anime INTEGER,
  calculated_at TIMESTAMP,
  PRIMARY KEY (user1, user2)
);

-- AI-generated anime analyses
CREATE TABLE ai_anime_analyses (
  anime_id INTEGER PRIMARY KEY,
  themes_analysis TEXT,
  appeal_analysis TEXT,
  target_audience TEXT,
  comparison_points JSONB,
  generated_at TIMESTAMP,
  model_version VARCHAR(50)
);

-- External platform ratings
CREATE TABLE external_ratings (
  id SERIAL PRIMARY KEY,
  anime_id INTEGER,
  platform VARCHAR(50),
  rating FLOAT,
  rating_scale VARCHAR(20),
  sample_size INTEGER,
  scraped_at TIMESTAMP
);

-- User feedback and learning data
CREATE TABLE user_anime_feedback (
  id SERIAL PRIMARY KEY,
  username VARCHAR(100),
  anime_id INTEGER,
  feedback_type VARCHAR(50),
  feedback_data JSONB,
  created_at TIMESTAMP
);
```

## Implementation Phases

### Phase 1: Basic Profile & Recommendations
- User profile creation and management
- Basic taste question system
- Simple similarity-based recommendations

### Phase 2: Mood Integration
- Mood capture and analysis
- Mood-based recommendation algorithms
- Temporal recommendation patterns

### Phase 3: AI Enhancement
- AI anime analysis generation
- Intelligent recommendation explanations
- Natural language preference processing

### Phase 4: Cross-Platform Integration
- External rating imports
- Rating normalization algorithms
- Platform bias analysis

### Phase 5: Advanced Analytics
- Deep review pattern analysis
- Comparative recommendation systems
- Community preference mapping

## Integration with Existing MCPs

### With anime-search-mcp
```javascript
// Get anime details for recommendation analysis
const animeDetails = await animeSearchMcp.getAnimeDetails(animeId);

// Get reviews for sentiment analysis
const reviews = await animeSearchMcp.getAnimeReviews(animeId);

// Search for similar anime
const similar = await animeSearchMcp.searchAnime({
  genres: userPreferredGenres,
  min_score: 7.0
});
```

### With mal-user-mcp
```javascript
// Get user's MAL data for profile building
const userList = await malUserMcp.getUserAnimeList(username);

// Import user ratings for taste analysis
const ratings = await malUserMcp.getUserRatings(username);

// Sync recommendations back to MAL (maybe)
await malUserMcp.updatePlanToWatch(username, recommendedAnime);
```

## Expected User Workflows

### First-Time User
1. `createUserProfile(username)`
2. `askTasteQuestions(username)` - Interactive preference learning
3. `getPersonalizedRecommendations(username)` - Initial suggestions

### Returning User Looking for Something New
1. `setCurrentMood(username, currentMood)`
2. `getRecommendationsByMood(username)` - Mood-appropriate suggestions
3. `getRecommendationExplanation(username, selectedAnimeId)` - Why this choice?

### Power User Exploring Tastes
1. `analyzeTastePattern(username)` - Deep profile analysis
2. `findSimilarUsers(username)` - Find taste twins
3. `getRecommendationsFromSimilarUsers(username)` - What are they watching?
4. `findHiddenGems(username)` - Discover underrated gems

This MCP would become the intelligent layer that ties together anime data, user preferences, and community insights to provide truly personalized anime recommendations.