const express = require('express');
const { getPool } = require('../config/database');
const { paginate } = require('../utils/helpers');

const router = express.Router();

// In-memory cache for external (Anikoto) search results
const extCache = new Map();

// Search local anime and merge in non-imported external Anikoto results.
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const { q, page, limit } = req.query;
    const pagination = paginate(page, limit);

    if (!q || q.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const searchTerm = `%${q.trim()}%`;

    const [animeCount] = await pool.query(
      `SELECT COUNT(*) as total FROM anime 
       WHERE title LIKE ? OR series_title LIKE ? OR description LIKE ? OR genres LIKE ?`,
      [searchTerm, searchTerm, searchTerm, searchTerm]
    );
    const total = animeCount[0].total;

    const [anime] = await pool.query(
      `SELECT id, title, slug, poster, rating, status, genres, release_year, episode_count
       FROM anime 
       WHERE title LIKE ? OR series_title LIKE ? OR description LIKE ? OR genres LIKE ?
       ORDER BY 
         CASE 
           WHEN title LIKE ? THEN 0
           WHEN series_title LIKE ? THEN 1
           ELSE 2
         END,
         rating DESC, views DESC
       LIMIT ? OFFSET ?`,
      [searchTerm, searchTerm, searchTerm, searchTerm, q.trim(), q.trim(), pagination.limit, pagination.offset]
    );

    const [genres] = await pool.query(
      `SELECT DISTINCT genres FROM anime 
       WHERE genres LIKE ? 
       LIMIT 10`,
      [searchTerm]
    );

    let genreResults = [];
    genres.forEach(g => {
      if (g.genres) {
        g.genres.split(',').forEach(genre => {
          if (genre.trim().toLowerCase().includes(q.trim().toLowerCase())) {
            genreResults.push(genre.trim());
          }
        });
      }
    });
    genreResults = [...new Set(genreResults)].slice(0, 5);

    // Merge external (Anikoto) results so anime that are NOT yet in the DB can
    // still be found and viewed (without importing). Items already imported are
    // skipped - they already show up in the local results above.
    let externalAnime = [];
    try {
      const cacheKey = `ext_search_${q.trim().toLowerCase()}`;
      const cached = extCache.get(cacheKey);
      if (cached && Date.now() - cached.ts < 60000) {
        externalAnime = cached.data;
      } else {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);
        const extRes = await fetch(`https://anikotoapi.site/search?q=${encodeURIComponent(q.trim())}`, { signal: controller.signal });
        clearTimeout(timeout);
        if (extRes.ok) {
          const extData = await extRes.json();
          const list = extData.data || [];
          const [dbRows] = await pool.query(
            'SELECT anikoto_id FROM anime WHERE anikoto_id IS NOT NULL'
          );
          const importedIds = new Set(dbRows.map(r => String(r.anikoto_id)));
          externalAnime = list
            .filter(a => a && a.id && !importedIds.has(String(a.id)))
            .slice(0, 12)
            .map(a => ({
              id: `ext_${a.id}`,
              title: a.title || 'Unknown',
              slug: `anikoto-${a.id}`,
              poster: a.poster || '',
              banner: a.background_image || '',
              description: a.description || '',
              genres: (a.terms_by_type?.genre || []).map(g => (g.name || g)).join(',') || '',
              studio: (a.terms_by_type?.studios || []).join(',') || '',
              rating: a.score || 0,
              status: a.status === 'Currently Airing' ? 'ongoing' : 'completed',
              release_year: a.year || null,
              year: a.year || null,
              episode_count: a.episodes || 0,
              imported: false,
              anikoto_id: String(a.id),
            }));
          extCache.set(cacheKey, { data: externalAnime, ts: Date.now() });
        }
      }
    } catch (e) {
      // External API unavailable - continue with local results only
    }

    const merged = [...anime, ...externalAnime];
    const mergedTotal = total + externalAnime.length;

    res.json({
      success: true,
      data: {
        anime: merged,
        genres: genreResults,
        external_count: externalAnime.length,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: mergedTotal,
          pages: Math.ceil(mergedTotal / pagination.limit)
        },
        query: q.trim()
      }
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
