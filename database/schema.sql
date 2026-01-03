-- ESSAI Music Streaming Platform - Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracks table
CREATE TABLE IF NOT EXISTS tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  artist TEXT,
  album TEXT,
  genre TEXT,
  duration INTEGER DEFAULT 0,
  audio_url TEXT NOT NULL,
  cover_image_url TEXT,
  play_count INTEGER DEFAULT 0,
  listeners INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- Playlists table
CREATE TABLE IF NOT EXISTS playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playlist Tracks junction table
CREATE TABLE IF NOT EXISTS playlist_tracks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  position INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(playlist_id, track_id)
);

-- Recently Played table
CREATE TABLE IF NOT EXISTS recently_played (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  podcast_episode_id UUID REFERENCES podcast_episodes(id) ON DELETE CASCADE,
  last_position INTEGER DEFAULT 0,
  played_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favorites table
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, track_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre);
CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
CREATE INDEX IF NOT EXISTS idx_tracks_created_at ON tracks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tracks_play_count ON tracks(play_count DESC);

CREATE INDEX IF NOT EXISTS idx_podcasts_category ON podcasts(category);
CREATE INDEX IF NOT EXISTS idx_podcast_episodes_podcast_id ON podcast_episodes(podcast_id);

CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track_id ON playlist_tracks(track_id);

CREATE INDEX IF NOT EXISTS idx_recently_played_user_id ON recently_played(user_id);
CREATE INDEX IF NOT EXISTS idx_recently_played_played_at ON recently_played(played_at DESC);

CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_track_id ON favorites(track_id);

-- Function to increment play count
CREATE OR REPLACE FUNCTION increment_play_count(track_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE tracks
  SET play_count = play_count + 1
  WHERE id = track_id;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) Policies
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE recently_played ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Anyone can view tracks" ON tracks;
DROP POLICY IF EXISTS "Admins can insert tracks" ON tracks;
DROP POLICY IF EXISTS "Admins can update tracks" ON tracks;
DROP POLICY IF EXISTS "Admins can delete tracks" ON tracks;
DROP POLICY IF EXISTS "Users can view own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can create playlists" ON playlists;
DROP POLICY IF EXISTS "Users can update own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can delete own playlists" ON playlists;
DROP POLICY IF EXISTS "Users can view playlist tracks" ON playlist_tracks;
DROP POLICY IF EXISTS "Users can manage playlist tracks" ON playlist_tracks;
DROP POLICY IF EXISTS "Users can view own recently played" ON recently_played;
DROP POLICY IF EXISTS "Users can insert recently played" ON recently_played;
DROP POLICY IF EXISTS "Users can update own recently played" ON recently_played;
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
DROP POLICY IF EXISTS "Users can add favorites" ON favorites;
DROP POLICY IF EXISTS "Users can remove favorites" ON favorites;

-- Users policies
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Tracks policies
CREATE POLICY "Anyone can view tracks" ON tracks FOR SELECT USING (true);
CREATE POLICY "Admins can insert tracks" ON tracks FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can update tracks" ON tracks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can delete tracks" ON tracks FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Podcasts policies
CREATE POLICY "Anyone can view podcasts" ON podcasts FOR SELECT USING (true);
CREATE POLICY "Admins can manage podcasts" ON podcasts FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);isodes policies
CREATE POLICY "Anyone can view episodes" ON podcast_episodes FOR SELECT USING (true);
CREATE POLICY "Admins can manage episodes" ON podcast_episodes FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- Playlists policies
CREATE POLICY "Users can view own playlists" ON playlists FOR SELECT USING (
  user_id = auth.uid() OR is_public = true
);
CREATE POLICY "Users can create playlists" ON playlists FOR INSERT WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY "Users can update own playlists" ON playlists FOR UPDATE USING (
  user_id = auth.uid()
);
CREATE POLICY "Users can delete own playlists" ON playlists FOR DELETE USING (
  user_id = auth.uid()
);

-- Playlist tracks policies
CREATE POLICY "Users can view playlist tracks" ON playlist_tracks FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM playlists 
    WHERE playlists.id = playlist_tracks.playlist_id 
    AND (playlists.user_id = auth.uid() OR playlists.is_public = true)
  )
);
CREATE POLICY "Users can manage playlist tracks" ON playlist_tracks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM playlists 
    WHERE playlists.id = playlist_tracks.playlist_id 
    AND playlists.user_id = auth.uid()
  )
);
CREATE POLICY "Users can view own recently played" ON recently_played FOR SELECT USING (
  user_id = auth.uid()
);
CREATE POLICY "Users can insert recently played" ON recently_played FOR INSERT WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY "Users can update own recently played" ON recently_played FOR UPDATE USING (
  user_id = auth.uid()
);

-- Favorites policies
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT USING (
  user_id = auth.uid()
);
CREATE POLICY "Users can add favorites" ON favorites FOR INSERT WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY "Users can remove favorites" ON favorites FOR DELETE USING (
  user_id = auth.uid()
);

-- Storage buckets (create these in Supabase Dashboard -> Storage)
-- 1. audio-files (public)
-- 2. cover-images (public)
-- 3. podcast-episodes (public)

-- Sample data (optional - for testing)
-- You can uncomment and run this to populate with sample data

/*
INSERT INTO tracks (title, artist, album, genre, duration, audio_url, cover_image_url) VALUES
  ('Sample Track 1', 'Artist One', 'Album A', 'Pop', 180, 'https://example.com/track1.mp3', 'https://example.com/cover1.jpg'),
  ('Sample Track 2', 'Artist Two', 'Album B', 'Rock', 240, 'https://example.com/track2.mp3', 'https://example.com/cover2.jpg'),
  ('Sample Track 3', 'Artist Three', 'Album C', 'Electronic', 200, 'https://example.com/track3.mp3', 'https://example.com/cover3.jpg');

INSERT INTO podcasts (title, description, host, category, cover_image_url, total_episodes) VALUES
  ('Tech Talk', 'A podcast about technology', 'John Doe', 'Technology', 'https://example.com/podcast1.jpg', 10),
  ('Business Insights', 'Business strategies and tips', 'Jane Smith', 'Business', 'https://example.com/podcast2.jpg', 15);
*/
