export interface EmotionalPattern {
  id?: number;
  pattern_name: string;
  keywords: string[];
  regex_variants: string[];
  context_words: string[];
  emotional_category: string;
  confidence: number;
  source_anime: number[];
  discovered_from: 'manual_review_analysis' | 'ai_validation' | 'user_feedback';
  created_at?: Date;
  updated_at?: Date;
}

export interface PatternEvidence {
  id?: number;
  pattern_id: number;
  review_text: string;
  anime_id: number;
  match_strength: number;
  validated: boolean;
  created_at?: Date;
}

export interface UserProfile {
  username: string;
  preference_data: Record<string, any>;
  learning_data: Record<string, any>;
  mood_history: Record<string, any>;
  last_active: Date;
  profile_completeness: number;
}

export interface UserSimilarity {
  user1: string;
  user2: string;
  similarity_score: number;
  common_anime: number;
  calculated_at: Date;
}

export interface UserAnimeFeedback {
  id?: number;
  username: string;
  anime_id: number;
  feedback_type: string;
  feedback_data: Record<string, any>;
  created_at?: Date;
}

export interface ViewingContext {
  energy_level: 'low' | 'medium' | 'high';
  emotional_state: 'happy' | 'sad' | 'stressed' | 'bored' | 'excited' | 'contemplative';
  time_available: 'short' | 'medium' | 'long';
  viewing_context: 'solo' | 'with_friends' | 'background' | 'focused';
}

export interface PatternMatch {
  pattern_name: string;
  confidence: number;
  matched_keywords: string[];
  matched_regex: string[];
  evidence_text: string;
}