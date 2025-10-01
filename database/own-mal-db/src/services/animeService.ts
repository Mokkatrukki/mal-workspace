import { db } from '../database/connection';
import { Anime, AnimeWithRelations, SearchParams, SearchResult, Genre, CleanAnime, CleanSearchResult, SearchCapabilities } from '../types/anime';

// Utility function to extract primary image URL from images object
function extractPrimaryImageUrl(images: any): string | null {
  if (!images) return null;
  
  // Try different image formats in order of preference
  if (images.jpg?.image_url) return images.jpg.image_url;
  if (images.webp?.image_url) return images.webp.image_url;
  if (images.jpg?.large_image_url) return images.jpg.large_image_url;
  if (images.webp?.large_image_url) return images.webp.large_image_url;
  
  return null;
}

// Utility function to clean anime data for LLM consumption (compact version)
function cleanAnimeData(anime: AnimeWithRelations): CleanAnime {
  return {
    mal_id: anime.mal_id,
    title: anime.title || null,
    title_english: anime.title_english || null,
    title_japanese: anime.title_japanese || null,
    image_url: anime.image_url || extractPrimaryImageUrl(anime.images),
    score: anime.score || null,
    scored_by: anime.scored_by || null,
    rank: anime.rank || null,
    popularity: anime.popularity || null,
    members: anime.members || null,
    favorites: anime.favorites || null,
    synopsis: anime.synopsis ? (anime.synopsis.length > 300 ? anime.synopsis.substring(0, 300) + '...' : anime.synopsis) : null,
    episodes: anime.episodes || null,
    duration: anime.duration || null,
    year: anime.year || null,
    season: anime.season || null,
    status: anime.status || null,
    rating: anime.rating || null,
    source: anime.source || null,
    type: anime.type || null,
    genres: (anime.genres || []).map(g => g.name).join(', ') || null,
    studios: (anime.studios || []).map(s => s.name).join(', ') || null,
    themes: (anime.themes || []).map(t => t.name).join(', ') || null,
    demographics: (anime.demographics || []).map(d => d.name).join(', ') || null,
    url: `https://myanimelist.net/anime/${anime.mal_id}`
  };
}

// Ultra-compact version for MCP tools
function ultraCompactAnimeData(anime: AnimeWithRelations) {
  return {
    id: anime.mal_id,
    title: anime.title,
    type: anime.type || 'N/A', // TV, Movie, OVA, Special, ONA, Music
    score: anime.score || 'N/A',
    year: anime.year || 'N/A',
    episodes: anime.episodes || 'N/A',
    status: anime.status || 'Unknown',
    genres: (anime.genres || []).slice(0, 3).map(g => g.name).join(', ') || 'N/A',
    themes: (anime.themes || []).slice(0, 2).map(t => t.name).join(', ') || null,
    demographics: (anime.demographics || []).map(d => d.name).join(', ') || null,
    studio: (anime.studios || [])[0]?.name || null, // Just first studio to save space
    url: `https://myanimelist.net/anime/${anime.mal_id}`
  };
}

export class AnimeService {
  
  // Get anime by MAL ID with all relations
  async getAnimeById(malId: number): Promise<AnimeWithRelations | null> {
    const query = `
      SELECT 
        a.*,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', g.id,
              'name', g.name,
              'url', g.url
            )
          ) FILTER (WHERE g.id IS NOT NULL AND ag.genre_type = 'genre'),
          '[]'::json
        ) as genres,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', gt.id,
              'name', gt.name,
              'url', gt.url
            )
          ) FILTER (WHERE gt.id IS NOT NULL AND agt.genre_type = 'theme'),
          '[]'::json
        ) as themes,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', gd.id,
              'name', gd.name,
              'url', gd.url
            )
          ) FILTER (WHERE gd.id IS NOT NULL AND agd.genre_type = 'demographic'),
          '[]'::json
        ) as demographics,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', s.id,
              'name', s.name,
              'url', s.url
            )
          ) FILTER (WHERE s.id IS NOT NULL AND asu.role = 'studio'),
          '[]'::json
        ) as studios,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', p.id,
              'name', p.name,
              'url', p.url
            )
          ) FILTER (WHERE p.id IS NOT NULL AND asp.role = 'producer'),
          '[]'::json
        ) as producers,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', l.id,
              'name', l.name,
              'url', l.url
            )
          ) FILTER (WHERE l.id IS NOT NULL AND asl.role = 'licensor'),
          '[]'::json
        ) as licensors
      FROM anime a
      LEFT JOIN anime_genres ag ON a.mal_id = ag.anime_id AND ag.genre_type = 'genre'
      LEFT JOIN genres g ON ag.genre_id = g.id
      LEFT JOIN anime_genres agt ON a.mal_id = agt.anime_id AND agt.genre_type = 'theme'
      LEFT JOIN genres gt ON agt.genre_id = gt.id
      LEFT JOIN anime_genres agd ON a.mal_id = agd.anime_id AND agd.genre_type = 'demographic'
      LEFT JOIN genres gd ON agd.genre_id = gd.id
      LEFT JOIN anime_studios asu ON a.mal_id = asu.anime_id AND asu.role = 'studio'
      LEFT JOIN studios s ON asu.studio_id = s.id
      LEFT JOIN anime_studios asp ON a.mal_id = asp.anime_id AND asp.role = 'producer'
      LEFT JOIN studios p ON asp.studio_id = p.id
      LEFT JOIN anime_studios asl ON a.mal_id = asl.anime_id AND asl.role = 'licensor'
      LEFT JOIN studios l ON asl.studio_id = l.id
      WHERE a.mal_id = $1
      GROUP BY a.mal_id
    `;

    const result = await db.query(query, [malId]);
    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      ...row,
      url: `https://myanimelist.net/anime/${row.mal_id}`
    };
  }

  // Search anime with filters and pagination
  async searchAnime(params: SearchParams): Promise<SearchResult> {
    const {
      query,
      genres,
      min_score,
      max_score,
      year,
      min_year,
      max_year,
      decade,
      min_popularity,
      max_popularity,
      exclude_very_popular,
      airing_status,
      current_year_only,
      season,
      min_episodes,
      max_episodes,
      type,
      order_by = 'mal_id',
      sort = 'desc',
      sfw = true,
      page = 1,
      limit = 25
    } = params;

    let whereConditions: string[] = [];
    let queryParams: any[] = [];
    let paramCounter = 1;
    
    // Map API parameter names to actual database column names
    const columnMapping: { [key: string]: string } = {
      'start_date': 'aired_from',
      'end_date': 'aired_to'
    };
    
    const dbColumn = columnMapping[order_by] || order_by;
    let orderByClause = `a.${dbColumn} ${sort.toUpperCase()}`;

    // Smart text search with title prioritization
    if (query) {
      // Create a relevance score that prioritizes title matches
      const relevanceScore = `
        CASE 
          -- Exact title match (highest priority)
          WHEN LOWER(a.title) = LOWER($${paramCounter}) THEN 1000
          WHEN LOWER(a.title_english) = LOWER($${paramCounter}) THEN 1000
          WHEN LOWER(a.title_japanese) = LOWER($${paramCounter}) THEN 1000
          
          -- Title starts with query (high priority)
          WHEN LOWER(a.title) LIKE LOWER($${paramCounter}) || '%' THEN 900
          WHEN LOWER(a.title_english) LIKE LOWER($${paramCounter}) || '%' THEN 900
          
          -- Title contains query (medium-high priority)
          WHEN LOWER(a.title) LIKE '%' || LOWER($${paramCounter}) || '%' THEN 800
          WHEN LOWER(a.title_english) LIKE '%' || LOWER($${paramCounter}) || '%' THEN 800
          
          -- Full-text search match in title fields (medium priority)
          WHEN to_tsvector('english', COALESCE(a.title, '') || ' ' || COALESCE(a.title_english, '') || ' ' || COALESCE(a.title_japanese, '')) @@ plainto_tsquery('english', $${paramCounter}) THEN 700
          
          -- Full-text search match in synopsis (lower priority)
          WHEN a.search_vector @@ plainto_tsquery('english', $${paramCounter}) THEN 600
          
          -- No match
          ELSE 0
        END
      `;

      whereConditions.push(`(
        LOWER(a.title) = LOWER($${paramCounter}) OR
        LOWER(a.title_english) = LOWER($${paramCounter}) OR
        LOWER(a.title_japanese) = LOWER($${paramCounter}) OR
        LOWER(a.title) LIKE LOWER($${paramCounter}) || '%' OR
        LOWER(a.title_english) LIKE LOWER($${paramCounter}) || '%' OR
        LOWER(a.title) LIKE '%' || LOWER($${paramCounter}) || '%' OR
        LOWER(a.title_english) LIKE '%' || LOWER($${paramCounter}) || '%' OR
        to_tsvector('english', COALESCE(a.title, '') || ' ' || COALESCE(a.title_english, '') || ' ' || COALESCE(a.title_japanese, '')) @@ plainto_tsquery('english', $${paramCounter}) OR
        a.search_vector @@ plainto_tsquery('english', $${paramCounter})
      )`);

      // Override order by to use relevance score when searching
      orderByClause = `(${relevanceScore}) DESC, a.popularity ASC, a.${dbColumn} ${sort.toUpperCase()}`;
      
      queryParams.push(query);
      paramCounter++;
    }

    // Genre filtering
    if (genres) {
      const genreIds = genres.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (genreIds.length > 0) {
        whereConditions.push(`a.mal_id IN (
          SELECT ag.anime_id 
          FROM anime_genres ag 
          WHERE ag.genre_id = ANY($${paramCounter})
        )`);
        queryParams.push(genreIds);
        paramCounter++;
      }
    }

    // Score filtering
    if (min_score !== undefined) {
      whereConditions.push(`a.score >= $${paramCounter}`);
      queryParams.push(min_score);
      paramCounter++;
    }

    if (max_score !== undefined) {
      whereConditions.push(`a.score <= $${paramCounter}`);
      queryParams.push(max_score);
      paramCounter++;
    }

    // Year filtering
    if (year !== undefined) {
      whereConditions.push(`a.year = $${paramCounter}`);
      queryParams.push(year);
      paramCounter++;
    }

    if (min_year !== undefined) {
      whereConditions.push(`a.year >= $${paramCounter}`);
      queryParams.push(min_year);
      paramCounter++;
    }

    if (max_year !== undefined) {
      whereConditions.push(`a.year <= $${paramCounter}`);
      queryParams.push(max_year);
      paramCounter++;
    }

    // Decade filtering (e.g., "1990s", "2000s")
    if (decade) {
      const decadeYear = parseInt(decade.replace('s', ''));
      if (!isNaN(decadeYear)) {
        whereConditions.push(`a.year >= $${paramCounter} AND a.year < $${paramCounter + 1}`);
        queryParams.push(decadeYear, decadeYear + 10);
        paramCounter += 2;
      }
    }

    // Current year filtering
    if (current_year_only) {
      const currentYear = new Date().getFullYear();
      whereConditions.push(`a.year = $${paramCounter}`);
      queryParams.push(currentYear);
      paramCounter++;
    }

    // Popularity filtering
    if (min_popularity !== undefined) {
      whereConditions.push(`a.popularity >= $${paramCounter}`);
      queryParams.push(min_popularity);
      paramCounter++;
    }

    if (max_popularity !== undefined) {
      whereConditions.push(`a.popularity <= $${paramCounter}`);
      queryParams.push(max_popularity);
      paramCounter++;
    }

    // Exclude very popular anime (top 100)
    if (exclude_very_popular) {
      whereConditions.push(`(a.popularity IS NULL OR a.popularity > 100)`);
    }

    // Airing status filtering
    if (airing_status) {
      switch (airing_status) {
        case 'airing':
          whereConditions.push(`a.status = 'Currently Airing'`);
          break;
        case 'finished':
          whereConditions.push(`a.status = 'Finished Airing'`);
          break;
        case 'upcoming':
          whereConditions.push(`a.status = 'Not yet aired'`);
          break;
      }
    }

    // Season filtering - use existing database field
    if (season) {
      whereConditions.push(`a.season = $${paramCounter}`);
      queryParams.push(season);
      paramCounter++;
    }

    // Episode count filtering
    if (min_episodes !== undefined) {
      whereConditions.push(`a.episodes >= $${paramCounter}`);
      queryParams.push(min_episodes);
      paramCounter++;
    }

    if (max_episodes !== undefined) {
      whereConditions.push(`a.episodes <= $${paramCounter}`);
      queryParams.push(max_episodes);
      paramCounter++;
    }

    // Type filtering
    if (type) {
      whereConditions.push(`a.type = $${paramCounter}`);
      queryParams.push(type);
      paramCounter++;
    }

    // SFW filtering (exclude explicit content)
    if (sfw) {
      whereConditions.push(`a.mal_id NOT IN (
        SELECT ag.anime_id 
        FROM anime_genres ag 
        JOIN genres g ON ag.genre_id = g.id 
        WHERE g.name IN ('Hentai', 'Erotica')
      )`);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Count total results
    const countQuery = `
      SELECT COUNT(*) as total
      FROM anime a
      ${whereClause}
    `;
    const countResult = await db.query(countQuery, queryParams);
    const totalCount = parseInt(countResult.rows[0].total);

    // Calculate pagination
    const offset = (page - 1) * limit;
    const totalPages = Math.ceil(totalCount / limit);

    // Main query with relations
    const searchQuery = `
      SELECT 
        a.*,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', g.id,
              'name', g.name
            )
          ) FILTER (WHERE g.id IS NOT NULL AND ag.genre_type = 'genre'),
          '[]'::json
        ) as genres,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', gt.id,
              'name', gt.name
            )
          ) FILTER (WHERE gt.id IS NOT NULL AND agt.genre_type = 'theme'),
          '[]'::json
        ) as themes,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', gd.id,
              'name', gd.name
            )
          ) FILTER (WHERE gd.id IS NOT NULL AND agd.genre_type = 'demographic'),
          '[]'::json
        ) as demographics,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', s.id,
              'name', s.name
            )
          ) FILTER (WHERE s.id IS NOT NULL AND asu.role = 'studio'),
          '[]'::json
        ) as studios,
        COALESCE(
          array_agg(DISTINCT p.name) FILTER (WHERE p.id IS NOT NULL AND asp.role = 'producer'),
          ARRAY[]::text[]
        ) as producer_names,
        COALESCE(
          array_agg(DISTINCT l.name) FILTER (WHERE l.id IS NOT NULL AND asl.role = 'licensor'),
          ARRAY[]::text[]
        ) as licensor_names
      FROM anime a
      LEFT JOIN anime_genres ag ON a.mal_id = ag.anime_id AND ag.genre_type = 'genre'
      LEFT JOIN genres g ON ag.genre_id = g.id
      LEFT JOIN anime_genres agt ON a.mal_id = agt.anime_id AND agt.genre_type = 'theme'
      LEFT JOIN genres gt ON agt.genre_id = gt.id
      LEFT JOIN anime_genres agd ON a.mal_id = agd.anime_id AND agd.genre_type = 'demographic'
      LEFT JOIN genres gd ON agd.genre_id = gd.id
      LEFT JOIN anime_studios asu ON a.mal_id = asu.anime_id AND asu.role = 'studio'
      LEFT JOIN studios s ON asu.studio_id = s.id
      LEFT JOIN anime_studios asp ON a.mal_id = asp.anime_id AND asp.role = 'producer'
      LEFT JOIN studios p ON asp.studio_id = p.id
      LEFT JOIN anime_studios asl ON a.mal_id = asl.anime_id AND asl.role = 'licensor'
      LEFT JOIN studios l ON asl.studio_id = l.id
      ${whereClause}
      GROUP BY a.mal_id
      ORDER BY ${orderByClause}
      LIMIT $${paramCounter} OFFSET $${paramCounter + 1}
    `;

    queryParams.push(limit, offset);
    const result = await db.query(searchQuery, queryParams);

    const results: AnimeWithRelations[] = result.rows.map(row => ({
      ...row,
      producers: (row.producer_names || []).map((name: string, index: number) => ({
        id: index + 1, // Temporary ID, should be actual producer ID in production
        name
      })),
      licensors: (row.licensor_names || []).map((name: string, index: number) => ({
        id: index + 1, // Temporary ID, should be actual licensor ID in production
        name
      })),
      url: `https://myanimelist.net/anime/${row.mal_id}`
    }));

    return {
      total_results: totalCount,
      showing: results.length,
      current_page: page,
      last_page: totalPages,
      has_next_page: page < totalPages,
      items_per_page: limit,
      results
    };
  }

  // Insert or update anime data
  async upsertAnime(anime: Anime): Promise<void> {
    const query = `
      INSERT INTO anime (
        mal_id, title, title_english, title_japanese, title_synonyms,
        image_url, type, source, episodes, status, airing,
        aired_from, aired_to, duration, rating, score, scored_by,
        rank, popularity, members, favorites, synopsis, background,
        season, year, images, trailer, broadcast, statistics, last_scraped
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, NOW()
      )
      ON CONFLICT (mal_id) DO UPDATE SET
        title = EXCLUDED.title,
        title_english = EXCLUDED.title_english,
        title_japanese = EXCLUDED.title_japanese,
        title_synonyms = EXCLUDED.title_synonyms,
        image_url = EXCLUDED.image_url,
        type = EXCLUDED.type,
        source = EXCLUDED.source,
        episodes = EXCLUDED.episodes,
        status = EXCLUDED.status,
        airing = EXCLUDED.airing,
        aired_from = EXCLUDED.aired_from,
        aired_to = EXCLUDED.aired_to,
        duration = EXCLUDED.duration,
        rating = EXCLUDED.rating,
        score = EXCLUDED.score,
        scored_by = EXCLUDED.scored_by,
        rank = EXCLUDED.rank,
        popularity = EXCLUDED.popularity,
        members = EXCLUDED.members,
        favorites = EXCLUDED.favorites,
        synopsis = EXCLUDED.synopsis,
        background = EXCLUDED.background,
        season = EXCLUDED.season,
        year = EXCLUDED.year,
        images = EXCLUDED.images,
        trailer = EXCLUDED.trailer,
        broadcast = EXCLUDED.broadcast,
        statistics = EXCLUDED.statistics,
        last_scraped = NOW(),
        updated_at = NOW()
    `;

    const values = [
      anime.mal_id,
      anime.title,
      anime.title_english,
      anime.title_japanese,
      anime.title_synonyms,
      anime.image_url,
      anime.type,
      anime.source,
      anime.episodes,
      anime.status,
      anime.airing,
      anime.aired_from,
      anime.aired_to,
      anime.duration,
      anime.rating,
      anime.score,
      anime.scored_by,
      anime.rank,
      anime.popularity,
      anime.members,
      anime.favorites,
      anime.synopsis,
      anime.background,
      anime.season,
      anime.year,
      JSON.stringify(anime.images),
      JSON.stringify(anime.trailer),
      JSON.stringify(anime.broadcast),
      JSON.stringify(anime.statistics)
    ];

    await db.query(query, values);
  }

  // Get all genres
  async getAllGenres(): Promise<Genre[]> {
    const query = `
      SELECT id, name, url, count, type
      FROM genres
      ORDER BY type, name
    `;
    const result = await db.query(query);
    return result.rows;
  }

  // Upsert genre
  async upsertGenre(genre: Genre & { type?: string }): Promise<void> {
    // First, try to update by name (genre names are the real identifier)
    // This handles when IDs change in the Jikan API
    const query = `
      INSERT INTO genres (id, name, url, count, type)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (name) DO UPDATE SET
        url = EXCLUDED.url,
        count = EXCLUDED.count,
        type = EXCLUDED.type,
        updated_at = NOW()
    `;

    await db.query(query, [
      genre.id,
      genre.name,
      genre.url,
      genre.count || 0,
      genre.type || 'genre'
    ]);
  }

  // Get anime count by genre
  async getAnimeCountByGenre(): Promise<{ genre_name: string; count: number }[]> {
    const query = `
      SELECT g.name as genre_name, COUNT(ag.anime_id) as count
      FROM genres g
      LEFT JOIN anime_genres ag ON g.id = ag.genre_id
      GROUP BY g.id, g.name
      ORDER BY count DESC
    `;
    const result = await db.query(query);
    return result.rows;
  }

  // Get top anime by score
  async getTopAnime(limit: number = 50): Promise<AnimeWithRelations[]> {
    return this.searchAnime({
      order_by: 'score',
      sort: 'desc',
      limit,
      sfw: true
    }).then(result => result.results);
  }

  // Clean data methods for LLM consumption

  // Get clean anime by MAL ID
  async getCleanAnimeById(malId: number): Promise<CleanAnime | null> {
    const anime = await this.getAnimeById(malId);
    if (!anime) return null;
    return cleanAnimeData(anime);
  }

  // Search anime with clean data format
  async searchCleanAnime(params: SearchParams): Promise<CleanSearchResult> {
    const result = await this.searchAnime(params);
    
    return {
      total_results: result.total_results,
      showing: result.showing,
      current_page: result.current_page,
      last_page: result.last_page,
      has_next_page: result.has_next_page,
      items_per_page: result.items_per_page,
      results: result.results.map(anime => cleanAnimeData(anime))
    };
  }

  // Get top anime with clean data format
  async getTopCleanAnime(limit: number = 50): Promise<CleanAnime[]> {
    const topAnime = await this.getTopAnime(limit);
    return topAnime.map(anime => cleanAnimeData(anime));
  }

  // Ultra-compact search for MCP tools
  async getCompactSearch(params: SearchParams): Promise<any[]> {
    const result = await this.searchAnime({ ...params, limit: Math.min(params.limit || 10, 15) });
    return result.results.map(anime => ultraCompactAnimeData(anime));
  }

  // Get current season anime using actual database season field
  async getCurrentSeasonAnime(limit: number = 25): Promise<any[]> {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    // Determine current season
    let season: 'winter' | 'spring' | 'summer' | 'fall';
    if (currentMonth >= 3 && currentMonth <= 5) {
      season = 'spring';
    } else if (currentMonth >= 6 && currentMonth <= 8) {
      season = 'summer';
    } else if (currentMonth >= 9 && currentMonth <= 11) {
      season = 'fall';
    } else {
      season = 'winter';
    }

    const result = await this.searchAnime({
      year: currentYear,
      season,
      airing_status: 'airing',
      limit,
      order_by: 'popularity',
      sort: 'asc'
    });

    return result.results.map(anime => ultraCompactAnimeData(anime));
  }

  // Get seasonal recommendations using database season field
  async getSeasonalRecommendations(year?: number, season?: string, limit: number = 20): Promise<any> {
    const currentDate = new Date();
    const targetYear = year || currentDate.getFullYear();
    let targetSeason = season as 'winter' | 'spring' | 'summer' | 'fall' | undefined;

    if (!targetSeason) {
      const currentMonth = currentDate.getMonth() + 1;
      if (currentMonth >= 3 && currentMonth <= 5) {
        targetSeason = 'spring';
      } else if (currentMonth >= 6 && currentMonth <= 8) {
        targetSeason = 'summer';
      } else if (currentMonth >= 9 && currentMonth <= 11) {
        targetSeason = 'fall';
      } else {
        targetSeason = 'winter';
      }
    }

    const searchParams: SearchParams = {
      year: targetYear,
      season: targetSeason,
      limit,
      min_score: 6.0,
      order_by: 'score',
      sort: 'desc'
    };

    const result = await this.searchAnime(searchParams);

    return {
      season_info: {
        year: targetYear,
        season: targetSeason,
        total_anime_found: result.total_results
      },
      recommendations: result.results.map(anime => ultraCompactAnimeData(anime))
    };
  }

  // Bulk get anime by MAL IDs (for MCP tools with many anime IDs)
  async getBulkAnimeByIds(malIds: number[], compact: boolean = false): Promise<any[]> {
    if (malIds.length === 0) {
      return [];
    }

    // Limit to prevent overwhelming queries
    const limitedIds = malIds.slice(0, 100);

    const query = `
      SELECT
        a.*,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', g.id,
              'name', g.name
            )
          ) FILTER (WHERE g.id IS NOT NULL AND ag.genre_type = 'genre'),
          '[]'::json
        ) as genres,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', gt.id,
              'name', gt.name
            )
          ) FILTER (WHERE gt.id IS NOT NULL AND agt.genre_type = 'theme'),
          '[]'::json
        ) as themes,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', gd.id,
              'name', gd.name
            )
          ) FILTER (WHERE gd.id IS NOT NULL AND agd.genre_type = 'demographic'),
          '[]'::json
        ) as demographics,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', s.id,
              'name', s.name
            )
          ) FILTER (WHERE s.id IS NOT NULL AND asu.role = 'studio'),
          '[]'::json
        ) as studios
      FROM anime a
      LEFT JOIN anime_genres ag ON a.mal_id = ag.anime_id AND ag.genre_type = 'genre'
      LEFT JOIN genres g ON ag.genre_id = g.id
      LEFT JOIN anime_genres agt ON a.mal_id = agt.anime_id AND agt.genre_type = 'theme'
      LEFT JOIN genres gt ON agt.genre_id = gt.id
      LEFT JOIN anime_genres agd ON a.mal_id = agd.anime_id AND agd.genre_type = 'demographic'
      LEFT JOIN genres gd ON agd.genre_id = gd.id
      LEFT JOIN anime_studios asu ON a.mal_id = asu.anime_id AND asu.role = 'studio'
      LEFT JOIN studios s ON asu.studio_id = s.id
      WHERE a.mal_id = ANY($1)
      GROUP BY a.mal_id
      ORDER BY array_position($1, a.mal_id)
    `;

    const result = await db.query(query, [limitedIds]);
    const results: AnimeWithRelations[] = result.rows.map(row => ({
      ...row,
      url: `https://myanimelist.net/anime/${row.mal_id}`
    }));

    // Return compact or full format based on request
    if (compact) {
      return results.map(anime => ultraCompactAnimeData(anime));
    } else {
      return results.map(anime => cleanAnimeData(anime));
    }
  }

  // Get search capabilities for MCP tool discovery
  async getSearchCapabilities(): Promise<SearchCapabilities> {
    // Get available genres
    const genres = await this.getAllGenres();
    
    // Get year range from database
    const yearRangeQuery = `
      SELECT MIN(year) as min_year, MAX(year) as max_year 
      FROM anime 
      WHERE year IS NOT NULL
    `;
    const yearResult = await db.query(yearRangeQuery);
    const { min_year, max_year } = yearResult.rows[0];

    return {
      available_filters: {
        temporal: {
          year: "Filter by specific year (e.g., 2020)",
          year_range: "Filter by year range using min_year and max_year (e.g., 2000-2010)",
          decade: "Filter by decade using format '1990s', '2000s', '2010s', '2020s'",
          current_year: "Filter to current year only using current_year_only=true"
        },
        content: {
          genres: "Filter by genre IDs (comma-separated, e.g., '1,4,10'). Use getAllGenres() to see available options",
          type: "Filter by anime type: 'TV', 'Movie', 'OVA', 'Special', 'ONA', 'Music'",
          airing_status: "Filter by status: 'airing' (currently airing), 'finished', 'upcoming'",
          episodes: "Filter by episode count using min_episodes and max_episodes",
          content_rating: "SFW filtering available (sfw=true excludes adult content)"
        },
        quality: {
          score_range: "Filter by MAL score using min_score and max_score (0-10)",
          popularity_range: "Filter by popularity rank using min_popularity and max_popularity (lower rank = more popular)",
          exclude_very_popular: "Exclude top 100 most popular anime using exclude_very_popular=true"
        }
      },
      search_examples: [
        {
          description: "Find best ecchi series from 2000-2010",
          example_query: "2000-2010 best ecchi series",
          suggested_parameters: {
            min_year: 2000,
            max_year: 2010,
            genres: "9", // Ecchi genre ID
            order_by: "score",
            sort: "desc",
            min_score: 7.0
          }
        },
        {
          description: "Find anime similar to Berserk but less popular",
          example_query: "anime like berserk but not so popular",
          suggested_parameters: {
            genres: "1,8,13", // Action, Drama, Historical
            exclude_very_popular: true,
            min_score: 7.5,
            order_by: "score",
            sort: "desc"
          }
        },
        {
          description: "Find current year popular anime",
          example_query: "current popular series this year",
          suggested_parameters: {
            current_year_only: true,
            order_by: "popularity",
            sort: "asc",
            airing_status: "airing"
          }
        },
        {
          description: "Find short anime series with high ratings",
          example_query: "good short anime series",
          suggested_parameters: {
            max_episodes: 13,
            min_score: 8.0,
            type: "TV",
            order_by: "score",
            sort: "desc"
          }
        }
      ],
      available_genres: genres,
      year_range: {
        min_year: min_year || 1960,
        max_year: max_year || new Date().getFullYear()
      },
      current_limitations: [
        "No similarity-based recommendations yet (requires additional ML implementation)",
        "No user-specific recommendations based on watch history",
        "Genre filtering is inclusive (OR logic) - cannot exclude specific genres yet",
        "No studio-based filtering implemented yet",
        "No advanced text search in synopsis with ranking"
      ]
    };
  }
}

export const animeService = new AnimeService(); 