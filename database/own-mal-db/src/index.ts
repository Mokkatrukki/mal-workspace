import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import { db } from './database/connection';
import animeRoutes from './api/routes/anime';
import v1Routes from './api/v1/routes';
import docsRouter from './api/docs';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Own MAL Database API',
    version: '1.0.0',
    status: 'running',
    api_versions: {
      v1: {
        base_url: '/api/v1',
        status: 'active',
        documentation: '/api/docs',
        info: '/api/v1'
      },
      legacy: {
        base_url: '/api/anime',
        status: 'deprecated',
        note: 'Will be removed in v2.0.0. Please migrate to /api/v1'
      }
    },
    quick_start: {
      search_anime: 'GET /api/v1/anime?query=naruto',
      get_anime: 'GET /api/v1/anime/1',
      list_genres: 'GET /api/v1/genres',
      api_info: 'GET /api/v1'
    }
  });
});

// API documentation (Scalar UI)
app.use('/api/docs', docsRouter);

// API v1 routes (new, clean API)
app.use('/api/v1', v1Routes);

// Legacy API routes (deprecated but still working)
app.use('/api/anime', animeRoutes);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: 'The requested resource was not found'
  });
});

// Start server
async function startServer() {
  try {
    // Test database connection
    const isConnected = await db.testConnection();
    if (!isConnected) {
      throw new Error('Database connection failed');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 API documentation available at http://localhost:${PORT}`);
      console.log(`🔍 Search anime: http://localhost:${PORT}/api/anime/search?query=naruto`);
      console.log(`📝 Genres: http://localhost:${PORT}/api/anime/genres`);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await db.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  await db.end();
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

export { app }; 