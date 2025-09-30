# WIP: Recommendation System Design

**Status:** Work in Progress - Planning Phase
**Date:** 2025-09-27
**Context:** Designing nuanced, conversational anime recommendation system

## Core Philosophy: Beyond Binary Preferences

### Problem with Traditional Approach
- **Too Binary:** "User hates episodic" → Never recommend slice-of-life ❌
- **Too Rigid:** "User loves hidden meanings" → Always recommend complex shows ❌

### Our Nuanced Approach
- **Context-Aware:** User preferences change based on mood, time, energy level
- **Weighted Preferences:** Not yes/no, but strength scores that can be modified by context
- **Conversational Learning:** Learn from natural mentions, not forced questionnaires
- **Pattern-Based Similarity:** Find users with similar emotional viewing patterns

## 1. Nuanced Preference System

### User Profile Structure
```typescript
interface UserPreferenceProfile {
  // Context-dependent preferences
  viewing_contexts: {
    "tired_evening": {
      complexity_tolerance: 0.2,     // Low complexity when tired
      slice_of_life_appeal: 0.8,     // High appeal for cozy shows
      plot_intensity_need: 0.1       // Don't need intense plots
    },
    "weekend_deep_dive": {
      complexity_tolerance: 0.9,     // Can handle complex shows
      hidden_meaning_appetite: 0.8,  // Enjoys analysis
      marathon_potential: 0.9        // Can binge long series
    },
    "casual_background": {
      episodic_preference: 0.9,      // Episodic works better
      comedy_weight: 0.7,            // Light content preferred
      attention_requirement: 0.2     // Don't need full attention
    }
  },

  // Flexible, not absolute preferences
  flexible_preferences: {
    slice_of_life: {
      base_appeal: 0.3,              // Generally not favorite
      exceptions: ["character_focused", "healing", "music_related"],
      context_boost: {
        "comfort_viewing": +0.5,      // Much higher when seeking comfort
        "high_energy": -0.3           // Lower when wanting excitement
      }
    },

    episodic_shows: {
      base_appeal: 0.4,
      exceptions: ["character_driven", "world_building"],
      context_boost: {
        "casual_viewing": +0.6,
        "binge_mode": -0.4
      }
    }
  },

  // Emotional patterns learned from reviews and conversations
  emotional_patterns: {
    character_driven_romantic: 0.8,   // Strong preference
    plot_structure_focused: 0.6,     // Moderate preference
    mood_based_viewer: 0.3,          // Low but present
    nostalgia_seeker: 0.7            // High preference
  }
}
```

## 2. Review Pattern Analysis Strategy

### Discovered Viewer Types from Cowboy Bebop Reviews

**Type 1: Analytical Viewer** (Labracadabrador - Score: 7)
- Values clear thematic presentation
- Reads between lines but wants clarity
- Tolerates slow pacing if purposeful

**Type 2: Modern Standards Viewer** (VertSang1 - Score: 4)
- Judges classics by today's standards
- Needs engagement, will drop if bored
- Can appreciate technical aspects even when story fails

**Type 3: Plot-Driven Viewer** (Dislexic_Potato - Score: 6)
- Needs overarching plot and stakes
- Low tolerance for episodic structure
- Prefers linear progression

**Type 4: Deep Analysis Viewer** (sushiisawesome - Score: 6)
- Appreciates complexity but demands consistency
- Analytical approach to narrative structure
- Gets frustrated by quality inconsistency

**Type 5: Character-Driven Romantic** (horrorcores - Score: 9)
- Initially resistant but drawn to character depth
- Looks for subtle romantic subtext
- Changed opinion through deeper analysis

**Type 6: Impatient Viewer** (Akiraa-kun - Score: 3)
- Gets angry at wasted potential
- Results-oriented, needs payoff
- Frustrated by incompetent protagonists

### Pattern Detection Methods

#### Option A: Regex/Keyword Pattern Matching (Fast, Scalable)
```typescript
const emotional_patterns = {
  "character_driven_romantic": [
    /relationship.{0,20}develop/i,
    /subtle.{0,20}romance/i,
    /chemistry.{0,20}between/i,
    /loved.{0,20}(characters?|dynamic)/i
  ],

  "plot_structure_focused": [
    /overarching.{0,20}plot/i,
    /story.{0,20}structure/i,
    /pacing.{0,20}(issues?|problems?)/i,
    /(episodic|filler).{0,20}(boring|pointless)/i
  ],

  "mood_based_viewer": [
    /comfort.{0,20}(watch|viewing)/i,
    /healing/i,
    /cozy/i,
    /when.{0,20}(sad|tired|stressed)/i
  ],

  "analytical_viewer": [
    /themes?.{0,20}(clear|unclear)/i,
    /read.{0,20}between.{0,20}lines/i,
    /analysis/i,
    /deeper.{0,20}meaning/i
  ]
}

// Mass analysis function
async function analyzeAllReviews() {
  const reviews = await getAllReviews(); // 111K+ reviews

  for (const review of reviews) {
    const detected_patterns = [];

    for (const [pattern_type, regexes] of Object.entries(emotional_patterns)) {
      const matches = regexes.filter(regex => regex.test(review.text));
      if (matches.length > 0) {
        detected_patterns.push({
          type: pattern_type,
          confidence: matches.length / regexes.length,
          evidence: matches
        });
      }
    }

    await updateReviewPatterns(review.id, detected_patterns);
    await updateUserPatterns(review.username, detected_patterns);
  }
}
```

#### Option B: AI Agent Analysis (More Accurate, Expensive)
```typescript
async function aiAnalyzeReview(review_text: string) {
  const prompt = `
    Analyze this anime review for emotional viewing patterns:
    "${review_text}"

    Identify:
    1. What the viewer values most (plot, characters, mood, atmosphere, etc.)
    2. Their tolerance for different story structures (episodic, linear, complex)
    3. Viewing context preferences (binge, casual, analytical, comfort)
    4. Emotional needs this anime fulfilled or failed to fulfill
    5. Flexibility vs rigidity in preferences

    Return JSON with confidence scores 0-1:
    {
      "viewer_type": "character_driven_romantic",
      "patterns": {
        "needs_plot_progression": 0.2,
        "appreciates_subtle_romance": 0.9,
        "comfort_viewing_tendency": 0.6
      },
      "viewing_contexts": ["evening_relaxation", "emotional_processing"],
      "flexibility_indicators": ["willing_to_rewatch", "changed_opinion_over_time"]
    }
  `;

  return await aiCall(prompt);
}
```

## 3. User Similarity Engine

### Multi-Factor Similarity Calculation
```typescript
interface UserSimilarity {
  pattern_overlap: number;        // How similar their viewing patterns are
  score_correlation: number;      // How similarly they rate anime
  context_alignment: number;      // Similar viewing contexts
  taste_evolution_similarity: number; // How their tastes change over time

  // Example:
  // User A: loves character-driven, hates complex plots
  // User B: loves character-driven, sometimes enjoys complex plots
  // Similarity: 0.7 (high character overlap, plot tolerance difference)
}

function calculateUserSimilarity(user1: UserProfile, user2: UserProfile): UserSimilarity {
  const pattern_overlap = calculatePatternOverlap(user1.emotional_patterns, user2.emotional_patterns);
  const score_correlation = calculateScoreCorrelation(user1.ratings, user2.ratings);
  const context_alignment = calculateContextAlignment(user1.viewing_contexts, user2.viewing_contexts);

  return {
    pattern_overlap,
    score_correlation,
    context_alignment,
    overall_similarity: (pattern_overlap * 0.4) + (score_correlation * 0.3) + (context_alignment * 0.3)
  };
}

// Find recommendations from similar users
function findSimilarUserRecommendations(user_patterns: UserPatterns, context?: ViewingContext) {
  const similar_users = findUsersWithPatternOverlap(user_patterns, 0.6);

  return similar_users
    .flatMap(user => user.high_rated_anime)
    .filter(anime => !current_user.has_seen(anime))
    .filter(anime => context ? matchesContext(anime, context) : true)
    .sort_by_pattern_relevance();
}
```

## 4. Conversational Learning System

### Smart Context Detection
```typescript
// Example conversation learning
interface ConversationBreadcrumb {
  type: 'anime_mention' | 'preference_hint' | 'mood_indicator' | 'context_reveal';
  content: string;
  extracted_themes: string[];
  viewing_context?: string;
  emotional_state?: string;
  confidence: number;
}

// Real examples:
user_message: "I watched Your Name last night when I was feeling down, it really helped"
→ Extract: {
  anime: "Your Name",
  viewing_context: "emotional_comfort",
  timing: "evening",
  emotional_state: "sad",
  outcome: "healing_effect",
  patterns: ["seeks_healing_content_when_sad", "appreciates_emotional_catharsis"]
}

user_message: "I think dress up darling was so good, the relationship was warm and their passion for hobbies was amazing"
→ Extract: {
  anime: "My Dress-Up Darling",
  loved_aspects: ["warm_relationship", "hobby_passion", "mutual_support"],
  emotional_response: "positive_warmth",
  patterns: ["values_supportive_relationships", "enjoys_hobby_focused_stories"]
}

// Smart follow-up questions based on patterns:
if (detected_pattern === "character_driven_romantic") {
  ask("What specifically made their relationship feel warm to you? Was it the gradual development or how they supported each other's interests?");
}

if (detected_pattern === "seeks_healing_content") {
  ask("Do you often watch anime when you're feeling down, or was this a special case?");
}
```

### Learning Integration
```typescript
function updateUserProfileFromConversation(username: string, breadcrumb: ConversationBreadcrumb) {
  const user = getUserProfile(username);

  // Update contextual preferences
  if (breadcrumb.viewing_context === "emotional_comfort" && breadcrumb.outcome === "healing_effect") {
    user.viewing_contexts.sad_evening.romance_appeal += 0.2;
    user.viewing_contexts.sad_evening.emotional_catharsis_need += 0.3;
  }

  // Update flexible preferences based on specific anime enjoyment
  if (breadcrumb.loved_aspects.includes("hobby_passion")) {
    user.flexible_preferences.slice_of_life.exceptions.push("hobby_focused");
    user.flexible_preferences.slice_of_life.base_appeal += 0.1;
  }

  // Update emotional patterns
  for (const pattern of breadcrumb.patterns) {
    user.emotional_patterns[pattern] += 0.1;
  }

  saveUserProfile(user);
}
```

## 5. Database Schema

### SQLite (User Data)
```sql
-- User pattern profiles
CREATE TABLE user_viewing_patterns (
  username TEXT,
  pattern_type TEXT,
  confidence FLOAT,
  context TEXT,              -- When this pattern applies
  learned_from TEXT,         -- 'conversation', 'review', 'behavior'
  last_updated DATETIME,
  PRIMARY KEY (username, pattern_type, context)
);

-- User contextual preferences
CREATE TABLE user_context_preferences (
  username TEXT,
  context_name TEXT,         -- 'tired_evening', 'weekend_deep_dive'
  preference_data TEXT,      -- JSON of preference weights
  last_updated DATETIME,
  PRIMARY KEY (username, context_name)
);

-- User similarity cache
CREATE TABLE user_similarity_cache (
  user1 TEXT,
  user2 TEXT,
  similarity_score FLOAT,
  pattern_overlap FLOAT,
  score_correlation FLOAT,
  context_alignment FLOAT,
  calculated_at DATETIME,
  PRIMARY KEY (user1, user2)
);

-- Conversation learning history
CREATE TABLE conversation_breadcrumbs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  message_content TEXT,
  extracted_patterns TEXT,   -- JSON array
  viewing_context TEXT,
  emotional_state TEXT,
  confidence FLOAT,
  created_at DATETIME
);
```

### PostgreSQL (Anime Data Extensions)
```sql
-- Review pattern analysis
CREATE TABLE review_patterns (
  review_id INTEGER REFERENCES anime_reviews(id),
  pattern_type TEXT,
  confidence FLOAT,
  extracted_keywords TEXT,   -- What triggered this pattern
  analysis_method TEXT,      -- 'regex' or 'ai'
  created_at TIMESTAMP
);

-- Anime emotional signatures (aggregated from reviews)
CREATE TABLE anime_emotional_signatures (
  anime_id INTEGER REFERENCES anime(mal_id),
  emotional_pattern TEXT,
  strength FLOAT,            -- How strongly anime exhibits this pattern
  review_evidence_count INTEGER,
  user_pattern_matches INTEGER, -- How many users with this pattern rated it highly
  calculated_at TIMESTAMP,
  PRIMARY KEY (anime_id, emotional_pattern)
);

-- Contextual anime recommendations
CREATE TABLE anime_context_suitability (
  anime_id INTEGER REFERENCES anime(mal_id),
  context_type TEXT,         -- 'tired_evening', 'comfort_viewing'
  suitability_score FLOAT,   -- 0-1 how well it fits this context
  evidence_source TEXT,      -- 'reviews', 'user_patterns', 'content_analysis'
  last_calculated TIMESTAMP,
  PRIMARY KEY (anime_id, context_type)
);
```

## 6. Implementation Phases

### Phase 1: Pattern Analysis Foundation (Weeks 1-2)
```bash
# Pattern detection and user classification
npm run patterns:analyze-reviews     # Run regex patterns on 111K+ reviews
npm run patterns:extract-keywords    # Extract emotional keywords from reviews
npm run patterns:tag-users          # Tag users based on review patterns
npm run patterns:validate           # Manual validation of pattern accuracy
npm run patterns:export-for-similarity # Prepare data for similarity calculations
```

### Phase 2: Similarity Engine (Weeks 3-4)
```bash
# User similarity and recommendation engine
npm run similarity:calculate-users   # Calculate user similarity matrix
npm run similarity:test-accuracy    # Test recommendation accuracy against known preferences
npm run similarity:optimize-weights # Optimize similarity algorithm weights
npm run similarity:generate-recommendations # Generate initial recommendation sets
```

### Phase 3: Conversational Learning (Weeks 5-6)
```bash
# Natural language processing and learning
npm run conversation:setup-nlp      # Set up natural language processing
npm run conversation:extract-patterns # Extract patterns from user messages
npm run conversation:update-profiles # Update user profiles from conversations
npm run conversation:test-learning  # Test learning accuracy and responsiveness
```

### Phase 4: Integration & MCP Tools (Weeks 7-8)
```bash
# MCP tool implementation
npm run mcp:implement-tools         # Implement all MCP recommendation tools
npm run mcp:test-integration       # Test integration with other MCP services
npm run mcp:performance-optimize   # Optimize for real-time usage
npm run mcp:deploy-beta           # Deploy beta version for testing
```

## 7. Key Decisions Needed

### Pattern Analysis Method
- **Start with regex** (fast, can process all 111K reviews quickly)
- **Validate with AI sampling** (use AI on subset to verify regex accuracy)
- **Hybrid approach** (regex for bulk processing, AI for edge cases)

### Learning Granularity
- **Broad patterns** ("character_driven") vs **specific patterns** ("character_driven_romantic_slow_burn")
- **Recommendation:** Start broad, refine over time based on user feedback

### Context Sensitivity
- **How much should mood affect recommendations?** (High - mood is crucial for enjoyment)
- **Track temporal patterns?** (Yes - learn when users prefer different content types)

### Similarity Algorithm Weights
- **Pattern overlap:** 40% (most important - similar emotional needs)
- **Score correlation:** 30% (important - similar quality standards)
- **Context alignment:** 30% (important - similar viewing situations)

## Interactive Pattern Discovery System

### **MCP Tools for Pattern Building**

Instead of pre-building patterns, we'll discover them interactively using Claude chat + MCP tools:

```typescript
// New MCP tools needed:
saveEmotionalPattern(pattern_name, regex_variants, context_words, confidence)
getStoredPatterns(category?)
analyzeReviewForPatterns(review_text, known_patterns?)
updatePatternFromEvidence(pattern_name, new_evidence, context)
runPatternAnalysisScript(anime_ids?, pattern_filter?)
```

### **Interactive Discovery Workflow**

```typescript
// 1. User guides: "Let's analyze Natsume Yuujinchou reviews for comfort patterns"
const reviews = await getAnimeReviewsDetailed(55823);

// 2. Claude finds patterns: "I see 'healing', 'peaceful', 'made my day'"
await saveEmotionalPattern("comfort_healing", {
  keywords: ["healing", "peaceful", "made my day", "feel better"],
  regex_variants: [/heal(ing)?/i, /peaceful/i, /made.{0,5}(my.)?day/i],
  context_words: ["anime", "show", "series", "watching"],
  confidence: 0.8,
  source_anime: [55823],
  discovered_from: "manual_review_analysis"
});

// 3. Continue with more series, building pattern library
// 4. When ready: run mass analysis on 111K reviews
await runPatternAnalysisScript();
```

### **Comprehensive Emotional Categories for Discovery**

```typescript
const emotionalCategoriesToDiscover = {
  // Basic Mood States
  comfort_seeking: {
    target_series: ["Natsume Yuujinchou", "Non Non Biyori", "Barakamon", "Silver Spoon"],
    expected_patterns: ["healing", "peaceful", "cozy", "gentle", "warm", "made my day"]
  },

  excitement_seeking: {
    target_series: ["Attack on Titan", "Demon Slayer", "Jujutsu Kaisen", "Chainsaw Man"],
    expected_patterns: ["intense", "adrenaline", "edge of seat", "pumped up", "thrilling"]
  },

  melancholy_contemplative: {
    target_series: ["Your Name", "A Silent Voice", "Violet Evergarden", "Anohana"],
    expected_patterns: ["bittersweet", "emotional journey", "tears", "profound", "touching"]
  },

  // Romance Subcategories
  fluffy_romance: {
    target_series: ["Teasing Master Takagi-san", "Tonikawa", "Horimiya", "My Dress-Up Darling"],
    expected_patterns: ["adorable", "diabetes", "heart flutter", "pure", "wholesome"]
  },

  mature_romance: {
    target_series: ["Nana", "Paradise Kiss", "Honey and Clover", "Nodame Cantabile"],
    expected_patterns: ["realistic", "complex", "adult relationships", "sophisticated"]
  },

  dramatic_romance: {
    target_series: ["Your Lie in April", "Clannad", "Plastic Memories", "Angel Beats"],
    expected_patterns: ["emotional rollercoaster", "heart-wrenching", "tragedy", "cathartic"]
  },

  // Intellectual/Psychological
  mind_bending: {
    target_series: ["Serial Experiments Lain", "Perfect Blue", "Paprika", "Ghost in the Shell"],
    expected_patterns: ["thought-provoking", "philosophical", "mind-bending", "complex"]
  },

  psychological_thriller: {
    target_series: ["Monster", "Psycho-Pass", "Death Note", "Paranoia Agent"],
    expected_patterns: ["disturbing", "psychological", "dark", "twisted", "unsettling"]
  },

  // Energy Levels
  cozy_slice_of_life: {
    target_series: ["K-On!", "Aria", "Flying Witch", "Yuru Camp"],
    expected_patterns: ["relaxing", "comfy", "chill", "iyashikei", "cozy"]
  },

  high_energy_comedy: {
    target_series: ["Gintama", "Grand Blue", "Prison School", "Daily Lives of High School Boys"],
    expected_patterns: ["hilarious", "laugh out loud", "chaotic", "energetic", "crazy"]
  },

  // Aesthetic Moods
  atmospheric_dark: {
    target_series: ["Hell Girl", "Another", "Shiki", "Higurashi"],
    expected_patterns: ["atmospheric", "eerie", "unsettling", "dark mood", "creepy"]
  },

  visually_stunning: {
    target_series: ["Demon Slayer", "Violet Evergarden", "Your Name", "Garden of Words"],
    expected_patterns: ["gorgeous", "visual feast", "breathtaking", "masterpiece", "stunning"]
  },

  // Nostalgia/Time-specific
  nostalgic_warm: {
    target_series: ["Summer Wars", "Wolf Children", "Only Yesterday", "From Up on Poppy Hill"],
    expected_patterns: ["nostalgic", "childhood", "memories", "warm feelings", "reminiscent"]
  },

  // Social/Community
  friendship_bonds: {
    target_series: ["Haikyuu", "Run with the Wind", "A Place Further Than the Universe", "Shirobako"],
    expected_patterns: ["camaraderie", "teamwork", "bonds", "inspiring", "friendship"]
  },

  // Temporal Moods
  late_night_watching: {
    target_series: ["Serial Experiments Lain", "Mushishi", "Hell Girl", "Kino's Journey"],
    expected_patterns: ["atmospheric", "contemplative", "slow burn", "meditative", "quiet"]
  },

  binge_worthy: {
    target_series: ["Death Note", "Code Geass", "Steins;Gate", "Attack on Titan"],
    expected_patterns: ["addictive", "can't stop watching", "one more episode", "gripping"]
  },

  // Context-Dependent Categories
  weekend_energy: {
    target_series: ["Mob Psycho 100", "One Punch Man", "Fire Force", "Black Clover"],
    expected_patterns: ["energetic", "weekend vibes", "high energy", "action-packed"]
  },

  tired_evening: {
    target_series: ["Mushishi", "Natsume Yuujinchou", "Aria", "Flying Witch"],
    expected_patterns: ["relaxing", "peaceful", "gentle", "soothing", "calm"]
  },

  stress_relief: {
    target_series: ["K-On!", "Non Non Biyori", "Yuru Camp", "Barakamon"],
    expected_patterns: ["stress relief", "healing", "peaceful", "comfort", "de-stress"]
  }
};
```

### **Pattern Detection Example**

```typescript
// When we find: "This anime made my day better after a stressful work"
// We save pattern:
{
  pattern_name: "stress_relief_healing",
  keywords: ["made my day", "better", "stressful", "work"],
  regex_variants: [
    /made.{0,5}(my.)?day.{0,10}better/i,
    /(after|during).{0,10}stress(ful)?/i,
    /stress.{0,10}relief/i
  ],
  context_indicators: ["work", "day", "tired", "stressed"],
  emotional_outcome: "feeling_better",
  viewing_context: "stress_relief",
  confidence: 0.8,
  source_evidence: ["review_12345", "review_67890"]
}

// Later when analyzing 111K reviews:
// "watched this after tough day at work, really helped" → matches stress_relief_healing
```

## Next Steps

1. **Create MCP tools** for interactive pattern discovery
2. **Start with pilot analysis** of 3-5 series to test approach
3. **Build pattern library gradually** through guided exploration
4. **Mass analysis script** when pattern library is sufficient

## Notes & Considerations

- **Privacy:** User patterns stored in separate SQLite database
- **Performance:** Cache similarity calculations, use materialized views
- **Scalability:** Design for growing user base and anime database
- **Accuracy:** Start simple, improve through user feedback and validation
- **Flexibility:** System should evolve as we learn what works best

---

**Last Updated:** 2025-09-27
**Next Review:** After testing initial pattern analysis on reviews
**Status:** Ready for implementation phase 1