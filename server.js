import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import trackRoutes from './routes/tracks.js';
import playlistRoutes from './routes/playlists.js';
import userRoutes from './routes/user.js';
import seedRoutes from './routes/seed.js';
import setupRoutes from './routes/setup.js';
import { supabase } from './config/supabase.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});

// Initialize database tables on startup
async function initializeDatabase() {
  try {
    console.log('🔧 Initializing database...');

    // Check if tables exist by trying to select from them
    const tables = ['users', 'tracks', 'playlists', 'playlist_tracks', 'recently_played', 'favorites'];
    let missingTables = [];

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          missingTables.push(table);
        }
      } catch (err) {
        missingTables.push(table);
      }
    }

    if (missingTables.length > 0) {
      console.log(`❌ Missing tables: ${missingTables.join(', ')}`);
      console.log('📄 Please run the SQL schema from backend/database/schema.sql in your Supabase SQL Editor');
      console.log('🔄 Server will continue but playlist operations will fail until tables are created');
    } else {
      console.log('✅ All database tables exist');
    }

  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
  }
}

app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api/', limiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/tracks', trackRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/user', userRoutes);
app.use('/api/seed', seedRoutes);
app.use('/api/setup', setupRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {},
  });
});

app.listen(PORT, async () => {
  console.log(`🎵 ESSAI Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Initialize database on startup
  await initializeDatabase();
});
