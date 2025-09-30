-- Migration to add review intelligence tables
-- Run this after your existing schema

\echo 'Adding review intelligence tables...'

-- Store anime reviews for sentiment analysis and user matching
CREATE TABLE anime_reviews (
    id SERIAL PRIMARY KEY,
    anime_id INTEGER REFERENCES anime(mal_id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    user_score INTEGER CHECK (user_score >= 1 AND user_score <= 10),
    review_text TEXT,
    helpful_count INTEGER DEFAULT 0,
    is_preliminary BOOLEAN DEFAULT FALSE,
    date_posted DATE,
    review_length INTEGER,
    sentiment_score FLOAT, -- Computed sentiment (-1 to 1)
    sentiment_label VARCHAR(20), -- 'positive', 'negative', 'neutral'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(anime_id, username) -- Prevent duplicate reviews from same user for same anime
);

-- Indexes for performance
CREATE INDEX idx_anime_reviews_anime_id ON anime_reviews(anime_id);
CREATE INDEX idx_anime_reviews_username ON anime_reviews(username);
CREATE INDEX idx_anime_reviews_score ON anime_reviews(user_score) WHERE user_score IS NOT NULL;
CREATE INDEX idx_anime_reviews_preliminary ON anime_reviews(is_preliminary);
CREATE INDEX idx_anime_reviews_sentiment ON anime_reviews(sentiment_score) WHERE sentiment_score IS NOT NULL;
CREATE INDEX idx_anime_reviews_date ON anime_reviews(date_posted) WHERE date_posted IS NOT NULL;

-- Store basic user profile data (for taste matching)
CREATE TABLE user_profiles (
    username VARCHAR(100) PRIMARY KEY,
    anime_completed INTEGER DEFAULT 0,
    anime_watching INTEGER DEFAULT 0,
    anime_dropped INTEGER DEFAULT 0,
    mean_score FLOAT,
    profile_last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    taste_profile JSONB, -- Store computed taste characteristics
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Store user's anime ratings (for compatibility analysis)
CREATE TABLE user_anime_ratings (
    username VARCHAR(100) REFERENCES user_profiles(username) ON DELETE CASCADE,
    anime_id INTEGER REFERENCES anime(mal_id) ON DELETE CASCADE,
    user_score INTEGER CHECK (user_score >= 1 AND user_score <= 10),
    watch_status VARCHAR(50), -- 'completed', 'watching', 'dropped', 'on_hold', 'plan_to_watch'
    episodes_watched INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (username, anime_id)
);

-- Indexes
CREATE INDEX idx_user_ratings_anime_id ON user_anime_ratings(anime_id);
CREATE INDEX idx_user_ratings_score ON user_anime_ratings(user_score) WHERE user_score IS NOT NULL;
CREATE INDEX idx_user_ratings_status ON user_anime_ratings(watch_status);

-- Store computed reception metrics for anime
ALTER TABLE anime ADD COLUMN IF NOT EXISTS reception_data JSONB;

-- Example reception_data structure:
-- {
--   "review_count": 150,
--   "score_variance": 2.3,
--   "polarization_score": 1.2,
--   "sentiment_ratio": 0.67,
--   "preliminary_review_count": 45,
--   "avg_review_length": 250,
--   "last_analyzed": "2024-09-18T12:00:00Z"
-- }

-- Create index for reception data queries
CREATE INDEX idx_anime_reception_data ON anime USING GIN (reception_data) WHERE reception_data IS NOT NULL;

-- Update trigger for updated_at columns
CREATE TRIGGER trigger_anime_reviews_updated_at
    BEFORE UPDATE ON anime_reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_user_anime_ratings_updated_at
    BEFORE UPDATE ON user_anime_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

\echo 'Review intelligence tables added successfully!'