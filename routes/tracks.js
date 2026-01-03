import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { genre, artist, limit = 50 } = req.query;
    
    let query = supabase
      .from('tracks')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (genre) {
      query = query.eq('genre', genre);
    }
    
    if (artist) {
      query = query.ilike('artist', `%${artist}%`);
    }
    
    query = query.limit(parseInt(limit));
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Get tracks error:', error);
    res.status(500).json({ message: 'Failed to fetch tracks' });
  }
});

router.get('/featured', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .order('play_count', { ascending: false })
      .limit(20);
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Get featured tracks error:', error);
    res.status(500).json({ message: 'Failed to fetch featured tracks' });
  }
});

router.get('/genres', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('tracks')
      .select('genre')
      .not('genre', 'is', null);
    
    if (error) throw error;
    
    const genres = [...new Set(data.map(t => t.genre))];
    res.json(genres);
  } catch (error) {
    console.error('Get genres error:', error);
    res.status(500).json({ message: 'Failed to fetch genres' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    
    if (!data) {
      return res.status(404).json({ message: 'Track not found' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Get track error:', error);
    res.status(500).json({ message: 'Failed to fetch track' });
  }
});

router.post('/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    const { data, error } = await supabase
      .from('tracks')
      .select('*')
      .or(`title.ilike.%${query}%,artist.ilike.%${query}%,album.ilike.%${query}%`)
      .limit(50);
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Search tracks error:', error);
    res.status(500).json({ message: 'Failed to search tracks' });
  }
});

router.post('/:id/play', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data, error } = await supabase
      .from('tracks')
      .update({ play_count: supabase.raw('play_count + 1') })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Increment play count error:', error);
    res.status(500).json({ message: 'Failed to update play count' });
  }
});

export default router;
