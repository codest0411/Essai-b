import express from 'express';
import { supabase } from '../config/supabase.js';

const router = express.Router();

// Check database setup and provide SQL if needed
router.get('/setup', async (req, res) => {
  try {
    console.log('🔍 Checking database setup...');

    const tables = [
      'users',
      'tracks',
      'playlists',
      'playlist_tracks',
      'recently_played',
      'favorites'
    ];

    const results = {};

    for (const table of tables) {
      try {
        const { error } = await supabase.from(table).select('*').limit(1);
        if (error) {
          results[table] = { exists: false, error: error.message };
        } else {
          results[table] = { exists: true };
        }
      } catch (err) {
        results[table] = { exists: false, error: err.message };
      }
    }

    const missingTables = Object.entries(results)
      .filter(([_, status]) => !status.exists)
      .map(([table]) => table);

    if (missingTables.length > 0) {
      console.log(`❌ Missing tables: ${missingTables.join(', ')}`);

      // Read the schema file
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');

      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const schemaPath = path.join(__dirname, '../database/schema.sql');

      let schemaSQL = '';
      try {
        schemaSQL = fs.readFileSync(schemaPath, 'utf8');
      } catch (err) {
        console.error('Could not read schema file:', err);
      }

      res.json({
        status: 'incomplete',
        missingTables,
        message: 'Some database tables are missing. Please run the SQL schema in your Supabase SQL Editor.',
        sql: schemaSQL,
        results
      });
    } else {
      res.json({
        status: 'complete',
        message: 'All database tables exist!',
        results
      });
    }

  } catch (error) {
    console.error('Database setup check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to check database setup',
      error: error.message
    });
  }
});

export default router;
