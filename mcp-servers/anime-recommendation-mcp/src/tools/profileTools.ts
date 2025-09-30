import { z } from 'zod';
import { UserProfileService } from '../services/userProfile.js';
import { ViewingContext } from '../types/recommendation.js';

// Zod schemas for validation
const UserPreferencesSchema = z.object({
  genres: z.record(z.number()).optional(),
  themes: z.record(z.number()).optional(),
  studios: z.record(z.number()).optional(),
  viewing_contexts: z.record(z.any()).optional()
});

const ViewingContextSchema = z.object({
  energy_level: z.enum(['low', 'medium', 'high']),
  emotional_state: z.enum(['happy', 'sad', 'stressed', 'bored', 'excited', 'contemplative']),
  time_available: z.enum(['short', 'medium', 'long']),
  viewing_context: z.enum(['solo', 'with_friends', 'background', 'focused'])
});

const FeedbackSchema = z.object({
  username: z.string(),
  anime_id: z.number(),
  feedback_type: z.string(),
  feedback_data: z.record(z.any())
});

export class UserProfileTools {
  private profileService = new UserProfileService();

  getTools() {
    return [
      {
        name: 'createUserProfile',
        description: 'Initialize a new user profile for personalized anime recommendations',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Unique username for the profile'
            },
            preferences: {
              type: 'object',
              description: 'Optional initial preferences object',
              properties: {
                genres: {
                  type: 'object',
                  description: 'Genre preferences as key-value pairs (genre: preference_score)'
                },
                themes: {
                  type: 'object',
                  description: 'Theme preferences as key-value pairs'
                },
                viewing_contexts: {
                  type: 'object',
                  description: 'Viewing context preferences'
                }
              }
            }
          },
          required: ['username']
        }
      },

      {
        name: 'getUserProfile',
        description: 'Get complete user profile and taste data',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username to get profile for'
            }
          },
          required: ['username']
        }
      },

      {
        name: 'updateUserPreferences',
        description: 'Update user genre preferences, mood settings, and other taste data',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username to update preferences for'
            },
            preferences: {
              type: 'object',
              description: 'Preferences to update',
              properties: {
                genres: {
                  type: 'object',
                  description: 'Genre preferences (genre_name: score)'
                },
                themes: {
                  type: 'object',
                  description: 'Theme preferences'
                },
                studios: {
                  type: 'object',
                  description: 'Studio preferences'
                },
                viewing_contexts: {
                  type: 'object',
                  description: 'Context-specific preferences'
                }
              }
            }
          },
          required: ['username', 'preferences']
        }
      },

      {
        name: 'deleteUserProfile',
        description: 'Remove user profile and all associated data',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username to delete profile for'
            }
          },
          required: ['username']
        }
      },

      {
        name: 'recordUserFeedback',
        description: 'Record user feelings and responses about specific anime for learning',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username providing feedback'
            },
            anime_id: {
              type: 'number',
              description: 'MyAnimeList ID of the anime'
            },
            feedback_type: {
              type: 'string',
              description: 'Type of feedback (rating, sentiment, mood_response, etc.)'
            },
            feedback_data: {
              type: 'object',
              description: 'Feedback data object',
              properties: {
                rating: { type: 'number', minimum: 1, maximum: 10 },
                sentiment: { type: 'string', enum: ['positive', 'negative', 'mixed', 'neutral'] },
                mood_when_watched: { type: 'string' },
                emotional_response: { type: 'string' },
                comparison_to: { type: 'number', description: 'Compare to another anime ID' },
                notes: { type: 'string' },
                genres: { type: 'array', items: { type: 'string' } },
                themes: { type: 'array', items: { type: 'string' } }
              }
            }
          },
          required: ['username', 'anime_id', 'feedback_type', 'feedback_data']
        }
      },

      {
        name: 'getUserFeedback',
        description: 'Get user feedback history for analysis',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username to get feedback for'
            },
            anime_id: {
              type: 'number',
              description: 'Optional: get feedback for specific anime only'
            }
          },
          required: ['username']
        }
      },

      {
        name: 'setCurrentMood',
        description: 'Set user current mood and viewing context for recommendations',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username to set mood for'
            },
            mood_data: {
              type: 'object',
              properties: {
                energy_level: {
                  type: 'string',
                  enum: ['low', 'medium', 'high'],
                  description: 'Current energy level'
                },
                emotional_state: {
                  type: 'string',
                  enum: ['happy', 'sad', 'stressed', 'bored', 'excited', 'contemplative'],
                  description: 'Current emotional state'
                },
                time_available: {
                  type: 'string',
                  enum: ['short', 'medium', 'long'],
                  description: 'How much time available for watching'
                },
                viewing_context: {
                  type: 'string',
                  enum: ['solo', 'with_friends', 'background', 'focused'],
                  description: 'Viewing situation'
                }
              },
              required: ['energy_level', 'emotional_state', 'time_available', 'viewing_context']
            }
          },
          required: ['username', 'mood_data']
        }
      },

      {
        name: 'getCurrentMood',
        description: 'Get user current mood and viewing context',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username to get current mood for'
            }
          },
          required: ['username']
        }
      },

      {
        name: 'askTasteQuestions',
        description: 'Present dynamic questions about anime preferences to build user profile',
        inputSchema: {
          type: 'object',
          properties: {
            username: {
              type: 'string',
              description: 'Username to ask questions for'
            },
            category: {
              type: 'string',
              description: 'Optional category to focus questions on (genres, themes, studios, eras, etc.)'
            }
          },
          required: ['username']
        }
      }
    ];
  }

  async handleToolCall(name: string, args: any): Promise<any> {
    switch (name) {
      case 'createUserProfile': {
        const preferences = args.preferences ? UserPreferencesSchema.parse(args.preferences) : undefined;
        const profile = await this.profileService.createUserProfile(args.username, preferences);
        return {
          success: true,
          profile,
          message: `User profile created for ${args.username}`
        };
      }

      case 'getUserProfile': {
        const profile = await this.profileService.getUserProfile(args.username);
        if (!profile) {
          return {
            success: false,
            message: `User profile ${args.username} not found`
          };
        }
        return {
          success: true,
          profile
        };
      }

      case 'updateUserPreferences': {
        const preferences = UserPreferencesSchema.parse(args.preferences);
        await this.profileService.updateUserPreferences(args.username, preferences);
        return {
          success: true,
          message: `Preferences updated for ${args.username}`
        };
      }

      case 'deleteUserProfile': {
        await this.profileService.deleteUserProfile(args.username);
        return {
          success: true,
          message: `User profile ${args.username} deleted`
        };
      }

      case 'recordUserFeedback': {
        const feedback = FeedbackSchema.parse(args);
        const feedbackId = await this.profileService.recordUserFeedback(feedback);
        return {
          success: true,
          feedback_id: feedbackId,
          message: `Feedback recorded for ${args.username}`
        };
      }

      case 'getUserFeedback': {
        const feedback = await this.profileService.getUserFeedback(args.username, args.anime_id);
        return {
          success: true,
          feedback,
          count: feedback.length
        };
      }

      case 'setCurrentMood': {
        const moodData = ViewingContextSchema.parse(args.mood_data);
        await this.profileService.setCurrentMood(args.username, moodData);
        return {
          success: true,
          message: `Mood set for ${args.username}`,
          mood: moodData
        };
      }

      case 'getCurrentMood': {
        const mood = await this.profileService.getCurrentMood(args.username);
        return {
          success: true,
          current_mood: mood
        };
      }

      case 'askTasteQuestions': {
        // Get user profile to understand current gaps
        const profile = await this.profileService.getUserProfile(args.username);
        if (!profile) {
          return {
            success: false,
            message: `User profile ${args.username} not found. Create profile first.`
          };
        }

        // Generate questions based on profile completeness and category
        const questions = this.generateTasteQuestions(profile, args.category);

        return {
          success: true,
          questions,
          current_completeness: profile.profile_completeness,
          suggested_category: args.category || this.suggestQuestionCategory(profile)
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private generateTasteQuestions(profile: any, category?: string): any[] {
    const questions = [];
    const preferences = profile.preference_data || {};
    const learningData = profile.learning_data || {};

    if (!category || category === 'genres') {
      if (!preferences.genres || Object.keys(preferences.genres).length < 5) {
        questions.push({
          type: 'genre_preference',
          question: 'Rate your interest in these anime genres (1-10)',
          options: ['Action', 'Romance', 'Comedy', 'Drama', 'Fantasy', 'Sci-Fi', 'Slice of Life', 'Thriller'],
          category: 'genres'
        });
      }
    }

    if (!category || category === 'themes') {
      if (!preferences.themes || Object.keys(preferences.themes).length < 3) {
        questions.push({
          type: 'theme_preference',
          question: 'Which themes do you find most appealing in anime?',
          options: ['Friendship', 'Coming of Age', 'Power of Friendship', 'Redemption', 'Sacrifice', 'Love Conquers All'],
          category: 'themes',
          allow_multiple: true
        });
      }
    }

    if (!category || category === 'viewing_contexts') {
      if (!preferences.viewing_contexts) {
        questions.push({
          type: 'viewing_preference',
          question: 'When do you typically watch anime? Rate how often (1-5)',
          options: {
            'tired_evening': 'When tired in the evening',
            'weekend_binge': 'Weekend binge sessions',
            'background_watching': 'As background while doing other things',
            'focused_viewing': 'Full attention, analyzing deeply'
          },
          category: 'viewing_contexts'
        });
      }
    }

    if (!category || category === 'mood_based') {
      questions.push({
        type: 'mood_preference',
        question: 'What do you usually want from anime when you feel...',
        scenarios: [
          { mood: 'stressed', options: ['Something calming', 'Something distracting/exciting', 'Something uplifting'] },
          { mood: 'bored', options: ['Something engaging/intense', 'Something light/funny', 'Something to think about'] },
          { mood: 'sad', options: ['Something comforting', 'Something cathartic', 'Something uplifting'] }
        ],
        category: 'mood_based'
      });
    }

    return questions.slice(0, 3); // Return max 3 questions at a time
  }

  private suggestQuestionCategory(profile: any): string {
    const preferences = profile.preference_data || {};

    if (!preferences.genres || Object.keys(preferences.genres).length < 5) return 'genres';
    if (!preferences.themes || Object.keys(preferences.themes).length < 3) return 'themes';
    if (!preferences.viewing_contexts) return 'viewing_contexts';

    return 'mood_based';
  }
}