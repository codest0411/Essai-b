import axios from 'axios';

const AUDIODB_API_KEY = process.env.AUDIODB_API_KEY || '2';
const AUDIODB_BASE_URL = 'https://www.theaudiodb.com/api/v1/json';

export const audioDBService = {
  // ARTISTS
  async searchArtist(artistName) {
    try {
      const response = await axios.get(
        `${AUDIODB_BASE_URL}/${AUDIODB_API_KEY}/search.php?s=${encodeURIComponent(artistName)}`
      );
      return response.data;
    } catch (error) {
      console.error('AudioDB search artist error:', error.message);
      return null;
    }
  },

  async getArtistById(artistId) {
    try {
      const response = await axios.get(
        `${AUDIODB_BASE_URL}/${AUDIODB_API_KEY}/artist.php?i=${artistId}`
      );
      return response.data;
    } catch (error) {
      console.error('AudioDB get artist error:', error.message);
      return null;
    }
  },

  async getArtistByMusicBrainzId(mbId) {
    try {
      const response = await axios.get(
        `${AUDIODB_BASE_URL}/${AUDIODB_API_KEY}/artist-mb.php?i=${mbId}`
      );
      return response.data;
    } catch (error) {
      console.error('AudioDB get artist by MB ID error:', error.message);
      return null;
    }
  },

  async searchAllArtists(artistName) {
    try {
      const response = await axios.get(
        `${AUDIODB_BASE_URL}/${AUDIODB_API_KEY}/search_all.php?s=${encodeURIComponent(artistName)}`
      );
      return response.data;
    } catch (error) {
      console.error('AudioDB search all artists error:', error.message);
      return null;
    }
  },

  // ALBUMS
  async searchAlbum(artistName, albumName = null) {
    try {
      let url = `${AUDIODB_BASE_URL}/${AUDIODB_API_KEY}/searchalbum.php?s=${encodeURIComponent(artistName)}`;
      if (albumName) {
        url += `&a=${encodeURIComponent(albumName)}`;
      }
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('AudioDB search album error:', error.message);
      return null;
    }
  },

  async getAlbumById(albumId) {
    try {
      const response = await axios.get(
        `${AUDIODB_BASE_URL}/${AUDIODB_API_KEY}/album.php?m=${albumId}`
      );
      return response.data;
    } catch (error) {
      console.error('AudioDB get album error:', error.message);
      return null;
    }
  },

  async getArtistAlbums(artistId) {
    try {
      const response = await axios.get(
        `${AUDIODB_BASE_URL}/${AUDIODB_API_KEY}/album.php?i=${artistId}`
      );
      return response.data;
    } catch (error) {
      console.error('AudioDB get albums error:', error.message);
      return null;
    }
  },

  // TRACKS / SONGS
  async searchTrack(artistName, trackName = null) {
    try {
      let url = `${AUDIODB_BASE_URL}/${AUDIODB_API_KEY}/searchtrack.php?s=${encodeURIComponent(artistName)}`;
      if (trackName) {
        url += `&t=${encodeURIComponent(trackName)}`;
      }
      const response = await axios.get(url);
      return response.data;
    } catch (error) {
      console.error('AudioDB search track error:', error.message);
      return null;
    }
  },

  async getTrackById(trackId) {
    try {
      const response = await axios.get(
        `${AUDIODB_BASE_URL}/${AUDIODB_API_KEY}/track.php?h=${trackId}`
      );
      return response.data;
    } catch (error) {
      console.error('AudioDB get track error:', error.message);
      return null;
    }
  },

  async getAlbumTracks(albumId) {
    try {
      const response = await axios.get(
        `${AUDIODB_BASE_URL}/${AUDIODB_API_KEY}/track.php?m=${albumId}`
      );
      return response.data;
    } catch (error) {
      console.error('AudioDB get tracks error:', error.message);
      return null;
    }
  },

  // GENRES & TRENDING
  async getGenres() {
    try {
      const response = await axios.get(
        `${AUDIODB_BASE_URL}/${AUDIODB_API_KEY}/genre.php`
      );
      return response.data;
    } catch (error) {
      console.error('AudioDB get genres error:', error.message);
      return null;
    }
  },

  async getTrending(countryCode = 'us', type = 'itunes') {
    try {
      const response = await axios.get(
        `${AUDIODB_BASE_URL}/${AUDIODB_API_KEY}/trending.php?country=${countryCode}&type=${type}`
      );
      return response.data;
    } catch (error) {
      console.error('AudioDB get trending error:', error.message);
      return null;
    }
  },

  // MOST LOVED
  async getMostLoved(format = 'track') {
    try {
      const response = await axios.get(
        `${AUDIODB_BASE_URL}/${AUDIODB_API_KEY}/mostloved.php?format=${format}`
      );
      return response.data;
    } catch (error) {
      console.error('AudioDB get most loved error:', error.message);
      return null;
    }
  },

  // MUSIC VIDEOS
  async getMusicVideos(artistId) {
    try {
      const response = await axios.get(
        `${AUDIODB_BASE_URL}/${AUDIODB_API_KEY}/mvid.php?i=${artistId}`
      );
      return response.data;
    } catch (error) {
      console.error('AudioDB get music videos error:', error.message);
      return null;
    }
  },

  async getRealMusicTracks() {
    const popularArtists = [
      'Coldplay', 'Ed Sheeran', 'Taylor Swift', 'The Weeknd',
      'Dua Lipa', 'Drake', 'Ariana Grande', 'Post Malone',
      'Billie Eilish', 'Bruno Mars', 'Imagine Dragons', 'Adele',
      'Justin Bieber', 'Lady Gaga', 'Rihanna', 'Eminem'
    ];

    const tracks = [];

    for (const artistName of popularArtists) {
      try {
        console.log(`Fetching data for ${artistName}...`);
        const artistData = await this.searchArtist(artistName);
        
        if (artistData?.artists?.[0]) {
          const artist = artistData.artists[0];
          const albumsData = await this.getArtistAlbums(artist.idArtist);
          
          if (albumsData?.album) {
            const topAlbums = albumsData.album.slice(0, 2);
            
            for (const album of topAlbums) {
              const tracksData = await this.getAlbumTracks(album.idAlbum);
              
              if (tracksData?.track) {
                for (const track of tracksData.track.slice(0, 5)) {
                  tracks.push({
                    title: track.strTrack || 'Unknown Track',
                    artist: track.strArtist || artistName,
                    album: track.strAlbum || album.strAlbum,
                    genre: track.strGenre || album.strGenre || 'Pop',
                    duration: track.intDuration ? parseInt(track.intDuration) : 200,
                    audio_url: `https://www.soundhelix.com/examples/mp3/SoundHelix-Song-${Math.floor(Math.random() * 16) + 1}.mp3`,
                    cover_image_url: track.strTrackThumb || album.strAlbumThumb || artist.strArtistThumb || 
                                   `https://picsum.photos/300/300?random=${tracks.length}`,
                    play_count: Math.floor(Math.random() * 50000) + 1000
                  });
                }
              }
              
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (error) {
        console.error(`Error processing ${artistName}:`, error.message);
      }
    }

    return tracks;
  }
};
