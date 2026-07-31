const express = require('express');
const { getPool } = require('../config/database');
const auth = require('../middleware/auth');
const { adminAuth, requirePermission } = require('../middleware/adminAuth');
const { generateSlug, delay } = require('../utils/helpers');
const { importLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.use(auth, adminAuth);

const ANIZEN_API_URL = process.env.ANIZEN_API_URL || 'https://api.zenime.me';

async function anizenFetch(path) {
  const response = await fetch(`${ANIZEN_API_URL}${path}`, {
    headers: { 'Accept': 'application/json' }
  });
  if (!response.ok) throw new Error(`Anizen API error: ${response.statusText}`);
  const data = await response.json();
  if (data.success === false && !data.results) throw new Error('Anizen API returned error');
  return data;
}

// Check Anikoto API status
router.get('/anikoto/status', async (req, res) => {
  try {
    const response = await fetch('https://anikotoapi.site/recent-anime?page=1&per_page=1');
    const data = await response.json();
    res.json({ success: true, online: data.ok === true });
  } catch (error) {
    res.json({ success: true, online: false });
  }
});

// Search Anikoto API
router.get('/anikoto/search', async (req, res) => {
  try {
    const { q, page = 1 } = req.query;
    if (!q) return res.json({ success: true, data: { anime: [], pagination: {} } });
    // Use the Anikoto search endpoint directly
    const response = await fetch(`https://anikotoapi.site/search?q=${encodeURIComponent(q)}`);
    const data = await response.json();
    const animeList = data.data || [];
    const pool = await getPool();

    const withStatus = await Promise.all(animeList.map(async (a) => {
      const [existing] = await pool.query('SELECT id FROM anime WHERE anikoto_id = ?', [a.id]);
      return { ...a, imported: existing.length > 0 };
    }));

    res.json({ success: true, data: { anime: withStatus, pagination: data.pagination || {} } });
  } catch (error) {
    console.error('Anikoto search error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Browse Anikoto recent
router.get('/anikoto/browse', async (req, res) => {
  try {
    const { page = 1, per_page = 20 } = req.query;
    // Try recent first, then search if q is provided
    let response;
    if (req.query.q) {
      response = await fetch(`https://anikotoapi.site/search?q=${encodeURIComponent(req.query.q)}`);
    } else {
      response = await fetch(`https://anikotoapi.site/recent-anime?page=${page}&per_page=${per_page}`);
    }
    const data = await response.json();
    const animeList = data.data || [];
    const pool = await getPool();

    const withStatus = await Promise.all(animeList.map(async (a) => {
      const [existing] = await pool.query('SELECT id FROM anime WHERE anikoto_id = ?', [a.id]);
      return { ...a, imported: existing.length > 0 };
    }));

    res.json({ success: true, data: { anime: withStatus, pagination: data.pagination || {} } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Import from Anikoto - FULL import with episodes
router.post('/anikoto', requirePermission('add_anime'), async (req, res) => {
  try {
    const { anikoto_id, is_premium } = req.body;
    if (!anikoto_id) {
      return res.status(400).json({ success: false, message: 'anikoto_id is required' });
    }

    const pool = await getPool();
    const [existing] = await pool.query('SELECT id FROM anime WHERE anikoto_id = ?', [anikoto_id]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Anime already imported' });
    }

    // Fetch series details with episodes from Anikoto API
    const response = await fetch(`https://anikotoapi.site/series/${anikoto_id}`);
    if (!response.ok) {
      return res.status(500).json({ success: false, message: `Anikoto API error: ${response.statusText}` });
    }
    const apiData = await response.json();
    if (!apiData.ok) {
      return res.status(500).json({ success: false, message: 'Anikoto API returned error' });
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

    const genres = animeInfo.terms_by_type?.genre
      ? animeInfo.terms_by_type.genre.join(',')
      : '';
    const studio = animeInfo.terms_by_type?.studios
      ? animeInfo.terms_by_type.studios.join(',')
      : '';
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

    // Insert episodes with actual embed URLs from API
    for (const ep of episodes) {
      const [epResult] = await pool.query(
        'INSERT INTO episodes (anime_id, episode_number, title, description, thumbnail, duration) VALUES (?, ?, ?, ?, ?, ?)',
        [
          animeId,
          ep.number,
          ep.title || `Episode ${ep.number}`,
          '',
          '',
          ''
        ]
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

    // Update episode count
    await pool.query('UPDATE anime SET episode_count = ? WHERE id = ?', [episodes.length, animeId]);

    await pool.query(
      'INSERT INTO activity_feed (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'import_anime', `Imported from Anikoto: ${title} (${episodes.length} episodes)`]
    );

    const [newAnime] = await pool.query('SELECT * FROM anime WHERE id = ?', [animeId]);
    res.status(201).json({ success: true, data: newAnime[0] });
  } catch (error) {
    console.error('Import from Anikoto error:', error);
    res.status(500).json({ success: false, message: `Import failed: ${error.message}` });
  }
});

// ===== ANIZEN IMPORT =====

// Check Anizen API status
router.get('/anizen/status', async (req, res) => {
  try {
    await anizenFetch('/api/home');
    res.json({ success: true, online: true });
  } catch (error) {
    res.json({ success: true, online: false });
  }
});

// Anizen home (spotlights + trending)
router.get('/anizen/home', async (req, res) => {
  try {
    const data = await anizenFetch('/api/home');
    const results = data.results || {};
    res.json({
      success: true,
      data: {
        results: {
          spotlights: results.spotlights || results.spotLight || [],
          trending: results.trending || [],
          top10: results.top10 || null
        }
      }
    });
  } catch (error) {
    console.error('Anizen home error:', error);
    res.status(502).json({ success: false, message: 'Anizen API unavailable' });
  }
});

// Anizen search
router.get('/anizen/search', async (req, res) => {
  try {
    const { q, page = 1, keyword } = req.query;
    const query = q || keyword;
    if (!query) return res.json({ success: true, data: { results: [] }, totalPages: 1 });

    const data = await anizenFetch(`/api/search?keyword=${encodeURIComponent(query)}&page=${page}`);
    const results = data.results || {};
    const list = results.data || results.animes || [];

    const pool = await getPool();
    const withStatus = await Promise.all(list.map(async (a) => {
      const id = a.id || a._id;
      const [existing] = await pool.query('SELECT id FROM anime WHERE anikoto_id = ? OR title = ?', [id, a.title]);
      return { ...a, imported: existing.length > 0 };
    }));

    const totalPages = Math.ceil((results.totalResults || 0) / (results.perPage || 20)) || 1;

    res.json({ success: true, data: { results: withStatus }, totalPages });
  } catch (error) {
    console.error('Anizen search error:', error);
    res.status(502).json({ success: false, message: 'Anizen API unavailable' });
  }
});

// Import from Anizen
router.post('/anizen', requirePermission('add_anime'), importLimiter, async (req, res) => {
  try {
    const { anizen_id, data: itemData } = req.body;
    if (!anizen_id) {
      return res.status(400).json({ success: false, message: 'anizen_id is required' });
    }

    const pool = await getPool();

    let info = null;
    let episodes = [];
    try {
      const apiData = await anizenFetch(`/api/info?id=${encodeURIComponent(anizen_id)}`);
      const results = apiData.results || {};
      info = results.info || results.animeInfo || null;
      episodes = results.episodes || results.episodeList || [];
    } catch (e) {
      console.warn('Anizen info fetch failed, using client data:', e.message);
    }

    const src = info || itemData || {};
    const title = src.title || 'Unknown Title';
    const slug = generateSlug(title);

    const [existingTitle] = await pool.query('SELECT id FROM anime WHERE title = ?', [title]);
    if (existingTitle.length > 0) {
      return res.status(400).json({ success: false, message: 'Anime already imported' });
    }

    const [existingSlug] = await pool.query('SELECT id FROM anime WHERE slug = ?', [slug]);
    let finalSlug = slug;
    if (existingSlug.length > 0) {
      finalSlug = `${slug}-${Date.now()}`;
    }

    const genres = Array.isArray(src.genres)
      ? src.genres.join(',')
      : (src.genre || '');
    const description = src.description || src.synopsis || '';
    const poster = src.poster || src.image || src.poster_image || '';
    const banner = src.background || src.backdrop || src.banner_image || poster;
    const rating = typeof src.rating === 'object' ? (src.rating.score || src.rating.mean || 0) : (parseFloat(src.rating) || parseFloat(src.score) || 0);

    const [result] = await pool.query(
      `INSERT INTO anime (title, slug, description, poster, banner, genres, studio,
        rating, mal_score, release_year, duration, language, status, episode_count,
        anilist_id, mal_id, anikoto_id, is_premium)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        finalSlug,
        description,
        poster,
        banner,
        genres,
        src.studio || src.studios || '',
        rating,
        rating,
        src.year || src.releaseYear || null,
        src.duration ? `${src.duration}` : '',
        'sub',
        src.status === 'Ongoing' ? 'ongoing' : (src.status || 'completed'),
        episodes.length || 0,
        null,
        src.malId || null,
        anizen_id,
        0
      ]
    );

    const animeId = result.insertId;

    // Insert episodes (metadata only; streaming sources resolved at watch time via Anizen)
    for (const ep of episodes) {
      const epNumber = ep.number || ep.episodeNumber || 0;
      await pool.query(
        'INSERT INTO episodes (anime_id, episode_number, title, description, thumbnail, duration) VALUES (?, ?, ?, ?, ?, ?)',
        [
          animeId,
          epNumber,
          ep.title || `Episode ${epNumber}`,
          ep.description || '',
          ep.image || ep.thumbnail || '',
          ''
        ]
      );
    }

    await pool.query('UPDATE anime SET episode_count = ? WHERE id = ?', [episodes.length, animeId]);

    await pool.query(
      'INSERT INTO activity_feed (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'import_anime', `Imported from Anizen: ${title} (${episodes.length} episodes)`]
    );

    const [newAnime] = await pool.query('SELECT * FROM anime WHERE id = ?', [animeId]);
    res.status(201).json({ success: true, data: newAnime[0] });
  } catch (error) {
    console.error('Import from Anizen error:', error);
    res.status(500).json({ success: false, message: `Import failed: ${error.message}` });
  }
});

module.exports = router;
