import express from 'express';
import { supabase } from '../config/supabase.js';
import { jamendoService } from '../services/jamendo.js';

const router = express.Router();

// Populate database with tracks from Jamendo (REAL MUSIC)
router.post('/populate-from-jamendo', async (req, res) => {
  try {
    console.log('🎵 Fetching REAL music from Jamendo...');

    const tracks = await jamendoService.getRealMusicTracks();

    console.log(`✅ Found ${tracks.length} music tracks from Jamendo`);

    if (tracks.length > 0) {
      // Clear existing tracks
      await supabase.from('tracks').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Insert new tracks
      const { data, error } = await supabase
        .from('tracks')
        .insert(tracks)
        .select();

      if (error) {
        console.error('❌ Supabase insert error:', error);
        throw error;
      }

      res.json({
        success: true,
        message: 'Real music from Jamendo populated',
        count: data.length,
        artists: [...new Set(data.map(t => t.artist))],
        genres: [...new Set(data.map(t => t.genre))]
      });
    } else {
      res.json({
        success: false,
        message: 'No tracks found from Jamendo',
        count: 0
      });
    }
  } catch (error) {
    console.error('❌ Populate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to populate music',
      error: error.message
    });
  }
});

// Clear all tracks
router.delete('/clear-all', async (req, res) => {
  try {
    await supabase.from('tracks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    res.json({ success: true, message: 'All tracks cleared' });
  } catch (error) {
    console.error('Clear error:', error);
    res.status(500).json({ success: false, message: 'Failed to clear tracks' });
  }
});

export default router;
