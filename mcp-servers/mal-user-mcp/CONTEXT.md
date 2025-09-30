# mal-user-mcp - Context

**Your MAL Account Manager for Claude**

## What Is This?

MCP server that connects Claude to your MyAnimeList account via OAuth. Lets Claude read and manage your anime list - add anime, update episodes watched, change scores, etc.

## One-Liner

OAuth2 bridge between Claude and MyAnimeList → Claude can manage your personal anime list.

## What It Does

When you ask Claude "Add this to my watching list", this MCP server:
1. Uses OAuth tokens stored locally
2. Calls official MyAnimeList API
3. Updates your actual MAL account
4. Reports success back to Claude

**Key Features**:
- 🔐 OAuth 2.0 authentication with MAL
- 📝 Read your anime list
- ✏️ Update anime status (watching/completed/dropped/etc.)
- 📊 Update episode progress and scores
- 🔄 Token refresh (automatic)
- 🚀 Bulk operations (update/add/delete many anime at once)

## Tools Provided to Claude

### Authentication
- `mal_authenticate` - Start OAuth flow (opens browser)
- `mal_get_auth_status` - Check if logged in
- `mal_debug_config` - Show OAuth config (debugging)
- `mal_revoke_auth` - Logout (delete tokens)

### List Management
- `mal_get_user_list` - Get your anime list (with filters)
- `mal_update_anime` - Update single anime (status/score/episodes)
- `mal_remove_anime` - Remove anime from list
- `mal_get_user_info` - Get your MAL profile info

### Bulk Operations
- `mal_bulk_update_anime` - Update many anime at once (e.g., "move all watching to on-hold")
- `mal_bulk_add_anime` - Add many anime to your list
- `mal_bulk_delete_anime` - Remove many anime from your list

## OAuth Flow Explained

### First Time Setup (One-Time)

1. **Get MAL API Credentials**:
   - Go to https://myanimelist.net/apiconfig
   - Click "Create ID" or "Edit"
   - Set App Redirect URL: `http://localhost:8080/callback`
   - Copy your Client ID and Client Secret
   - Put them in `.env` file

2. **Start Authentication**:
   - Ask Claude: "Authenticate with MyAnimeList"
   - MCP server starts a temporary Express web server on port 8080
   - Server generates authorization URL
   - Opens your browser to MAL login page

3. **Login on MAL Website**:
   - Browser shows MyAnimeList OAuth page
   - You log in with your MAL username/password
   - MAL asks "Allow this app to access your account?"
   - Click "Allow"

4. **Callback & Token Exchange**:
   - MAL redirects browser to `http://localhost:8080/callback?code=...`
   - Express server catches this callback
   - Server exchanges authorization code for access + refresh tokens
   - Tokens saved to `tokens.json` in server directory
   - Browser shows success message
   - Express server shuts down

5. **Done!**:
   - Future requests use saved tokens
   - Tokens auto-refresh when expired
   - No need to login again until tokens revoked

### Technical Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User asks Claude to authenticate                             │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. MCP Server                                                    │
│    - Starts Express server on port 8080                         │
│    - Generates code_verifier & code_challenge (PKCE)            │
│    - Creates authorization URL                                  │
│    - Opens browser to MAL OAuth page                            │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Browser → MyAnimeList                                        │
│    URL: https://myanimelist.net/v1/oauth2/authorize?           │
│         response_type=code&                                     │
│         client_id=YOUR_CLIENT_ID&                               │
│         code_challenge=...&                                     │
│         redirect_uri=http://localhost:8080/callback            │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. User Interaction                                             │
│    - Enters MAL username & password                             │
│    - Clicks "Allow" to grant permission                         │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. MAL Redirects Back                                           │
│    Browser → http://localhost:8080/callback?code=AUTH_CODE      │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Express Server (localhost:8080)                             │
│    - Receives authorization code                                │
│    - POST to MAL token endpoint:                                │
│      https://myanimelist.net/v1/oauth2/token                   │
│      with code, verifier, client_id, client_secret             │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. MAL Responds with Tokens                                     │
│    {                                                            │
│      "access_token": "...",                                     │
│      "refresh_token": "...",                                    │
│      "expires_in": 2592000  // 30 days                         │
│    }                                                            │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. Save to tokens.json                                          │
│    {                                                            │
│      "access_token": "...",                                     │
│      "refresh_token": "...",                                    │
│      "expires_at": 1234567890000,  // timestamp                │
│      "user_id": "your_username"                                 │
│    }                                                            │
│                                                                 │
│    ⚠️ SECURITY ISSUE: Plain text JSON file!                    │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 9. Express Server Shuts Down                                    │
│    - Port 8080 released                                         │
│    - Browser shows success message                              │
│    - Authentication complete                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Subsequent Requests

```
Claude: "Show me my anime list"
    ↓
mal-user-mcp reads tokens.json
    ↓
Check if expired (compare expires_at to now)
    ↓
If expired: refresh token automatically
    ↓
Make API request with Bearer token
    ↓
Return results to Claude
```

## Current Status

✅ **Uses Official MAL API** - Connects to `https://api.myanimelist.net/v2`
✅ **OAuth 2.0 Flow** - Proper authentication with PKCE
✅ **Token Management** - Automatic refresh
⚠️ **Security Concern** - Tokens stored as plain text JSON (see ISSUES.md)

## API Used

**MyAnimeList Official API**:
- Base URL: `https://api.myanimelist.net/v2`
- Auth: `https://myanimelist.net/v1/oauth2`
- Rate Limit: 3 requests/second (built-in limiter)

**Local Database**: NOT USED (this server only talks to MAL)

## Directory Structure

```
mal-user-mcp/
├── src/
│   └── server.ts           # Main MCP server (800+ lines)
├── build/
│   └── server.js           # Compiled JavaScript
├── tokens.json             # ⚠️ OAuth tokens in PLAIN TEXT (auto-created)
├── .env                    # MAL OAuth credentials
├── package.json
└── tsconfig.json
```

**⚠️ SECURITY WARNING**: `tokens.json` contains sensitive access tokens in plain text!

## Technology Stack

- **MCP SDK**: @modelcontextprotocol/sdk
- **OAuth**: PKCE flow with temporary Express callback server
- **Runtime**: Node.js + TypeScript + Express (for OAuth callback)
- **Data Source**: MyAnimeList official API
- **Transport**: stdio (standard input/output)

## Commands

```bash
# Development
npm run dev              # Start with tsx (hot reload)
npm run build            # Compile TypeScript
npm start                # Start production server

# Use in Claude Desktop
# Add to ~/.config/claude/claude_desktop_config.json
```

## Configuration

**Required Environment Variables** (`.env`):
```env
MAL_CLIENT_ID=your_client_id_from_mal_apiconfig
MAL_CLIENT_SECRET=your_client_secret_from_mal_apiconfig
MAL_REDIRECT_URI=http://localhost:8080/callback
MAL_CALLBACK_PORT=8080
TOKEN_STORAGE_PATH=./tokens.json  # Optional, defaults to ./tokens.json
```

**Get MAL OAuth Credentials**:
1. Go to https://myanimelist.net/apiconfig
2. Create new API application (or edit existing)
3. **Important**: Set App Redirect URL: `http://localhost:8080/callback`
4. Copy Client ID and Client Secret
5. Paste into `.env` file

**Claude Desktop Config**:
```json
{
  "mcpServers": {
    "mal-user": {
      "command": "node",
      "args": ["/path/to/mal-workspace/mcp-servers/mal-user-mcp/build/server.js"],
      "env": {
        "MAL_CLIENT_ID": "your_client_id",
        "MAL_CLIENT_SECRET": "your_client_secret"
      }
    }
  }
}
```

## Token Storage

**File**: `tokens.json` (auto-created in server directory)

**Format**:
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "def50200a1b2c3d4e5f6...",
  "expires_at": 1735689600000,
  "user_id": "your_mal_username"
}
```

**⚠️ SECURITY ISSUES**:
- Tokens stored as **plain text JSON** (no encryption!)
- File readable by any process with filesystem access
- Should be moved to secure storage (keyring, encrypted file, env vars)
- See ISSUES.md for planned improvements

**Current Mitigation**:
- Add `tokens.json` to `.gitignore` (don't commit!)
- Use OS-level file permissions (chmod 600)
- Keep server directory secure

## Rate Limiting

**MAL API Limits**: 3 requests/second

**Built-in Rate Limiter**:
```typescript
class RateLimiter {
  private maxRequests = 3;
  private timeWindow = 1000; // 1 second
}
```

Automatically waits when rate limit hit - prevents API throttling.

## Example Usage

**In Claude Desktop**:
- "Authenticate with MyAnimeList" → Opens browser for login
- "Show me my anime list"
- "Add Attack on Titan to my plan to watch list"
- "I watched 5 episodes of Naruto, update it"
- "Mark One Piece as completed with score 9"
- "Move all my watching anime to on-hold"
- "Remove all dropped anime from my list"

## Troubleshooting

**"Port 8080 already in use" during auth?**
```bash
# Check what's using port 8080
lsof -i :8080

# Kill the process or change port in .env
MAL_CALLBACK_PORT=8081
```

**Browser doesn't open?**
- Server prints URL to console
- Manually copy/paste into browser
- Check firewall allows localhost:8080

**"Not authenticated" error?**
```bash
# Check if tokens exist
cat tokens.json

# If missing or invalid, re-authenticate
# Ask Claude: "authenticate with MyAnimeList"
```

**Token refresh fails?**
- Check internet connection
- MAL API might be down
- Refresh token might be expired (max 90 days)
- Solution: Re-authenticate

**Rate limit errors?**
- Built-in limiter should prevent this
- If occurs, wait 1-2 seconds
- MAL may have additional hourly/daily limits

## Security Best Practices

### What to NEVER commit:
- `tokens.json` ← Contains your MAL access!
- `.env` ← Contains OAuth secrets
- Any file with MAL credentials

### Secure Your System:
```bash
# Restrict token file permissions (Unix/Linux/Mac)
chmod 600 tokens.json

# Verify it's in .gitignore
git check-ignore tokens.json  # Should output: tokens.json
```

### Revoke Access When Done:
- Use `mal_revoke_auth` tool (deletes tokens.json)
- Or manually: `rm tokens.json`
- Or on MAL website: https://myanimelist.net/apiconfig

### Planned Improvements (see ISSUES.md):
- Encrypted token storage
- System keyring integration
- Token expiration warnings
- Automatic token rotation

## Integration Points

**Used by**:
- Claude Desktop (primary)
- Chat client (testing)

**Depends on**:
- MyAnimeList API (external, requires internet)

**Does NOT use**:
- Local `own-mal-db` database

**Could integrate with**:
- `anime-search-mcp` - Search local DB → Add to MAL list
- `anime-recommendation-mcp` - Get recommendations based on MAL list
- Local DB sync - Mirror MAL list to local database

## Related Files

- `./ISSUES.md` - Security issues and planned improvements
- `../../ARCHITECTURE.md` - Overall system design
- `../../mcp-servers/anime-search-mcp/CONTEXT.md` - Local search (separate from MAL)
