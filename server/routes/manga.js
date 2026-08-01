const express = require('express');
const { getPool } = require('../config/database');
const { paginate } = require('../utils/helpers');
const { getChapterPages } = require('../utils/mangaImporter');

const router = express.Router();

// Simple in-memory cache for external MangaDex calls
const apiCache = new Map();
function getCached(key, ttlMs = 300000) {
  const entry = apiCache.get(key);
  if (entry && Date.now() - entry.ts < ttlMs) return entry.data;
  return null;
}
function setCache(key, data) {
  apiCache.set(key, { data, ts: Date.now() });
}

router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { genre, search, sort, status } = req.query;

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

    if (search) {
      whereClause += ' AND (title LIKE ? OR description LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term);
    }

    let orderClause = 'ORDER BY created_at DESC';
    if (sort === 'rating') orderClause = 'ORDER BY user_rating DESC, rating DESC';
    else if (sort === 'title') orderClause = 'ORDER BY title ASC';
    else if (sort === 'year') orderClause = 'ORDER BY year DESC';
    else if (sort === 'views') orderClause = 'ORDER BY views DESC';
    else if (sort === 'newest') orderClause = 'ORDER BY created_at DESC';

    const [countResult] = await pool.query(`SELECT COUNT(*) as total FROM mangas ${whereClause}`, params);
    const total = countResult[0].total;

    const [manga] = await pool.query(
      `SELECT * FROM mangas ${whereClause} ${orderClause} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: {
        manga,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) }
      }
    });
  } catch (error) {
    console.error('Get manga list error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/featured', async (req, res) => {
  try {
    const pool = await getPool();
    const [manga] = await pool.query(
      'SELECT * FROM mangas WHERE is_featured = 1 ORDER BY rating DESC LIMIT 10'
    );
    res.json({ success: true, data: manga });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/recent', async (req, res) => {
  try {
    const pool = await getPool();
    const [manga] = await pool.query('SELECT * FROM mangas ORDER BY created_at DESC LIMIT 20');
    res.json({ success: true, data: manga });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/genres', async (req, res) => {
  try {
    const pool = await getPool();
    const [manga] = await pool.query(
      'SELECT genres FROM mangas WHERE genres IS NOT NULL AND genres != ""'
    );
    const genreSet = new Set();
    manga.forEach((m) => {
      if (m.genres) {
        m.genres.split(',').forEach((g) => {
          const trimmed = g.trim();
          if (trimmed) genreSet.add(trimmed);
        });
      }
    });
    res.json({ success: true, data: Array.from(genreSet).sort() });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Chapter reader: live pages from MangaDex
router.get('/:id/read', async (req, res) => {
  try {
    const { id } = req.params;
    const { chapter } = req.query;
    if (!chapter) {
      return res.status(400).json({ success: false, message: 'chapter is required' });
    }

    const pool = await getPool();
    const [manga] = await pool.query(
      'SELECT id, title FROM mangas WHERE id = ?',
      [id]
    );
    if (manga.length === 0) {
      return res.status(404).json({ success: false, message: 'Manga not found' });
    }

    const [chapters] = await pool.query(
      'SELECT * FROM manga_chapters WHERE manga_id = ? AND chapter_uuid = ?',
      [id, chapter]
    );
    if (chapters.length === 0) {
      return res.status(404).json({ success: false, message: 'Chapter not found' });
    }

    // External chapters are hosted elsewhere (e.g. scanlator's site) — return the link
    if (chapters[0].external_url) {
      return res.json({
        success: true,
        data: {
          manga: { id: manga[0].id, title: manga[0].title },
          chapter: { ...chapters[0], external: true, url: chapters[0].external_url },
          chapterList: [],
        },
      });
    }

    const cacheKey = `manga_pages_${chapter}`;
    const cached = getCached(cacheKey, 600000);
    let pages;
    if (cached) {
      pages = cached;
    } else {
      pages = await getChapterPages(chapter);
      setCache(cacheKey, pages);
    }

    const [allChapters] = await pool.query(
      'SELECT id, chapter_uuid, chapter_number, title FROM manga_chapters WHERE manga_id = ? ORDER BY CAST(chapter_number AS UNSIGNED) ASC, created_at ASC',
      [id]
    );
    const chapterList = allChapters.map((c) => ({
      chapter_uuid: c.chapter_uuid,
      chapter_number: c.chapter_number,
      title: c.title,
    }));

    await pool.query('UPDATE mangas SET views = views + 1 WHERE id = ?', [id]);

    res.json({
      success: true,
      data: {
        manga: { id: manga[0].id, title: manga[0].title },
        chapter: { ...chapters[0], pages: pages.pages, dataSaver: pages.dataSaver },
        chapterList,
      },
    });
  } catch (error) {
    console.error('Get chapter pages error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const pool = await getPool();
    const { slug } = req.params;

    const [manga] = await pool.query(
      'SELECT * FROM mangas WHERE slug = ? OR id = ?',
      [slug, parseInt(slug) || 0]
    );
    if (manga.length === 0) {
      return res.status(404).json({ success: false, message: 'Manga not found' });
    }

    const [chapters] = await pool.query(
      'SELECT * FROM manga_chapters WHERE manga_id = ? ORDER BY CAST(chapter_number AS UNSIGNED) ASC, created_at ASC',
      [manga[0].id]
    );

    const [similar] = await pool.query(
      `SELECT * FROM mangas
       WHERE FIND_IN_SET(?, genres) AND id != ?
       ORDER BY rating DESC LIMIT 6`,
      [manga[0].genres ? manga[0].genres.split(',')[0].trim() : '', manga[0].id]
    );

    res.json({
      success: true,
      data: { ...manga[0], chapters, similar },
    });
  } catch (error) {
    console.error('Get manga detail error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
