import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433'),
  database: process.env.DB_NAME || 'mal_db',
  user: process.env.DB_USER || 'mal_user',
  password: process.env.DB_PASSWORD || 'your_password',
});

// Common anime genres from MyAnimeList
const genres = [
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mystery',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
  'Ecchi',
  'Mecha',
  'Music',
  'Psychological',
  'School',
  'Seinen',
  'Shoujo',
  'Shounen',
  'Josei',
  'Historical',
  'Military',
  'Parody',
  'Martial Arts',
  'Samurai',
  'Dementia',
  'Vampire',
  'Yaoi',
  'Yuri',
  'Harem',
  'Demons',
  'Magic',
  'Game',
  'Space',
  'Super Power',
];

// Common anime studios
const studios = [
  'Bones',
  'Madhouse',
  'Studio Ghibli',
  'Kyoto Animation',
  'Production I.G',
  'Trigger',
  'A-1 Pictures',
  'Wit Studio',
  'MAPPA',
  'CloverWorks',
  'Shaft',
  'Ufotable',
  'J.C.Staff',
  'Sunrise',
  'Toei Animation',
  'Pierrot',
  'David Production',
  'Studio Deen',
  'Gainax',
  'White Fox',
  'P.A. Works',
  'Silver Link',
  'Doga Kobo',
  'Brain\'s Base',
  'Lerche',
  'Studio Bind',
];

async function seedDatabase() {
  const client = await pool.connect();

  try {
    console.log('Starting database seeding...\n');

    // Seed genres
    console.log('Seeding genres...');
    for (const genre of genres) {
      await client.query(
        'INSERT INTO genres (name) VALUES ($1) ON CONFLICT ON CONSTRAINT genres_name_key DO NOTHING',
        [genre]
      );
    }
    console.log(`✓ Seeded ${genres.length} genres\n`);

    // Seed studios
    console.log('Seeding studios...');
    for (const studio of studios) {
      await client.query(
        'INSERT INTO studios (name) VALUES ($1) ON CONFLICT DO NOTHING',
        [studio]
      );
    }
    console.log(`✓ Seeded ${studios.length} studios\n`);

    // Show counts
    const genreCount = await client.query('SELECT COUNT(*) FROM genres');
    const studioCount = await client.query('SELECT COUNT(*) FROM studios');

    console.log('Database seeding completed!');
    console.log(`Total genres in database: ${genreCount.rows[0].count}`);
    console.log(`Total studios in database: ${studioCount.rows[0].count}`);

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seedDatabase().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});