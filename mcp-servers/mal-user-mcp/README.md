# MAL User MCP Server

A Model Context Protocol (MCP) server that enables AI assistants to interact with MyAnimeList user accounts for list management, progress tracking, and personalized anime recommendations.

## Features

### 🔐 Secure Authentication
- OAuth 2.0 with PKCE for secure MyAnimeList authentication
- Automatic token refresh and management
- Multi-user support with secure token storage

### 📝 List Management
- **View Lists**: Get user's anime lists (watching, completed, on-hold, dropped, plan-to-watch)
- **Update Progress**: Mark episodes watched, update scores, change status
- **Bulk Operations**: Update multiple anime at once with natural language
- **Smart Updates**: "I watched episodes 1-5 of Attack on Titan, score it 8/10"

### 📊 Personal Analytics
- User statistics and viewing patterns
- Genre and studio preferences analysis
- Personalized recommendations based on watch history
- Compare preferences with other users

### 🤖 AI Integration
- Natural language anime list updates
- Context-aware recommendations during conversations
- Automatic status tracking based on discussion
- Preference analysis for better suggestions

## How It Works

This project consists of **two separate servers** that work together:

### 🔍 **MCP Server** (`build/server.js`)
- **Purpose**: Provides MCP tools for AI assistants to interact with MAL API
- **Usage**: Runs in background, connects to Claude Code or other MCP clients
- **Authentication**: Reads stored tokens from `tokens.json`

### 🌐 **Authentication Server** (`auth-server.js`)
- **Purpose**: Web interface for easy MyAnimeList OAuth authentication
- **Usage**: Visit `http://localhost:3006` to login and manage tokens
- **Output**: Saves authentication tokens to `tokens.json` for MCP server use

### 🔄 **Workflow**
1. **Start Auth Server**: `node auth-server.js` → Visit `localhost:3006` → Login with MAL
2. **Use MCP Server**: Add to Claude Code → Use tools like `mal_get_user_list`
3. **Tokens Shared**: Both servers use the same `tokens.json` file

## Recommended Companion

### Anime Search MCP Server
For best results, use alongside the [anime-search-mcp](https://github.com/Mokkatrukki/anime-search-mcp) server to:
- Search and discover anime with detailed information
- Get MyAnimeList anime IDs needed for list management
- Access comprehensive anime metadata before adding to your list

## Quick Start

### Prerequisites
- Node.js 18+
- TypeScript
- A MyAnimeList account
- Registered MAL API application

### Installation

1. Clone and setup:
```bash
git clone <repository>
cd mal-user-mcp
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your MAL API credentials
```

3. Build the project:
```bash
npm run build
```

### Two-Step Setup

#### Step 1: Authenticate (Web Interface)
```bash
# Start the authentication server
node auth-server.js

# Visit http://localhost:3006 in your browser
# Click "Login with MyAnimeList"
# Complete OAuth flow
# Tokens are saved to tokens.json
```

#### Step 2: Use MCP Server
```bash
# The MCP server is now ready to use with stored tokens
# Add to your MCP client configuration (see below)
```

### MCP Integration

Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "mal-user": {
      "command": "node",
      "args": ["/path/to/mal-user-mcp/build/server.js"],
      "env": {
        "MAL_CLIENT_ID": "your_client_id",
        "MAL_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

## Testing & Development

### MCP Inspector (Recommended)
Test all tools before integrating with Claude Code:

```bash
# Start the MCP Inspector
npx @modelcontextprotocol/inspector node build/server.js

# Visit the provided URL (e.g., http://localhost:6274/?MCP_PROXY_AUTH_TOKEN=...)
# Test tools in this order:
# 1. mal_get_auth_status - Check if authenticated
# 2. mal_authenticate - Get authentication instructions
# 3. Complete authentication at http://localhost:3006
# 4. mal_get_user_info - Test API connection
# 5. mal_get_user_list - View your anime list
```

### Authentication Testing
```bash
# Test OAuth flow independently
node test-oauth.js

# Or run the full auth server
node auth-server.js
# Visit http://localhost:3006
```

## Usage Examples

### With Claude Code

```
# Check authentication status (gets login instructions if needed)
"Check my MAL authentication status"

# After authentication through web interface:
"I just finished watching Death Note, mark it completed with score 9"

# Bulk updates
"I watched these anime: Attack on Titan (completed, 8/10), Naruto (episode 50, still watching)"

# Get your stats
"Show me my anime statistics and what genres I prefer"

# View your list
"Show me what anime I'm currently watching"
```

## Available MCP Tools

### Authentication
- `mal_authenticate` - Start OAuth flow and store credentials
- `mal_get_auth_status` - Check authentication status
- `mal_revoke_auth` - Remove stored credentials

### List Management
- `mal_get_anime_list` - Retrieve user's anime list with filters
- `mal_add_anime` - Add anime to list with status/score
- `mal_update_anime` - Update anime progress, status, or score
- `mal_remove_anime` - Remove anime from list
- `mal_bulk_update` - Update multiple anime at once

### User Information
- `mal_get_user_stats` - Get user statistics and preferences
- `mal_get_user_info` - Get basic user profile information
- `mal_search_user_list` - Search within user's anime list

### Analytics
- `mal_analyze_preferences` - Analyze genre/studio preferences
- `mal_get_watching_history` - Get recently updated entries
- `mal_compare_with_user` - Compare lists with another user

## Configuration

### Environment Variables

```bash
# Required: MyAnimeList API credentials
MAL_CLIENT_ID=your_mal_client_id
MAL_CLIENT_SECRET=your_mal_client_secret

# Optional: Customize OAuth callback
MAL_REDIRECT_URI=http://localhost:8080/callback
MAL_CALLBACK_PORT=8080

# Optional: Token storage location
TOKEN_STORAGE_PATH=./tokens.json

# Optional: API settings
MAL_API_BASE_URL=https://api.myanimelist.net/v2
MAL_RATE_LIMIT_DELAY=1000
```

### Getting MAL API Credentials

1. Go to [MyAnimeList API](https://myanimelist.net/apiconfig)
2. Create a new application
3. Set redirect URI to `http://localhost:8080/callback`
4. Copy Client ID and Client Secret to your `.env` file

## Authentication Flow

The MCP server handles OAuth authentication automatically:

1. **First Use**: Call `mal_authenticate` to start OAuth flow
2. **Browser Opens**: Complete authentication in browser
3. **Tokens Stored**: Access/refresh tokens saved securely
4. **Auto-Refresh**: Tokens refreshed automatically when needed

## API Rate Limiting

The server automatically handles MyAnimeList API rate limits:
- Maximum 3 requests per second
- Automatic retry with exponential backoff
- Graceful error handling for rate limit exceeded

## Security

- OAuth 2.0 with PKCE prevents authorization code interception
- Tokens stored locally and encrypted
- No sensitive data logged or transmitted
- Automatic token cleanup on revocation

## Development

### Building from Source

```bash
# Install dependencies
npm install

# Development mode with auto-reload
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Type checking
npm run type-check
```

### Project Structure

```
src/
├── server.ts              # Main MCP server
├── auth/
│   ├── oauth.ts          # OAuth 2.0 flow handler
│   └── token-store.ts    # Secure token storage
├── api/
│   ├── mal-client.ts     # MyAnimeList API client
│   └── endpoints.ts      # API endpoint definitions
├── tools/
│   ├── auth-tools.ts     # Authentication MCP tools
│   ├── list-tools.ts     # List management MCP tools
│   └── stats-tools.ts    # Statistics MCP tools
└── types/
    └── mal-types.ts      # TypeScript type definitions
```

## Troubleshooting

### Server Architecture Issues

**Problem**: "Connection Error" in MCP Inspector
- **Solution**: Make sure only the MCP server (`build/server.js`) is running, not the auth server
- **Explanation**: MCP Inspector connects to the MCP server, not the auth server

**Problem**: "Not authenticated" errors
- **Solution**:
  1. Start auth server: `node auth-server.js`
  2. Visit `http://localhost:3006` and login
  3. Verify `tokens.json` file exists
  4. Restart MCP client to pick up new tokens

**Problem**: Port conflicts
- **Auth server**: Uses port 3006 (configurable via `MAL_CALLBACK_PORT`)
- **MCP Inspector**: Uses ports 6274/6277 (managed automatically)
- **Solution**: Make sure ports are available or change in `.env`

### Authentication Issues
- Ensure MAL API credentials are correct in `.env`
- Check redirect URI is `http://localhost:3006/callback` in MAL app settings
- Verify auth server is accessible at `http://localhost:3006`

### API Errors
- Check `tokens.json` exists and contains valid tokens
- Verify internet connectivity to MyAnimeList API
- Tokens auto-refresh, but may need re-authentication if refresh token expires

### Rate Limiting
- Server automatically handles MAL's 3 requests/second limit
- If persistent issues, avoid concurrent MCP tool calls

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - see LICENSE file for details

## Support

- Report bugs via GitHub Issues
- Feature requests welcome
- Documentation improvements appreciated

---

**Note**: This MCP server requires a MyAnimeList account and API application. Ensure you comply with MyAnimeList's API terms of service.