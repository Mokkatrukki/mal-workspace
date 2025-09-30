#!/usr/bin/env tsx

import { getSQLiteDB } from '../sqlite.js';

async function runMigrations() {
  console.log('Starting SQLite migrations...');

  try {
    const db = getSQLiteDB();
    await db.initialize();
    console.log('✅ SQLite database initialized successfully');
  } catch (error) {
    console.error('❌ SQLite migration failed:', error);
    process.exit(1);
  }
}

// Run migrations
runMigrations();