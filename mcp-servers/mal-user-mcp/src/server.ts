import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import express from "express";

// Environment configuration
const MAL_CLIENT_ID = process.env.MAL_CLIENT_ID || "29709444ed975c1bfba6fa37a77a6942";
const MAL_CLIENT_SECRET = process.env.MAL_CLIENT_SECRET || "9714563e1c56b91278553b161d4195f0b954236364f27c00a7378db09509daa5";
const MAL_REDIRECT_URI = process.env.MAL_REDIRECT_URI || "http://localhost:8080/callback";
const MAL_CALLBACK_PORT = parseInt(process.env.MAL_CALLBACK_PORT || "8080");
const TOKEN_STORAGE_PATH = process.env.TOKEN_STORAGE_PATH || "./tokens.json";
const MAL_API_BASE_URL = process.env.MAL_API_BASE_URL || "https://api.myanimelist.net/v2";
const MAL_AUTH_BASE_URL = process.env.MAL_AUTH_BASE_URL || "https://myanimelist.net/v1/oauth2";

// Token storage interface
interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user_id?: string;
}

// MAL API response types
interface MALTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

interface MALAnimeListEntry {
  id: number;
  title: string;
  main_picture?: {
    medium: string;
    large: string;
  };
  list_status: {
    status: string;
    score: number;
    num_episodes_watched: number;
    is_rewatching: boolean;
    updated_at: string;
  };
}

// Rate limiter for MAL API
class RateLimiter {
  private requestTimes: number[] = [];
  private readonly maxRequests = 3;
  private readonly timeWindow = 1000; // 1 second

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    this.requestTimes = this.requestTimes.filter(time => now - time < this.timeWindow);

    if (this.requestTimes.length < this.maxRequests) {
      this.requestTimes.push(now);
      return;
    }

    const oldestRequest = this.requestTimes[0];
    const waitTime = this.timeWindow - (now - oldestRequest) + 10;

    console.error(`Rate limit reached, waiting ${waitTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    this.requestTimes.push(Date.now());
  }
}

const rateLimiter = new RateLimiter();

// Token management functions
async function loadTokens(): Promise<StoredTokens | null> {
  try {
    const data = await fs.readFile(TOKEN_STORAGE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

async function saveTokens(tokens: StoredTokens): Promise<void> {
  await fs.writeFile(TOKEN_STORAGE_PATH, JSON.stringify(tokens, null, 2));
}

async function clearTokens(): Promise<void> {
  try {
    await fs.unlink(TOKEN_STORAGE_PATH);
  } catch (error) {
    // File doesn't exist, which is fine
  }
}

// OAuth helper functions
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier: string): string {
  // MAL only supports 'plain' method currently
  return verifier;
}

// MAL API client functions
async function makeMALRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
  await rateLimiter.waitForSlot();

  const tokens = await loadTokens();
  if (!tokens) {
    throw new Error("Not authenticated. Please run mal_authenticate first.");
  }

  // Check if token is expired and refresh if needed
  if (Date.now() > tokens.expires_at) {
    console.error("Access token expired, refreshing...");
    await refreshAccessToken();
    return makeMALRequest(endpoint, options); // Retry with new token
  }

  const response = await fetch(`${MAL_API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${tokens.access_token}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Token might be invalid, try refreshing
      console.error("Received 401, attempting token refresh...");
      await refreshAccessToken();
      return makeMALRequest(endpoint, options); // Retry with new token
    }
    throw new Error(`MAL API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function refreshAccessToken(): Promise<void> {
  const tokens = await loadTokens();
  if (!tokens?.refresh_token) {
    throw new Error("No refresh token available. Please re-authenticate.");
  }

  const response = await fetch(`${MAL_AUTH_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${MAL_CLIENT_ID}:${MAL_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: tokens.refresh_token,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${response.status} ${response.statusText}`);
  }

  const tokenData: MALTokenResponse = await response.json();

  await saveTokens({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: Date.now() + (tokenData.expires_in * 1000),
    user_id: tokens.user_id,
  });
}

// OAuth flow
async function startOAuthFlow(): Promise<string> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = crypto.randomBytes(16).toString('hex');

  // Store the code verifier temporarily
  await fs.writeFile('./oauth_state.json', JSON.stringify({
    codeVerifier,
    state,
    timestamp: Date.now()
  }));

  const authUrl = new URL(`${MAL_AUTH_BASE_URL}/authorize`);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', MAL_CLIENT_ID);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('redirect_uri', MAL_REDIRECT_URI);
  authUrl.searchParams.set('code_challenge', codeChallenge);
  authUrl.searchParams.set('code_challenge_method', 'plain');

  return authUrl.toString();
}

async function handleOAuthCallback(authCode: string, state: string): Promise<void> {
  // Load stored OAuth state
  const stateData = JSON.parse(await fs.readFile('./oauth_state.json', 'utf-8'));

  if (state !== stateData.state) {
    throw new Error("Invalid state parameter");
  }

  // Exchange code for tokens
  const response = await fetch(`${MAL_AUTH_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${MAL_CLIENT_ID}:${MAL_CLIENT_SECRET}`).toString('base64')}`,
    },
    body: new URLSearchParams({
      client_id: MAL_CLIENT_ID,
      grant_type: 'authorization_code',
      code: authCode,
      redirect_uri: MAL_REDIRECT_URI,
      code_verifier: stateData.codeVerifier,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status} ${response.statusText}`);
  }

  const tokenData: MALTokenResponse = await response.json();

  await saveTokens({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: Date.now() + (tokenData.expires_in * 1000),
  });

  // Clean up temporary state file
  await fs.unlink('./oauth_state.json');
}

// Create the MCP server
const server = new McpServer(
  {
    name: "mal-user-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Tool definitions using server.tool()
server.tool(
  "mal_authenticate",
  "Get instructions for authenticating with MyAnimeList using the web interface",
  {},
  async () => {
    const tokens = await loadTokens();

    if (tokens && Date.now() < tokens.expires_at) {
      return {
        content: [
          {
            type: "text",
            text: `✅ **Already authenticated!**\n\n` +
                  `You're already logged in to MyAnimeList.\n` +
                  `Use \`mal_get_auth_status\` to see more details.\n\n` +
                  `To re-authenticate, first run \`mal_revoke_auth\` then follow the authentication steps.`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `🔑 **MyAnimeList Authentication**\n\n` +
                `**Easy Web Authentication:**\n` +
                `1. 🌐 Open: http://localhost:${MAL_CALLBACK_PORT}\n` +
                `2. 🔄 Click "Login with MyAnimeList"\n` +
                `3. ✅ Complete OAuth authorization\n` +
                `4. 🎯 Return here and use \`mal_get_auth_status\` to verify\n\n` +
                `**Manual Authentication (Advanced):**\n` +
                `If the web interface isn't available, you can start a manual OAuth flow.\n\n` +
                `📝 **Note:** The authentication server should be running on port ${MAL_CALLBACK_PORT}.\n` +
                `If it's not running, start it with: \`node auth-server.js\``,
        },
      ],
    };
  }
);

server.tool(
  "mal_debug_config",
  "Show current OAuth configuration for debugging",
  {},
  async () => {
    return {
      content: [
        {
          type: "text",
          text: `🔧 **OAuth Configuration:**\n\n` +
                `• Client ID: ${MAL_CLIENT_ID}\n` +
                `• Redirect URI: ${MAL_REDIRECT_URI}\n` +
                `• Callback Port: ${MAL_CALLBACK_PORT}\n` +
                `• Auth Base URL: ${MAL_AUTH_BASE_URL}\n` +
                `• API Base URL: ${MAL_API_BASE_URL}\n\n` +
                `⚠️ **Important:** Make sure the redirect URI is registered in your MAL application settings.`,
        },
      ],
    };
  }
);

server.tool(
  "mal_get_auth_status",
  "Check current authentication status and get login instructions",
  {},
  async () => {
    const tokens = await loadTokens();

    if (!tokens) {
      return {
        content: [
          {
            type: "text",
            text: `❌ **Not authenticated with MyAnimeList**\n\n` +
                  `🔑 **To authenticate:**\n` +
                  `1. Visit: http://localhost:${MAL_CALLBACK_PORT}\n` +
                  `2. Click "Login with MyAnimeList"\n` +
                  `3. Complete OAuth authorization\n` +
                  `4. Return here and run this tool again\n\n` +
                  `📝 **Note:** The authentication server must be running on port ${MAL_CALLBACK_PORT}`,
          },
        ],
      };
    }

    const isExpired = Date.now() > tokens.expires_at;
    const expiresAt = new Date(tokens.expires_at).toLocaleString();

    return {
      content: [
        {
          type: "text",
          text: `✅ **Authenticated with MyAnimeList**\n\n` +
                `📅 **Token expires:** ${expiresAt}\n` +
                `🔋 **Status:** ${isExpired ? '🔴 Expired (will auto-refresh)' : '🟢 Valid'}\n\n` +
                `🎯 **Ready to use MAL API tools:**\n` +
                `• mal_get_user_info - Get your profile and statistics\n` +
                `• mal_get_user_list - View your anime list\n` +
                `• mal_update_anime - Update anime status/scores\n` +
                `• mal_remove_anime - Remove anime from list`,
        },
      ],
    };
  }
);

server.tool(
  "mal_revoke_auth",
  "Revoke stored authentication tokens",
  {},
  async () => {
    await clearTokens();

    return {
      content: [
        {
          type: "text",
          text: "✅ Authentication tokens cleared",
        },
      ],
    };
  }
);

server.tool(
  "mal_get_user_list",
  "Get user's anime list with optional filters",
  {
    status: z.enum(["watching", "completed", "on_hold", "dropped", "plan_to_watch"]).optional().describe("Filter by list status"),
    limit: z.number().max(1000).default(100).describe("Number of entries to retrieve (max 1000)"),
    offset: z.number().default(0).describe("Offset for pagination"),
  },
  async (args) => {
    try {
      const { status, limit = 100, offset = 0 } = args;

      const params = new URLSearchParams({
        fields: 'list_status',
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (status) {
        params.set('status', status);
      }

      const data = await makeMALRequest(`/users/@me/animelist?${params}`);

      const animeList = data.data.map((entry: any) => ({
        id: entry.node.id,
        title: entry.node.title,
        status: entry.list_status.status,
        score: entry.list_status.score,
        episodes_watched: entry.list_status.num_episodes_watched,
        is_rewatching: entry.list_status.is_rewatching,
        updated_at: entry.list_status.updated_at,
      }));

      return {
        content: [
          {
            type: "text",
            text: `Found ${animeList.length} anime in your list:\n\n` +
              animeList.map((anime: any) =>
                `• ${anime.title} (ID: ${anime.id})\n` +
                `  Status: ${anime.status} | Score: ${anime.score || 'Not scored'} | Episodes: ${anime.episodes_watched}`
              ).join('\n\n'),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "mal_update_anime",
  "Update anime in user's list (status, score, episodes watched)",
  {
    anime_id: z.number().describe("MyAnimeList anime ID"),
    status: z.enum(["watching", "completed", "on_hold", "dropped", "plan_to_watch"]).optional().describe("New status for the anime"),
    score: z.number().min(0).max(10).optional().describe("Score from 0-10 (0 removes score)"),
    num_watched_episodes: z.number().min(0).optional().describe("Number of episodes watched"),
    is_rewatching: z.boolean().optional().describe("Whether currently rewatching"),
  },
  async (args) => {
    try {
      const { anime_id, status, score, num_watched_episodes, is_rewatching } = args;

      const body = new URLSearchParams();

      if (status) body.set('status', status);
      if (score !== undefined) body.set('score', score.toString());
      if (num_watched_episodes !== undefined) body.set('num_watched_episodes', num_watched_episodes.toString());
      if (is_rewatching !== undefined) body.set('is_rewatching', is_rewatching.toString());

      await makeMALRequest(`/anime/${anime_id}/my_list_status`, {
        method: 'PUT',
        body: body,
      });

      return {
        content: [
          {
            type: "text",
            text: `✅ Successfully updated anime ID ${anime_id}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "mal_remove_anime",
  "Remove anime from user's list",
  {
    anime_id: z.number().describe("MyAnimeList anime ID to remove"),
  },
  async (args) => {
    try {
      const { anime_id } = args;

      await makeMALRequest(`/anime/${anime_id}/my_list_status`, {
        method: 'DELETE',
      });

      return {
        content: [
          {
            type: "text",
            text: `✅ Removed anime ID ${anime_id} from your list`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "mal_get_user_info",
  "Get basic user information and statistics",
  {},
  async () => {
    try {
      const data = await makeMALRequest('/users/@me?fields=anime_statistics');

      const stats = data.anime_statistics;

      return {
        content: [
          {
            type: "text",
            text: `👤 User: ${data.name}\n\n` +
              `📊 Anime Statistics:\n` +
              `• Watching: ${stats.num_items_watching}\n` +
              `• Completed: ${stats.num_items_completed}\n` +
              `• On Hold: ${stats.num_items_on_hold}\n` +
              `• Dropped: ${stats.num_items_dropped}\n` +
              `• Plan to Watch: ${stats.num_items_plan_to_watch}\n` +
              `• Total Entries: ${stats.num_items}\n` +
              `• Episodes Watched: ${stats.num_episodes}\n` +
              `• Days Watched: ${stats.num_days_watched.toFixed(1)}\n` +
              `• Mean Score: ${stats.mean_score.toFixed(1)}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "mal_bulk_update_anime",
  "Bulk update anime status for multiple anime (useful for changing watching→dropped/on_hold)",
  {
    from_status: z.enum(["watching", "completed", "on_hold", "dropped", "plan_to_watch"]).describe("Current status to filter and update from"),
    to_status: z.enum(["watching", "completed", "on_hold", "dropped", "plan_to_watch"]).describe("New status to change to"),
    dry_run: z.boolean().default(true).describe("If true, shows what would be updated without making changes"),
    limit: z.number().max(1000).default(1000).describe("Max number of entries to process"),
  },
  async (args) => {
    try {
      const { from_status, to_status, dry_run = true, limit = 1000 } = args;

      if (from_status === to_status) {
        return {
          content: [
            {
              type: "text",
              text: "❌ From status and to status cannot be the same",
            },
          ],
        };
      }

      // Get all anime with the specified status
      const params = new URLSearchParams({
        fields: 'list_status',
        status: from_status,
        limit: limit.toString(),
      });

      const data = await makeMALRequest(`/users/@me/animelist?${params}`);
      const animeToUpdate = data.data;

      if (animeToUpdate.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No anime found with status: ${from_status}`,
            },
          ],
        };
      }

      if (dry_run) {
        const animeList = animeToUpdate.map((entry: any) =>
          `• ${entry.node.title} (ID: ${entry.node.id}) - Episodes watched: ${entry.list_status.num_episodes_watched}`
        ).join('\n');

        return {
          content: [
            {
              type: "text",
              text: `🔍 **DRY RUN** - Found ${animeToUpdate.length} anime to update from "${from_status}" to "${to_status}":\n\n${animeList}\n\n` +
                    `To actually perform these updates, run this tool again with dry_run=false.\n\n` +
                    `⚠️ **Warning:** This will update ${animeToUpdate.length} anime entries. Make sure this is what you want!`,
            },
          ],
        };
      }

      // Perform actual updates
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const entry of animeToUpdate) {
        try {
          const body = new URLSearchParams();
          body.set('status', to_status);

          await makeMALRequest(`/anime/${entry.node.id}/my_list_status`, {
            method: 'PUT',
            body: body,
          });

          successCount++;

          // Progress indicator
          if (successCount % 10 === 0) {
            console.error(`Progress: ${successCount}/${animeToUpdate.length} updated...`);
          }
        } catch (error) {
          errorCount++;
          errors.push(`${entry.node.title} (${entry.node.id}): ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      const resultText = `✅ **Bulk Update Complete!**\n\n` +
        `📊 **Results:**\n` +
        `• Successfully updated: ${successCount}\n` +
        `• Errors: ${errorCount}\n` +
        `• Total processed: ${animeToUpdate.length}\n\n` +
        `Status changed from "${from_status}" to "${to_status}"\n\n` +
        (errors.length > 0 ? `❌ **Errors:**\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? `\n...and ${errors.length - 10} more errors` : ''}` : '');

      return {
        content: [
          {
            type: "text",
            text: resultText,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "mal_bulk_add_anime",
  "Bulk add multiple anime to your list by their IDs",
  {
    anime_ids: z.array(z.number()).describe("Array of MyAnimeList anime IDs to add"),
    status: z.enum(["watching", "completed", "on_hold", "dropped", "plan_to_watch"]).default("plan_to_watch").describe("Status to add anime with"),
    score: z.number().min(0).max(10).optional().describe("Optional score to set (0-10)"),
    dry_run: z.boolean().default(true).describe("If true, shows what would be added without making changes"),
  },
  async (args) => {
    try {
      const { anime_ids, status = "plan_to_watch", score, dry_run = true } = args;

      if (anime_ids.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "❌ No anime IDs provided",
            },
          ],
        };
      }

      if (dry_run) {
        const animeIdList = anime_ids.join(', ');
        return {
          content: [
            {
              type: "text",
              text: `🔍 **DRY RUN** - Will add ${anime_ids.length} anime to your list:\n\n` +
                    `• Anime IDs: ${animeIdList}\n` +
                    `• Status: ${status}\n` +
                    `• Score: ${score || 'Not set'}\n\n` +
                    `To actually add these anime, run this tool again with dry_run=false.\n\n` +
                    `⚠️ **Warning:** This will add ${anime_ids.length} anime entries to your list!`,
            },
          ],
        };
      }

      // Perform actual additions
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const animeId of anime_ids) {
        try {
          const body = new URLSearchParams();
          body.set('status', status);
          if (score !== undefined) {
            body.set('score', score.toString());
          }

          await makeMALRequest(`/anime/${animeId}/my_list_status`, {
            method: 'PUT',
            body: body,
          });

          successCount++;

          // Progress indicator
          if (successCount % 10 === 0) {
            console.error(`Progress: ${successCount}/${anime_ids.length} added...`);
          }
        } catch (error) {
          errorCount++;
          errors.push(`ID ${animeId}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      const resultText = `✅ **Bulk Add Complete!**\n\n` +
        `📊 **Results:**\n` +
        `• Successfully added: ${successCount}\n` +
        `• Errors: ${errorCount}\n` +
        `• Total processed: ${anime_ids.length}\n\n` +
        `All anime added with status: "${status}"\n\n` +
        (errors.length > 0 ? `❌ **Errors:**\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? `\n...and ${errors.length - 10} more errors` : ''}` : '');

      return {
        content: [
          {
            type: "text",
            text: resultText,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);

server.tool(
  "mal_bulk_delete_anime",
  "Bulk delete anime from your list (by status or specific IDs)",
  {
    delete_by: z.enum(["status", "ids"]).describe("Delete by status filter or specific anime IDs"),
    status: z.enum(["watching", "completed", "on_hold", "dropped", "plan_to_watch"]).optional().describe("Status to filter and delete (required if delete_by=status)"),
    anime_ids: z.array(z.number()).optional().describe("Array of anime IDs to delete (required if delete_by=ids)"),
    dry_run: z.boolean().default(true).describe("If true, shows what would be deleted without making changes"),
    limit: z.number().max(1000).default(1000).describe("Max number of entries to process (only for status-based deletion)"),
  },
  async (args) => {
    try {
      const { delete_by, status, anime_ids, dry_run = true, limit = 1000 } = args;

      let animeToDelete: any[] = [];

      if (delete_by === "status") {
        if (!status) {
          return {
            content: [
              {
                type: "text",
                text: "❌ Status is required when delete_by=status",
              },
            ],
          };
        }

        // Get all anime with the specified status
        const params = new URLSearchParams({
          fields: 'list_status',
          status: status,
          limit: limit.toString(),
        });

        const data = await makeMALRequest(`/users/@me/animelist?${params}`);
        animeToDelete = data.data.map((entry: any) => ({
          id: entry.node.id,
          title: entry.node.title,
        }));
      } else if (delete_by === "ids") {
        if (!anime_ids || anime_ids.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: "❌ anime_ids array is required when delete_by=ids",
              },
            ],
          };
        }

        animeToDelete = anime_ids.map(id => ({
          id,
          title: `Anime ID ${id}`,
        }));
      }

      if (animeToDelete.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: delete_by === "status" ? `No anime found with status: ${status}` : "No anime IDs provided",
            },
          ],
        };
      }

      if (dry_run) {
        const animeList = animeToDelete.map(anime =>
          `• ${anime.title} (ID: ${anime.id})`
        ).join('\n');

        return {
          content: [
            {
              type: "text",
              text: `🔍 **DRY RUN** - Found ${animeToDelete.length} anime to delete:\n\n${animeList}\n\n` +
                    `To actually delete these anime, run this tool again with dry_run=false.\n\n` +
                    `⚠️ **WARNING:** This will permanently remove ${animeToDelete.length} anime from your list!`,
            },
          ],
        };
      }

      // Perform actual deletions
      let successCount = 0;
      let errorCount = 0;
      const errors: string[] = [];

      for (const anime of animeToDelete) {
        try {
          await makeMALRequest(`/anime/${anime.id}/my_list_status`, {
            method: 'DELETE',
          });

          successCount++;

          // Progress indicator
          if (successCount % 10 === 0) {
            console.error(`Progress: ${successCount}/${animeToDelete.length} deleted...`);
          }
        } catch (error) {
          errorCount++;
          errors.push(`${anime.title} (${anime.id}): ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      const resultText = `✅ **Bulk Delete Complete!**\n\n` +
        `📊 **Results:**\n` +
        `• Successfully deleted: ${successCount}\n` +
        `• Errors: ${errorCount}\n` +
        `• Total processed: ${animeToDelete.length}\n\n` +
        (errors.length > 0 ? `❌ **Errors:**\n${errors.slice(0, 10).join('\n')}${errors.length > 10 ? `\n...and ${errors.length - 10} more errors` : ''}` : '');

      return {
        content: [
          {
            type: "text",
            text: resultText,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }
);


// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MAL User MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});