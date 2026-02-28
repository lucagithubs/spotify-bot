const axios = require('axios');
require('dotenv').config();

class SpotifyService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
    this.baseUrl = 'https://api.spotify.com/v1';
  }

  async getAccessToken() {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    console.log('🔐 Getting Spotify token (Refresh Token)...');

    const response = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
        client_id: process.env.SPOTIFY_CLIENT_ID,
        client_secret: process.env.SPOTIFY_CLIENT_SECRET,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    this.accessToken = response.data.access_token;
    this.tokenExpiry = Date.now() + (response.data.expires_in - 60) * 1000;
    console.log('✅ Token obtained');
    return this.accessToken;
  }

  parseSpotifyInput(input) {
    const urlMatch = input.match(/open\.spotify\.com\/album\/([a-zA-Z0-9]+)/);
    if (urlMatch) return urlMatch[1];
    const uriMatch = input.match(/spotify:album:([a-zA-Z0-9]+)/);
    if (uriMatch) return uriMatch[1];
    return null;
  }

  async getFullAlbum(albumId) {
    const token = await this.getAccessToken();
    console.log('📀 Fetching Spotify album:', albumId);

    try {
      const response = await axios.get(`${this.baseUrl}/albums/${albumId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const album = response.data;
      console.log('✅ Spotify album fetched with real track IDs!');

      return {
        source: 'spotify',
        name: album.name,
        url: album.external_urls.spotify,
        artists: album.artists.map(a => ({ name: a.name, url: a.external_urls.spotify })),
        release_date: album.release_date,
        total_tracks: album.total_tracks,
        artwork: album.images[0]?.url,
        genres: album.genres || [],
        label: album.label || null,
        popularity: album.popularity ?? null,
        copyright: album.copyrights?.[0]?.text || null,
        tracks: album.tracks.items.map(t => ({
          name: t.name,
          duration_ms: t.duration_ms,
          track_number: t.track_number,
          spotify_url: t.external_urls?.spotify || null,
        })),
      };
    } catch (error) {
      console.error('❌ Spotify fetch failed:', error.response?.status, JSON.stringify(error.response?.data));
      throw new Error('Failed to fetch album from Spotify');
    }
  }
}

module.exports = new SpotifyService();