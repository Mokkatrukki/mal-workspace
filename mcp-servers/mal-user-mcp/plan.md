# MyAnimeList User MCP Server - Implementation Plan

## Project Overview

A Model Context Protocol (MCP) server that allows AI assistants to interact with a user's MyAnimeList account for tracking anime consumption, updating scores, managing lists, and providing personalized recommendations based on viewing history.

## Core Features

### 1. User Authentication (OAuth 2.0 + PKCE)
- OAuth 2.0 flow with PKCE for secure authentication
- Token storage and refresh mechanism
- Support for multiple users via user identification

### 2. List Management
- **Read Operations:**
  - Get user's anime list (watching/completed/on_hold/dropped/plan_to_watch)
  - Retrieve specific anime status and scores
  - Get user statistics and preferences

- **Write Operations:**
  - Add anime to lists with status
  - Update watching progress (episodes watched)
  - Set scores (0-10 scale)
  - Change status (watching → completed, etc.)
  - Remove anime from lists

### 3. Personal Statistics & Analytics
- Get user's anime statistics
- Analyze viewing patterns
- Genre preferences
- Average scores by genre/year/studio

### 4. AI Integration Features
- Bulk list updates ("I watched episodes 1-5 of Attack on Titan")
- Natural language status updates ("Mark Death Note as completed with score 9")
- Preference analysis for recommendations
- Watch history context for conversations

## Technical Architecture

### Integration Strategy
We'll leverage your existing local MAL database infrastructure:

1. **Dual API Approach**:
   - **Local Database**: For anime search, details, and metadata (via `../own-mal-db`)
   - **MAL Official API**: For user-specific operations (lists, scores, progress)

2. **Database Integration**: Connect to your PostgreSQL database for enhanced features
3. **OAuth Authentication**: For official MAL API user operations
4. **Local Token Storage**: Secure local storage of access/refresh tokens

### Project Structure
```
mal-user-mcp/
├── src/
│   ├── server.ts           # Main MCP server
│   ├── auth/
│   │   ├── oauth.ts        # OAuth flow handler
│   │   └── token-store.ts  # Token storage/retrieval
│   ├── api/
│   │   ├── mal-client.ts   # MAL Official API client (user operations)
│   │   ├── db-client.ts    # Local database client (anime data)
│   │   └── endpoints.ts    # API endpoint definitions
│   ├── database/
│   │   └── connection.ts   # PostgreSQL connection to own-mal-db
│   ├── tools/
│   │   ├── list-tools.ts   # List management tools
│   │   ├── auth-tools.ts   # Authentication tools
│   │   ├── search-tools.ts # Enhanced search with local DB
│   │   └── stats-tools.ts  # Statistics tools
│   └── types/
│       ├── mal-types.ts    # Official MAL API types
│       └── db-types.ts     # Local database types (from own-mal-db)
├── package.json
├── tsconfig.json
├── README.md
└── .env.example            # Environment variables template
```

## MCP Tools to Implement

### Authentication Tools
1. `mal_authenticate` - Start OAuth flow and store tokens
2. `mal_get_auth_status` - Check if user is authenticated
3. `mal_revoke_auth` - Revoke stored tokens

### List Management Tools
1. `mal_get_anime_list` - Get user's anime list with filters
2. `mal_add_anime` - Add anime to list with status/score
3. `mal_update_anime` - Update anime status/progress/score
4. `mal_remove_anime` - Remove anime from list
5. `mal_bulk_update` - Update multiple anime at once

### Information Tools
1. `mal_get_user_stats` - Get user's anime statistics
2. `mal_get_user_info` - Get basic user information
3. `mal_search_user_list` - Search within user's list

### Analysis Tools
1. `mal_analyze_preferences` - Analyze user's genre/studio preferences
2. `mal_get_watching_history` - Get recently updated entries
3. `mal_compare_with_user` - Compare lists with another user (if public)

## Implementation Phases

### Phase 1: Foundation
- [ ] Set up project structure with TypeScript
- [ ] Implement OAuth 2.0 flow with local callback server
- [ ] Create token storage mechanism
- [ ] Basic MAL API client with authentication

### Phase 2: Core List Management
- [ ] Implement basic list retrieval
- [ ] Add anime to list functionality
- [ ] Update anime status and progress
- [ ] Score management

### Phase 3: Advanced Features
- [ ] Bulk operations
- [ ] User statistics and analytics
- [ ] Search and filtering
- [ ] Error handling and retry logic

### Phase 4: AI Integration
- [ ] Natural language processing for bulk updates
- [ ] Smart recommendations based on list
- [ ] Conversation context integration
- [ ] Usage examples and documentation

## Security Considerations

1. **Token Security**: Store tokens securely, encrypt if possible
2. **Scope Limitation**: Only request necessary OAuth scopes
3. **Rate Limiting**: Respect MAL API rate limits
4. **Error Handling**: Graceful handling of auth failures
5. **Data Privacy**: No logging of sensitive user data

## Environment Variables

```bash
MAL_CLIENT_ID=29709444ed975c1bfba6fa37a77a6942
MAL_CLIENT_SECRET=9714563e1c56b91278553b161d4195f0b954236364f27c00a7378db09509daa5
MAL_REDIRECT_URI=http://localhost:8080/callback
TOKEN_STORAGE_PATH=./tokens.json
```

## Usage Examples

```typescript
// Example MCP tool calls from AI:
await mal_add_anime({
  anime_id: 17074,
  status: "completed",
  score: 8,
  num_watched_episodes: 3
});

await mal_bulk_update({
  updates: [
    { anime_id: 1234, status: "watching", episodes: 5 },
    { anime_id: 5678, status: "completed", score: 9 }
  ]
});

await mal_analyze_preferences({
  user: "mokkatrukki"
});
```

## Testing Strategy

1. **OAuth Flow Testing**: Test complete authentication flow
2. **API Integration**: Test all MAL API endpoints
3. **Error Scenarios**: Test token expiry, rate limits, network errors
4. **MCP Integration**: Test with Claude Code/other MCP clients

## Questions for Clarification

1. **Token Storage**: Should tokens be stored per-user or globally? How do we handle multiple MAL accounts?
2. **Authentication UI**: Should we open a browser automatically for OAuth, or provide instructions?
3. **Callback Server**: What port should we use for the local OAuth callback server?
4. **Error Recovery**: How should we handle cases where OAuth fails or tokens become invalid?

## Next Steps

1. Review and approve this plan
2. Set up basic project structure
3. Implement OAuth authentication flow
4. Create basic MAL API client
5. Implement core MCP tools
6. Test with real MAL account