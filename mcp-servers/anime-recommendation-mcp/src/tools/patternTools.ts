import { z } from 'zod';
import { PatternAnalysisService } from '../services/patternAnalysis.js';

// Zod schemas for validation
const EmotionalPatternSchema = z.object({
  pattern_name: z.string().min(1),
  keywords: z.array(z.string()),
  regex_variants: z.array(z.string()),
  context_words: z.array(z.string()),
  emotional_category: z.string(),
  confidence: z.number().min(0).max(1),
  source_anime: z.array(z.number()),
  discovered_from: z.enum(['manual_review_analysis', 'ai_validation', 'user_feedback'])
});

const PatternEvidenceSchema = z.object({
  pattern_name: z.string(),
  new_evidence: z.object({
    review_text: z.string(),
    anime_id: z.number(),
    match_strength: z.number().min(0).max(1)
  }),
  validation: z.object({
    validated: z.boolean(),
    confidence_adjustment: z.number().optional()
  })
});

export class PatternDiscoveryTools {
  private patternService = new PatternAnalysisService();

  getTools() {
    return [
      {
        name: 'saveEmotionalPattern',
        description: 'Save a discovered emotional pattern from review analysis with keywords, regex variants, and evidence',
        inputSchema: {
          type: 'object',
          properties: {
            pattern_name: {
              type: 'string',
              description: 'Unique name for the pattern (e.g., "comfort_healing", "excitement_seeking")'
            },
            keywords: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of keywords that indicate this pattern'
            },
            regex_variants: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of regex patterns to match this emotional state'
            },
            context_words: {
              type: 'array',
              items: { type: 'string' },
              description: 'Context words that help identify when pattern applies'
            },
            emotional_category: {
              type: 'string',
              description: 'Category this pattern belongs to (e.g., "comfort", "excitement", "contemplative")'
            },
            confidence: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Confidence score for this pattern (0-1)'
            },
            source_anime: {
              type: 'array',
              items: { type: 'number' },
              description: 'Array of anime IDs where this pattern was discovered'
            },
            discovered_from: {
              type: 'string',
              enum: ['manual_review_analysis', 'ai_validation', 'user_feedback'],
              description: 'How this pattern was discovered'
            }
          },
          required: ['pattern_name', 'keywords', 'regex_variants', 'context_words', 'emotional_category', 'confidence', 'source_anime', 'discovered_from']
        }
      },

      {
        name: 'getStoredPatterns',
        description: 'Retrieve saved emotional patterns with optional filtering by category or confidence',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Filter by emotional category (optional)'
            },
            confidence_threshold: {
              type: 'number',
              minimum: 0,
              maximum: 1,
              description: 'Minimum confidence threshold (optional)'
            }
          }
        }
      },

      {
        name: 'analyzeReviewForPatterns',
        description: 'Check if a review text matches known emotional patterns and return pattern matches with confidence scores',
        inputSchema: {
          type: 'object',
          properties: {
            review_text: {
              type: 'string',
              description: 'The review text to analyze for patterns'
            },
            known_patterns: {
              type: 'array',
              description: 'Optional array of specific patterns to test against (if not provided, uses all stored patterns)',
              items: {
                type: 'object',
                properties: {
                  pattern_name: { type: 'string' },
                  keywords: { type: 'array', items: { type: 'string' } },
                  regex_variants: { type: 'array', items: { type: 'string' } },
                  confidence: { type: 'number' }
                }
              }
            }
          },
          required: ['review_text']
        }
      },

      {
        name: 'updatePatternFromEvidence',
        description: 'Update a pattern with new supporting evidence and validation',
        inputSchema: {
          type: 'object',
          properties: {
            pattern_name: {
              type: 'string',
              description: 'Name of the pattern to update'
            },
            new_evidence: {
              type: 'object',
              properties: {
                review_text: { type: 'string', description: 'Review text that supports this pattern' },
                anime_id: { type: 'number', description: 'Anime ID the review is for' },
                match_strength: { type: 'number', minimum: 0, maximum: 1, description: 'How strong the match is' }
              },
              required: ['review_text', 'anime_id', 'match_strength']
            },
            validation: {
              type: 'object',
              properties: {
                validated: { type: 'boolean', description: 'Whether this evidence is validated' },
                confidence_adjustment: { type: 'number', description: 'Optional adjustment to pattern confidence (-0.1 to +0.1)' }
              },
              required: ['validated']
            }
          },
          required: ['pattern_name', 'new_evidence', 'validation']
        }
      },

      {
        name: 'runMassPatternAnalysis',
        description: 'Apply all discovered patterns to review data obtained from anime-search-mcp for mass emotional classification',
        inputSchema: {
          type: 'object',
          properties: {
            review_data: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  review_text: { type: 'string' },
                  anime_id: { type: 'number' }
                },
                required: ['review_text', 'anime_id']
              },
              description: 'Array of review objects from anime-search-mcp tools'
            },
            pattern_filter: {
              type: 'string',
              description: 'Optional: only apply patterns from specific category'
            }
          },
          required: ['review_data']
        }
      },

      {
        name: 'getPatternEvidence',
        description: 'Get evidence for a specific pattern to validate or review pattern accuracy',
        inputSchema: {
          type: 'object',
          properties: {
            pattern_name: {
              type: 'string',
              description: 'Name of the pattern to get evidence for'
            },
            validated: {
              type: 'boolean',
              description: 'Optional: filter by validation status'
            }
          },
          required: ['pattern_name']
        }
      },

      {
        name: 'validatePatternEvidence',
        description: 'Mark pattern evidence as validated or invalidated',
        inputSchema: {
          type: 'object',
          properties: {
            evidence_id: {
              type: 'number',
              description: 'ID of the evidence to validate'
            },
            validated: {
              type: 'boolean',
              description: 'Whether to mark as validated (true) or invalidated (false)'
            }
          },
          required: ['evidence_id', 'validated']
        }
      }
    ];
  }

  async handleToolCall(name: string, args: any): Promise<any> {
    switch (name) {
      case 'saveEmotionalPattern': {
        const validated = EmotionalPatternSchema.parse(args);
        const patternId = await this.patternService.saveEmotionalPattern(validated);
        return {
          success: true,
          pattern_id: patternId,
          message: `Emotional pattern "${validated.pattern_name}" saved successfully`
        };
      }

      case 'getStoredPatterns': {
        const patterns = await this.patternService.getStoredPatterns(
          args.category,
          args.confidence_threshold
        );
        return {
          success: true,
          patterns,
          count: patterns.length
        };
      }

      case 'analyzeReviewForPatterns': {
        const matches = await this.patternService.analyzeReviewForPatterns(
          args.review_text,
          args.known_patterns
        );
        return {
          success: true,
          matches,
          total_matches: matches.length,
          high_confidence_matches: matches.filter(m => m.confidence > 0.7).length
        };
      }

      case 'updatePatternFromEvidence': {
        const validated = PatternEvidenceSchema.parse(args);
        await this.patternService.updatePatternFromEvidence(
          validated.pattern_name,
          validated.new_evidence,
          validated.validation
        );
        return {
          success: true,
          message: `Pattern "${validated.pattern_name}" updated with new evidence`
        };
      }

      case 'runMassPatternAnalysis': {
        const results = await this.patternService.runMassPatternAnalysis(
          args.review_data,
          args.pattern_filter
        );
        return {
          success: true,
          ...results,
          message: `Analyzed ${results.processedReviews} reviews, found ${results.totalMatches} pattern matches`
        };
      }

      case 'getPatternEvidence': {
        const evidence = await this.patternService.getPatternEvidence(
          args.pattern_name,
          args.validated
        );
        return {
          success: true,
          evidence,
          count: evidence.length
        };
      }

      case 'validatePatternEvidence': {
        await this.patternService.validatePatternEvidence(
          args.evidence_id,
          args.validated
        );
        return {
          success: true,
          message: `Evidence ${args.evidence_id} marked as ${args.validated ? 'validated' : 'invalidated'}`
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}