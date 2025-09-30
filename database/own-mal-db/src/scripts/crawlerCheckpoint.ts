import * as fs from 'fs';
import * as path from 'path';

export interface CrawlerProgress {
  startTime: string;
  lastUpdateTime: string;
  totalGenresProcessed: number;
  totalAnimeProcessed: number;
  currentGenre?: {
    id: number;
    name: string;
    currentPage: number;
    totalPagesProcessed: number;
    animeProcessedInGenre: number;
  };
  processedGenres: Array<{
    id: number;
    name: string;
    pagesProcessed: number;
    animeCount: number;
    completedAt: string;
  }>;
  processedAnimeIds: Set<number>;
  errors: Array<{
    timestamp: string;
    type: 'genre_error' | 'anime_error' | 'api_error';
    genreId?: number;
    animeId?: number;
    error: string;
    page?: number;
  }>;
  config: {
    maxPagesPerGenre: number;
    maxGenres: number;
    priorityGenres: string[];
  };
}

export class CrawlerCheckpoint {
  private checkpointFile: string;
  private progress: CrawlerProgress;

  constructor(checkpointDir: string = './crawler-data') {
    // Ensure checkpoint directory exists
    if (!fs.existsSync(checkpointDir)) {
      fs.mkdirSync(checkpointDir, { recursive: true });
    }
    
    this.checkpointFile = path.join(checkpointDir, 'crawler-progress.json');
    this.progress = this.loadProgress();
  }

  private loadProgress(): CrawlerProgress {
    try {
      if (fs.existsSync(this.checkpointFile)) {
        const data = fs.readFileSync(this.checkpointFile, 'utf8');
        const parsed = JSON.parse(data);
        
        // Convert processedAnimeIds array back to Set
        parsed.processedAnimeIds = new Set(parsed.processedAnimeIds || []);
        
        console.log(`📂 Loaded checkpoint: ${parsed.totalAnimeProcessed} anime processed, ${parsed.totalGenresProcessed} genres completed`);
        return parsed;
      }
    } catch (error) {
      console.warn('⚠️ Could not load checkpoint file, starting fresh:', error);
    }

    // Return fresh progress
    return {
      startTime: new Date().toISOString(),
      lastUpdateTime: new Date().toISOString(),
      totalGenresProcessed: 0,
      totalAnimeProcessed: 0,
      processedGenres: [],
      processedAnimeIds: new Set(),
      errors: [],
      config: {
        maxPagesPerGenre: 3,
        maxGenres: 10,
        priorityGenres: []
      }
    };
  }

  private saveProgress(): void {
    try {
      // Convert Set to array for JSON serialization
      const toSave = {
        ...this.progress,
        processedAnimeIds: Array.from(this.progress.processedAnimeIds),
        lastUpdateTime: new Date().toISOString()
      };

      fs.writeFileSync(this.checkpointFile, JSON.stringify(toSave, null, 2));
    } catch (error) {
      console.error('❌ Failed to save checkpoint:', error);
    }
  }

  // Initialize new crawling session
  initializeCrawl(config: { maxPagesPerGenre: number; maxGenres: number; priorityGenres: string[] }): void {
    this.progress.config = config;
    this.progress.startTime = new Date().toISOString();
    this.saveProgress();
    
    console.log(`🚀 Crawler initialized with config:`, config);
    if (this.progress.totalAnimeProcessed > 0) {
      console.log(`📊 Resuming from previous session: ${this.progress.totalAnimeProcessed} anime already processed`);
    }
  }

  // Check if genre should be skipped (already completed)
  shouldSkipGenre(genreId: number): boolean {
    return this.progress.processedGenres.some(g => g.id === genreId);
  }

  // Check if anime should be skipped (already processed)
  shouldSkipAnime(animeId: number): boolean {
    return this.progress.processedAnimeIds.has(animeId);
  }

  // Start processing a genre
  startGenre(genreId: number, genreName: string): void {
    this.progress.currentGenre = {
      id: genreId,
      name: genreName,
      currentPage: 1,
      totalPagesProcessed: 0,
      animeProcessedInGenre: 0
    };
    this.saveProgress();
    
    console.log(`📁 Starting genre: ${genreName} (ID: ${genreId})`);
  }

  // Get the page to resume from for current genre
  getResumePageForGenre(): number {
    return this.progress.currentGenre?.currentPage || 1;
  }

  // Mark page as completed for current genre
  completePageForGenre(page: number, animeProcessed: number): void {
    if (this.progress.currentGenre) {
      this.progress.currentGenre.currentPage = page + 1;
      this.progress.currentGenre.totalPagesProcessed = page;
      this.progress.currentGenre.animeProcessedInGenre += animeProcessed;
    }
    this.saveProgress();
  }

  // Mark anime as processed
  markAnimeProcessed(animeId: number): void {
    this.progress.processedAnimeIds.add(animeId);
    this.progress.totalAnimeProcessed++;
    
    // Save checkpoint every 10 anime to avoid too frequent I/O
    if (this.progress.totalAnimeProcessed % 10 === 0) {
      this.saveProgress();
    }
  }

  // Complete current genre
  completeGenre(): void {
    if (this.progress.currentGenre) {
      this.progress.processedGenres.push({
        id: this.progress.currentGenre.id,
        name: this.progress.currentGenre.name,
        pagesProcessed: this.progress.currentGenre.totalPagesProcessed,
        animeCount: this.progress.currentGenre.animeProcessedInGenre,
        completedAt: new Date().toISOString()
      });
      
      this.progress.totalGenresProcessed++;
      this.progress.currentGenre = undefined;
    }
    this.saveProgress();
  }

  // Log error
  logError(type: 'genre_error' | 'anime_error' | 'api_error', error: string, details?: { genreId?: number; animeId?: number; page?: number }): void {
    this.progress.errors.push({
      timestamp: new Date().toISOString(),
      type,
      error,
      ...details
    });
    
    // Keep only last 100 errors to prevent file from growing too large
    if (this.progress.errors.length > 100) {
      this.progress.errors = this.progress.errors.slice(-100);
    }
    
    this.saveProgress();
  }

  // Get remaining genres to process
  getRemainingGenres(allGenres: Array<{ id: number; name: string }>): Array<{ id: number; name: string }> {
    const processedGenreIds = new Set(this.progress.processedGenres.map(g => g.id));
    return allGenres.filter(genre => !processedGenreIds.has(genre.id));
  }

  // Get progress summary
  getProgressSummary(): {
    totalAnime: number;
    totalGenres: number;
    currentGenre?: string;
    currentPage?: number;
    errors: number;
    duplicatesSkipped: number;
  } {
    return {
      totalAnime: this.progress.totalAnimeProcessed,
      totalGenres: this.progress.totalGenresProcessed,
      currentGenre: this.progress.currentGenre?.name,
      currentPage: this.progress.currentGenre?.currentPage,
      errors: this.progress.errors.length,
      duplicatesSkipped: this.progress.processedAnimeIds.size - this.progress.totalAnimeProcessed
    };
  }

  // Reset checkpoint (start fresh)
  reset(): void {
    this.progress = {
      startTime: new Date().toISOString(),
      lastUpdateTime: new Date().toISOString(),
      totalGenresProcessed: 0,
      totalAnimeProcessed: 0,
      processedGenres: [],
      processedAnimeIds: new Set(),
      errors: [],
      config: {
        maxPagesPerGenre: 3,
        maxGenres: 10,
        priorityGenres: []
      }
    };
    
    if (fs.existsSync(this.checkpointFile)) {
      fs.unlinkSync(this.checkpointFile);
    }
    
    console.log('🔄 Checkpoint reset - starting fresh');
  }

  // Export progress to readable format
  exportProgress(): void {
    const exportFile = this.checkpointFile.replace('.json', '-export.json');
    const exportData = {
      ...this.progress,
      processedAnimeIds: Array.from(this.progress.processedAnimeIds),
      summary: this.getProgressSummary()
    };
    
    fs.writeFileSync(exportFile, JSON.stringify(exportData, null, 2));
    console.log(`📤 Progress exported to: ${exportFile}`);
  }
} 