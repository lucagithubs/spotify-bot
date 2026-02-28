const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const spotify = require('../services/spotify');
const itunes = require('../services/itunes');
const lastfm = require('../services/lastfm');
const { formatTotalDuration, formatTracklistFields, formatPopularity } = require('../utils/format');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ss')
    .setDescription('Look up music on Spotify')
    .addSubcommand(sub => sub
      .setName('album')
      .setDescription('Search for an album')
      .addStringOption(opt => opt.setName('query').setDescription('Album name or Spotify URL').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('creator')
      .setDescription('Search for an artist')
      .addStringOption(opt => opt.setName('query').setDescription('Artist name or Spotify URL').setRequired(true))
    )
    .addSubcommand(sub => sub
      .setName('playlist')
      .setDescription('Find a Spotify playlist')
      .addStringOption(opt => opt.setName('query').setDescription('Playlist name or Spotify URL').setRequired(true))
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const sub = interaction.options.getSubcommand();
    const query = interaction.options.getString('query');
    console.log(`🎵 /ss ${sub}: "${query}"`);

    if (sub === 'album') {
      const spotifyId = spotify.parseSpotifyInput(query);
      const album = spotifyId
        ? await spotify.getFullAlbum(spotifyId)
        : await itunes.searchAlbum(query);
      if (!album) return interaction.editReply('❌ No album found!');
      return interaction.editReply({ embeds: [buildAlbumEmbed(album)] });
    }

    if (sub === 'creator') {
      const artistUrlMatch = query.match(/open\.spotify\.com\/artist\/([a-zA-Z0-9]+)/);
      let spotifyUrl = artistUrlMatch ? `https://open.spotify.com/artist/${artistUrlMatch[1]}` : null;
      let artistName = query;

      if (!spotifyUrl) {
        const result = await lastfm.isArtistQuery(query);
        if (!result) return interaction.editReply('❌ Artist not found!');
        spotifyUrl = result.spotifyUrl;
        artistName = result.artistName;
      }

      const artistData = await lastfm.getArtistTopAlbums(artistName, spotifyUrl);
      if (!artistData) return interaction.editReply('❌ Could not fetch artist data!');
      return interaction.editReply({ embeds: [buildArtistEmbed(artistData)] });
    }

    if (sub === 'playlist') {
      const playlistMatch = query.match(/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/);
      if (playlistMatch) {
        const url = `https://open.spotify.com/playlist/${playlistMatch[1]}`;
        return interaction.editReply({
          embeds: [new EmbedBuilder()
            .setColor('#1DB954')
            .setTitle('🎵 Spotify Playlist')
            .setDescription(`[Open Playlist](${url})`)
            .setURL(url)
            .setFooter({ text: 'Powered by Spotify' })]
        });
      }

      const playlistUrl = lastfm.findSpotifyPlaylistUrl(query);
      return interaction.editReply({
        embeds: [new EmbedBuilder()
          .setColor('#1DB954')
          .setTitle(`🎵 ${query}`)
          .setDescription(`[Search this playlist on Spotify](${playlistUrl})`)
          .setURL(playlistUrl)
          .setFooter({ text: 'Powered by Spotify' })]
      });
    }
  },
};

function buildAlbumEmbed(album) {
  const artistName = album.artists[0]?.name || '';
  const artistLinks = album.artists.map(a => `[${a.name}](${a.url})`).join(', ');
  const genres = album.genres?.length ? album.genres.join(', ') : 'N/A';

  const embed = new EmbedBuilder()
    .setColor('#1DB954')
    .setAuthor({ name: '🎵 Album Lookup' })
    .setTitle(album.name)
    .setURL(album.url)
    .setThumbnail(album.artwork)
    .setDescription(`by ${artistLinks}`)
    .addFields(
      { name: '📅 Released', value: album.release_date, inline: true },
      { name: '🎵 Tracks', value: `${album.total_tracks}`, inline: true },
      { name: '⏱️ Duration', value: formatTotalDuration(album.tracks), inline: true },
      { name: '🎸 Genre', value: genres, inline: true },
    );

  if (album.label) embed.addFields({ name: '🏷️ Label', value: album.label, inline: true });
  if (album.popularity != null) embed.addFields({ name: '🔥 Popularity', value: formatPopularity(album.popularity), inline: false });

  embed.addFields(...formatTracklistFields(album.tracks, artistName));
  embed.setImage(album.artwork);
  embed.setFooter({ text: album.copyright || 'Powered by Spotify • iTunes • Odesli' });

  return embed;
}

function buildArtistEmbed(artist) {
  const albumList = artist.albums
    .map(a => `\`${a.rank}.\` [${a.name}](${a.url}) — **${a.playcount}** plays`)
    .join('\n');

  return new EmbedBuilder()
    .setColor('#1DB954')
    .setAuthor({ name: '🎙️ Artist Lookup' })
    .setTitle(artist.name)
    .setURL(artist.url)
    .setThumbnail(artist.albums[0]?.image || null)
    .setDescription(`**${artist.listeners}** listeners on Last.fm`)
    .addFields({ name: '🏆 Top Albums', value: albumList || 'No albums found', inline: false })
    .setFooter({ text: 'Powered by Last.fm • Spotify' });
}