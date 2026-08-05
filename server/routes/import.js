const express = require('express');
const { getPool } = require('../config/database');
const auth = require('../middleware/auth');
const { adminAuth, requirePermission } = require('../middleware/adminAuth');
const { generateSlug, delay, fetchWithTimeout } = require('../utils/helpers');
const { importAnikotoAnime } = require('../utils/anikotoImporter');
const { importLimiter } = require('../middleware/rateLimit');
const { searchMangaDex, getMangaDexInfo, getMangaChapters, importMangaIntoDb } = require('../utils/mangaImporter');

const router = express.Router();

router.use(auth, adminAuth);

const ANIZEN_API_URL = process.env.ANIZEN_API_URL || 'https://api.anizen.tr';

// Fetch JSON from the Anizen API and throw on error responses.
async function anizenFetch(path) {
  const response = await fetchWithTimeout(`${ANIZEN_API_URL}${path}`, {
    headers: { 'Accept': 'application/json' }
  }, 12000);
  if (!response.ok) throw new Error(`Anizen API error: ${response.statusText}`);
  const data = await response.json();
  if (data.success === false && !data.results) throw new Error('Anizen API returned error');
  return data;
}

// Check Anikoto API status
router.get('/anikoto/status', async (req, res) => {
  try {
    const response = await fetchWithTimeout('https://anikotoapi.site/recent-anime?page=1&per_page=1', {}, 8000);
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
    const response = await fetchWithTimeout(`https://anikotoapi.site/search?q=${encodeURIComponent(q)}`, {}, 8000);
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
      response = await fetchWithTimeout(`https://anikotoapi.site/search?q=${encodeURIComponent(req.query.q)}`, {}, 8000);
    } else {
      response = await fetchWithTimeout(`https://anikotoapi.site/recent-anime?page=${page}&per_page=${per_page}`, {}, 8000);
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
    const result = await importAnikotoAnime(pool, anikoto_id, req.user.id, is_premium);

    if (result.alreadyImported) {
      return res.status(400).json({ success: false, message: 'Anime already imported' });
    }

    res.status(201).json({ success: true, data: result.anime });
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

// ===== MANGA (MangaDex) IMPORT =====

// Check MangaDex API status
router.get('/manga/status', async (req, res) => {
  try {
    const data = await searchMangaDex('one piece', 1);
    res.json({ success: true, online: (data.total || 0) >= 0 });
  } catch (error) {
    res.json({ success: true, online: false });
  }
});

// Search MangaDex
router.get('/manga/search', async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;
    if (!q) return res.json({ success: true, data: { manga: [], total: 0 } });
    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, Math.max(1, parseInt(limit)));
    const data = await searchMangaDex(q, Math.min(100, Math.max(1, parseInt(limit))), offset);

    const pool = await getPool();
    const withStatus = await Promise.all(data.manga.map(async (m) => {
      const [existing] = await pool.query('SELECT id FROM mangas WHERE mangadex_id = ?', [m.id]);
      return { ...m, imported: existing.length > 0 };
    }));

    res.json({
      success: true,
      data: {
        manga: withStatus,
        total: data.total,
        limit: data.limit,
        offset: data.offset,
        totalPages: Math.ceil(data.total / data.limit) || 1,
      },
    });
  } catch (error) {
    console.error('MangaDex search error:', error);
    res.status(502).json({ success: false, message: 'MangaDex API unavailable' });
  }
});

// MangaDex detail + chapters (preview before import)
router.get('/manga/info', async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ success: false, message: 'id is required' });
    const info = await getMangaDexInfo(id);
    const chapters = await getMangaChapters(id);
    const pool = await getPool();
    const [existing] = await pool.query('SELECT id FROM mangas WHERE mangadex_id = ?', [id]);
    res.json({
      success: true,
      data: { ...info, chapters: chapters.slice(0, 50), chapterCount: chapters.length, imported: existing.length > 0 },
    });
  } catch (error) {
    console.error('MangaDex info error:', error);
    res.status(502).json({ success: false, message: error.message });
  }
});

// Import manga + chapters from MangaDex
router.post('/manga', requirePermission('add_anime'), importLimiter, async (req, res) => {
  try {
    const { mangadex_id } = req.body;
    if (!mangadex_id) {
      return res.status(400).json({ success: false, message: 'mangadex_id is required' });
    }

    const pool = await getPool();
    const result = await importMangaIntoDb(pool, mangadex_id, req.user.id);

    if (result.alreadyImported) {
      return res.status(400).json({ success: false, message: 'Manga already imported' });
    }

    res.status(201).json({ success: true, data: result.manga });
  } catch (error) {
    console.error('Import manga error:', error);
    res.status(500).json({ success: false, message: `Import failed: ${error.message}` });
  }
});

// Refresh chapters for an imported manga
router.post('/manga/:id/refresh', requirePermission('add_anime'), async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    const [manga] = await pool.query('SELECT mangadex_id, title FROM mangas WHERE id = ?', [id]);
    if (manga.length === 0 || !manga[0].mangadex_id) {
      return res.status(404).json({ success: false, message: 'Manga not found or no MangaDex id' });
    }

    const chapters = await getMangaChapters(manga[0].mangadex_id);
    for (const ch of chapters) {
      await pool.query(
        `INSERT IGNORE INTO manga_chapters (manga_id, chapter_uuid, chapter_number, title, volume, language, scanlation_group, external_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          ch.chapter_uuid,
          ch.chapter_number,
          ch.title || `Chapter ${ch.chapter_number || '?'}`,
          ch.volume,
          ch.language,
          ch.scanlation_group,
          ch.external_url,
        ]
      );
    }

    const [count] = await pool.query('SELECT COUNT(*) as total FROM manga_chapters WHERE manga_id = ?', [id]);
    res.json({ success: true, message: `Refreshed chapters for ${manga[0].title}`, data: { total: count[0].total } });
  } catch (error) {
    console.error('Refresh manga chapters error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete imported manga (cascades chapters)
router.delete('/manga/:id', requirePermission('add_anime'), async (req, res) => {
  try {
    const { id } = req.params;
    const pool = await getPool();
    await pool.query('DELETE FROM mangas WHERE id = ?', [id]);
    res.json({ success: true, message: 'Manga deleted' });
  } catch (error) {
    console.error('Delete manga error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
