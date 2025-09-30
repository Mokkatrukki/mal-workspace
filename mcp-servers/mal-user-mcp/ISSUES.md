# mal-user-mcp - Issues & Roadmap

## 🔴 Critical Issues

### ⚠️ INSECURE TOKEN STORAGE
**OAuth tokens stored as plain text JSON**

**Current Implementation**:
```typescript
// tokens.json - PLAIN TEXT!
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "def50200a1b2c3d4e5f6...",
  "expires_at": 1735689600000,
  "user_id": "your_mal_username"
}
```

**Security Risks**:
- Any process with filesystem access can read tokens
- Tokens grant full access to user's MAL account
- If leaked, attacker can modify user's anime list
- No encryption, no access control
- Easy to accidentally commit to git

**Recommended Solutions** (in priority order):

1. **System Keyring Integration** (Best)
   ```bash
   npm install keytar
   ```
   - Store tokens in OS keyring (macOS Keychain, Windows Credential Manager, Linux Secret Service)
   - Encrypted by OS
   - Requires system password to access
   - Industry standard for desktop apps

2. **Encrypted JSON with User Password**
   ```typescript
   // Encrypt tokens with user-provided password
   const encrypted = encrypt(tokens, userPassword);
   fs.writeFileSync('tokens.enc', encrypted);
   ```
   - Better than plain text
   - User enters password once per session
   - Can use crypto libraries (node-forge, crypto)

3. **Environment Variables** (Temporary solution)
   ```bash
   # Store in .env (still not great, but better than committed JSON)
   MAL_ACCESS_TOKEN=...
   MAL_REFRESH_TOKEN=...
   ```
   - At least won't be in git if .env is ignored
   - Still plain text on disk

4. **OAuth Token Service** (Over-engineered)
   - Separate service to manage tokens
   - API calls proxy through service
   - Overkill for single-user desktop app

**Action Required**:
- [ ] Implement keyring storage (keytar or @napi-rs/keyring)
- [ ] Add migration from tokens.json to keyring
- [ ] Fallback to encrypted JSON if keyring unavailable
- [ ] Add warning if using plain text storage
- [ ] Update documentation

**Estimated Effort**: 4-6 hours

---

## ⚠️ High Priority

### OAuth Callback Server Issues

**Problem 1: Port Conflicts**
If port 8080 is already in use, authentication fails silently.

**Solutions**:
- Try multiple ports (8080, 8081, 8082...)
- Better error message showing which port to use
- Allow dynamic port selection
- Print fallback URL if server can't start

**Problem 2: Temporary Server Not Closing**
Sometimes Express server doesn't shut down properly after callback.

**Solutions**:
- Add timeout to force shutdown
- Better connection tracking
- Use `server.close()` with callback

### Token Expiration Handling

**Current Behavior**:
- Tokens expire after ~30 days
- Auto-refresh works most of the time
- Sometimes fails silently

**Improvements Needed**:
- Proactive token refresh (refresh before expiry)
- Better error messages when refresh fails
- Prompt user to re-authenticate
- Show token expiration status in `mal_get_auth_status`

### Rate Limiting

**Current**: Simple in-memory limiter (3 req/sec)

**Issues**:
- Doesn't account for MAL's hourly/daily limits
- No queuing for bulk operations
- No backoff strategy

**Improvements**:
- Track hourly usage
- Implement request queue
- Exponential backoff on errors
- Better rate limit error messages

---

## 🟡 Medium Priority

### Multi-User Support

**Current**: One tokens.json = one MAL account

**Feature Request**: Support multiple MAL accounts

**Implementation Ideas**:
```typescript
// tokens/
//   user1@mal.json
//   user2@mal.json

const userTokenPath = `./tokens/${username}.json`;
```

**Challenges**:
- How to switch between users?
- Need user identifier in requests
- Keyring storage per user
- UI for account selection

### Offline Mode / Caching

**Current**: Every request hits MAL API

**Feature**: Cache frequently accessed data
- User's anime list (cache 5-10 minutes)
- User info (cache 1 hour)
- Genre lists (cache forever)

**Benefits**:
- Faster responses
- Fewer API calls
- Works during brief connection issues

### Bulk Operation Improvements

**Current**: Bulk operations work but could be better

**Improvements**:
- Progress reporting (1/100, 2/100...)
- Partial success handling (some updates fail)
- Rollback on failure
- Dry-run validation
- Better error summaries

---

## 🟢 Low Priority / Nice to Have

### Better OAuth Flow

**Current**: Opens browser, requires manual interaction

**Improvements**:
- QR code authentication (scan with phone)
- Device flow (enter code on website)
- Remember device option
- SSO if already logged into MAL

### Enhanced Authentication Tools

**New Tools**:
- `mal_get_token_info` - Show token expiration, scope, etc.
- `mal_test_connection` - Verify MAL API is reachable
- `mal_check_permissions` - List granted permissions
- `mal_rotate_tokens` - Force token refresh

### List Sync Features

**Integration with local database**:
- Export MAL list to local `own-mal-db`
- Sync changes bidirectionally
- Backup MAL list automatically
- Compare MAL list vs local recommendations

### Advanced List Operations

- Filter/search within user's list
- Sort by custom criteria
- Tag/label anime (if MAL supports)
- Export to various formats (CSV, JSON, Markdown)
- Import from other platforms (Anilist, Kitsu)

---

## ✅ Completed

- ✅ OAuth 2.0 PKCE flow
- ✅ Automatic token refresh
- ✅ Bulk operations (update/add/delete)
- ✅ Rate limiting (basic)
- ✅ Error handling for API failures
- ✅ Authentication status checking

---

## 🎯 Future Enhancements

### MAL API Feature Parity

MAL API has more features we could expose:
- Anime search (currently only in anime-search-mcp)
- Seasonal anime from MAL
- Forum posts
- User statistics
- Anime recommendations from MAL
- User-to-user features (if available)

### Integration Features

**With anime-search-mcp**:
- "Add this anime to my list" after search
- "Show me local info for anime in my list"
- Sync MAL ratings to local database

**With anime-recommendation-mcp**:
- Use MAL list as input for recommendations
- "Recommend based on my completed anime"
- Find similar anime to those in MAL list

**With chat-client**:
- Visual list management UI
- Drag-and-drop status changes
- Bulk operations with preview

---

## 🐛 Known Bugs

### Minor Issues
- OAuth callback sometimes requires browser refresh
- Token refresh doesn't update expires_at timestamp correctly
- Bulk operations with >100 items may timeout
- Error messages from MAL API not always helpful

### Edge Cases
- Very long anime titles truncate in some displays
- Special characters in anime names cause URL encoding issues
- Timeout handling for slow MAL API responses
- Concurrent requests may cause rate limit confusion

---

## 📝 Technical Debt

### Code Organization
- Entire server in one 800-line file
- OAuth logic should be separate module
- Token management should be separate class
- API client should be separate module

**Proposed Structure**:
```
src/
├── server.ts          # Main MCP server
├── auth/
│   ├── oauth.ts       # OAuth flow
│   ├── tokens.ts      # Token management
│   └── storage.ts     # Token storage (keyring/file)
├── api/
│   ├── client.ts      # MAL API client
│   └── rateLimit.ts   # Rate limiting
├── tools/
│   ├── list.ts        # List management tools
│   ├── auth.ts        # Auth tools
│   └── bulk.ts        # Bulk operation tools
└── types/
    └── index.ts       # TypeScript types
```

### Configuration
- Hardcoded MAL API URLs
- Magic numbers (timeouts, limits)
- OAuth config scattered through code
- No validation of environment variables

### Error Handling
- Inconsistent error response format
- Some errors don't propagate to Claude
- Missing context in error messages
- No error code system

---

## 💡 Ideas / Brainstorming

- Desktop notification when anime episode releases
- Watch reminder based on airing schedule
- Export MAL list as beautiful webpage/PDF
- Social features (compare lists with friends)
- Statistics dashboard (watch time, genre breakdown)
- Achievement system (100 completed, etc.)
- MAL forum integration
- Anime calendar sync (Google Calendar, iCal)

---

## 🔧 Maintenance Tasks

### Regular
- Monitor MAL API changes
- Update dependencies (especially MCP SDK)
- Review token expiration issues
- Check rate limiting effectiveness

### Periodic
- Security audit (especially token storage)
- Review error logs
- Performance benchmarking
- Update OAuth flow if MAL changes

---

## 📊 Metrics to Track

- Authentication success/failure rate
- Token refresh success rate
- API call distribution (which endpoints most used)
- Rate limit hit frequency
- Average response time per operation
- Error rate by operation type

---

## 🔐 Security Roadmap

**Phase 1: Stop the Bleeding** (Next Release)
- [ ] Add keyring support (optional)
- [ ] Warn users about plain text storage
- [ ] Better .gitignore patterns
- [ ] Docs on securing tokens.json

**Phase 2: Encrypt Everything** (v2.0)
- [ ] Make keyring default
- [ ] Encrypted fallback if no keyring
- [ ] Remove plain text option
- [ ] Migration tool from plain text

**Phase 3: Advanced Security** (v3.0)
- [ ] Token rotation strategy
- [ ] Scope limitation (request minimal permissions)
- [ ] Audit logging
- [ ] Anomaly detection

---

*Last Updated: 2025-09-30*
*Priority Focus: Secure token storage, then improve OAuth flow*
