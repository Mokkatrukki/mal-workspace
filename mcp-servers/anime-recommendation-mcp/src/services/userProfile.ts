import { getSQLiteDB } from '../database/sqlite.js';
import { UserProfile, UserAnimeFeedback, ViewingContext } from '../types/recommendation.js';

export class UserProfileService {
  private sqliteDb = getSQLiteDB();

  async createUserProfile(username: string, preferences?: Record<string, any>): Promise<UserProfile> {
    await this.sqliteDb.initialize();

    const profile: UserProfile = {
      username,
      preference_data: preferences || {},
      learning_data: {},
      mood_history: {},
      last_active: new Date(),
      profile_completeness: preferences ? 0.2 : 0.0
    };

    await this.sqliteDb.run(`
      INSERT INTO user_taste_profiles (
        username, preference_data, learning_data, mood_history, last_active, profile_completeness
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      profile.username,
      JSON.stringify(profile.preference_data),
      JSON.stringify(profile.learning_data),
      JSON.stringify(profile.mood_history),
      profile.last_active.toISOString(),
      profile.profile_completeness
    ]);

    return profile;
  }

  async getUserProfile(username: string): Promise<UserProfile | null> {
    await this.sqliteDb.initialize();

    const row = await this.sqliteDb.get(`
      SELECT * FROM user_taste_profiles WHERE username = ?
    `, [username]);

    if (!row) return null;

    return {
      username: row.username,
      preference_data: JSON.parse(row.preference_data || '{}'),
      learning_data: JSON.parse(row.learning_data || '{}'),
      mood_history: JSON.parse(row.mood_history || '{}'),
      last_active: new Date(row.last_active),
      profile_completeness: row.profile_completeness
    };
  }

  async updateUserPreferences(username: string, preferences: Record<string, any>): Promise<void> {
    await this.sqliteDb.initialize();

    const profile = await this.getUserProfile(username);
    if (!profile) {
      throw new Error(`User profile ${username} not found`);
    }

    const updatedPreferences = { ...profile.preference_data, ...preferences };
    const completeness = this.calculateProfileCompleteness(updatedPreferences, profile.learning_data);

    await this.sqliteDb.run(`
      UPDATE user_taste_profiles
      SET preference_data = ?, profile_completeness = ?, last_active = ?
      WHERE username = ?
    `, [
      JSON.stringify(updatedPreferences),
      completeness,
      new Date().toISOString(),
      username
    ]);
  }

  async deleteUserProfile(username: string): Promise<void> {
    await this.sqliteDb.initialize();

    // Delete all related data
    await this.sqliteDb.run('DELETE FROM user_anime_feedback WHERE username = ?', [username]);
    await this.sqliteDb.run('DELETE FROM user_similarity_matrix WHERE user1 = ? OR user2 = ?', [username, username]);
    await this.sqliteDb.run('DELETE FROM user_taste_profiles WHERE username = ?', [username]);
  }

  async recordUserFeedback(feedback: Omit<UserAnimeFeedback, 'id' | 'created_at'>): Promise<number> {
    await this.sqliteDb.initialize();

    const result = await this.sqliteDb.run(`
      INSERT INTO user_anime_feedback (
        username, anime_id, feedback_type, feedback_data
      ) VALUES (?, ?, ?, ?)
    `, [
      feedback.username,
      feedback.anime_id,
      feedback.feedback_type,
      JSON.stringify(feedback.feedback_data)
    ]);

    // Update learning data based on feedback
    await this.updateLearningDataFromFeedback(feedback);

    return result.lastID!;
  }

  async getUserFeedback(username: string, animeId?: number): Promise<UserAnimeFeedback[]> {
    await this.sqliteDb.initialize();

    let sql = 'SELECT * FROM user_anime_feedback WHERE username = ?';
    const params: any[] = [username];

    if (animeId) {
      sql += ' AND anime_id = ?';
      params.push(animeId);
    }

    sql += ' ORDER BY created_at DESC';

    const rows = await this.sqliteDb.all(sql, params);
    return rows.map(row => ({
      ...row,
      feedback_data: JSON.parse(row.feedback_data),
      created_at: new Date(row.created_at)
    }));
  }

  async setCurrentMood(username: string, moodData: ViewingContext & { timestamp?: Date }): Promise<void> {
    await this.sqliteDb.initialize();

    const profile = await this.getUserProfile(username);
    if (!profile) {
      throw new Error(`User profile ${username} not found`);
    }

    const timestamp = moodData.timestamp || new Date();
    const moodEntry = {
      ...moodData,
      timestamp: timestamp.toISOString()
    };

    // Add to mood history
    const moodHistory = profile.mood_history || {};
    const todayKey = timestamp.toISOString().split('T')[0];

    if (!moodHistory[todayKey]) {
      moodHistory[todayKey] = [];
    }
    moodHistory[todayKey].push(moodEntry);

    // Keep only last 30 days of mood history
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    Object.keys(moodHistory).forEach(date => {
      if (new Date(date) < thirtyDaysAgo) {
        delete moodHistory[date];
      }
    });

    await this.sqliteDb.run(`
      UPDATE user_taste_profiles
      SET mood_history = ?, last_active = ?
      WHERE username = ?
    `, [
      JSON.stringify(moodHistory),
      new Date().toISOString(),
      username
    ]);
  }

  async getCurrentMood(username: string): Promise<ViewingContext | null> {
    const profile = await this.getUserProfile(username);
    if (!profile || !profile.mood_history) return null;

    const today = new Date().toISOString().split('T')[0];
    const todayMoods = profile.mood_history[today];

    if (!todayMoods || todayMoods.length === 0) return null;

    // Return the most recent mood
    const latestMood = todayMoods[todayMoods.length - 1];
    return {
      energy_level: latestMood.energy_level,
      emotional_state: latestMood.emotional_state,
      time_available: latestMood.time_available,
      viewing_context: latestMood.viewing_context
    };
  }

  private calculateProfileCompleteness(preferences: Record<string, any>, learningData: Record<string, any>): number {
    let score = 0;

    // Basic preferences (40% of total)
    if (preferences.genres && Object.keys(preferences.genres).length > 0) score += 0.2;
    if (preferences.themes && Object.keys(preferences.themes).length > 0) score += 0.1;
    if (preferences.viewing_contexts && Object.keys(preferences.viewing_contexts).length > 0) score += 0.1;

    // Learning data (40% of total)
    if (learningData.taste_questions_answered && learningData.taste_questions_answered > 5) score += 0.2;
    if (learningData.feedback_count && learningData.feedback_count > 3) score += 0.2;

    // Engagement (20% of total)
    if (learningData.session_count && learningData.session_count > 1) score += 0.1;
    if (learningData.last_interaction &&
        new Date(learningData.last_interaction) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) {
      score += 0.1;
    }

    return Math.min(1.0, score);
  }

  private async updateLearningDataFromFeedback(feedback: Omit<UserAnimeFeedback, 'id' | 'created_at'>): Promise<void> {
    const profile = await this.getUserProfile(feedback.username);
    if (!profile) return;

    const learningData = profile.learning_data || {};

    // Update feedback count
    learningData.feedback_count = (learningData.feedback_count || 0) + 1;
    learningData.last_interaction = new Date().toISOString();

    // Analyze feedback for learning insights
    if (feedback.feedback_type === 'rating' && feedback.feedback_data.rating) {
      if (!learningData.rating_patterns) learningData.rating_patterns = {};

      const rating = feedback.feedback_data.rating;
      if (rating >= 8) {
        // Learn from highly rated anime
        if (feedback.feedback_data.genres) {
          learningData.rating_patterns.loved_genres = learningData.rating_patterns.loved_genres || {};
          feedback.feedback_data.genres.forEach((genre: string) => {
            learningData.rating_patterns.loved_genres[genre] =
              (learningData.rating_patterns.loved_genres[genre] || 0) + 1;
          });
        }
      }
    }

    const completeness = this.calculateProfileCompleteness(profile.preference_data, learningData);

    await this.sqliteDb.run(`
      UPDATE user_taste_profiles
      SET learning_data = ?, profile_completeness = ?, last_active = ?
      WHERE username = ?
    `, [
      JSON.stringify(learningData),
      completeness,
      new Date().toISOString(),
      feedback.username
    ]);
  }
}