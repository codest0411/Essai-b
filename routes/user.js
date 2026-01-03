import express from 'express';
import { supabase } from '../config/supabase.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.get('/favorites', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('*, tracks(*)')
      .eq('user_id', req.user.id)
      .order('added_at', { ascending: false });
    
    if (error) throw error;
    
    const tracks = data.map(fav => fav.tracks);
    res.json(tracks);
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ message: 'Failed to fetch favorites' });
  }
});

router.post('/favorites/:trackId', authenticate, async (req, res) => {
  try {
    const { trackId } = req.params;
    
    const { data: existing } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('track_id', trackId)
      .single();
    
    if (existing) {
      return res.status(400).json({ message: 'Track already in favorites' });
    }
    
    const { data, error } = await supabase
      .from('favorites')
      .insert([
        {
          user_id: req.user.id,
          track_id: trackId
        }
      ])
      .select();
    
    if (error) throw error;
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ message: 'Failed to add favorite' });
  }
});

router.delete('/favorites/:trackId', authenticate, async (req, res) => {
  try {
    const { trackId } = req.params;
    
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', req.user.id)
      .eq('track_id', trackId);
    
    if (error) throw error;
    
    res.json({ message: 'Favorite removed successfully' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ message: 'Failed to remove favorite' });
  }
});

router.get('/recently-played', authenticate, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('recently_played')
      .select('*, tracks(*)')
      .eq('user_id', req.user.id)
      .order('played_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    const tracks = data.map(rp => ({
      ...rp.tracks,
      played_at: rp.played_at
    }));
    
    res.json(tracks);
  } catch (error) {
    console.error('Get recently played error:', error);
    res.status(500).json({ message: 'Failed to fetch recently played' });
  }
});

router.post('/recently-played', authenticate, async (req, res) => {
  try {
    const { trackId } = req.body;
    
    if (!trackId) {
      return res.status(400).json({ message: 'Track ID is required' });
    }
    
    const { data, error } = await supabase
      .from('recently_played')
      .insert([
        {
          user_id: req.user.id,
          track_id: trackId,
          played_at: new Date().toISOString()
        }
      ])
      .select();
    
    if (error) throw error;
    
    res.status(201).json(data);
  } catch (error) {
    console.error('Add recently played error:', error);
    res.status(500).json({ message: 'Failed to add recently played' });
  }
});

router.delete('/delete-account', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('Deleting account for user:', userId);

    // Delete user data in order (respecting foreign key constraints)
    const deleteOperations = [
      // Delete recently played
      supabase.from('recently_played').delete().eq('user_id', userId),
      // Delete favorites
      supabase.from('favorites').delete().eq('user_id', userId),
      // Delete playlist tracks (this will cascade delete playlists due to FK)
      supabase.from('playlist_tracks').delete().eq('user_id', userId),
      // Delete playlists
      supabase.from('playlists').delete().eq('user_id', userId),
    ];

    // Execute all delete operations
    const results = await Promise.allSettled(deleteOperations);

    // Check for any errors
    const errors = results
      .filter(result => result.status === 'rejected')
      .map(result => result.reason);

    if (errors.length > 0) {
      console.error('Errors during data deletion:', errors);
      // Continue anyway - some data might still be deleted
    }

    // Delete the user from auth (this will cascade to users table if FK is set)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error('Error deleting user from auth:', deleteError);
      throw deleteError;
    }

    console.log('Account deleted successfully for user:', userId);

    res.json({
      success: true,
      message: 'Account deleted successfully'
    });

  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete account',
      error: error.message
    });
  }
});

export default router;
