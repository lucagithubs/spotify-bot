function formatDuration(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function formatTotalDuration(tracks) {
  const totalMs = tracks.reduce((sum, t) => sum + t.duration_ms, 0);
  const totalSeconds = Math.floor(totalMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function truncate(str, max) {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function formatTracklistFields(tracks, artistName) {
  const fields = [];
  let current = '';
  let fieldIndex = 0;

  for (const [i, track] of tracks.entries()) {
    const url = track.spotify_url || `https://open.spotify.com/search/${encodeURIComponent(`${track.name} ${artistName || ''}`)}`;
    // Keep name short enough so the whole line fits on one line in Discord
    const shortName = truncate(track.name, 28);
    const dur = formatDuration(track.duration_ms);
    const num = String(i + 1).padStart(2, '0');
    const line = `\`${num}\` [${shortName}](${url}) \`${dur}\`\n`;

    if ((current + line).length > 1020) {
      fields.push({ name: fieldIndex === 0 ? '📋 Tracklist' : '​', value: current, inline: false });
      current = line;
      fieldIndex++;
    } else {
      current += line;
    }
  }

  if (current) {
    fields.push({ name: fieldIndex === 0 ? '📋 Tracklist' : '​', value: current, inline: false });
  }

  return fields;
}

function formatPopularity(score) {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  return `${'█'.repeat(filled)}${'░'.repeat(empty)} ${score}%`;
}

module.exports = { formatDuration, formatTotalDuration, formatTracklistFields, formatPopularity };
