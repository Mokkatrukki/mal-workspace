// Shared types for MAL workspace

export interface Anime {
  mal_id: number;
  title: string;
  title_english?: string;
  title_japanese?: string;
  type?: string;
  episodes?: number;
  status?: string;
  aired_from?: string;
  aired_to?: string;
  score?: number;
  scored_by?: number;
  rank?: number;
  popularity?: number;
  members?: number;
  favorites?: number;
  synopsis?: string;
  background?: string;
  season?: string;
  year?: number;
  rating?: string;
}

export interface Genre {
  mal_id: number;
  name: string;
  type: string;
}

export interface Review {
  mal_id: number;
  anime_id: number;
  username: string;
  date: string;
  overall_rating: number;
  story_rating?: number;
  animation_rating?: number;
  sound_rating?: number;
  character_rating?: number;
  enjoyment_rating?: number;
  review_text: string;
  helpful_count?: number;
}

export interface MCPToolRequest {
  name: string;
  arguments?: Record<string, unknown>;
}

export interface MCPToolResponse {
  content: Array<{
    type: string;
    text: string;
  }>;
}

export interface SearchOptions {
  limit?: number;
  offset?: number;
  type?: string;
  status?: string;
  order_by?: string;
  sort?: 'asc' | 'desc';
}