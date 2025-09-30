# Phase 1 Testing Plan - Interactive Pattern Discovery (Updated Architecture)

## 🎯 Testing Objective

Validate the interactive pattern discovery system using **clean 3-layer MCP architecture** with real anime review data to build emotional viewing pattern libraries.

## 🏗️ Testing Architecture

```
anime-search-mcp → anime-recommendation-mcp → User
(Data Source)      (Pattern Engine)           (Results)
```

## 📋 Test Scenarios

### Test 1: Comfort-Seeking Pattern Discovery

**Target Anime**: Natsume Yuujinchou (known comfort anime)

**Steps**:
1. Use `anime-search-mcp.searchAnime({ query: "Natsume Yuujinchou" })` to get MAL ID
2. Use `anime-search-mcp.getAnimeReviews({ anime_id: found_id, limit: 30 })` for review data
3. Manually analyze reviews for comfort language
4. Use `anime-recommendation-mcp.saveEmotionalPattern()` with discovered keywords/regex
5. Use `anime-recommendation-mcp.analyzeReviewForPatterns()` to test pattern
6. Validate pattern accuracy

**Expected Keywords**: healing, peaceful, calm, soothing, gentle, comfort, relaxing, cozy, made my day

**Expected Regex Patterns**:
```javascript
[
  "/heal(ing)?/gi",
  "/peaceful/gi",
  "/calm(ing)?/gi",
  "/sooth(ing)?/gi",
  "/made.{0,5}(my.)?day/gi",
  "/comfort(ing)?/gi",
  "/relax(ing)?/gi"
]
```

### Test 2: Excitement-Seeking Pattern Discovery

**Target Anime**: Attack on Titan or Demon Slayer (high-energy anime)

**Steps**:
1. Get reviews for action anime
2. Discover excitement/adrenaline patterns
3. Create "excitement_seeking" pattern
4. Test accuracy

**Expected Keywords**: intense, adrenaline, exciting, edge of seat, pumped up, thrilling, action-packed

### Test 3: Pattern Validation & Evidence

**Steps**:
1. Use `getPatternEvidence` to review saved evidence
2. Use `validatePatternEvidence` to mark good/bad matches
3. Use `updatePatternFromEvidence` to improve pattern accuracy
4. Test refined patterns

### Test 4: Cross-Anime Pattern Testing

**Steps**:
1. Apply comfort pattern to different comfort anime (K-On!, Non Non Biyori)
2. Apply excitement pattern to different action anime
3. Verify patterns work across similar anime types
4. Measure false positives/negatives

### Test 5: Mass Pattern Analysis

**Steps**:
1. Run `runMassPatternAnalysis` on limited dataset (1000 reviews)
2. Analyze results for pattern distribution
3. Identify most common emotional patterns in database
4. Validate with manual review sampling

## 🧪 Test Commands

### Setup Commands
```bash
# Ensure server is built and databases ready
npm run build
npm run db:migrate:sqlite
npm run db:migrate:postgres
```

### MCP Tool Testing Commands (Updated Architecture)

1. **Find Anime** (anime-search-mcp):
```javascript
searchAnime({ query: "Natsume Yuujinchou", limit: 5 })
```

2. **Get Reviews** (anime-search-mcp):
```javascript
getAnimeReviews({
  anime_id: 55823, // Replace with actual MAL ID from search
  limit: 30
})
```

3. **Save Pattern** (anime-recommendation-mcp):
```javascript
saveEmotionalPattern({
  pattern_name: "comfort_healing",
  keywords: ["healing", "peaceful", "calm", "soothing"],
  regex_variants: ["/heal(ing)?/gi", "/peaceful/gi"],
  context_words: ["anime", "show", "series"],
  emotional_category: "comfort_seeking",
  confidence: 0.8,
  source_anime: [55823],
  discovered_from: "manual_review_analysis"
})
```

4. **Test Pattern** (anime-recommendation-mcp):
```javascript
analyzeReviewForPatterns({
  review_text: "This anime is so healing and made my day better"
})
```

5. **Mass Analysis** (anime-recommendation-mcp with data from anime-search-mcp):
```javascript
// First get review data from anime-search-mcp, then:
runMassPatternAnalysis({
  review_data: [
    { review_text: "This anime is so peaceful...", anime_id: 123 },
    { review_text: "Made me feel calm...", anime_id: 456 }
  ],
  pattern_filter: "comfort_seeking"
})
```

## 📊 Success Criteria

### Pattern Discovery Success
- [ ] Successfully identify 3-5 distinct emotional patterns
- [ ] Each pattern has 5+ relevant keywords
- [ ] Each pattern has 3+ working regex variants
- [ ] Pattern confidence scores > 0.7

### Pattern Accuracy Success
- [ ] True positive rate > 80% (correctly identifies emotional content)
- [ ] False positive rate < 20% (doesn't incorrectly match non-emotional content)
- [ ] Cross-anime validation works (patterns apply to similar anime types)

### System Performance Success
- [ ] Mass analysis processes 1000+ reviews without errors
- [ ] Database operations complete within reasonable time (<30s for 1000 reviews)
- [ ] Pattern evidence storage and retrieval works correctly
- [ ] User profile creation and preference learning functions

### Integration Success
- [ ] MCP tools respond correctly to all test scenarios
- [ ] SQLite and PostgreSQL integration works seamlessly
- [ ] Error handling works for invalid inputs
- [ ] Pattern library can be built incrementally

## 🐛 Known Issues to Test

1. **Database Connection**: Ensure PostgreSQL port 5433 connection is stable
2. **Large Dataset Performance**: Test with incremental limits before full 112K analysis
3. **Regex Validation**: Ensure regex patterns are properly escaped and functional
4. **Memory Usage**: Monitor memory during mass analysis operations

## 📝 Test Results Documentation

Create `TEST_RESULTS.md` to document:
- Which anime were tested
- What patterns were discovered
- Pattern accuracy measurements
- Performance metrics
- Issues encountered
- Recommendations for improvement

## 🔄 Iterative Testing Process

1. **Start Small** - Test with 1-2 anime, 20-30 reviews each
2. **Validate Patterns** - Ensure patterns work correctly before scaling
3. **Expand Gradually** - Add more anime types and emotional categories
4. **Mass Analysis** - Only after individual patterns are validated
5. **Refine System** - Use results to improve pattern discovery algorithms

---

**Ready for execution when MCP server is active in chat session**