const axios = require('axios');
require('dotenv').config();

const BASE = 'https://ws.audioscrobbler.com/2.0/';

class LastFmService {

  // Build a Spotify artist search URL - always works, no API needed
  getSpotifyArtistUrl(artistName) {
    return `https://open.spotify.com/search/${encodeURIComponent(artistName)}/artists`;
  }

  getSpotifyPlaylistUrl(query) {
    return `https://open.spotify.com/search/${encodeURIComponent(query)}/playlists`;
  }

  async isArtistQuery(query) {
    // Confirm it's a real artist via Last.fm artist search
    try {
      const res = await axios.get(BASE, {
        params: { method: 'artist.search', artist: query, api_key: process.env.LASTFM_API_KEY, format: 'json', limit: 3 },
        timeout: 8000,
      });

      const results = res.data.results?.artistmatches?.artist;
      if (!results?.length) return false;

      const list = Array.isArray(results) ? results : [results];
      const match = list.find(a =>
        a.name.toLowerCase() === query.toLowerCase() ||
        a.name.toLowerCase().includes(query.toLowerCase()) ||
        query.toLowerCase().includes(a.name.toLowerCase())
      );

      if (!match) return false;
      console.log(`✅ Artist confirmed via Last.fm: ${match.name}`);
      return { artistName: match.name, spotifyUrl: this.getSpotifyArtistUrl(match.name) };
    } catch (err) {
      console.error(`⚠️ Last.fm artist check failed: ${err.message}`);
      return false;
    }
  }

  async getArtistTopAlbums(artistName, spotifyUrl, limit = 5) {
    console.log(`🎙️ Last.fm: fetching top albums for "${artistName}"...`);

    const infoRes = await axios.get(BASE, {
      params: { method: 'artist.getinfo', artist: artistName, api_key: process.env.LASTFM_API_KEY, format: 'json' },
      timeout: 8000,
    });

    const artist = infoRes.data.artist;
    const correctedName = artist?.name || artistName;
    const listeners = parseInt(artist?.stats?.listeners || 0).toLocaleString();

    const albumsRes = await axios.get(BASE, {
      params: { method: 'artist.gettopalbums', artist: correctedName, api_key: process.env.LASTFM_API_KEY, format: 'json', limit: limit + 5 },
      timeout: 8000,
    });

    const rawAlbums = albumsRes.data.topalbums?.album || [];
    const albums = rawAlbums
      .filter(a => a.name !== '(null)' && a.name !== '' && parseInt(a.playcount) > 0)
      .slice(0, limit);

    return {
      name: correctedName,
      url: spotifyUrl,
      listeners,
      albums: albums.map((a, i) => ({
        rank: i + 1,
        name: a.name,
        playcount: parseInt(a.playcount || 0).toLocaleString(),
        url: a.url,
        image: a.image?.find(img => img.size === 'extralarge')?.['#text'] || null,
      })),
    };
  }

  findSpotifyPlaylistUrl(query) {
    return this.getSpotifyPlaylistUrl(query);
  }
}

module.exports = new LastFmService();