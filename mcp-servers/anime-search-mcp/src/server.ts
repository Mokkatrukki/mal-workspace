import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { AnalyticsLogger } from "analytics";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

// Base URL for local clean API
const LOCAL_API_BASE = "http://localhost:3001/api/anime";

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize analytics logger with absolute path
const analytics = new AnalyticsLogger('anime-search-mcp', {
  dbPath: join(__dirname, '../../../analytics/analytics.db')
});

// Session ID for this MCP server instance
let sessionId = AnalyticsLogger.generateSessionId();

// Helper to wrap tool execution with analytics
async function withAnalytics<T>(
  toolName: string,
  params: Record<string, any>,
  fn: () => Promise<T>
): Promise<T> {
  const callId = analytics.startCall({
    sessionId,
    toolName,
    parameters: params
  });

  const startTime = Date.now();

  try {
    const result = await fn();

    analytics.endCall(callId, {
      success: true,
      executionTimeMs: Date.now() - startTime,
      resultMetadata: {
        hasResult: !!result,
        resultType: typeof result
      }
    });

    return result;
  } catch (error) {
    analytics.endCall(callId, {
      success: false,
      executionTimeMs: Date.now() - startTime,
      errorType: error instanceof Error ? 'unknown' : 'unknown',
      errorMessage: error instanceof Error ? error.message : String(error)
    });

    throw error;
  }
}

// Using local API - no rate limiting needed

// Parameter validation helper
function validateSearchParams(params: any): { isValid: boolean; errors: string[]; suggestions: string[] } {
  const errors: string[] = [];
  const suggestions: string[] = [];

  // Validate score range
  if (params.min_score !== undefined) {
    if (params.min_score < 0 || params.min_score > 10) {
      errors.push("min_score must be between 0 and 10");
      suggestions.push("Try min_score between 6.0-8.0 for good quality anime");
    }
  }

  // Validate pagination
  if (params.page !== undefined && params.page < 1) {
    errors.push("page must be 1 or greater");
    suggestions.push("Start with page 1");
  }

  if (params.limit !== undefined) {
    if (params.limit < 1 || params.limit > 25) {
      errors.push("limit must be between 1 and 25");
      suggestions.push("Try limit of 10-25 for good results");
    }
  }

  // Validate genres format
  if (params.genres !== undefined) {
    if (typeof params.genres !== 'string') {
      errors.push("genres must be a comma-separated string of genre IDs");
      suggestions.push("Use getAnimeGenres() first to see available genre IDs");
    } else {
      const genreIds = params.genres.split(',');
             const invalidIds = genreIds.filter((id: string) => !/^\d+$/.test(id.trim()));
      if (invalidIds.length > 0) {
        errors.push(`Invalid genre IDs: ${invalidIds.join(', ')}`);
        suggestions.push("Genre IDs must be numbers. Use getAnimeGenres() to see valid IDs");
      }
    }
  }

  // Add general suggestions if no specific errors
  if (errors.length === 0) {
    if (!params.genres) {
      suggestions.push("Consider using genre filters with getAnimeGenres() for more specific results");
    }
    if (!params.min_score) {
      suggestions.push("Consider adding min_score filter (7.0+) for higher quality anime");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    suggestions
  };
}

// All API calls now use local endpoints directly with fetch()

// Image URLs are now handled by the local API

// Recommendations are now handled by local API - no cleaning needed

// Reviews are now handled by local API - no cleaning needed

// Helper function for pattern descriptions
function getPatternDescription(pattern: string): string {
  const descriptions: Record<string, string> = {
    'mostly_positive': 'Anime with predominantly positive reviews (sentiment ratio > 2.0)',
    'mostly_negative': 'Anime with predominantly negative reviews (sentiment ratio < 0.5)',
    'highly_polarizing': 'Anime that divide opinion strongly (high score variance > 6.0)',
    'universally_loved': 'Anime with high positive sentiment and low polarization',
    'underrated': 'Anime with positive reviews but lower MAL scores (hidden gems)',
    'overrated': 'Anime with high MAL scores but more negative reviews',
    'mixed_reception': 'Anime with balanced but polarized reception'
  };
  return descriptions[pattern] || 'Unknown pattern';
}

// Helper function to create and configure the MCP server
function getServer() {
  const server = new McpServer({
    name: "anime-search-mcp",
    version: "1.0.0",
    description: "Comprehensive anime search and information server with advanced filtering capabilities and review intelligence. Features: genre-based search, temporal filtering, quality metrics, seasonal recommendations, sentiment analysis, reception patterns, and intelligent fallback strategies. Use getSearchCapabilities() first to discover all available search options."
  });

  // Get comprehensive information about search capabilities and available parameters
  server.tool(
    "getSearchCapabilities",
    "Get a detailed overview of all available anime search/filter capabilities, parameters, and tool usage. Always call this first to discover options.",

    {},
    async () => {
      return withAnalytics("getSearchCapabilities", {}, async () => {
        try {
          // First, get the actual genres from the API to provide accurate information
        const genresResponse = await fetch(`${LOCAL_API_BASE}/genres`);
        let availableGenres: any[] = [];
        
        if (genresResponse.ok) {
          const genresData = await genresResponse.json();
          if (genresData.success && genresData.data) {
            availableGenres = genresData.data;
          }
        }

        const capabilities = {
          overview: {
            description: "Advanced anime search with multiple filtering options and intelligent fallback strategies",
            primary_functions: [
              "searchAnime - Main search with comprehensive filtering (COMPACT FORMAT - 94% smaller responses)",
              "getBulkAnimeByIds - Get multiple anime by MAL IDs in one efficient call (PERFECT FOR MAL USER DATA)",
              "getCurrentSeasonAnime - Currently airing anime (COMPACT FORMAT)",
              "getCompactSeasonalRecommendations - Seasonal anime recommendations (COMPACT FORMAT)",
              "getAnimeDetails - Detailed information for specific anime",
              "getTopAnime - Popular and trending anime lists",
              "getSeasonalAnimeRecommendations - Legacy seasonal search (use compact version instead)",
              "getAnimeRecommendations - Similar anime suggestions",
              "getAnimeReviews - Review summary (sentiment, scores, top reviewers) - ALWAYS USE THIS FIRST",
              "getAnimeReviewsSample - Balanced sample of 10 reviews (mix of positive/negative/neutral) with full text",
              "getAnimeReviewsDetailed - Full review text (context-heavy) - use only when needed after summary",
              "getAnimeGenres - All available genres with IDs",
              "getAnimeReception - Reception analysis with sentiment and polarization",
              "searchByReviewSentiment - Find anime by sentiment patterns",
              "getReviewInsights - Database-wide review pattern insights",
              "compareAnimeReception - Compare reception between two anime"
            ]
          },
          search_parameters: {
            text_search: {
              query: "Search by anime title, character names, or keywords",
              examples: ["'Naruto'", "'dragon ball'", "'studio ghibli'"]
            },
            genre_filtering: {
              genres: "Filter by genre IDs (comma-separated). Use getAnimeGenres() first to see all available options",
              available_count: availableGenres.length,
              examples: ["'1' (Action)", "'4' (Comedy)", "'10' (Fantasy)", "'22' (Romance)", "'1,4' (Action+Comedy)"],
              note: "IMPORTANT: Always call getAnimeGenres() first to see current genre IDs and names"
            },
            quality_filters: {
              min_score: "Minimum MAL score (0-10). Higher scores = better rated anime",
              examples: ["8.0 for highly rated", "7.0 for good anime", "6.0 for decent anime"]
            },
            sorting_options: {
              order_by: "Sort results by specific criteria",
              available_fields: ["mal_id", "title", "type", "rating", "start_date", "end_date", "episodes", "score", "scored_by", "rank", "popularity", "members", "favorites"],
              sort: "Sort direction: 'desc' (highest first) or 'asc' (lowest first)",
              examples: ["order_by: 'score', sort: 'desc' for highest rated first"]
            },
            temporal_filtering: {
              year: "Filter by specific year (e.g., 2024, 2023)",
              season: "Filter by season: winter, spring, summer, fall",
              airing_status: "Filter by status: 'airing' (currently airing), 'finished', 'upcoming'",
              examples: ["year: 2024, season: 'summer' for Summer 2024 anime"]
            },
            type_filtering: {
              type: "Filter by anime type",
              available_types: ["TV (series)", "Movie (films)", "OVA (original video)", "Special (specials)", "ONA (web anime)", "Music (music videos)"],
              note: "Useful for avoiding weird 1-episode OVA specials or finding specific content types"
            },
            content_filtering: {
              sfw: "Safe for work filter. true = family-friendly only, false = include all content",
              default: "true (family-friendly by default)"
            },
            pagination: {
              page: "Page number for results (starts at 1)",
              limit: "Results per page (maximum 25)",
              note: "Use pagination for large result sets"
            }
          },
          specialized_searches: {
            top_anime: {
              description: "Get popular and trending anime lists",
              filters: ["airing (currently broadcasting)", "upcoming (not yet aired)", "bypopularity (most popular)", "favorite (most favorited)"]
            },
            seasonal_anime: {
              description: "Get anime from current or upcoming seasons - BOTH COMPACT AND FULL VERSIONS AVAILABLE",
              compact_functions: [
                "getCurrentSeasonAnime() - Currently airing anime (ultra-compact, 94% smaller)",
                "getCompactSeasonalRecommendations() - Any season/year (ultra-compact, 94% smaller)"
              ],
              full_functions: [
                "getSeasonalAnimeRecommendations() - Full detailed format with all anime data"
              ],
              recommendation: "Use compact versions for quick searches, full versions for detailed analysis",
              data_difference: "Compact: id, title, score, year, episodes, status, genres, themes, demographics, studio, type. Full: Complete anime objects with synopsis, images, etc."
            },
            recommendations: {
              description: "Find anime similar to a specific anime",
              input: "Requires anime MAL ID (get from search results)"
            },
            reviews: {
              description: "Three-tier review system for different use cases",
              tier_1_summary: "getAnimeReviews - Quick summary (sentiment breakdown, average scores, top reviewers) - START HERE",
              tier_2_sample: "getAnimeReviewsSample - Balanced sample of ~10 reviews (mix of positive/negative/neutral) with full text for analysis",
              tier_3_detailed: "getAnimeReviewsDetailed - All reviews with full text (context-heavy) - use sparingly",
              recommended_strategy: "1) Always start with summary, 2) Use sample for recommendation analysis, 3) Use detailed only when you need comprehensive review content",
              options: ["Include/exclude preliminary reviews", "Include/exclude spoiler reviews", "Sort by helpfulness/date/score"]
            }
          },
          search_strategies: {
            recommended_workflow: [
              "1. Use getAnimeGenres() to discover available genres",
              "2. Use searchAnime() with appropriate filters",
              "3. Use getAnimeDetails() for detailed information on interesting results",
              "4. Use getAnimeRecommendations() to find similar anime"
            ],
            mal_user_data_workflow: [
              "1. Get anime IDs from MAL user MCP (watch list, completed list, etc.)",
              "2. Use getBulkAnimeByIds() with compact=true for efficient lookup",
              "3. Use getAnimeDetails() for detailed info on specific anime",
              "4. Use getAnimeReception() for sentiment analysis on watched anime"
            ],
            common_patterns: {
              "Find highly rated anime in specific genre": "searchAnime with genres + min_score + order_by='score'",
              "Discover new seasonal anime": "getSeasonalAnimeRecommendations with season='now'",
              "Find popular anime of all time": "getTopAnime with filter='bypopularity'",
              "Get anime similar to one you like": "getAnimeRecommendations with anime ID",
              "Analyze user's watch list": "getBulkAnimeByIds with user's anime IDs",
              "Get detailed info on many anime efficiently": "getBulkAnimeByIds with compact=false"
            }
          },
          response_structure: {
            search_results: "Array of anime with core information (title, score, genres, etc.)",
            metadata: "Pagination info, total results, search parameters used",
            error_handling: "Detailed error messages with suggestions for fixes"
          },
          current_limitations: [
            "Genre filtering requires exact genre IDs (use getAnimeGenres() first)",
            "Some advanced filters may not be available in all endpoints",
            "Rate limiting applies to recommendation and review endpoints",
            "Maximum 25 results per page for performance"
          ],
          tips_for_ai_assistants: [
            "Always call getAnimeGenres() before using genre filters",
            "Use min_score filter to find quality anime (7.0+ recommended)",
            "Combine multiple search strategies for better results",
            "Check error messages for specific guidance on failed searches",
            "Use pagination for comprehensive searches",
            "USE getBulkAnimeByIds() when you have many MAL IDs from user data - much more efficient than individual calls",
            "Use compact=true for getBulkAnimeByIds() when you need basic info for many anime (saves 94% tokens)",
            "getBulkAnimeByIds() is perfect for analyzing user watch lists, completed lists, or recommendation lists"
          ]
        };

        return {
          content: [{ type: "text", text: JSON.stringify(capabilities, null, 2) }],
        };
      } catch (error: any) {
        const isFetchError = error.message?.includes('fetch failed') || error.code === 'ECONNREFUSED';
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: true,
              message: isFetchError
                ? `⚠️  API Server not running at ${LOCAL_API_BASE}`
                : `Failed to get search capabilities: ${error.message || 'An unexpected error occurred'}`,
              troubleshooting: isFetchError ? {
                issue: "The own-mal-db API server is not running",
                solution: [
                  "1. Start API server: cd /home/mokka/projektit/own-mal-db && npm run dev",
                  "2. Verify PostgreSQL: docker ps | grep postgres",
                  "3. Test API: curl http://localhost:3001/api/anime/genres"
                ],
                note: "MCP tools require the API server to be running"
              } : undefined,
              basic_info: {
                available_functions: ["searchAnime", "getAnimeDetails", "getTopAnime", "getSeasonalAnimeRecommendations", "getAnimeRecommendations", "getAnimeReviews", "getAnimeGenres"],
                note: isFetchError
                  ? "⚠️  Start the API server first (see troubleshooting)"
                  : "Full capabilities unavailable due to error, but basic functions should work"
              }
            }, null, 2)
          }],
          isError: true,
        };
      }
      });
    }
  );

  // Analyze user queries and suggest optimal search parameters
  server.tool(
    "suggestSearchStrategy",
    "Suggest optimal search/filter strategies and parameters based on a user's natural language anime request.",
    
    {
      user_query: z.string().describe("The user's search request in natural language")
    },
    async ({ user_query }: { user_query: string }) => {
      return withAnalytics("suggestSearchStrategy", { user_query }, async () => {
        try {
          const query = user_query.toLowerCase();
        
        // Analyze the query for different patterns
        const suggestions = {
          detected_intent: "general_search",
          confidence: 0.7,
          suggested_parameters: {} as any,
          alternative_strategies: [] as any[],
          explanation: "",
          expected_result_count: "medium" as "low" | "medium" | "high"
        };

        // Genre detection
        const genreKeywords = {
          action: ["action", "fight", "battle", "combat", "martial arts"],
          comedy: ["comedy", "funny", "humor", "laugh"],
          romance: ["romance", "love", "romantic", "relationship"],
          drama: ["drama", "emotional", "serious"],
          fantasy: ["fantasy", "magic", "magical", "wizard", "dragon"],
          horror: ["horror", "scary", "creepy", "ghost"],
          thriller: ["thriller", "suspense", "mystery"],
          "slice of life": ["slice of life", "daily life", "everyday", "school life"],
          sports: ["sports", "basketball", "soccer", "baseball", "volleyball"],
          mecha: ["mecha", "robot", "gundam", "giant robot"]
        };

        let detectedGenres: string[] = [];
        for (const [genre, keywords] of Object.entries(genreKeywords)) {
          if (keywords.some(keyword => query.includes(keyword))) {
            detectedGenres.push(genre);
          }
        }

        // Quality indicators
        const qualityKeywords = {
          high: ["best", "top", "highly rated", "masterpiece", "classic", "must watch"],
          good: ["good", "decent", "recommended", "popular"],
          any: ["any", "whatever", "anything"]
        };

        let qualityLevel = "any";
        for (const [level, keywords] of Object.entries(qualityKeywords)) {
          if (keywords.some(keyword => query.includes(keyword))) {
            qualityLevel = level;
            break;
          }
        }

        // Time period detection
        const timeKeywords = {
          recent: ["recent", "new", "latest", "2020", "2021", "2022", "2023", "2024"],
          classic: ["classic", "old", "vintage", "90s", "1990", "80s", "1980"],
          specific_year: query.match(/\b(19|20)\d{2}\b/)
        };

        // Type detection
        const typeKeywords = {
          movie: ["movie", "film"],
          series: ["series", "tv", "show", "anime series"],
          short: ["short", "ova", "special"]
        };

        // Build suggestions based on analysis
        if (detectedGenres.length > 0) {
          suggestions.detected_intent = "genre_search";
          suggestions.explanation = `Detected interest in ${detectedGenres.join(", ")} anime. `;
          suggestions.suggested_parameters.note = "Use getAnimeGenres() first to get exact genre IDs";
          suggestions.alternative_strategies.push({
            strategy: "genre_search",
            description: `Search specifically for ${detectedGenres.join(" + ")} anime`,
            parameters: { note: "Get genre IDs from getAnimeGenres() first" }
          });
        }

        if (qualityLevel === "high") {
          suggestions.suggested_parameters.min_score = 8.0;
          suggestions.suggested_parameters.order_by = "score";
          suggestions.suggested_parameters.sort = "desc";
          suggestions.explanation += "Looking for high-quality anime with excellent ratings. ";
        } else if (qualityLevel === "good") {
          suggestions.suggested_parameters.min_score = 7.0;
          suggestions.explanation += "Looking for well-regarded anime. ";
        }

        if (timeKeywords.recent.some(keyword => query.includes(keyword))) {
          suggestions.alternative_strategies.push({
            strategy: "seasonal_search",
            description: "Use getSeasonalAnimeRecommendations for recent anime",
            parameters: { season: "now" }
          });
          suggestions.explanation += "Consider using seasonal search for recent anime. ";
        }

        if (timeKeywords.classic.some(keyword => query.includes(keyword))) {
          suggestions.suggested_parameters.order_by = "year";
          suggestions.suggested_parameters.sort = "asc";
          suggestions.explanation += "Searching for classic/older anime. ";
        }

        // Specific anime title detection
        const animeNames = ["naruto", "one piece", "dragon ball", "attack on titan", "demon slayer", "my hero academia"];
        const mentionedAnime = animeNames.find(name => query.includes(name));
        if (mentionedAnime) {
          suggestions.detected_intent = "specific_anime_or_similar";
          suggestions.explanation = `Looking for "${mentionedAnime}" or similar anime. `;
          suggestions.alternative_strategies.push({
            strategy: "search_then_recommendations",
            description: "First search for the specific anime, then use getAnimeRecommendations",
            steps: [
              `searchAnime with query: "${mentionedAnime}"`,
              "getAnimeRecommendations with the found anime's ID"
            ]
          });
        }

        // Popularity indicators
        if (query.includes("popular") || query.includes("trending")) {
          suggestions.alternative_strategies.push({
            strategy: "top_anime_search",
            description: "Use getTopAnime for popular anime",
            parameters: { filter: "bypopularity" }
          });
        }

        // Set default explanation if none provided
        if (!suggestions.explanation) {
          suggestions.explanation = "General anime search detected. ";
        }

        // Add general recommendations
        suggestions.explanation += "Recommended workflow: 1) Use getAnimeGenres() if filtering by genre, 2) Use searchAnime() with suggested parameters, 3) Use getAnimeDetails() for more info on interesting results.";

        // Estimate result count
        if (suggestions.suggested_parameters.min_score >= 8.0) {
          suggestions.expected_result_count = "low";
        } else if (detectedGenres.length > 2 || suggestions.suggested_parameters.min_score >= 7.0) {
          suggestions.expected_result_count = "medium";
        } else {
          suggestions.expected_result_count = "high";
        }

        return {
          content: [{ type: "text", text: JSON.stringify(suggestions, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              error: true,
              message: `Failed to analyze search strategy: ${error.message}`,
              fallback_suggestion: {
                strategy: "Use searchAnime() with basic parameters",
                note: "Start with getSearchCapabilities() to see all available options"
              }
            }, null, 2)
          }],
          isError: true,
        };
      }
      });
    }
  );

  server.tool(
    "searchAnime",
    "Search for anime by title, genres, score, and other filters. Supports sorting, SFW/adult filtering, and pagination. Use getAnimeGenres() for genre IDs.",
    
    {
      query: z.string().describe("Search query for anime title, character name, or keyword").optional(),
      genres: z.string().optional().describe("Filter by genre IDs (comma-separated). IMPORTANT: Use getAnimeGenres first to see available genres and their IDs. Examples: '1' for Action, '4' for Comedy, '10' for Fantasy, '22' for Romance. Multiple genres: '1,4' for Action+Comedy."),
      min_score: z.number().min(0).max(10).optional().describe("Minimum score filter (0-10)"),
      year: z.number().int().min(1900).max(2030).optional().describe("Filter by specific year (e.g., 2024)"),
      season: z.enum(["winter", "spring", "summer", "fall"]).optional().describe("Filter by season: winter, spring, summer, fall"),
      airing_status: z.enum(["airing", "finished", "upcoming"]).optional().describe("Filter by airing status: airing (currently airing), finished (completed), upcoming (not yet aired)"),
      type: z.enum(["TV", "Movie", "OVA", "Special", "ONA", "Music"]).optional().describe("Filter by anime type: TV (series), Movie (films), OVA (original video), Special (specials), ONA (web anime), Music (music videos)"),
      order_by: z.enum([
        "mal_id", "title", "type", "rating", "start_date", "end_date",
        "episodes", "score", "scored_by", "rank", "popularity",
        "members", "favorites"
      ]).optional().describe("Sort results by this field"),
      sort: z.enum(["desc", "asc"]).optional().describe("Sort order (desc or asc)"),
      sfw: z.boolean().optional().describe("Filter out adult content (true) or include all (false). Defaults to true."),
      page: z.number().int().positive().optional().describe("Page number for pagination"),
      limit: z.number().int().positive().max(15).optional().describe("Number of results per page (max 15 for compact results)"),
    },
    async (params: {
      query?: string;
      genres?: string;
      min_score?: number;
      year?: number;
      season?: string;
      airing_status?: string;
      type?: string;
      order_by?: string;
      sort?: string;
      sfw?: boolean;
      page?: number;
      limit?: number;
    }) => {
      return withAnalytics("searchAnime", params, async () => {
        try {
          // Validate parameters first
          const validation = validateSearchParams(params);
        if (!validation.isValid) {
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                error: true,
                message: "Invalid search parameters",
                validation_errors: validation.errors,
                suggestions: validation.suggestions,
                parameters_provided: params
              }, null, 2)
            }],
            isError: true,
          };
        }

        const queryParams = new URLSearchParams();
        if (params.query) queryParams.append("query", params.query);
        if (params.genres) queryParams.append("genres", params.genres);
        if (params.min_score !== undefined) queryParams.append("min_score", String(params.min_score));
        if (params.year) queryParams.append("year", String(params.year));
        if (params.season) queryParams.append("season", params.season);
        if (params.airing_status) queryParams.append("airing_status", params.airing_status);
        if (params.type) queryParams.append("type", params.type);
        if (params.order_by) queryParams.append("order_by", params.order_by);
        if (params.sort) queryParams.append("sort", params.sort);
        queryParams.append("sfw", String(params.sfw === undefined ? true : params.sfw));
        if (params.page) queryParams.append("page", String(params.page));
        if (params.limit) queryParams.append("limit", String(params.limit));

        const apiUrl = `${LOCAL_API_BASE}/compact/search?${queryParams.toString()}`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                error: true,
                status: response.status,
                message: `Error searching anime: ${errorData?.message || 'Unknown error'}`
              }, null, 2)
            }],
            isError: true,
          };
        }
        
        const data = await response.json();
        
        if (!data.success) {
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                error: true,
                message: data.message || 'Search failed',
                suggestions: [
                  "Try using getAnimeGenres() first if using genre filters",
                  "Check if your search query is too specific",
                  "Try reducing the min_score filter",
                  "Use getSearchCapabilities() to see all available options"
                ],
                search_parameters_used: params
              }, null, 2)
            }],
            isError: true,
          };
        }
        
        // Get validation suggestions for successful searches too
        const validationSuggestions = validateSearchParams(params);
        
        // Enhance the response with search metadata
        const enhancedResponse = {
          ...data.data,
          search_metadata: {
            strategy_used: "direct_api_search",
            parameters_applied: params,
            total_results: data.data?.pagination?.total || data.data?.data?.length || 0,
            results_shown: data.data?.data?.length || 0,
            search_tips: [
              ...(params.genres ? [
                "Genre filtering applied - use getAnimeGenres() to see all available genres"
              ] : [
                "No genre filter applied - use genres parameter with getAnimeGenres() for more specific results"
              ]),
              ...validationSuggestions.suggestions
            ],
            optimization_suggestions: [
              "Use getAnimeDetails() for detailed information on interesting results",
              "Use getAnimeRecommendations() to find similar anime",
              "Try different sorting options (score, popularity, year) for varied results"
            ]
          }
        };
        
        return {
          content: [{ type: "text", text: JSON.stringify(enhancedResponse, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              error: true,
              message: `Failed to search anime: ${error.message || 'An unexpected error occurred'}`
            }, null, 2)
          }],
          isError: true,
        };
      }
      });
    }
  );



  server.tool(
    "getAnimeDetails",
    "Get comprehensive details for a specific anime by MyAnimeList ID, including synopsis, genres, episodes, and images.",

    { id: z.number().int().positive().describe("MyAnimeList ID of the anime to get detailed information for") },
    async ({ id }: { id: number }) => {
      return withAnalytics("getAnimeDetails", { id }, async () => {
        try {
        const response = await fetch(`${LOCAL_API_BASE}/clean/${id}`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                error: true,
                status: response.status,
                message: `Error fetching anime details: ${errorData?.message || 'Unknown error'}`
              }, null, 2)
            }],
            isError: true,
          };
        }
        
        const data = await response.json();
        
        if (!data.success) {
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                error: true,
                message: data.message || 'Failed to fetch anime details',
                suggestions: [
                  "Verify the anime ID is correct (get from searchAnime results)",
                  "Try searching for the anime first using searchAnime",
                  "Check if the anime exists on MyAnimeList"
                ],
                anime_id_used: id
              }, null, 2)
            }],
            isError: true,
          };
        }
        
        // Add metadata to the response
        const enhancedResponse = {
          ...data.data,
          fetch_metadata: {
            anime_id: id,
            data_source: "local_clean_api",
            timestamp: new Date().toISOString(),
            related_functions: [
              "Use getAnimeRecommendations() to find similar anime",
              "Use getAnimeReviews() to see user reviews"
            ]
          }
        };
        
        return {
          content: [{ type: "text", text: JSON.stringify(enhancedResponse, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: true,
              message: `Failed to fetch anime details: ${error.message || 'An unexpected error occurred'}`
            }, null, 2)
          }],
          isError: true,
        };
      }
      });
    }
  );

  server.tool(
    "getAnimeRecommendations",
    "Find anime recommendations based on a given anime's MyAnimeList ID. Returns similar or related anime.",

    { id: z.number().int().positive().describe("MyAnimeList ID of the anime to get recommendations based on") },
    async ({ id }: { id: number }) => {
      return withAnalytics("getAnimeRecommendations", { id }, async () => {
        try {
        const response = await fetch(`${LOCAL_API_BASE}/recommendations/${id}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                status: response.status,
                message: `Error fetching recommendations: ${errorData?.message || 'Unknown error'}`
              }, null, 2)
            }],
            isError: true,
          };
        }

        const data = await response.json();

        if (!data.success) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                message: data.message || 'Failed to fetch recommendations',
                anime_id: id
              }, null, 2)
            }],
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(data.data, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: true,
              message: `Failed to fetch recommendations: ${error.message || 'An unexpected error occurred'}`
            }, null, 2)
          }],
          isError: true,
        };
      }
      });
    }
  );

  server.tool(
    "getTopAnime",
    "Retrieve lists of top, popular, trending, or most favorited anime. Filter by airing, upcoming, popularity, or favorites.",
    
    {
      page: z.number().int().positive().optional().describe("Page number for pagination"),
      limit: z.number().int().positive().max(25).optional().describe("Number of results per page (max 25)"),
      filter: z.enum(["airing", "upcoming", "bypopularity", "favorite"]).optional().describe("Filter for top anime: airing (currently airing), upcoming (not yet aired), bypopularity (most popular), favorite (most favorited)"),
    },
    async (params: { page?: number; limit?: number; filter?: string }) => {
      return withAnalytics("getTopAnime", params, async () => {
        try {
          const queryParams = new URLSearchParams();
          if (params.page) queryParams.append("page", String(params.page));
          if (params.filter) queryParams.append("filter", params.filter);
          queryParams.append("sfw", "true");

          const limitParam = params.limit || 25;
          const apiUrl = `${LOCAL_API_BASE}/clean/top/${limitParam}?${queryParams.toString()}`;
          const response = await fetch(apiUrl);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                error: true,
                status: response.status,
                message: `Error fetching top anime: ${errorData?.message || 'Unknown error'}`
              }, null, 2)
            }],
            isError: true,
          };
        }
        
        const data = await response.json();
        
        if (!data.success) {
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                error: true,
                message: data.message || 'Failed to fetch top anime',
                suggestions: [
                  "Try different filter options: 'airing', 'upcoming', 'bypopularity', 'favorite'",
                  "Reduce the limit if requesting too many results",
                  "Check if the page number is valid"
                ],
                parameters_used: params,
                available_filters: ["airing", "upcoming", "bypopularity", "favorite"]
              }, null, 2)
            }],
            isError: true,
          };
        }
        
        return {
          content: [{ 
            type: "text", 
            text: JSON.stringify({
              ...data.data,
              search_metadata: {
                filter: params.filter || "all",
                category: "top_anime",
                page: params.page || 1,
                limit: params.limit || 25,
                data_source: "local_clean_api",
                timestamp: new Date().toISOString(),
                next_steps: [
                  "Use getAnimeDetails() for detailed information on any anime",
                  "Use getAnimeRecommendations() to find similar anime"
                ]
              }
            }, null, 2)
          }],
        };
        } catch (error: any) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                message: `Failed to fetch top anime: ${error.message || 'An unexpected error occurred'}`
              }, null, 2)
            }],
            isError: true,
          };
        }
      });
    }
  );

  server.tool(
    "getAnimeReviews",
    "Get a compact summary of reviews for an anime (sentiment breakdown, average scores, top reviewers) without flooding context. Use getAnimeReviewsDetailed when you need actual review text.",

    {
      id: z.number().int().positive().describe("MyAnimeList ID of the anime to get review summary for")
    },
    async (params: { id: number }) => {
      return withAnalytics("getAnimeReviews", params, async () => {
        try {
        const apiUrl = `${LOCAL_API_BASE}/reviews/${params.id}/summary`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                status: response.status,
                message: `Error fetching review summary: ${errorData?.message || 'Unknown error'}`
              }, null, 2)
            }],
            isError: true,
          };
        }

        const data = await response.json();

        if (!data.success) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                message: data.message || 'Failed to fetch review summary',
                anime_id: params.id
              }, null, 2)
            }],
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(data.data, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: true,
              message: `Failed to fetch review summary: ${error.message || 'An unexpected error occurred'}`
            }, null, 2)
          }],
          isError: true,
        };
      }
      });
    }
  );

  server.tool(
    "getAnimeReviewsDetailed",
    "Fetch detailed user reviews with full text for a specific anime. Use this ONLY when you need actual review content after checking the summary first.",

    {
      id: z.number().int().positive().describe("MyAnimeList ID of the anime to fetch detailed reviews for"),
      page: z.number().int().positive().optional().describe("Page number for pagination (default: 1)"),
      limit: z.number().int().positive().max(10).optional().describe("Number of reviews per page (max 10 to avoid context overflow)"),
      preliminary: z.boolean().optional().describe("Include preliminary reviews (written before anime finished airing)"),
      spoilers: z.boolean().optional().describe("Include reviews marked as containing spoilers"),
      sort: z.enum(["date", "helpful", "score"]).optional().describe("Sort reviews by: date (newest first), helpful (most helpful first), or score (highest score first)")
    },
    async (params: { id: number; page?: number; limit?: number; preliminary?: boolean; spoilers?: boolean; sort?: string }) => {
      return withAnalytics("getAnimeReviewsDetailed", params, async () => {
        try {
        const queryParams = new URLSearchParams();
        if (params.page) queryParams.append("page", String(params.page));
        if (params.limit) queryParams.append("limit", String(Math.min(params.limit, 10))); // Cap at 10 for context safety
        if (params.preliminary !== undefined) queryParams.append("preliminary", String(params.preliminary));
        if (params.spoilers !== undefined) queryParams.append("spoilers", String(params.spoilers));
        if (params.sort) queryParams.append("sort", params.sort);

        const apiUrl = `${LOCAL_API_BASE}/reviews/${params.id}${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                status: response.status,
                message: `Error fetching detailed reviews: ${errorData?.message || 'Unknown error'}`
              }, null, 2)
            }],
            isError: true,
          };
        }

        const data = await response.json();

        if (!data.success) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                message: data.message || 'Failed to fetch detailed reviews',
                anime_id: params.id,
                suggestion: "Try getAnimeReviews first to check if reviews exist for this anime"
              }, null, 2)
            }],
            isError: true,
          };
        }

        // Add a warning about context usage
        const enhancedResponse = {
          ...data.data,
          context_warning: {
            reviews_returned: data.data.reviews?.length || 0,
            estimated_tokens: (data.data.reviews?.length || 0) * 500, // Rough estimate
            recommendation: "This contains full review text and may use significant context. Use getAnimeReviews for summaries when possible."
          }
        };

        return {
          content: [{ type: "text", text: JSON.stringify(enhancedResponse, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: true,
              message: `Failed to fetch detailed reviews: ${error.message || 'An unexpected error occurred'}`
            }, null, 2)
          }],
          isError: true,
        };
      }
      });
    }
  );

  server.tool(
    "getAnimeReviewsSample",
    "Get a balanced sample of reviews (mix of positive/negative/neutral) with full text for recommendation analysis. Limited to ~10 reviews to avoid context overflow.",

    {
      id: z.number().int().positive().describe("MyAnimeList ID of the anime to get review sample for"),
      limit: z.number().int().positive().max(15).optional().describe("Number of reviews to sample (max 15, default 10)")
    },
    async (params: { id: number; limit?: number }) => {
      return withAnalytics("getAnimeReviewsSample", params, async () => {
        try {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.append("limit", String(params.limit));

        const apiUrl = `${LOCAL_API_BASE}/reviews/${params.id}/sample${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                status: response.status,
                message: `Error fetching review sample: ${errorData?.message || 'Unknown error'}`
              }, null, 2)
            }],
            isError: true,
          };
        }

        const data = await response.json();

        if (!data.success) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                message: data.message || 'Failed to fetch review sample',
                anime_id: params.id,
                suggestion: "Try getAnimeReviews first to check if reviews exist for this anime"
              }, null, 2)
            }],
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(data.data, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: true,
              message: `Failed to fetch review sample: ${error.message || 'An unexpected error occurred'}`
            }, null, 2)
          }],
          isError: true,
        };
      }
      });
    }
  );

  // Get all available anime genres - use BEFORE searchAnime for genre filtering
  server.tool(
    "getAnimeGenres",
    "List all available anime genres and their IDs. Use before searchAnime for genre filtering.",

    {},
    async () => {
      return withAnalytics("getAnimeGenres", {}, async () => {
        try {
        const response = await fetch(`${LOCAL_API_BASE}/genres`);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                error: true,
                status: response.status,
                message: `Error fetching genres: ${errorData?.message || 'Unknown error'}`
              }, null, 2)
            }],
            isError: true,
          };
        }
        
        const data = await response.json();
        
        if (!data.success) {
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                error: true,
                message: data.message || 'Failed to fetch genres'
              }, null, 2)
            }],
            isError: true,
          };
        }
        
        return {
          content: [{ type: "text", text: JSON.stringify(data.data, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: true,
              message: `Failed to fetch genres: ${error.message || 'An unexpected error occurred'}`
            }, null, 2)
          }],
          isError: true,
        };
      }
      });
    }
  );

  // New compact seasonal endpoints
  server.tool(
    "getCurrentSeasonAnime",
    "Get currently airing anime for the current season in ultra-compact format optimized for MCP tools.",

    {
      limit: z.number().int().positive().max(25).optional().describe("Number of results to return (max 25)")
    },
    async (params: { limit?: number }) => {
      return withAnalytics("getCurrentSeasonAnime", params, async () => {
        try {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.append("limit", String(params.limit));

        const apiUrl = `${LOCAL_API_BASE}/compact/current?${queryParams.toString()}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                status: response.status,
                message: `Error fetching current season anime: ${errorData?.message || 'Unknown error'}`
              }, null, 2)
            }],
            isError: true,
          };
        }

        const data = await response.json();

        if (!data.success) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                message: data.message || 'Failed to fetch current season anime',
                parameters_used: params
              }, null, 2)
            }],
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: true,
              message: `Failed to fetch current season anime: ${error.message}`
            }, null, 2)
          }],
          isError: true,
        };
      }
      });
    }
  );

  server.tool(
    "getCompactSeasonalRecommendations",
    "Get seasonal anime recommendations in ultra-compact format. Much more efficient than getSeasonalAnimeRecommendations.",

    {
      year: z.number().int().min(1900).max(2030).optional().describe("Year to get seasonal anime for (defaults to current year)"),
      season: z.enum(["winter", "spring", "summer", "fall"]).optional().describe("Season to get anime for (defaults to current season)"),
      limit: z.number().int().positive().max(25).optional().describe("Number of results to return (max 25)")
    },
    async (params: { year?: number; season?: string; limit?: number }) => {
      return withAnalytics("getCompactSeasonalRecommendations", params, async () => {
        try {
        const queryParams = new URLSearchParams();
        if (params.year) queryParams.append("year", String(params.year));
        if (params.season) queryParams.append("season", params.season);
        if (params.limit) queryParams.append("limit", String(params.limit));

        const apiUrl = `${LOCAL_API_BASE}/compact/seasonal?${queryParams.toString()}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                status: response.status,
                message: `Error fetching seasonal anime: ${errorData?.message || 'Unknown error'}`
              }, null, 2)
            }],
            isError: true,
          };
        }

        const data = await response.json();

        if (!data.success) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                message: data.message || 'Failed to fetch seasonal anime',
                parameters_used: params
              }, null, 2)
            }],
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: true,
              message: `Failed to fetch seasonal anime: ${error.message}`
            }, null, 2)
          }],
          isError: true,
        };
      }
      });
    }
  );

  server.tool(
    "getSeasonalAnimeRecommendations",
    "Get anime airing in the current or upcoming season, with optional type, SFW, and pagination filters. NOTE: Use getCompactSeasonalRecommendations for better performance.",

    {
      season: z.enum(["now", "upcoming"]).describe("Get recommendations for current season ('now') or upcoming season ('upcoming')"),
      filter: z.enum(["tv", "movie", "ova", "special", "ona", "music"]).optional().describe("Filter by anime type"),
      sfw: z.boolean().optional().describe("Filter out adult content. Defaults to true."),
      unapproved: z.boolean().optional().describe("Include unapproved entries. Defaults to false."),
      continuing: z.boolean().optional().describe("Include anime continuing from previous season. Defaults to false."),
      page: z.number().int().positive().optional().describe("Page number for pagination"),
      limit: z.number().int().positive().max(25).optional().describe("Number of results per page (max 25)"),
    },
    async (params: {
      season: "now" | "upcoming";
      filter?: "tv" | "movie" | "ova" | "special" | "ona" | "music";
      sfw?: boolean;
      unapproved?: boolean;
      continuing?: boolean;
      page?: number;
      limit?: number;
    }) => {
      return withAnalytics("getSeasonalAnimeRecommendations", params, async () => {
        try {
        const queryParams = new URLSearchParams();
        if (params.filter) queryParams.append("filter", params.filter);
        queryParams.append("sfw", String(params.sfw === undefined ? true : params.sfw));
        if (params.unapproved) queryParams.append("unapproved", "true");
        if (params.continuing) queryParams.append("continuing", "true");
        if (params.page) queryParams.append("page", String(params.page));
        if (params.limit) queryParams.append("limit", String(params.limit));

        const seasonPath = params.season === "now" ? "now" : "upcoming";
        const apiUrl = `${LOCAL_API_BASE}/clean/seasons/${seasonPath}?${queryParams.toString()}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                error: true,
                status: response.status,
                message: `Error fetching seasonal anime: ${errorData?.message || 'Unknown error'}`
              }, null, 2)
            }],
            isError: true,
          };
        }
        
        const data = await response.json();
        
        if (!data.success) {
          return {
            content: [{ 
              type: "text", 
              text: JSON.stringify({
                error: true,
                message: data.message || 'Failed to fetch seasonal anime',
                suggestions: [
                  "Try different season: 'now' for current season, 'upcoming' for next season",
                  "Try different filter: 'tv', 'movie', 'ova', 'special', 'ona', 'music'",
                  "Check if the page number is valid",
                  "Reduce the limit if requesting too many results"
                ],
                parameters_used: params,
                available_seasons: ["now", "upcoming"],
                available_filters: ["tv", "movie", "ova", "special", "ona", "music"]
              }, null, 2)
            }],
            isError: true,
          };
        }
        
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              ...data.data,
              search_metadata: {
                season: params.season,
                filter: params.filter || "all",
                category: "seasonal_anime",
                sfw: params.sfw !== false,
                page: params.page || 1,
                limit: params.limit || 25,
                data_source: "local_clean_api",
                timestamp: new Date().toISOString(),
                description: params.season === "now" ? "Currently airing anime" : "Upcoming anime for next season",
                next_steps: [
                  "Use getAnimeDetails() for detailed information on any anime",
                  "Use getAnimeRecommendations() to find similar anime",
                  "Use searchAnime() with specific genres for more targeted results"
                ]
              }
            }, null, 2)
          }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: true,
              message: `Failed to fetch seasonal anime: ${error.message || 'An unexpected error occurred'}`
            }, null, 2)
          }],
          isError: true,
        };
      }
      });
    }
  );

  // Get comprehensive reception analysis for an anime based on reviews
  server.tool(
    "getAnimeReception",
    "Get detailed reception analysis for an anime including sentiment analysis, polarization scores, common complaints/praises, and review patterns.",

    { id: z.number().int().positive().describe("MyAnimeList ID of the anime to analyze reception for") },
    async ({ id }: { id: number }) => {
      return withAnalytics("getAnimeReception", { id }, async () => {
        try {
        const response = await fetch(`${LOCAL_API_BASE}/reception/${id}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                status: response.status,
                message: `Error fetching anime reception: ${errorData?.message || 'Unknown error'}`
              }, null, 2)
            }],
            isError: true,
          };
        }

        const data = await response.json();

        if (!data.success) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                message: data.error || 'Failed to fetch anime reception',
                anime_id: id
              }, null, 2)
            }],
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(data.data, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: true,
              message: `Failed to get anime reception: ${error.message}`
            }, null, 2)
          }],
          isError: true,
        };
      }
      });
    }
  );

  // Search anime by review sentiment patterns
  server.tool(
    "searchByReviewSentiment",
    "Find anime based on review sentiment patterns like 'mostly positive', 'polarizing', 'underrated', etc.",

    {
      sentiment_pattern: z.enum([
        "mostly_positive", "mostly_negative", "highly_polarizing",
        "universally_loved", "underrated", "overrated", "mixed_reception"
      ]).describe("Pattern to search for"),
      min_reviews: z.number().int().positive().optional().describe("Minimum number of reviews required (default: 10)"),
      limit: z.number().int().positive().max(50).optional().describe("Maximum results to return (max 50)")
    },
    async (params: {
      sentiment_pattern: string;
      min_reviews?: number;
      limit?: number
    }) => {
      return withAnalytics("searchByReviewSentiment", params, async () => {
        try {
        const queryParams = new URLSearchParams();
        queryParams.append("sentiment_pattern", params.sentiment_pattern);
        if (params.min_reviews) queryParams.append("min_reviews", String(params.min_reviews));
        if (params.limit) queryParams.append("limit", String(params.limit));

        const response = await fetch(`${LOCAL_API_BASE}/sentiment/search?${queryParams.toString()}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                status: response.status,
                message: `Error searching by sentiment: ${errorData?.message || 'Unknown error'}`
              }, null, 2)
            }],
            isError: true,
          };
        }

        const data = await response.json();

        if (!data.success) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                message: data.error || 'Failed to search by sentiment',
                parameters: params
              }, null, 2)
            }],
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(data.data, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: true,
              message: `Failed to search by sentiment: ${error.message}`
            }, null, 2)
          }],
          isError: true,
        };
      }
      });
    }
  );

  // Get review insights and patterns across the database
  server.tool(
    "getReviewInsights",
    "Get insights about review patterns, sentiment distributions, and trends across the anime database.",

    {
      insight_type: z.enum([
        "sentiment_distribution", "polarization_trends", "review_engagement",
        "genre_sentiment", "database_overview"
      ]).describe("Type of insights to retrieve"),
      genre_filter: z.string().optional().describe("Filter by specific genre (genre name)")
    },
    async (params: { insight_type: string; genre_filter?: string }) => {
      return withAnalytics("getReviewInsights", params, async () => {
        try {
        const queryParams = new URLSearchParams();
        queryParams.append("insight_type", params.insight_type);
        if (params.genre_filter) queryParams.append("genre_filter", params.genre_filter);

        const response = await fetch(`${LOCAL_API_BASE}/insights?${queryParams.toString()}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                status: response.status,
                message: `Error fetching insights: ${errorData?.message || 'Unknown error'}`
              }, null, 2)
            }],
            isError: true,
          };
        }

        const data = await response.json();

        if (!data.success) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                message: data.error || 'Failed to fetch insights',
                parameters: params
              }, null, 2)
            }],
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(data.data, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: true,
              message: `Failed to get review insights: ${error.message}`
            }, null, 2)
          }],
          isError: true,
        };
      }
      });
    }
  );

  // Compare reception between two anime
  server.tool(
    "compareAnimeReception",
    "Compare reception analysis between two anime to see differences in sentiment, polarization, and review patterns.",

    {
      anime_id_1: z.number().int().positive().describe("MyAnimeList ID of the first anime"),
      anime_id_2: z.number().int().positive().describe("MyAnimeList ID of the second anime")
    },
    async (params: { anime_id_1: number; anime_id_2: number }) => {
      return withAnalytics("compareAnimeReception", params, async () => {
        try {
        const queryParams = new URLSearchParams();
        queryParams.append("anime_id_1", String(params.anime_id_1));
        queryParams.append("anime_id_2", String(params.anime_id_2));

        const response = await fetch(`${LOCAL_API_BASE}/compare-reception?${queryParams.toString()}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                status: response.status,
                message: `Error comparing reception: ${errorData?.message || 'Unknown error'}`
              }, null, 2)
            }],
            isError: true,
          };
        }

        const data = await response.json();

        if (!data.success) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                message: data.error || 'Failed to compare reception',
                parameters: params
              }, null, 2)
            }],
            isError: true,
          };
        }

        return {
          content: [{ type: "text", text: JSON.stringify(data.data, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: true,
              message: `Failed to compare anime reception: ${error.message}`
            }, null, 2)
          }],
          isError: true,
        };
      }
      });
    }
  );

  // Bulk anime lookup - get multiple anime by MAL IDs in one call
  server.tool(
    "getBulkAnimeByIds",
    "Get information for multiple anime by their MAL IDs in a single efficient call. Perfect for looking up many anime from user watch lists or recommendation lists.",

    {
      ids: z.array(z.number().int().positive()).max(100).describe("Array of MyAnimeList IDs to fetch (max 100 IDs per request)"),
      compact: z.boolean().optional().default(false).describe("Return ultra-compact format to save tokens (true) or clean detailed format (false)")
    },
    async (params: { ids: number[]; compact?: boolean }) => {
      return withAnalytics("getBulkAnimeByIds", params, async () => {
        try {
        if (params.ids.length === 0) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                message: "No anime IDs provided",
                suggestion: "Provide an array of MAL IDs to fetch anime information"
              }, null, 2)
            }],
            isError: true,
          };
        }

        if (params.ids.length > 100) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                message: "Too many IDs provided. Maximum 100 IDs per request",
                provided_count: params.ids.length,
                suggestion: "Split the request into multiple calls or use the first 100 IDs"
              }, null, 2)
            }],
            isError: true,
          };
        }

        const queryParams = new URLSearchParams();
        queryParams.append("ids", params.ids.join(","));
        if (params.compact) queryParams.append("compact", "true");

        const response = await fetch(`${LOCAL_API_BASE}/bulk?${queryParams.toString()}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                status: response.status,
                message: `Error fetching bulk anime data: ${errorData?.message || 'Unknown error'}`
              }, null, 2)
            }],
            isError: true,
          };
        }

        const data = await response.json();

        if (!data.success) {
          return {
            content: [{
              type: "text",
              text: JSON.stringify({
                error: true,
                message: data.error || 'Failed to fetch bulk anime data',
                parameters: params
              }, null, 2)
            }],
            isError: true,
          };
        }

        // Add some metadata about the bulk operation
        const enhancedResponse = {
          ...data.data,
          bulk_operation_metadata: {
            requested_ids: params.ids,
            format_used: params.compact ? "ultra-compact" : "clean",
            efficiency_note: params.compact
              ? "Ultra-compact format used - 94% smaller responses, perfect for MCP tools"
              : "Clean format used - detailed information suitable for analysis",
            performance_benefit: `Retrieved ${data.data.total_found} anime in 1 API call instead of ${params.ids.length} individual calls`,
            missing_anime_note: data.data.total_missing > 0
              ? `${data.data.total_missing} anime not found in database - these might need to be scraped first`
              : "All requested anime found in database",
            next_steps: [
              "Use getAnimeDetails() for even more detailed information on specific anime",
              "Use getAnimeRecommendations() to find similar anime",
              "Use getAnimeReception() for sentiment analysis on any anime"
            ]
          }
        };

        return {
          content: [{ type: "text", text: JSON.stringify(enhancedResponse, null, 2) }],
        };
      } catch (error: any) {
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              error: true,
              message: `Failed to fetch bulk anime data: ${error.message}`
            }, null, 2)
          }],
          isError: true,
        };
      }
      });
    }
  );

  return server;
}

// Main function to start the server with StdioTransport
async function main() {
  const server = getServer();
  const transport = new StdioServerTransport();

  try {
    await server.connect(transport);
  } catch (error) {
    console.error("Failed to connect server with StdioTransport:", error);
    process.exit(1);
  }
}

main();

// No Express app, no app.listen(), no export { app } 