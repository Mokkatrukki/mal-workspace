# MAL User MCP - Usage Guide

## Quick Start

### 1. Setup
```bash
# Copy environment config
cp .env.example .env

# Build the project
npm run build

# Start the server
npm start
```

### 2. Configure MCP Client

Add to your MCP client configuration (e.g., Claude Code):

```json
{
  "mcpServers": {
    "mal-user": {
      "command": "node",
      "args": ["/path/to/mal-user-mcp/build/server.js"],
      "env": {
        "MAL_CLIENT_ID": "29709444ed975c1bfba6fa37a77a6942",
        "MAL_CLIENT_SECRET": "9714563e1c56b91278553b161d4195f0b954236364f27c00a7378db09509daa5"
      }
    }
  }
}
```

### 3. Available Tools

#### Authentication
- `mal_authenticate` - Start OAuth flow with MyAnimeList
- `mal_get_auth_status` - Check authentication status
- `mal_revoke_auth` - Clear stored tokens

#### List Management
- `mal_get_user_list` - Get your anime list with filters
- `mal_update_anime` - Update anime status/score/progress
- `mal_remove_anime` - Remove anime from list

#### User Information
- `mal_get_user_info` - Get user statistics and info

## Usage Examples

### First Time Setup
```
User: "Please authenticate with my MyAnimeList account"
Assistant: I'll start the MAL authentication process for you.
[Uses mal_authenticate tool]
```

### Managing Your List
```
User: "I just finished watching Death Note, mark it completed with score 9"
Assistant: I'll update Death Note in your list as completed with a score of 9.
[Uses mal_update_anime with anime_id, status="completed", score=9]
```

### Bulk Updates
```
User: "I watched Attack on Titan up to episode 15, still watching, score it 8"
Assistant: I'll update Attack on Titan with 15 episodes watched and score 8.
[Uses mal_update_anime with num_watched_episodes=15, score=8, status="watching"]
```

### Get Your Statistics
```
User: "Show me my anime stats"
Assistant: Let me get your MyAnimeList statistics.
[Uses mal_get_user_info]
```

### Filter Your List
```
User: "Show me all anime I'm currently watching"
Assistant: I'll get your currently watching anime list.
[Uses mal_get_user_list with status="watching"]
```

## Authentication Flow

1. **Run `mal_authenticate`** - Gets OAuth URL
2. **Visit the URL** - Complete authentication in browser
3. **Tokens stored automatically** - Future API calls use stored tokens
4. **Auto-refresh** - Tokens refresh automatically when expired

## Error Handling

- **Not authenticated**: Run `mal_authenticate` first
- **Token expired**: Automatically refreshed on next API call
- **Invalid anime ID**: Check the anime ID on MyAnimeList
- **Rate limits**: Automatically handled with delays

## Tips

- **Find Anime IDs**: Use the anime-search-mcp or check URLs on MyAnimeList
- **Status Values**: `watching`, `completed`, `on_hold`, `dropped`, `plan_to_watch`
- **Scores**: 0-10 (0 removes the score)
- **Episodes**: Set to current episode number you've watched

## Troubleshooting

### Authentication Issues
- Ensure port 8080 is available for OAuth callback
- Check that your MAL client ID/secret are correct
- Try clearing tokens with `mal_revoke_auth` and re-authenticating

### API Errors
- Verify you're authenticated with `mal_get_auth_status`
- Check anime ID exists on MyAnimeList
- Ensure episode count doesn't exceed total episodes

### Server Issues
- Check server is running: `npm start`
- Verify build completed: `npm run build`
- Check logs for specific error messages