import { getSQLiteDB } from '../database/sqlite.js';
import { EmotionalPattern, PatternEvidence, PatternMatch } from '../types/recommendation.js';

export class PatternAnalysisService {
  private sqliteDb = getSQLiteDB();

  async saveEmotionalPattern(pattern: Omit<EmotionalPattern, 'id' | 'created_at' | 'updated_at'>): Promise<number> {
    await this.sqliteDb.initialize();

    const result = await this.sqliteDb.run(`
      INSERT INTO emotional_patterns (
        pattern_name, keywords, regex_variants, context_words,
        emotional_category, confidence, source_anime, discovered_from
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      pattern.pattern_name,
      JSON.stringify(pattern.keywords),
      JSON.stringify(pattern.regex_variants),
      JSON.stringify(pattern.context_words),
      pattern.emotional_category,
      pattern.confidence,
      JSON.stringify(pattern.source_anime),
      pattern.discovered_from
    ]);

    return result.lastID!;
  }

  async getStoredPatterns(category?: string, confidenceThreshold?: number): Promise<EmotionalPattern[]> {
    await this.sqliteDb.initialize();

    let sql = `
      SELECT * FROM emotional_patterns
      WHERE 1=1
    `;
    const params: any[] = [];

    if (category) {
      sql += ` AND emotional_category = ?`;
      params.push(category);
    }

    if (confidenceThreshold) {
      sql += ` AND confidence >= ?`;
      params.push(confidenceThreshold);
    }

    sql += ` ORDER BY confidence DESC, created_at DESC`;

    const rows = await this.sqliteDb.all(sql, params);

    return rows.map(row => ({
      ...row,
      keywords: JSON.parse(row.keywords),
      regex_variants: JSON.parse(row.regex_variants),
      context_words: JSON.parse(row.context_words),
      source_anime: JSON.parse(row.source_anime)
    }));
  }

  async analyzeReviewForPatterns(reviewText: string, knownPatterns?: EmotionalPattern[]): Promise<PatternMatch[]> {
    const patterns = knownPatterns || await this.getStoredPatterns();
    const matches: PatternMatch[] = [];

    for (const pattern of patterns) {
      const keywordMatches = pattern.keywords.filter(keyword =>
        reviewText.toLowerCase().includes(keyword.toLowerCase())
      );

      const regexMatches: string[] = [];
      for (const regexStr of pattern.regex_variants) {
        try {
          const regex = new RegExp(regexStr, 'gi');
          const match = reviewText.match(regex);
          if (match) {
            regexMatches.push(regexStr);
          }
        } catch (error) {
          console.warn(`Invalid regex pattern: ${regexStr}`);
        }
      }

      if (keywordMatches.length > 0 || regexMatches.length > 0) {
        const totalMatches = keywordMatches.length + regexMatches.length;
        const totalPossible = pattern.keywords.length + pattern.regex_variants.length;
        const confidence = (totalMatches / totalPossible) * pattern.confidence;

        matches.push({
          pattern_name: pattern.pattern_name,
          confidence,
          matched_keywords: keywordMatches,
          matched_regex: regexMatches,
          evidence_text: reviewText.substring(0, 200) + '...'
        });
      }
    }

    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  async updatePatternFromEvidence(
    patternName: string,
    newEvidence: { review_text: string; anime_id: number; match_strength: number },
    validation: { validated: boolean; confidenceAdjustment?: number }
  ): Promise<void> {
    await this.sqliteDb.initialize();

    // Get the pattern
    const pattern = await this.sqliteDb.get<EmotionalPattern>(
      'SELECT * FROM emotional_patterns WHERE pattern_name = ?',
      [patternName]
    );

    if (!pattern) {
      throw new Error(`Pattern ${patternName} not found`);
    }

    // Save the evidence
    await this.sqliteDb.run(`
      INSERT INTO pattern_evidence (
        pattern_id, review_text, anime_id, match_strength, validated
      ) VALUES (?, ?, ?, ?, ?)
    `, [
      pattern.id,
      newEvidence.review_text,
      newEvidence.anime_id,
      newEvidence.match_strength,
      validation.validated
    ]);

    // Update pattern confidence if adjustment provided
    if (validation.confidenceAdjustment) {
      const newConfidence = Math.max(0, Math.min(1, pattern.confidence + validation.confidenceAdjustment));
      await this.sqliteDb.run(
        'UPDATE emotional_patterns SET confidence = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [newConfidence, pattern.id]
      );
    }
  }

  async runMassPatternAnalysis(reviewData: Array<{review_text: string, anime_id: number}>, patternFilter?: string): Promise<{
    processedReviews: number;
    patternsFound: Record<string, number>;
    totalMatches: number;
  }> {
    await this.sqliteDb.initialize();

    const patterns = await this.getStoredPatterns(patternFilter, 0.3);
    const results = {
      processedReviews: 0,
      patternsFound: {} as Record<string, number>,
      totalMatches: 0
    };

    console.log(`Starting mass analysis of ${reviewData.length} reviews with ${patterns.length} patterns...`);

    for (const review of reviewData) {
      const matches = await this.analyzeReviewForPatterns(review.review_text, patterns);

      if (matches.length > 0) {
        results.totalMatches += matches.length;

        // Save high-confidence matches as evidence
        for (const match of matches.filter(m => m.confidence > 0.5)) {
          const pattern = patterns.find(p => p.pattern_name === match.pattern_name);
          if (pattern) {
            // Direct insert for mass analysis (more efficient than updatePatternFromEvidence)
            await this.sqliteDb.run(`
              INSERT INTO pattern_evidence (
                pattern_id, review_text, anime_id, match_strength, validated
              ) VALUES (?, ?, ?, ?, ?)
            `, [
              pattern.id,
              review.review_text,
              review.anime_id,
              match.confidence,
              false
            ]);

            results.patternsFound[match.pattern_name] = (results.patternsFound[match.pattern_name] || 0) + 1;
          }
        }
      }

      results.processedReviews++;

      // Progress logging
      if (results.processedReviews % 100 === 0) {
        console.log(`Processed ${results.processedReviews}/${reviewData.length} reviews...`);
      }
    }

    console.log('Mass analysis complete:', results);
    return results;
  }

  async getPatternEvidence(patternName: string, validated?: boolean): Promise<PatternEvidence[]> {
    await this.sqliteDb.initialize();

    let sql = `
      SELECT pe.* FROM pattern_evidence pe
      JOIN emotional_patterns ep ON pe.pattern_id = ep.id
      WHERE ep.pattern_name = ?
    `;
    const params: any[] = [patternName];

    if (validated !== undefined) {
      sql += ` AND pe.validated = ?`;
      params.push(validated);
    }

    sql += ` ORDER BY pe.match_strength DESC, pe.created_at DESC`;

    return this.sqliteDb.all(sql, params);
  }

  async validatePatternEvidence(evidenceId: number, validated: boolean): Promise<void> {
    await this.sqliteDb.initialize();

    await this.sqliteDb.run(
      'UPDATE pattern_evidence SET validated = ? WHERE id = ?',
      [validated, evidenceId]
    );
  }
}