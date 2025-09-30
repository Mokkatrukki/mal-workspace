-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enum types
CREATE TYPE anime_type AS ENUM ('TV', 'OVA', 'Movie', 'Special', 'ONA', 'Music');
CREATE TYPE anime_status AS ENUM ('Finished Airing', 'Currently Airing', 'Not yet aired');
CREATE TYPE anime_season AS ENUM ('winter', 'spring', 'summer', 'fall');
CREATE TYPE genre_type AS ENUM ('genre', 'explicit_genre', 'theme', 'demographic');
CREATE TYPE studio_role AS ENUM ('studio', 'producer', 'licensor');

-- Genres table (stores all genre/theme/demographic data)
CREATE TABLE genres (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    url VARCHAR(500),
    count INTEGER DEFAULT 0,
    type genre_type NOT NULL DEFAULT 'genre',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Studios/Producers table
CREATE TABLE studios (
    id INTEGER PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    url VARCHAR(500),
    type VARCHAR(50), -- 'studio', 'producer', 'licensor'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Main anime table
CREATE TABLE anime (
    mal_id INTEGER PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    title_english VARCHAR(500),
    title_japanese VARCHAR(500),
    title_synonyms TEXT[], -- Array of alternative titles
    image_url VARCHAR(1000),
    type anime_type,
    source VARCHAR(100),
    episodes INTEGER,
    status anime_status,
    airing BOOLEAN DEFAULT FALSE,
    aired_from DATE,
    aired_to DATE,
    duration VARCHAR(100),
    rating VARCHAR(50),
    score DECIMAL(4,2),
    scored_by INTEGER,
    rank INTEGER,
    popularity INTEGER,
    members INTEGER,
    favorites INTEGER,
    synopsis TEXT,
    background TEXT,
    season anime_season,
    year INTEGER,
    
    -- JSON fields for complex nested data
    images JSONB,
    trailer JSONB,
    broadcast JSONB,
    statistics JSONB,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_scraped TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Full-text search
    search_vector tsvector
);

-- Many-to-many relationship: anime to genres
CREATE TABLE anime_genres (
    anime_id INTEGER REFERENCES anime(mal_id) ON DELETE CASCADE,
    genre_id INTEGER REFERENCES genres(id) ON DELETE CASCADE,
    genre_type genre_type NOT NULL DEFAULT 'genre',
    PRIMARY KEY (anime_id, genre_id, genre_type)
);

-- Many-to-many relationship: anime to studios/producers
CREATE TABLE anime_studios (
    anime_id INTEGER REFERENCES anime(mal_id) ON DELETE CASCADE,
    studio_id INTEGER REFERENCES studios(id) ON DELETE CASCADE,
    role studio_role NOT NULL,
    PRIMARY KEY (anime_id, studio_id, role)
);

-- Create indexes for performance
CREATE INDEX idx_anime_title ON anime USING GIN (to_tsvector('english', title));
CREATE INDEX idx_anime_title_english ON anime USING GIN (to_tsvector('english', COALESCE(title_english, '')));
CREATE INDEX idx_anime_synopsis ON anime USING GIN (to_tsvector('english', COALESCE(synopsis, '')));
CREATE INDEX idx_anime_search_vector ON anime USING GIN (search_vector);

CREATE INDEX idx_anime_score ON anime (score DESC) WHERE score IS NOT NULL;
CREATE INDEX idx_anime_popularity ON anime (popularity ASC) WHERE popularity IS NOT NULL;
CREATE INDEX idx_anime_rank ON anime (rank ASC) WHERE rank IS NOT NULL;
CREATE INDEX idx_anime_year ON anime (year DESC) WHERE year IS NOT NULL;
CREATE INDEX idx_anime_type ON anime (type) WHERE type IS NOT NULL;
CREATE INDEX idx_anime_status ON anime (status) WHERE status IS NOT NULL;
CREATE INDEX idx_anime_season_year ON anime (year DESC, season) WHERE year IS NOT NULL AND season IS NOT NULL;

CREATE INDEX idx_anime_genres_anime_id ON anime_genres (anime_id);
CREATE INDEX idx_anime_genres_genre_id ON anime_genres (genre_id);
CREATE INDEX idx_anime_genres_type ON anime_genres (genre_type);

CREATE INDEX idx_anime_studios_anime_id ON anime_studios (anime_id);
CREATE INDEX idx_anime_studios_studio_id ON anime_studios (studio_id);
CREATE INDEX idx_anime_studios_role ON anime_studios (role);

CREATE INDEX idx_genres_name ON genres (name);
CREATE INDEX idx_genres_type ON genres (type);

CREATE INDEX idx_studios_name ON studios (name);

-- Function to update search vector
CREATE OR REPLACE FUNCTION update_anime_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', NEW.title), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.title_english, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.title_japanese, '')), 'B') ||
        setweight(to_tsvector('english', array_to_string(COALESCE(NEW.title_synonyms, ARRAY[]::text[]), ' ')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.synopsis, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for search vector updates
CREATE TRIGGER trigger_update_anime_search_vector
    BEFORE INSERT OR UPDATE ON anime
    FOR EACH ROW
    EXECUTE FUNCTION update_anime_search_vector();

-- Function to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER trigger_anime_updated_at
    BEFORE UPDATE ON anime
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_genres_updated_at
    BEFORE UPDATE ON genres
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_studios_updated_at
    BEFORE UPDATE ON studios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Views for common queries
CREATE VIEW anime_with_basic_info AS
SELECT 
    a.mal_id,
    a.title,
    a.title_english,
    a.title_japanese,
    a.image_url,
    a.type,
    a.episodes,
    a.status,
    a.score,
    a.rank,
    a.popularity,
    a.year,
    a.season,
    COALESCE(
        array_agg(DISTINCT g.name) FILTER (WHERE ag.genre_type = 'genre'),
        ARRAY[]::text[]
    ) as genres,
    COALESCE(
        array_agg(DISTINCT s.name) FILTER (WHERE asu.role = 'studio'),
        ARRAY[]::text[]
    ) as studios
FROM anime a
LEFT JOIN anime_genres ag ON a.mal_id = ag.anime_id AND ag.genre_type = 'genre'
LEFT JOIN genres g ON ag.genre_id = g.id
LEFT JOIN anime_studios asu ON a.mal_id = asu.anime_id AND asu.role = 'studio'
LEFT JOIN studios s ON asu.studio_id = s.id
GROUP BY a.mal_id, a.title, a.title_english, a.title_japanese, a.image_url, 
         a.type, a.episodes, a.status, a.score, a.rank, a.popularity, a.year, a.season;

-- Initial data setup will be done via migration scripts 