const axios = require('axios');

const MB_HEADERS = { 'User-Agent': 'DiscordSpotifyBot/1.0 (discord-bot)' };

class iTunesService {
  async searchAlbum(query) {
    console.log(`🍎 Searching iTunes for: ${query}`);

    const searchRes = await axios.get('https://itunes.apple.com/search', {
      params: { term: query, entity: 'album', limit: 1 },
    });

    const albums = searchRes.data.results;
    if (!albums.length) return null;

    const album = albums[0];
    console.log(`✅ Found album: ${album.collectionName} by ${album.artistName}`);

    // Get full track list from iTunes
    const lookupRes = await axios.get('https://itunes.apple.com/lookup', {
      params: { id: album.collectionId, entity: 'song' },
    });
    const itunesTracks = lookupRes.data.results.filter(i => i.wrapperType === 'track');

    // Get Spotify album URL via Odesli
    const spotifyAlbumUrl = await this.findSpotifyUrl(album.collectionViewUrl, album.collectionName, album.artistName);
    console.log(spotifyAlbumUrl ? `🟢 Spotify album URL: ${spotifyAlbumUrl}` : '⚠️ No Spotify album URL found');

    // Get Spotify track URLs via Odesli in parallel (feed each iTunes track URL)
    console.log(`🔗 Fetching Spotify track IDs for ${itunesTracks.length} tracks via Odesli...`);
    const tracks = await this.resolveSpotifyTrackUrls(itunesTracks);
    console.log(`✅ Resolved ${tracks.filter(t => t.spotify_url).length}/${tracks.length} Spotify track URLs`);

    return {
      source: 'itunes',
      name: album.collectionName,
      url: spotifyAlbumUrl || album.collectionViewUrl,
      artists: [{ name: album.artistName, url: album.artistViewUrl }],
      release_date: album.releaseDate?.split('T')[0] || 'Unknown',
      total_tracks: album.trackCount,
      artwork: album.artworkUrl100?.replace('100x100', '600x600'),
      genres: album.primaryGenreName ? [album.primaryGenreName] : [],
      label: null,
      popularity: null,
      copyright: album.copyright || null,
      tracks,
    };
  }

  // Feed each iTunes track URL to Odesli in parallel to get Spotify track URLs
  async resolveSpotifyTrackUrls(itunesTracks) {
    const results = await Promise.allSettled(
      itunesTracks.map(async (track) => {
        try {
          // iTunes track URL format: https://music.apple.com/us/album/name/albumid?i=trackid
          const trackUrl = track.trackViewUrl;
          if (!trackUrl) return this.fallbackTrack(track);

          const res = await axios.get('https://api.song.link/v1-alpha.1/links', {
            params: { url: trackUrl, userCountry: 'US' },
            timeout: 15000,
          });

          const spotifyTrack = res.data.linksByPlatform?.spotify;
          return {
            name: track.trackName,
            duration_ms: track.trackTimeMillis || 0,
            track_number: track.trackNumber,
            spotify_url: spotifyTrack?.url || null,
          };
        } catch {
          return this.fallbackTrack(track);
        }
      })
    );

    return results.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean);
  }

  fallbackTrack(track) {
    return {
      name: track.trackName,
      duration_ms: track.trackTimeMillis || 0,
      track_number: track.trackNumber,
      spotify_url: null,
    };
  }

  async findSpotifyUrl(itunesUrl, albumName, artistName) {
    const strategies = [
      () => this.tryOdesli(itunesUrl),
      () => this.tryDeezerOdesli(albumName, artistName),
      () => this.tryMusicBrainz(albumName, artistName),
    ];

    for (const strategy of strategies) {
      try {
        const url = await strategy();
        if (url) return url;
      } catch (err) {
        console.error(`⚠️ Strategy failed: ${err.message}`);
      }
    }
    return null;
  }

  async tryOdesli(url) {
    console.log(`🔗 Odesli lookup...`);
    const res = await axios.get('https://api.song.link/v1-alpha.1/links', {
      params: { url, userCountry: 'US' },
      timeout: 15000,
    });
    const sp = res.data.linksByPlatform?.spotify;
    if (sp?.url) { console.log(`✅ Odesli found Spotify URL`); return sp.url; }
    return null;
  }

  async tryDeezerOdesli(albumName, artistName) {
    console.log(`🎵 Deezer → Odesli lookup...`);
    const searchRes = await axios.get('https://api.deezer.com/search/album', {
      params: { q: `${albumName} ${artistName}`, limit: 1 },
      timeout: 6000,
    });
    const albums = searchRes.data.data;
    if (!albums?.length) return null;
    const res = await axios.get('https://api.song.link/v1-alpha.1/links', {
      params: { url: albums[0].link, userCountry: 'US' },
      timeout: 15000,
    });
    const sp = res.data.linksByPlatform?.spotify;
    if (sp?.url) { console.log(`✅ Deezer+Odesli found Spotify URL`); return sp.url; }
    return null;
  }

  async tryMusicBrainz(albumName, artistName) {
    console.log(`🔍 MusicBrainz lookup...`);
    const searchRes = await axios.get('https://musicbrainz.org/ws/2/release-group', {
      params: { query: `release:"${albumName}" AND artist:"${artistName}"`, limit: 3, fmt: 'json' },
      headers: MB_HEADERS,
      timeout: 8000,
    });
    const groups = searchRes.data['release-groups'];
    if (!groups?.length) return null;
    for (const group of groups) {
      const rgRes = await axios.get(`https://musicbrainz.org/ws/2/release-group/${group.id}`, {
        params: { inc: 'url-rels', fmt: 'json' },
        headers: MB_HEADERS,
      });
      const rgSpotify = (rgRes.data.relations || []).find(r => r.url?.resource?.includes('open.spotify.com/album'));
      if (rgSpotify) return rgSpotify.url.resource;
      const releasesRes = await axios.get('https://musicbrainz.org/ws/2/release', {
        params: { 'release-group': group.id, inc: 'url-rels', fmt: 'json', limit: 10 },
        headers: MB_HEADERS,
      });
      for (const release of releasesRes.data.releases || []) {
        const rel = (release.relations || []).find(r => r.url?.resource?.includes('open.spotify.com/album'));
        if (rel) return rel.url.resource;
      }
    }
    return null;
  }
}

module.exports = new iTunesService();
