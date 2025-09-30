/**
 * Anime Repository
 * Handles all database operations for anime data
 */

import { db } from '../../database/connection';

export class AnimeRepository {
  // Placeholder - will be populated in Task 3
  async findById(id: number) {
    const query = 'SELECT * FROM anime WHERE mal_id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0] || null;
  }
}

export const animeRepository = new AnimeRepository();