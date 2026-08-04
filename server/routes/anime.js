const express = require('express');
const { getPool } = require('../config/database');
const { paginate } = require('../utils/helpers');
const auth = require('../middleware/auth');
const { importLimiter } = require('../middleware/rateLimit');
const { importAnikotoAnime } = require('../utils/anikotoImporter');

const router = express.Router();

// Simple in-memory cache for external API calls
const apiCache = new Map();
// Read a cached API entry if it is still within its TTL window.
function getCached(key, ttlMs = 300000) {
  const entry = apiCache.get(key);
  if (entry && Date.now() - entry.ts < ttlMs) return entry.data;
  return null;
}
// Store data in the cache with the current timestamp.
function setCache(key, data) {
  apiCache.set(key, { data, ts: Date.now() });
}

// List anime with optional filters, search, and sorting.
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { genre, status, sort, search, language, year, season } = req.query;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (genre) {
      whereClause += ' AND FIND_IN_SET(?, genres)';
      params.push(genre);
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    if (language) {
      whereClause += ' AND language = ?';
      params.push(language);
    }

    if (year) {
      whereClause += ' AND release_year = ?';
      params.push(parseInt(year));
    }

    if (season) {
      whereClause += ' AND season = ?';
      params.push(season);
    }

    if (search) {
      whereClause += ' AND (title LIKE ? OR series_title LIKE ? OR description LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    let orderClause = 'ORDER BY created_at DESC';
    if (sort === 'rating') orderClause = 'ORDER BY rating DESC';
    else if (sort === 'views') orderClause = 'ORDER BY views DESC';
    else if (sort === 'title') orderClause = 'ORDER BY title ASC';
    else if (sort === 'year') orderClause = 'ORDER BY release_year DESC';
    else if (sort === 'newest') orderClause = 'ORDER BY created_at DESC';
    else if (sort === 'oldest') orderClause = 'ORDER BY created_at ASC';

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM anime ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    const [anime] = await pool.query(
      `SELECT * FROM anime ${whereClause} ${orderClause} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: {
        anime,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get anime list error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Return featured anime (cached) sorted by rating.
router.get('/featured', async (req, res) => {
  try {
    const cached = getCached('featured_db', 120000);
    if (cached) return res.json(cached);
    const pool = await getPool();
    const [anime] = await pool.query(
      'SELECT * FROM anime WHERE is_featured = 1 ORDER BY rating DESC LIMIT 10'
    );
    const result = { success: true, data: anime };
    setCache('featured_db', result);
    res.json(result);
  } catch (error) {
    console.error('Get featured anime error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Return ongoing anime with the most views, cached briefly.
router.get('/trending', async (req, res) => {
  try {
    const cached = getCached('trending_db', 120000);
    if (cached) return res.json(cached);
    const pool = await getPool();
    const [anime] = await pool.query(
      'SELECT * FROM anime WHERE status = "ongoing" ORDER BY views DESC LIMIT 20'
    );
    const result = { success: true, data: anime };
    setCache('trending_db', result);
    res.json(result);
  } catch (error) {
    console.error('Get trending anime error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Return recently updated anime with their latest episode dates.
router.get('/recent', async (req, res) => {
  try {
    const pool = await getPool();
    const [anime] = await pool.query(
      `SELECT a.*, 
        (SELECT MAX(created_at) FROM episodes WHERE anime_id = a.id) as latest_episode
       FROM anime a 
       ORDER BY latest_episode DESC, a.created_at DESC 
       LIMIT 20`
    );

    res.json({
      success: true,
      data: anime
    });
  } catch (error) {
    console.error('Get recent anime error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Collect and sort a unique list of all anime genres.
router.get('/genres', async (req, res) => {
  try {
    const pool = await getPool();
    const [anime] = await pool.query('SELECT genres FROM anime WHERE genres IS NOT NULL AND genres != ""');

    const genreSet = new Set();
    anime.forEach(a => {
      if (a.genres) {
        a.genres.split(',').forEach(g => {
          const trimmed = g.trim();
          if (trimmed) genreSet.add(trimmed);
        });
      }
    });

    const genres = Array.from(genreSet).sort();

    res.json({
      success: true,
      data: genres
    });
  } catch (error) {
    console.error('Get genres error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Build a weekly broadcast schedule for ongoing anime.
router.get('/schedule', async (req, res) => {
  try {
    const pool = await getPool();
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const schedule = {};

    for (const day of days) {
      const [anime] = await pool.query(
        'SELECT * FROM anime WHERE broadcast_day = ? AND status = "ongoing" ORDER BY broadcast_time ASC',
        [day]
      );
      schedule[day] = anime;
    }

    res.json({
      success: true,
      data: schedule
    });
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Return anime detail with episodes, similar titles, and external fallback.
router.get('/:slug', async (req, res) => {
  try {
    const pool = await getPool();
    const { slug } = req.params;

    let [anime] = await pool.query('SELECT * FROM anime WHERE slug = ?', [slug]);

    // If not found by slug, try looking up by anikoto_id (format: anikoto-{id})
    let isExternal = false;
    if (anime.length === 0 && slug.startsWith('anikoto-')) {
      const anikotoId = slug.replace('anikoto-', '');
      [anime] = await pool.query('SELECT * FROM anime WHERE anikoto_id = ?', [anikotoId]);
      if (anime.length === 0) {
        // Not in DB yet - fetch from external API
        try {
          const extRes = await fetch(`https://anikotoapi.site/series/${anikotoId}`);
          if (extRes.ok) {
            const extData = await extRes.json();
            if (extData.ok && extData.data) {
              const info = extData.data.anime;
              const epList = extData.data.episodes || [];
              return res.json({
                success: true,
                data: {
                  id: `ext_${anikotoId}`,
                  title: info.title || 'Unknown',
                  slug: `anikoto-${anikotoId}`,
                  description: info.description || '',
                  poster: info.poster || '',
                  banner: info.background_image || '',
                  genres: info.terms_by_type?.genre?.join(',') || '',
                  studio: info.terms_by_type?.studios?.join(',') || '',
                  rating: info.score || 0,
                  release_year: info.year || null,
                  duration: info.duration ? `${info.duration}m` : '',
                  status: info.status === 'Currently Airing' ? 'ongoing' : 'completed',
                  anikoto_id: anikotoId,
                  imported: false,
                  episodes: epList.map(ep => ({
                    id: `ext_ep_${ep.number}`,
                    episode_number: ep.number,
                    title: ep.title || `Episode ${ep.number}`,
                    sources: [
                      ep.embed_url?.sub ? { language: 'sub', server_name: 'MegaPlay', video_url: ep.embed_url.sub, embed_link: null, source_type: 'embed' } : null,
                      ep.embed_url?.dub ? { language: 'dub', server_name: 'MegaPlay', video_url: ep.embed_url.dub, embed_link: null, source_type: 'embed' } : null,
                    ].filter(Boolean),
                  })),
                  similar: [],
                }
              });
            }
          }
        } catch (e) {
          // fall through to 404
        }
        return res.status(404).json({
          success: false,
          message: 'Anime not found'
        });
      }
    }

    if (anime.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Anime not found'
      });
    }

    await pool.query('UPDATE anime SET views = views + 1 WHERE id = ?', [anime[0].id]);

    const [episodes] = await pool.query(
      'SELECT * FROM episodes WHERE anime_id = ? ORDER BY episode_number ASC',
      [anime[0].id]
    );

    const [similarAnime] = await pool.query(
      `SELECT * FROM anime 
       WHERE FIND_IN_SET(?, genres) AND id != ? 
       ORDER BY rating DESC LIMIT 6`,
      [anime[0].genres ? anime[0].genres.split(',')[0].trim() : '', anime[0].id]
    );

    res.json({
      success: true,
      data: {
        ...anime[0],
        episodes,
        similar: similarAnime
      }
    });
  } catch (error) {
    console.error('Get anime detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Return a paginated list of episodes for a given anime id.
router.get('/:id/episodes', async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    const [anime] = await pool.query('SELECT id FROM anime WHERE id = ?', [id]);
    if (anime.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Anime not found'
      });
    }

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM episodes WHERE anime_id = ?',
      [id]
    );
    const total = countResult[0].total;

    const [episodes] = await pool.query(
      'SELECT * FROM episodes WHERE anime_id = ? ORDER BY episode_number ASC LIMIT ? OFFSET ?',
      [id, limit, offset]
    );

    res.json({
      success: true,
      data: {
        episodes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get episodes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Fetch recent anime from Anikoto API (external)
router.get('/external/recent', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const per_page = parseInt(req.query.per_page) || 20;
    const cacheKey = `recent_${page}_${per_page}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`https://anikotoapi.site/recent-anime?page=${page}&per_page=${per_page}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) {
      return res.status(500).json({ success: false, message: 'Anikoto API error' });
    }
    const apiData = await response.json();
    const animeList = apiData.data || [];

    const pool = await getPool();
    const animeWithStatus = await Promise.all(animeList.map(async (a) => {
      const [existing] = await pool.query('SELECT id, slug FROM anime WHERE anikoto_id = ?', [a.id]);
      return {
        id: a.id,
        title: a.title,
        slug: existing.length > 0 ? existing[0].slug : null,
        poster: a.poster,
        banner: a.background_image,
        description: a.description,
        genres: a.terms_by_type?.genre?.join(',') || '',
        studio: a.terms_by_type?.studios?.join(',') || '',
        rating: a.score,
        status: a.status === 'Currently Airing' ? 'ongoing' : 'completed',
        episodes: a.episodes || '',
        year: a.year,
        season: a.season,
        duration: a.duration,
        ani_id: a.ani_id,
        mal_id: a.mal_id,
        imported: existing.length > 0,
        anikoto_id: a.id,
      };
    }));

    const result = {
      success: true,
      data: {
        anime: animeWithStatus,
        pagination: apiData.pagination || { total_pages: 1, total: animeWithStatus.length }
      }
    };
    setCache(cacheKey, result);
    res.json(result);
  } catch (error) {
    console.error('Fetch external recent error:', error);
    if (error.name === 'AbortError') {
      return res.status(504).json({ success: false, message: 'Anikoto API timeout' });
    }
    res.status(500).json({ success: false, message: 'Failed to fetch from Anikoto' });
  }
});

// Fetch single anime from Anikoto API
router.get('/external/series/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const response = await fetch(`https://anikotoapi.site/series/${id}`);
    if (!response.ok) {
      return res.status(500).json({ success: false, message: 'Anikoto API error' });
    }
    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Search Anikoto API
router.get('/external/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json({ success: true, data: { anime: [] } });
    const response = await fetch(`https://anikotoapi.site/search?q=${encodeURIComponent(q)}`);
    if (!response.ok) return res.status(500).json({ success: false, message: 'Anikoto API error' });
    const data = await response.json();
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Auto-import an external anime into the DB. Called when a logged-in user starts
// watching an anime that is not imported yet. Idempotent (no-op if already imported).
router.post('/external/import', auth, importLimiter, async (req, res) => {
  try {
    const { anikoto_id } = req.body;
    if (!anikoto_id) {
      return res.status(400).json({ success: false, message: 'anikoto_id is required' });
    }

    const pool = await getPool();
    const result = await importAnikotoAnime(pool, String(anikoto_id), req.user.id, false);

    res.json({
      success: true,
      data: {
        alreadyImported: result.alreadyImported,
        anime: result.anime || { id: result.id }
      }
    });
  } catch (error) {
    console.error('Auto-import error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
