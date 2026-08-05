const { generateSlug, fetchWithTimeout } = require('./helpers');

// Full import of an anime (with all episodes + sources) from the Anikoto API.
// Used by the admin import route and by auto-import when a user watches an
// external (not-yet-imported) anime. Idempotent: returns alreadyImported if the
// anime exists in the DB.
async function importAnikotoAnime(pool, anikoto_id, userId = null, is_premium = false) {
  const [existing] = await pool.query('SELECT id FROM anime WHERE anikoto_id = ?', [anikoto_id]);
  if (existing.length > 0) {
    return { alreadyImported: true, id: existing[0].id };
  }

  const response = await fetchWithTimeout(`https://anikotoapi.site/series/${anikoto_id}`, {}, 15000);
  if (!response.ok) {
    throw new Error(`Anikoto API error: ${response.statusText}`);
  }
  const apiData = await response.json();
  if (!apiData.ok) {
    throw new Error('Anikoto API returned error');
  }

  const animeInfo = apiData.data.anime;
  const episodes = apiData.data.episodes || [];

  const title = animeInfo.title || 'Unknown Title';
  const slug = generateSlug(title);

  const [existingSlug] = await pool.query('SELECT id FROM anime WHERE slug = ?', [slug]);
  let finalSlug = slug;
  if (existingSlug.length > 0) {
    finalSlug = `${slug}-${Date.now()}`;
  }

  const genres = animeInfo.terms_by_type?.genre ? animeInfo.terms_by_type.genre.join(',') : '';
  const studio = animeInfo.terms_by_type?.studios ? animeInfo.terms_by_type.studios.join(',') : '';
  const anilist_id = animeInfo.ani_id || null;
  const mal_id = animeInfo.mal_id || null;

  const [result] = await pool.query(
    `INSERT INTO anime (title, slug, description, poster, banner, genres, studio,
      rating, mal_score, release_year, duration, language, status, episode_count,
      anilist_id, mal_id, anikoto_id, is_premium)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      finalSlug,
      animeInfo.description || '',
      animeInfo.poster || '',
      animeInfo.background_image || '',
      genres,
      studio,
      animeInfo.score || 0,
      animeInfo.score || 0,
      animeInfo.year || null,
      animeInfo.duration ? `${animeInfo.duration}m` : '',
      animeInfo.is_dub ? 'dub' : 'sub',
      animeInfo.status === 'Currently Airing' ? 'ongoing' : 'completed',
      episodes.length || 0,
      anilist_id,
      mal_id,
      anikoto_id,
      is_premium ? 1 : 0
    ]
  );

  const animeId = result.insertId;

  // Insert episodes with actual embed URLs from the API
  for (const ep of episodes) {
    const [epResult] = await pool.query(
      'INSERT INTO episodes (anime_id, episode_number, title, description, thumbnail, duration) VALUES (?, ?, ?, ?, ?, ?)',
      [animeId, ep.number, ep.title || `Episode ${ep.number}`, '', '', '']
    );

    // Add SUB source
    if (ep.embed_url?.sub) {
      await pool.query(
        'INSERT INTO episode_sources (episode_id, language, server_name, video_url, embed_link, source_type) VALUES (?, ?, ?, ?, ?, ?)',
        [epResult.insertId, 'sub', 'MegaPlay', ep.embed_url.sub, null, 'embed']
      );
    }

    // Add DUB source
    if (ep.embed_url?.dub) {
      await pool.query(
        'INSERT INTO episode_sources (episode_id, language, server_name, video_url, embed_link, source_type) VALUES (?, ?, ?, ?, ?, ?)',
        [epResult.insertId, 'dub', 'MegaPlay', ep.embed_url.dub, null, 'embed']
      );
    }
  }

  await pool.query('UPDATE anime SET episode_count = ? WHERE id = ?', [episodes.length, animeId]);

  if (userId) {
    await pool.query(
      'INSERT INTO activity_feed (user_id, action, details) VALUES (?, ?, ?)',
      [userId, 'import_anime', `Auto-imported from Anikoto: ${title} (${episodes.length} episodes)`]
    );
  }

  const [newAnime] = await pool.query('SELECT * FROM anime WHERE id = ?', [animeId]);
  return { alreadyImported: false, anime: newAnime[0] };
}

module.exports = { importAnikotoAnime };
