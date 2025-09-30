import { animeService } from '../services/animeService';
import { Anime, Genre, JikanAnimeResponse, JikanGenreResponse } from '../types/anime';
import { CrawlerCheckpoint } from './crawlerCheckpoint';

// Rate limiter for Jikan API (more conservative to avoid 429 errors)
class RateLimiter {
  private requestTimes: number[] = [];
  private minuteRequestTimes: number[] = [];
  private readonly maxRequestsPerSecond = 2; // Reduced from 3 to 2
  private readonly maxRequestsPerMinute = 60; // Added minute limit
  private readonly secondWindow = 1000; // 1 second in milliseconds
  private readonly minuteWindow = 60000; // 1 minute in milliseconds

  async waitForSlot(): Promise<void> {
    const now = Date.now();
    
    // Remove requests older than 1 second
    this.requestTimes = this.requestTimes.filter(time => now - time < this.secondWindow);
    
    // Remove requests older than 1 minute
    this.minuteRequestTimes = this.minuteRequestTimes.filter(time => now - time < this.minuteWindow);
    
    // Check minute limit first
    if (this.minuteRequestTimes.length >= this.maxRequestsPerMinute) {
      const oldestMinuteRequest = this.minuteRequestTimes[0];
      const waitTime = this.minuteWindow - (now - oldestMinuteRequest) + 100; // +100ms buffer
      console.log(`Minute rate limit reached (${this.maxRequestsPerMinute}/min), waiting ${Math.round(waitTime/1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.waitForSlot(); // Recursive call after waiting
    }
    
    // Check second limit
    if (this.requestTimes.length >= this.maxRequestsPerSecond) {
      const oldestSecondRequest = this.requestTimes[0];
      const waitTime = this.secondWindow - (now - oldestSecondRequest) + 50; // +50ms buffer
      console.log(`Second rate limit reached (${this.maxRequestsPerSecond}/sec), waiting ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.waitForSlot(); // Recursive call after waiting
    }
    
    // If we have room for another request, proceed
    const currentTime = Date.now();
    this.requestTimes.push(currentTime);
    this.minuteRequestTimes.push(currentTime);
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

// Rate-limited fetch function for Jikan API with 429 retry logic
async function fetchWithRateLimit(url: string, retryCount = 0): Promise<Response> {
  await rateLimiter.waitForSlot();
  
  const response = await fetch(url);
  
  // Handle 429 Too Many Requests with exponential backoff
  if (response.status === 429 && retryCount < 3) {
    const backoffTime = Math.pow(2, retryCount) * 2000; // 2s, 4s, 8s
    console.log(`🚫 429 Too Many Requests. Backing off for ${backoffTime/1000}s (attempt ${retryCount + 1}/3)...`);
    await new Promise(resolve => setTimeout(resolve, backoffTime));
    return fetchWithRateLimit(url, retryCount + 1);
  }
  
  return response;
}

// Helper function to extract primary image URL from Jikan's complex image structure
function extractPrimaryImageUrl(images: any): string | null {
  if (!images) return null;
  
  // Priority: large_image_url > image_url > small_image_url
  // Prefer JPG over WEBP for compatibility
  if (images.jpg?.large_image_url) return images.jpg.large_image_url;
  if (images.jpg?.image_url) return images.jpg.image_url;
  if (images.jpg?.small_image_url) return images.jpg.small_image_url;
  if (images.webp?.large_image_url) return images.webp.large_image_url;
  if (images.webp?.image_url) return images.webp.image_url;
  if (images.webp?.small_image_url) return images.webp.small_image_url;
  
  return null;
}

// Convert Jikan API response to our Anime type
function transformJikanAnime(jikanAnime: any): Anime {
  return {
    mal_id: jikanAnime.mal_id,
    title: jikanAnime.title || '',
    title_english: jikanAnime.title_english || null,
    title_japanese: jikanAnime.title_japanese || null,
    title_synonyms: jikanAnime.title_synonyms || [],
    image_url: extractPrimaryImageUrl(jikanAnime.images),
    type: jikanAnime.type as Anime['type'],
    source: jikanAnime.source || null,
    episodes: jikanAnime.episodes || null,
    status: jikanAnime.status as Anime['status'],
    airing: jikanAnime.airing || false,
    aired_from: jikanAnime.aired?.from ? new Date(jikanAnime.aired.from) : null,
    aired_to: jikanAnime.aired?.to ? new Date(jikanAnime.aired.to) : null,
    duration: jikanAnime.duration || null,
    rating: jikanAnime.rating || null,
    score: jikanAnime.score || null,
    scored_by: jikanAnime.scored_by || null,
    rank: jikanAnime.rank || null,
    popularity: jikanAnime.popularity || null,
    members: jikanAnime.members || null,
    favorites: jikanAnime.favorites || null,
    synopsis: jikanAnime.synopsis || null,
    background: jikanAnime.background || null,
    season: jikanAnime.season as Anime['season'],
    year: jikanAnime.year || (jikanAnime.aired?.prop?.from?.year) || null,
    images: jikanAnime.images || null,
    trailer: jikanAnime.trailer || null,
    broadcast: jikanAnime.broadcast || null,
    statistics: null // Will be fetched separately if needed
  };
}

// Fetch and store all genres first
async function fetchAndStoreGenres(checkpoint: CrawlerCheckpoint): Promise<Genre[]> {
  console.log('Fetching genres from Jikan API...');
  
  try {
    const response = await fetchWithRateLimit('https://api.jikan.moe/v4/genres/anime');
    
    if (!response.ok) {
      const error = `Failed to fetch genres: ${response.status} ${response.statusText}`;
      checkpoint.logError('api_error', error);
      throw new Error(error);
    }
    
    const data = await response.json() as JikanGenreResponse;
    const genres: Genre[] = data.data.map(g => ({
      id: g.mal_id,
      name: g.name,
      url: g.url,
      count: g.count
    }));
    
    console.log(`Found ${genres.length} genres. Storing in database...`);
    
    // Store genres in database
    for (const genre of genres) {
      await animeService.upsertGenre(genre);
    }
    
    console.log('Genres stored successfully!');
    return genres;
    
  } catch (error) {
    console.error('Error fetching genres:', error);
    checkpoint.logError('api_error', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Fetch anime by genre with pagination and checkpoint support
async function fetchAnimeByGenre(
  genreId: number, 
  genreName: string, 
  maxPages: number,
  checkpoint: CrawlerCheckpoint
): Promise<number> {
  console.log(`\n=== Fetching anime for genre: ${genreName} (ID: ${genreId}) ===`);
  
  // Check if this genre should be skipped
  if (checkpoint.shouldSkipGenre(genreId)) {
    console.log(`⏭️ Skipping genre ${genreName} - already completed`);
    return 0;
  }
  
  // Start or resume genre processing
  checkpoint.startGenre(genreId, genreName);
  
  let totalFetched = 0;
  let page = checkpoint.getResumePageForGenre();
  let hasNextPage = true;
  
  console.log(`📄 Starting from page ${page} for genre ${genreName}`);
  
  while (hasNextPage && page <= maxPages) {
    try {
      console.log(`Fetching page ${page} for genre ${genreName}...`);
      
      const url = `https://api.jikan.moe/v4/anime?genres=${genreId}&page=${page}&limit=25&order_by=score&sort=desc`;
      const response = await fetchWithRateLimit(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log(`No more pages for genre ${genreName}`);
          break;
        }
        const error = `Failed to fetch anime: ${response.status} ${response.statusText}`;
        checkpoint.logError('api_error', error, { genreId, page });
        throw new Error(error);
      }
      
      const data = await response.json() as JikanAnimeResponse;
      
      if (!data.data || data.data.length === 0) {
        console.log(`No anime found on page ${page} for genre ${genreName}`);
        break;
      }
      
      console.log(`Processing ${data.data.length} anime from page ${page}...`);
      
      let pageProcessed = 0;
      
      // Process each anime
      for (const jikanAnime of data.data) {
        try {
          // Check if anime should be skipped (already processed)
          if (checkpoint.shouldSkipAnime(jikanAnime.mal_id)) {
            console.log(`⏭️ Skipping anime ${jikanAnime.mal_id} (${jikanAnime.title}) - already processed`);
            continue;
          }
          
          const anime = transformJikanAnime(jikanAnime);
          await animeService.upsertAnime(anime);
          
          // Store genre relationships
          await storeAnimeGenreRelationships(anime.mal_id, jikanAnime, checkpoint);
          
          // Mark as processed in checkpoint
          checkpoint.markAnimeProcessed(anime.mal_id);
          
          totalFetched++;
          pageProcessed++;
          
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          console.error(`Error processing anime ${jikanAnime.mal_id}:`, errorMsg);
          checkpoint.logError('anime_error', errorMsg, { genreId, animeId: jikanAnime.mal_id, page });
          
          // Continue with next anime instead of failing the whole page
        }
      }
      
      // Mark page as completed
      checkpoint.completePageForGenre(page, pageProcessed);
      
      // Check if there's a next page
      hasNextPage = data.pagination?.has_next_page || false;
      page++;
      
      console.log(`✅ Completed page ${page - 1}. Processed: ${pageProcessed} anime. Total for ${genreName}: ${totalFetched}`);
      
      // Show progress summary every few pages
      if (page % 3 === 0) {
        const summary = checkpoint.getProgressSummary();
        console.log(`📊 Progress: ${summary.totalAnime} anime, ${summary.totalGenres} genres, ${summary.duplicatesSkipped} duplicates skipped`);
      }
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`Error fetching page ${page} for genre ${genreName}:`, errorMsg);
      checkpoint.logError('genre_error', errorMsg, { genreId, page });
      
      // Continue with next page on error
      page++;
    }
  }
  
  // Complete the genre
  checkpoint.completeGenre();
  console.log(`✅ Completed genre ${genreName}. Total anime fetched: ${totalFetched}`);
  return totalFetched;
}

// Store anime-genre relationships from Jikan data with error handling
async function storeAnimeGenreRelationships(animeId: number, jikanAnime: any, checkpoint: CrawlerCheckpoint): Promise<void> {
  try {
    const db = await import('../database/connection').then(m => m.db);
    
    // Clear existing relationships for this anime
    await db.query('DELETE FROM anime_genres WHERE anime_id = $1', [animeId]);
    
    // Store genre relationships
    if (jikanAnime.genres && jikanAnime.genres.length > 0) {
      for (const genre of jikanAnime.genres) {
        await db.query(
          'INSERT INTO anime_genres (anime_id, genre_id, genre_type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [animeId, genre.mal_id, 'genre']
        );
      }
    }
    
    // Store theme relationships
    if (jikanAnime.themes && jikanAnime.themes.length > 0) {
      for (const theme of jikanAnime.themes) {
        await db.query(
          'INSERT INTO anime_genres (anime_id, genre_id, genre_type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [animeId, theme.mal_id, 'theme']
        );
      }
    }
    
    // Store demographic relationships
    if (jikanAnime.demographics && jikanAnime.demographics.length > 0) {
      for (const demo of jikanAnime.demographics) {
        await db.query(
          'INSERT INTO anime_genres (anime_id, genre_id, genre_type) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [animeId, demo.mal_id, 'demographic']
        );
      }
    }
    
    // Store studio relationships
    if (jikanAnime.studios && jikanAnime.studios.length > 0) {
      for (const studio of jikanAnime.studios) {
        // First ensure studio exists
        await db.query(
          'INSERT INTO studios (id, name, url, type) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, url = EXCLUDED.url',
          [studio.mal_id, studio.name, studio.url, 'studio']
        );
        
        // Then create relationship
        await db.query(
          'INSERT INTO anime_studios (anime_id, studio_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
          [animeId, studio.mal_id, 'studio']
        );
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    checkpoint.logError('anime_error', `Failed to store relationships for anime ${animeId}: ${errorMsg}`, { animeId });
    throw error;
  }
}

// Main crawler function with checkpoint support
async function crawlAnimeData(): Promise<void> {
  console.log('🚀 Starting anime data crawling from Jikan API...');
  
  // Initialize checkpoint system
  const checkpoint = new CrawlerCheckpoint();
  
  try {
    // Configuration
    const maxPagesPerGenre = parseInt(process.env.MAX_PAGES_PER_GENRE || '3');
    const maxGenres = parseInt(process.env.MAX_GENRES || '10');
    const priorityGenres = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Romance', 'Sci-Fi', 'Thriller', 'Mystery', 'Horror'];
    
    // Initialize crawler with config
    checkpoint.initializeCrawl({
      maxPagesPerGenre,
      maxGenres,
      priorityGenres
    });
    
    console.log(`\nCrawling anime data with limits:`);
    console.log(`- Max pages per genre: ${maxPagesPerGenre}`);
    console.log(`- Max genres to process: ${maxGenres}`);
    
    // Step 1: Fetch and store all genres
    const genres = await fetchAndStoreGenres(checkpoint);
    
    // Step 2: Get remaining genres to process
    const remainingGenres = checkpoint.getRemainingGenres(genres);
    
    // Filter to priority genres first, then others
    const priorityGenresList = remainingGenres
      .filter(g => priorityGenres.includes(g.name))
      .slice(0, maxGenres);
    
    const additionalGenres = remainingGenres
      .filter(g => !priorityGenres.includes(g.name))
      .slice(0, Math.max(0, maxGenres - priorityGenresList.length));
    
    const genresToProcess = [...priorityGenresList, ...additionalGenres];
    
    console.log(`\n📋 Genres to process: ${genresToProcess.map(g => g.name).join(', ')}`);
    
    if (genresToProcess.length === 0) {
      console.log('🎉 All genres already processed!');
      checkpoint.exportProgress();
      return;
    }
    
    let totalAnime = 0;
    
    // Process each genre
    for (const genre of genresToProcess) {
      try {
        const fetchedCount = await fetchAnimeByGenre(genre.id, genre.name, maxPagesPerGenre, checkpoint);
        totalAnime += fetchedCount;
        
        // Small delay between genres
        await new Promise(resolve => setTimeout(resolve, 2000));
        
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`Failed to process genre ${genre.name}:`, errorMsg);
        checkpoint.logError('genre_error', `Failed to process genre ${genre.name}: ${errorMsg}`, { genreId: genre.id });
        
        // Continue with next genre
      }
    }
    
    // Final summary
    const summary = checkpoint.getProgressSummary();
    console.log(`\n✅ Crawling completed!`);
    console.log(`- Total anime processed: ${summary.totalAnime}`);
    console.log(`- Total genres completed: ${summary.totalGenres}`);
    console.log(`- Duplicates skipped: ${summary.duplicatesSkipped}`);
    console.log(`- Errors encountered: ${summary.errors}`);
    
    // Export progress for review
    checkpoint.exportProgress();
    
  } catch (error) {
    console.error('❌ Crawling failed:', error);
    checkpoint.logError('api_error', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Run crawler if this file is executed directly
if (require.main === module) {
  crawlAnimeData()
    .then(() => {
      console.log('Crawler finished successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Crawler failed:', error);
      process.exit(1);
    });
}

export { crawlAnimeData, fetchAndStoreGenres }; 