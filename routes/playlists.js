import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('playlists')
      .select('*, playlist_tracks(count)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Get playlists error:', error);
    res.status(500).json({ message: 'Failed to fetch playlists' });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('*')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();
    
    if (playlistError) throw playlistError;
    
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    
    const { data: tracks, error: tracksError } = await supabase
      .from('playlist_tracks')
      .select('*, tracks(*)')
      .eq('playlist_id', id)
      .order('position', { ascending: true });
    
    if (tracksError) throw tracksError;
    
    res.json({
      ...playlist,
      tracks: tracks.map(pt => pt.tracks)
    });
  } catch (error) {
    console.error('Get playlist error:', error);
    res.status(500).json({ message: 'Failed to fetch playlist' });
  }
});

router.post('/', authenticate, async (req, res) => {
  try {
    console.log(' Auth check - req.user:', req.user);
    console.log(' Request body:', req.body);
    console.log(' Auth header:', req.headers.authorization ? 'Present' : 'Missing');

    const { name, description } = req.body;

    console.log(' Creating playlist:', { name, description, userId: req.user?.id });

    if (!req.user || !req.user.id) {
      console.error(' No user found in request');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!name) {
      return res.status(400).json({ message: 'Playlist name is required' });
    }

    console.log(' Creating playlist:', { name, description, userId: req.user.id });

    const { data, error } = await supabase
      .from('playlists')
      .insert([
        {
          name,
          description,
          user_id: req.user.id
        }
      ])
      .select()
      .single();

    if (error) {
      console.error(' Supabase error creating playlist:', error);
      console.error(' Error details:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log(' Playlist created successfully:', data);
    res.status(201).json(data);
  } catch (error) {
    console.error(' Error creating playlist:', error);
    console.error(' Error details:', error.message);
    res.status(500).json({ message: 'Failed to create playlist', error: error.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const { data, error } = await supabase
      .from('playlists')
      .update({ name, description })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json(data);
  } catch (error) {
    console.error('Update playlist error:', error);
    res.status(500).json({ message: 'Failed to update playlist' });
  }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    
    const { error } = await supabase
      .from('playlists')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);
    
    if (error) throw error;
    
    res.json({ message: 'Playlist deleted successfully' });
  } catch (error) {
    console.error('Delete playlist error:', error);
    res.status(500).json({ message: 'Failed to delete playlist' });
  }
});

router.post('/:id/tracks', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { trackId } = req.body;
    
    const { data: playlist } = await supabase
      .from('playlists')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();
    
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    
    const { data: existingTracks } = await supabase
      .from('playlist_tracks')
      .select('position')
      .eq('playlist_id', id)
      .order('position', { ascending: false })
      .limit(1);
    
    const nextPosition = existingTracks.length > 0 ? existingTracks[0].position + 1 : 0;
    
    const { data, error } = await supabase
      .from('playlist_tracks')
      .insert([
        {
          playlist_id: id,
          track_id: trackId,
          position: nextPosition
        }
      ])
      .select();
    
    if (error) throw error;
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Add track to playlist error:', error);
    res.status(500).json({ message: 'Failed to add track to playlist' });
  }
});

router.delete('/:id/tracks/:trackId', authenticate, async (req, res) => {
  try {
    const { id, trackId } = req.params;
    
    const { data: playlist } = await supabase
      .from('playlists')
      .select('id')
      .eq('id', id)
      .eq('user_id', req.user.id)
      .single();
    
    if (!playlist) {
      return res.status(404).json({ message: 'Playlist not found' });
    }
    
    const { error } = await supabase
      .from('playlist_tracks')
      .delete()
      .eq('playlist_id', id)
      .eq('track_id', trackId);
    
    if (error) throw error;
    
    res.json({ message: 'Track removed from playlist' });
  } catch (error) {
    console.error('Remove track from playlist error:', error);
    res.status(500).json({ message: 'Failed to remove track from playlist' });
  }
});

export default router;
