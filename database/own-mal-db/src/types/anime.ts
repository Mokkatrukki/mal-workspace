export interface Genre {
  id: number;
  name: string;
  url?: string;
  count?: number;
}

export interface Studio {
  id: number;
  name: string;
  url?: string;
}

export interface Producer {
  id: number;
  name: string;
  url?: string;
}

export interface AnimeImages {
  jpg?: {
    image_url?: string;
    small_image_url?: string;
    large_image_url?: string;
  };
  webp?: {
    image_url?: string;
    small_image_url?: string;
    large_image_url?: string;
  };
}

export interface Trailer {
  youtube_id?: string;
  url?: string;
  embed_url?: string;
  images?: {
    image_url?: string;
    small_image_url?: string;
    medium_image_url?: string;
    large_image_url?: string;
    maximum_image_url?: string;
  };
}

export interface DateRange {
  from?: string;
  to?: string;
  prop?: {
    from?: {
      day?: number;
      month?: number;
      year?: number;
    };
    to?: {
      day?: number;
      month?: number;
      year?: number;
    };
  };
}

export interface Broadcast {
  day?: string;
  time?: string;
  timezone?: string;
  string?: string;
}

export interface Statistics {
  watching?: number;
  completed?: number;
  on_hold?: number;
  dropped?: number;
  plan_to_watch?: number;
  total?: number;
  scores?: Array<{
    score: number;
    votes: number;
    percentage: number;
  }>;
}

// Core Anime interface for database storage
export interface Anime {
  mal_id: number;
  title: string;
  title_english?: string | null;
  title_japanese?: string | null;
  title_synonyms?: string[];
  image_url?: string | null;
  type?: 'TV' | 'OVA' | 'Movie' | 'Special' | 'ONA' | 'Music' | 'TV Special' | null;
  source?: string | null;
  episodes?: number | null;
  status?: 'Finished Airing' | 'Currently Airing' | 'Not yet aired' | null;
  airing?: boolean;
  aired_from?: Date | null;
  aired_to?: Date | null;
  duration?: string | null;
  rating?: string | null;
  score?: number | null;
  scored_by?: number | null;
  rank?: number | null;
  popularity?: number | null;
  members?: number | null;
  favorites?: number | null;
  synopsis?: string | null;
  background?: string | null;
  season?: 'winter' | 'spring' | 'summer' | 'fall' | null;
  year?: number | null;
  
  // JSON fields for complex data
  images?: AnimeImages | null;
  trailer?: Trailer | null;
  broadcast?: Broadcast | null;
  statistics?: Statistics | null;
  
  // Timestamps
  created_at?: Date;
  updated_at?: Date;
  last_scraped?: Date;
}

// Extended Anime interface for API responses (matches your MCP structure)
export interface AnimeWithRelations extends Anime {
  genres: Genre[];
  studios: Studio[];
  producers: Producer[];
  licensors: Producer[];
  themes: Genre[];
  demographics: Genre[];
  url: string;
}

// Search and pagination interfaces
export interface SearchParams {
  query?: string;
  genres?: string;
  min_score?: number;
  max_score?: number;
  
  // Year filtering
  year?: number;
  min_year?: number;
  max_year?: number;
  decade?: string; // "1990s", "2000s", "2010s", "2020s"
  
  // Popularity filtering
  min_popularity?: number;  // Lower rank = more popular (1 is most popular)
  max_popularity?: number;
  exclude_very_popular?: boolean; // Exclude top 100 most popular
  
  // Status and airing filtering
  airing_status?: 'airing' | 'finished' | 'upcoming';
  current_year_only?: boolean;
  season?: 'winter' | 'spring' | 'summer' | 'fall';
  
  // Episode count filtering
  min_episodes?: number;
  max_episodes?: number;
  
  // Type filtering
  type?: 'TV' | 'Movie' | 'OVA' | 'Special' | 'ONA' | 'Music';
  
  order_by?: 'mal_id' | 'title' | 'type' | 'rating' | 'start_date' | 'end_date' | 'episodes' | 'score' | 'scored_by' | 'rank' | 'popularity' | 'members' | 'favorites';
  sort?: 'desc' | 'asc';
  sfw?: boolean;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  total_results: number;
  showing: number;
  current_page: number;
  last_page: number;
  has_next_page: boolean;
  items_per_page: number;
  results: AnimeWithRelations[];
}

// Database entity interfaces
export interface AnimeGenreRelation {
  anime_id: number;
  genre_id: number;
  genre_type: 'genre' | 'explicit_genre' | 'theme' | 'demographic';
}

export interface AnimeStudioRelation {
  anime_id: number;
  studio_id: number;
  role: 'studio' | 'producer' | 'licensor';
}

// Jikan API response interfaces
export interface JikanAnimeResponse {
  data: any;
  pagination?: {
    current_page: number;
    last_visible_page: number;
    has_next_page: boolean;
    items: {
      count: number;
      total: number;
      per_page: number;
    };
  };
}

export interface JikanGenreResponse {
  data: Array<{
    mal_id: number;
    name: string;
    url: string;
    count: number;
  }>;
}

// LLM-optimized anime interface for clean API responses
export interface CleanAnime {
  mal_id: number;
  title: string | null;
  title_english: string | null;
  title_japanese: string | null;
  image_url: string | null;
  score: number | null;
  scored_by: number | null;
  rank: number | null;
  popularity: number | null;
  members: number | null;
  favorites: number | null;
  synopsis: string | null;
  episodes: number | null;
  duration: string | null;
  year: number | null;
  season: string | null;
  status: string | null;
  rating: string | null;
  source: string | null;
  type: string | null;
  genres: string | null;
  studios: string | null;
  themes: string | null;
  demographics: string | null;
  url: string;
}

export interface CleanSearchResult {
  total_results: number;
  showing: number;
  current_page: number;
  last_page: number;
  has_next_page: boolean;
  items_per_page: number;
  results: CleanAnime[];
}

// Search capabilities interface for MCP tool discovery
export interface SearchCapabilities {
  available_filters: {
    temporal: {
      year: string;
      year_range: string;
      decade: string;
      current_year: string;
    };
    content: {
      genres: string;
      type: string;
      airing_status: string;
      episodes: string;
      content_rating: string;
    };
    quality: {
      score_range: string;
      popularity_range: string;
      exclude_very_popular: string;
    };
  };
  search_examples: Array<{
    description: string;
    example_query: string;
    suggested_parameters: Partial<SearchParams>;
  }>;
  available_genres: Genre[];
  year_range: {
    min_year: number;
    max_year: number;
  };
  current_limitations: string[];
}

// Bulk operation interfaces
export interface BulkAnimeRequest {
  ids: number[];
  compact?: boolean;
}

export interface BulkAnimeResponse {
  total_requested: number;
  total_found: number;
  total_missing: number;
  missing_ids?: number[];
  results: CleanAnime[] | any[];
} 