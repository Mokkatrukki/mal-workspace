# Seasonal Recommendation Features

**Created:** 2025-09-30
**Status:** Requirements & Design
**Context:** Smart seasonal anime recommendations based on user watch history

## Core Problem

When recommending seasonal anime, we need to:

1. **Check prerequisite series** - If Season 3 is coming, did user watch Seasons 1-2?
2. **Suggest catch-up** - If user hasn't watched previous seasons, recommend starting before the new season airs
3. **Avoid score bias** - Don't rely only on MAL scores; use user's actual watch patterns
4. **Match user taste** - Recommend based on what they've actually watched and completed
5. **Check ALL statuses** - Analyze completed, dropped, watching, on-hold, and plan-to-watch lists to understand user's full history

## Key Features

### 1. Prerequisite Checking

When recommending a sequel (Season 2, 3, Part 2, etc.):

```typescript
interface SeasonalRecommendation {
  anime: AnimeData;
  recommendation_type: 'ready_to_watch' | 'needs_catch_up' | 'fresh_start' | 'skip_dropped';
  prerequisites?: {
    watched: AnimeData[];       // Seasons/parts user has watched (completed/watching)
    missing: AnimeData[];        // Seasons/parts user needs to watch
    dropped: AnimeData[];        // Seasons/parts user dropped
    on_hold: AnimeData[];        // Seasons/parts user put on-hold
    planned: AnimeData[];        // Seasons/parts in plan-to-watch
    watch_order: AnimeData[];    // Correct order to watch missing parts
  };
  match_score: number;           // How well it matches user's taste
  drop_risk_score: number;       // 0-1: Likelihood user will drop (based on dropped history)
  reasoning: string;             // Why we're recommending this
}

// Example:
{
  anime: { title: "Spy x Family Season 3", mal_id: 59027 },
  recommendation_type: "ready_to_watch",
  prerequisites: {
    watched: [
      { title: "Spy x Family", mal_id: 50265, status: "completed" }
    ],
    missing: [],
    watch_order: []
  },
  match_score: 0.85,
  reasoning: "You completed Season 1 and enjoy character-driven action comedies"
}

// vs.

{
  anime: { title: "One Punch Man Season 3", mal_id: 52807 },
  recommendation_type: "needs_catch_up",
  prerequisites: {
    watched: [
      { title: "One Punch Man", mal_id: 30276, status: "completed" }
    ],
    missing: [
      { title: "One Punch Man Season 2", mal_id: 34134 }
    ],
    watch_order: [
      { title: "One Punch Man Season 2", mal_id: 34134 }
    ]
  },
  match_score: 0.92,
  drop_risk_score: 0.1,
  reasoning: "You gave Season 1 a 9/10 and love action comedies. Watch Season 2 before Season 3 airs!"
}

// Example with dropped prerequisite:
{
  anime: { title: "Series X Season 3", mal_id: 99999 },
  recommendation_type: "skip_dropped",
  prerequisites: {
    watched: [
      { title: "Series X", mal_id: 11111, status: "completed" }
    ],
    missing: [
      { title: "Series X Season 2", mal_id: 22222, status: "not_watched" }
    ],
    dropped: [
      { title: "Series X Season 2", mal_id: 22222, status: "dropped", episodes_watched: 3 }
    ],
    on_hold: [],
    planned: [],
    watch_order: []
  },
  match_score: 0.45,
  drop_risk_score: 0.9,
  reasoning: "You dropped Season 2 after 3 episodes. Season 3 likely won't match your taste."
}
```

### 2. Pattern-Based Matching (Not Score-Based)

Instead of only looking at user scores, analyze:

#### Watch Completion Patterns
```typescript
interface UserWatchPatterns {
  // Analyze ALL list statuses for complete picture
  list_analysis: {
    completed: number;          // 83 shows completed
    watching: number;           // Currently watching
    dropped: number;            // Shows dropped
    on_hold: number;           // Shows on-hold
    plan_to_watch: number;     // Planned but not started
    total_entries: number;     // Total across all lists
  };

  // What they actually watch and complete
  completed_genres: {
    [genre: string]: {
      count: number;
      completion_rate: number;    // % of started shows they finish
      avg_episodes_watched: number;
    }
  };

  // What they DROP - critical for avoiding bad recommendations
  dropped_patterns: {
    [genre: string]: {
      dropped_count: number;
      avg_episodes_before_drop: number;
      common_reasons?: string[];  // If we can infer from reviews
    }
  };

  // What they put ON-HOLD - might resume later
  on_hold_patterns: {
    total_on_hold: number;
    avg_episodes_watched: number;
    resume_rate: number;          // % that eventually get completed
  };

  // Show types they complete
  preferred_types: {
    "TV": { count: 83, completion_rate: 0.95 },
    "Movie": { count: 12, completion_rate: 1.0 },
    "OVA": { count: 5, completion_rate: 0.6 }
  };

  // Source material preferences
  source_preferences: {
    "Light novel": 15,    // Completed 15 light novel adaptations
    "Manga": 32,
    "Original": 8,
    "Web manga": 4
  };

  // Completion behavior
  watching_style: {
    binge_tendency: 0.7,        // Likely to binge
    drop_rate: 0.05,            // Rarely drops shows (5% drop rate = very committed)
    rewatch_rate: 0.1,          // Sometimes rewatches
    sequel_commitment: 0.9,     // Almost always watches sequels
    avg_episodes_before_drop: 15 // When they DO drop, usually around episode 15
  };
}
```

#### Content Pattern Matching
```typescript
interface ContentPatterns {
  // What content they gravitate toward
  content_themes: {
    "isekai": { frequency: 0.15, completion_rate: 0.98 },
    "romance": { frequency: 0.18, completion_rate: 0.95 },
    "action": { frequency: 0.25, completion_rate: 0.92 },
    "power_fantasy": { frequency: 0.20, completion_rate: 1.0 }
  };

  // Story structure preferences (learned from completed shows)
  structure_preferences: {
    "game_mechanics": 0.8,      // Shangri-La Frontier, Solo Leveling
    "overpowered_mc": 0.7,      // Various isekai completions
    "romance_subplot": 0.6,     // Dress-Up Darling, Masamune-kun
    "tournament_arc": 0.5       // Blue Lock completion
  };
}
```

### 3. Smart Recommendation Tiers

#### Tier 1: Ready to Watch (Green Light)
- User has watched all prerequisites
- Matches user's established patterns
- High confidence recommendation

```typescript
{
  tier: "ready_to_watch",
  confidence: 0.9,
  message: "✅ Spy x Family Season 3 - You're all caught up!",
  reasoning: "You completed Season 1. This matches your love for character-driven action comedies."
}
```

#### Tier 2: Catch-Up Required (Yellow Light)
- User watched some but not all prerequisites
- Still matches user's patterns
- Provide catch-up plan

```typescript
{
  tier: "needs_catch_up",
  confidence: 0.85,
  message: "⏳ One Punch Man Season 3 - Watch Season 2 first!",
  catch_up_plan: {
    episodes_to_watch: 12,
    estimated_time: "4-6 hours",
    watch_before: "Fall 2025",
    urgency: "high"  // Season 3 starting soon
  },
  reasoning: "You gave Season 1 a 9/10. Season 2 has 12 episodes - perfect weekend catch-up!"
}
```

#### Tier 3: Fresh Start (New Series)
- No prerequisites needed
- Matches user's patterns
- Good entry point for new content

```typescript
{
  tier: "fresh_start",
  confidence: 0.75,
  message: "🆕 Isekai Munchkin - New power fantasy isekai!",
  reasoning: "Matches your isekai completion rate (98%) and love for game mechanics (Shangri-La Frontier, Solo Leveling)"
}
```

#### Tier 4: Consider Starting
- Long prerequisite chain
- Matches user's patterns well
- Worth the investment but requires commitment

```typescript
{
  tier: "consider_starting",
  confidence: 0.65,
  message: "🤔 [New Series Season 3] - Haven't started yet",
  catch_up_plan: {
    total_episodes: 48,  // Seasons 1 + 2
    estimated_time: "16-20 hours",
    watch_before: "Fall 2025",
    urgency: "medium",
    commitment_level: "high"
  },
  reasoning: "This matches your taste but requires watching 48 episodes first. Worth it if you have time!"
}
```

#### Tier 5: Skip - Dropped History (Red Flag)
- User dropped previous season(s)
- Low confidence, high drop risk
- Don't recommend unless explicitly asked

```typescript
{
  tier: "skip_dropped",
  confidence: 0.2,
  drop_risk_score: 0.9,
  message: "⚠️ [Series] Season 3 - You dropped Season 2",
  reasoning: "You dropped Season 2 after 3 episodes. Recommending Season 3 would likely waste your time.",
  action: "excluded_from_recommendations"  // Don't show unless user asks "why isn't X recommended?"
}
```

#### Tier 6: On-Hold Review
- User has previous season on-hold
- Moderate confidence, depends on context
- Suggest resuming if timing is good

```typescript
{
  tier: "on_hold_review",
  confidence: 0.5,
  message: "⏸️ [Series] Season 3 - Season 1 is on-hold",
  reasoning: "You have Season 1 on-hold (watched 8/12 episodes). Consider finishing it before Season 3 airs!",
  on_hold_info: {
    episodes_remaining: 4,
    estimated_time: "1.5-2 hours",
    last_watched: "3 months ago"
  }
}
```

### 4. Pattern Weighting System

```typescript
interface RecommendationScore {
  // Multiple factors, not just score
  pattern_match: number;        // 0-1: How well it matches watch patterns
  completion_likelihood: number; // 0-1: Probability user will finish it
  genre_alignment: number;      // 0-1: Genre match with completed shows
  theme_alignment: number;      // 0-1: Theme match with completed shows
  prerequisite_status: number;  // 0-1: 1 if all prereqs done, scaled down if not
  timing_relevance: number;     // 0-1: Is it airing soon? User binge vs weekly?

  // Weighted final score
  final_score: number;

  // Calculation example:
  final_score =
    pattern_match * 0.25 +
    completion_likelihood * 0.20 +
    genre_alignment * 0.15 +
    theme_alignment * 0.15 +
    prerequisite_status * 0.15 +
    timing_relevance * 0.10;
}
```

### 5. Messaging Strategy

#### For sequels user can watch:
- ✅ **"Ready to watch!"** - All prerequisites done
- 🎯 **"Perfect match"** - High pattern alignment
- 📺 **"Airing [date]"** - When it starts

#### For sequels needing catch-up:
- ⏳ **"Watch X first"** - What they need to watch
- ⏱️ **"~X hours"** - Time investment
- 🗓️ **"Before [season]"** - Deadline motivation
- 💡 **"You gave S1 a 9/10"** - Remind them why they'd like it

#### For new series:
- 🆕 **"New [genre] series"** - What it is
- 🎮 **"Like [completed show]"** - Compare to what they've watched
- 📊 **"X% match"** - Pattern-based confidence

#### For series with long catch-up:
- 🤔 **"Worth the investment?"** - Honest about time commitment
- 📺 **"X episodes to catch up"** - Clear expectations
- ⭐ **"Highly matches your taste"** - Why it's still recommended
- 📅 **"Can wait if needed"** - No pressure

## Example Workflow

### User: "What should I watch this Fall?"

**System Analysis:**
1. Fetch Fall 2025 anime list
2. For each anime:
   - Check if it's a sequel
   - If sequel: Check user's watch history for previous seasons
   - Calculate pattern match score
   - Categorize into recommendation tier
3. Sort by tier and confidence
4. Present with clear messaging

**Output:**
```
🎬 Your Fall 2025 Recommendations

✅ READY TO WATCH (3)
━━━━━━━━━━━━━━━━━━━
1. Spy x Family Season 3 (92% match)
   → You completed Season 1
   → Perfect match: Character comedy + action

2. Dandadan Season 2 (Already watching!)
   → You gave Season 1 a 9/10
   → Continue the supernatural chaos

⏳ CATCH UP FIRST (2)
━━━━━━━━━━━━━━━━━━━
3. One Punch Man Season 3 (95% match)
   → Need to watch: Season 2 (12 episodes)
   → Estimated time: 4-6 hours
   → You rated Season 1: 9/10

4. Fumetsu no Anata e Season 3 (78% match)
   → Need to watch: Season 2 (20 episodes)
   → Estimated time: 8-10 hours
   → You completed Season 1

🆕 FRESH STARTS (5)
━━━━━━━━━━━━━━━━━━━
5. Isekai Munchkin (89% match)
   → New isekai with game mechanics
   → Like: Solo Leveling, Shangri-La Frontier
   → Your isekai completion rate: 98%

6. Chichi wa Eiyuu... (85% match)
   → New reincarnation isekai
   → Matches your power fantasy pattern

[... more recommendations ...]
```

## Technical Requirements

### Database Schema Extensions

```sql
-- Track anime relationships (sequels, prequels, etc.)
CREATE TABLE anime_relations (
  anime_id INTEGER REFERENCES anime(mal_id),
  related_anime_id INTEGER REFERENCES anime(mal_id),
  relation_type VARCHAR(50), -- 'sequel', 'prequel', 'side_story', 'parent_story'
  watch_order INTEGER,       -- Suggested watch order
  PRIMARY KEY (anime_id, related_anime_id)
);

-- User watch patterns analysis (computed/cached)
CREATE TABLE user_watch_patterns (
  username TEXT PRIMARY KEY,
  pattern_data JSONB,        -- All pattern analysis stored as JSON
  completion_rate FLOAT,
  avg_episodes_watched FLOAT,
  drop_rate FLOAT,
  last_calculated TIMESTAMP
);
```

### MCP Tool Design

```typescript
// New MCP tool
server.tool(
  "getSeasonalRecommendations",
  {
    username: z.string(),
    season: z.enum(["winter", "spring", "summer", "fall"]),
    year: z.number(),
    limit: z.number().optional().default(10),
    include_catch_up: z.boolean().optional().default(true),
    min_confidence: z.number().optional().default(0.6)
  },
  async (params) => {
    // 1. Get seasonal anime
    const seasonal_anime = await getSeasonalAnime(params.season, params.year);

    // 2. Get user watch history
    const user_history = await getUserWatchHistory(params.username);

    // 3. Analyze patterns
    const user_patterns = await analyzeUserPatterns(user_history);

    // 4. Check prerequisites for each anime
    const recommendations = [];
    for (const anime of seasonal_anime) {
      const prereq_status = await checkPrerequisites(anime, user_history);
      const pattern_match = calculatePatternMatch(anime, user_patterns);
      const tier = determineRecommendationTier(prereq_status, pattern_match);

      recommendations.push({
        anime,
        tier,
        prereq_status,
        pattern_match,
        confidence: calculateConfidence(prereq_status, pattern_match)
      });
    }

    // 5. Sort and filter
    return recommendations
      .filter(r => r.confidence >= params.min_confidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, params.limit);
  }
);
```

## Implementation Phases

### Phase 1: Pattern Analysis
- Implement watch pattern analysis
- Calculate user completion rates
- Identify genre/theme preferences
- Cache pattern results

### Phase 2: Prerequisite Tracking
- Build anime relationship graph
- Implement prerequisite checking
- Calculate watch order
- Estimate time commitments

### Phase 3: Recommendation Engine
- Implement pattern matching algorithm
- Build scoring system
- Create tier categorization
- Generate explanations

### Phase 4: MCP Integration
- Create MCP tools
- Integrate with mal-user-mcp for watch history
- Integrate with anime-search-mcp for seasonal data
- Test end-to-end workflow

## Success Metrics

- **Accuracy:** Recommendations match user's actual watch patterns
- **Usefulness:** Users find catch-up suggestions helpful
- **Completion:** Recommended shows have high completion rate
- **Satisfaction:** Users report recommendations feel "right"

## Notes

- Don't rely solely on scores - many users don't score everything
- Watch completion is more important than high scores
- Consider watch history recency - recent patterns may differ
- Sequels should be heavily weighted if user loved previous seasons
- Be honest about time commitments for catch-up

---

**Status:** Ready for implementation
**Priority:** High - Seasonal recommendations are time-sensitive
**Dependencies:** mal-user-mcp (watch history), anime-search-mcp (seasonal data)