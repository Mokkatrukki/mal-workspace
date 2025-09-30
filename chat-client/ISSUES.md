# chat-client - Issues & Roadmap

⚠️ **TRANSITIONING: CLI → Web Application**

## 🔴 Critical Issues

### ⚠️ PLANNING WEB APPLICATION
**Current CLI will be replaced with web-based chat interface**

**Current State**:
- ✅ CLI client works for testing
- ❌ No web application yet
- ❌ No UI mockups
- ❌ Architecture not finalized
- ❌ MCP-for-web strategy unclear

**Vision**:
Chat-based website where users interact with AI that uses MCP servers to:
- Search and discover anime
- Get personalized recommendations
- Manage MAL account
- Analyze reviews and sentiment
- Track watch progress

**Decision Points**:
- [ ] Frontend framework (Next.js? React + Express?)
- [ ] AI provider (Claude API? OpenAI? Both?)
- [ ] MCP connection strategy (WebSocket? HTTP? Server-side only?)
- [ ] Authentication system (NextAuth? Custom?)
- [ ] Hosting platform (Vercel? Self-hosted?)
- [ ] Database for user sessions (Redis? PostgreSQL?)

**Estimated Timeline**: 10-12 weeks

---

## ⚠️ High Priority

### Architecture Planning

**Questions to Answer**:

1. **Frontend Framework**
   - Next.js (React framework with SSR)
   - Remix (React framework alternative)
   - Pure React + Vite + Express backend

2. **AI Integration**
   - Claude API (Anthropic)
   - OpenAI GPT-4
   - Both with fallback
   - Local LLM option?

3. **MCP Connection**
   - Option A: Server-side only (MCP servers run on backend)
   - Option B: WebSocket proxy (forward MCP to browser)
   - Option C: HTTP REST wrapper around MCP
   - Option D: Separate API that uses MCP internally

4. **State Management**
   - React Query (server state)
   - Zustand (client state)
   - Redux Toolkit
   - Context API only

5. **Deployment**
   - Vercel (easy Next.js hosting)
   - Railway / Render
   - Self-hosted VPS
   - Docker containers

### UI/UX Design

**Need to Design**:
- Chat interface layout
- Anime card components
- Search results display
- Recommendation cards
- MAL account integration UI
- Mobile responsive layouts

**Design Tools**:
- Figma mockups
- Component library (shadcn/ui? Radix?)
- Color scheme and branding
- Animation strategy

### MCP for Web Research

**Technical Challenges**:
- MCP SDK uses stdio (not web-friendly)
- Need server-side MCP client
- How to stream responses to frontend
- Authentication for MCP calls
- Rate limiting per user

**Options**:
1. Run MCP servers on backend, expose via REST API
2. Create WebSocket proxy for MCP communication
3. Modify MCP SDK for HTTP transport
4. Use separate API layer that wraps MCP

---

## 🟡 Medium Priority

### Current CLI Improvements

**While building web app, CLI still useful**:
- [ ] Add more test actions
- [ ] Better error messages
- [ ] Save results to file
- [ ] Script mode (non-interactive)
- [ ] Automated test suite

### Feature Planning

**Core Features for v1**:
- [ ] Natural language anime search
- [ ] Visual search results with images
- [ ] MAL OAuth integration
- [ ] Basic recommendations
- [ ] Chat history
- [ ] User preferences

**Nice-to-Have for v1**:
- [ ] Mood-based discovery
- [ ] Watch list management
- [ ] Progress tracking
- [ ] Social features
- [ ] Multi-language support

### Technology Prototypes

**Build Small Prototypes**:
- [ ] Next.js + Claude API demo
- [ ] MCP client on server-side
- [ ] WebSocket real-time chat
- [ ] Anime card component library
- [ ] MAL OAuth flow

---

## 🟢 Low Priority / Future

### Advanced Features

**Post-Launch Ideas**:
- Voice interface
- Mobile app (React Native)
- Browser extension
- Discord bot integration
- API for third parties
- Premium features

### AI Capabilities

**Advanced AI Features**:
- Multi-agent conversations
- Context-aware responses
- Personality customization
- Long-term memory
- Learning from feedback

### Social Features

**Community Aspects**:
- Share recommendations
- Friend lists
- Group watch parties
- Anime clubs/communities
- Discussion forums

---

## ✅ Completed (CLI Version)

- ✅ CLI client structure
- ✅ MCP connection manager
- ✅ Interactive menu system
- ✅ Basic test actions
- ✅ Pretty output with colors
- ✅ Error handling
- ✅ Connection to all 3 MCP servers

---

## 🎯 Web Application Roadmap

### Phase 1: Planning & Design (Weeks 1-2)
**Goal**: Finalize architecture and designs

- [ ] Choose tech stack
- [ ] Create UI mockups in Figma
- [ ] Design database schema (users, sessions, history)
- [ ] Plan MCP integration strategy
- [ ] Set up project structure

**Deliverables**:
- Architecture document
- UI mockups
- Tech stack decision
- Project scaffolding

### Phase 2: Foundation (Weeks 3-4)
**Goal**: Basic Next.js app with chat UI

- [ ] Initialize Next.js project
- [ ] Set up Tailwind CSS
- [ ] Create chat interface component
- [ ] Implement message history
- [ ] Add loading states and animations
- [ ] Set up development environment

**Deliverables**:
- Working chat UI (no AI yet)
- Component library started
- Responsive layout

### Phase 3: Backend & MCP (Weeks 5-6)
**Goal**: Connect MCP servers from backend

- [ ] Create API routes for MCP calls
- [ ] Adapt MCP client for server-side
- [ ] Implement MCP connection pooling
- [ ] Add error handling and retries
- [ ] Test all MCP tools via API

**Deliverables**:
- API endpoints for MCP operations
- Server-side MCP integration
- API documentation

### Phase 4: AI Integration (Weeks 7-8)
**Goal**: Connect AI and enable tool calling

- [ ] Integrate Claude API / OpenAI
- [ ] Implement tool calling system
- [ ] Natural language → MCP tool mapping
- [ ] Response formatting
- [ ] Streaming responses

**Deliverables**:
- Working AI chat
- MCP tools callable by AI
- Natural language queries working

### Phase 5: Features & Data (Weeks 9-10)
**Goal**: Core anime features

- [ ] Anime cards with images
- [ ] Search results display
- [ ] Recommendation interface
- [ ] MAL OAuth flow
- [ ] User preferences storage
- [ ] Watch list UI

**Deliverables**:
- All core features working
- MAL integration live
- User accounts

### Phase 6: Polish & Launch (Weeks 11-12)
**Goal**: Production ready

- [ ] Animations and transitions
- [ ] Mobile optimization
- [ ] Performance tuning
- [ ] Error handling polish
- [ ] SEO optimization
- [ ] Deploy to production
- [ ] User testing
- [ ] Bug fixes

**Deliverables**:
- Production deployment
- User documentation
- Launch announcement

---

## 📝 Technical Decisions Needed

### 1. AI Provider Strategy

**Option A: Claude Only**
- Pros: Best MCP support, tool calling
- Cons: Single provider lock-in, cost

**Option B: OpenAI Only**
- Pros: Cheaper, function calling
- Cons: Less context, different API

**Option C: Both with Fallback**
- Pros: Redundancy, flexibility
- Cons: Complex implementation

**Option D: Allow User Choice**
- Pros: User control, cost sharing
- Cons: Complex UI, key management

### 2. MCP Architecture

**Option A: Server-Side Only**
```
Browser → Next.js API → MCP Servers → Database
```
- Pros: Simple, secure
- Cons: No real-time updates

**Option B: WebSocket Proxy**
```
Browser ↔ WebSocket ↔ MCP Servers → Database
```
- Pros: Real-time, streaming
- Cons: Complex, connection management

**Option C: REST Wrapper**
```
Browser → REST API → MCP Adapter → MCP Servers
```
- Pros: Standard HTTP, easy caching
- Cons: Polling needed for streaming

### 3. Deployment Strategy

**Option A: Vercel**
- Pros: Easy Next.js deployment, edge functions
- Cons: Limited for MCP servers, serverless limits

**Option B: Railway/Render**
- Pros: Full backend support, Docker
- Cons: More setup, manual config

**Option C: Self-Hosted VPS**
- Pros: Full control, cost effective
- Cons: DevOps overhead, maintenance

---

## 💡 Feature Ideas

### Chat Interface
- Syntax highlighting for anime titles
- Image previews in chat
- Quick action buttons
- Suggested questions
- Voice input option

### Anime Discovery
- "Feeling lucky" random recommendation
- Trending anime widget
- "What's hot this season"
- Genre exploration mode
- Decade browsing

### Personalization
- Remember favorite genres
- Watch history integration
- Progress notifications
- Custom recommendation settings
- Mood-based filters

### Social
- Share chat conversations
- Recommend to friends
- Group watch planning
- Anime clubs/communities

---

## 🔧 CLI Maintenance (During Transition)

**Keep CLI Working**:
- Still useful for MCP server testing
- Quick debugging tool
- Development playground
- No UI needed for some tasks

**Improvements**:
- Better documentation
- More test scenarios
- Automated testing mode
- Output formatting options

---

## 📊 Success Metrics (Web App)

**Launch Goals**:
- 100 users in first month
- <2s average response time
- >90% uptime
- Positive user feedback

**Long-term Goals**:
- 10,000 active users
- <1s search response
- 99.9% uptime
- MAL list sync for 50%+ users
- 4.5+ star rating

---

*Last Updated: 2025-09-30*
*Status: Planning phase for web application*
*Priority: Finalize tech stack and start UI prototypes*
