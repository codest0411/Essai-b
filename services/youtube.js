import axios from 'axios';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_BASE_URL = 'https://www.googleapis.com/youtube/v3';

export const youtubeService = {
  // Search for music videos
  async searchVideos(query, maxResults = 50) {
    try {
      const response = await axios.get(`${YOUTUBE_BASE_URL}/search`, {
        params: {
          key: YOUTUBE_API_KEY,
          part: 'snippet',
          q: query,
          type: 'video',
          videoCategoryId: '10', // Music category
          maxResults: maxResults,
          order: 'viewCount'
        }
      });
      return response.data;
    } catch (error) {
      console.error('YouTube search error:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      return null;
    }
  },

  // Get video details
  async getVideoDetails(videoIds) {
    try {
      const response = await axios.get(`${YOUTUBE_BASE_URL}/videos`, {
        params: {
          key: YOUTUBE_API_KEY,
          part: 'snippet,contentDetails,statistics',
          id: Array.isArray(videoIds) ? videoIds.join(',') : videoIds
        }
      });
      return response.data;
    } catch (error) {
      console.error('YouTube video details error:', error.message);
      return null;
    }
  },

  // Parse ISO 8601 duration to seconds
  parseDuration(duration) {
    const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
    const hours = (match[1] || '').replace('H', '') || 0;
    const minutes = (match[2] || '').replace('M', '') || 0;
    const seconds = (match[3] || '').replace('S', '') || 0;
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
  },

  // Get tracks for database population
  async getRealMusicTracks() {
    const tracks = [];
    const seenVideoIds = new Set();
    
    try {
      console.log('🎵 Fetching REAL music from YouTube...');
      
      // Popular music queries
      const queries = [
        'official music video 2024',
        'top hits 2024',
        'popular songs 2024',
        'rock music official',
        'pop music official',
        'hip hop music official',
        'electronic music official',
        'indie music official',
        'r&b music official'
      ];

      for (const query of queries) {
        console.log(`Searching YouTube: ${query}`);
        const searchData = await this.searchVideos(query, 20);
        
        if (searchData?.items) {
          const videoIds = searchData.items
            .map(item => item.id.videoId)
            .filter(id => !seenVideoIds.has(id));
          
          if (videoIds.length === 0) continue;
          
          // Get detailed info for these videos
          const videoDetails = await this.getVideoDetails(videoIds);
          
          if (videoDetails?.items) {
            for (const video of videoDetails.items) {
              if (seenVideoIds.has(video.id)) continue;
              seenVideoIds.add(video.id);
              
              // Extract artist and title from video title
              const title = video.snippet.title;
              let artist = video.snippet.channelTitle.replace(' - Topic', '').replace('VEVO', '').trim();
              let songTitle = title;
              
              // Try to parse "Artist - Song" format
              if (title.includes(' - ')) {
                const parts = title.split(' - ');
                artist = parts[0].trim();
                songTitle = parts[1].replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();
              }
              
              // Clean up title
              songTitle = songTitle
                .replace(/official music video/gi, '')
                .replace(/official video/gi, '')
                .replace(/official audio/gi, '')
                .replace(/\(.*?\)/g, '')
                .replace(/\[.*?\]/g, '')
                .trim();
              
              const duration = this.parseDuration(video.contentDetails.duration);
              
              // Only include videos between 1-10 minutes (likely music)
              if (duration < 60 || duration > 600) continue;
              
              // Cap view counts to fit PostgreSQL integer range (max 2,147,483,647)
              const viewCount = parseInt(video.statistics.viewCount) || 0;
              const likeCount = parseInt(video.statistics.likeCount) || 0;
              
              tracks.push({
                title: songTitle || title,
                artist: artist || 'Unknown Artist',
                album: 'YouTube Music',
                genre: this.detectGenre(query, title),
                duration: duration,
                audio_url: `youtube:${video.id}`,
                cover_image_url: video.snippet.thumbnails.high?.url || 
                                video.snippet.thumbnails.medium?.url ||
                                `https://ui-avatars.com/api/?name=${encodeURIComponent(songTitle)}&size=300&background=random&color=fff`,
                play_count: Math.min(viewCount, 2147483647),
                listeners: Math.min(likeCount, 2147483647)
              });
            }
          }
        }
        
        // Respect API rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log(`✅ Found ${tracks.length} real music videos from YouTube`);
    } catch (error) {
      console.error('Error fetching tracks from YouTube:', error.message);
    }

    return tracks;
  },

  // Detect genre from query or title
  detectGenre(query, title) {
    const lowerQuery = (query + ' ' + title).toLowerCase();
    
    if (lowerQuery.includes('rock')) return 'rock';
    if (lowerQuery.includes('pop')) return 'pop';
    if (lowerQuery.includes('hip hop') || lowerQuery.includes('rap')) return 'hip-hop';
    if (lowerQuery.includes('electronic') || lowerQuery.includes('edm')) return 'electronic';
    if (lowerQuery.includes('indie')) return 'indie';
    if (lowerQuery.includes('r&b') || lowerQuery.includes('rnb')) return 'r-n-b';
    if (lowerQuery.includes('jazz')) return 'jazz';
    if (lowerQuery.includes('classical')) return 'classical';
    
    return 'Various';
  }
};
