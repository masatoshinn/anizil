const express = require('express');
const { getPool } = require('../config/database');
const auth = require('../middleware/auth');
const { generateSlug } = require('../utils/helpers');
const crypto = require('crypto');

const router = express.Router();

const ADMIN_ROLES = ['super_admin', 'content_admin', 'moderator'];

// Check whether a user has the creator role or is an admin.
const canCreate = (user) => user.role === 'creator' || ADMIN_ROLES.includes(user.role);
// Check if a user may manage a manga (owner or admin).
function canManage(user, manga) {
  return ADMIN_ROLES.includes(user.role) || String(manga.created_by) === String(user.id);
}

router.use(auth);

// Check creator access
router.get('/can', (req, res) => {
  res.json({ success: true, data: { can: canCreate(req.user), role: req.user.role } });
});

// List manga the current user is allowed to manage
router.get('/manga', async (req, res) => {
  try {
    if (!canCreate(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied. Creator role required.' });
    }
    const pool = await getPool();
    const base = `SELECT mangas.*,
        (SELECT COUNT(*) FROM manga_chapters mc WHERE mc.manga_id = mangas.id) AS chapter_count
        FROM mangas`;
    let rows;
    if (ADMIN_ROLES.includes(req.user.role)) {
      [rows] = await pool.query(`${base} ORDER BY created_at DESC LIMIT 200`);
    } else {
      [rows] = await pool.query(`${base} WHERE created_by = ? ORDER BY created_at DESC LIMIT 200`, [req.user.id]);
    }
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Creator list manga error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create a manga (creator or admin)
router.post('/manga', async (req, res) => {
  try {
    if (!canCreate(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied. Creator role required.' });
    }
    const { title, author, artist, description, poster, genres, status, content_rating, demography, year } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const pool = await getPool();
    let slug = generateSlug(title);
    const [existing] = await pool.query('SELECT id FROM mangas WHERE slug = ?', [slug]);
    if (existing.length > 0) slug = `${slug}-${Date.now()}`;

    const [result] = await pool.query(
      `INSERT INTO mangas (title, slug, description, poster, author, artist, status, genres,
         demography, content_rating, year, rating, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        title.trim(),
        slug,
        description || '',
        author || '',
        req.body.artist || '',
        status || 'ongoing',
        Array.isArray(genres) ? genres.join(',') : (genres || ''),
        demography || '',
        content_rating || '',
        year || null,
        req.user.id,
      ]
    );

    const [manga] = await pool.query('SELECT * FROM mangas WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, data: manga[0] });
  } catch (error) {
    console.error('Creator create manga error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update a manga the user manages
router.put('/manga/:id', async (req, res) => {
  try {
    if (!canCreate(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied. Creator role required.' });
    }
    const pool = await getPool();
    const [manga] = await pool.query('SELECT * FROM mangas WHERE id = ?', [req.params.id]);
    if (manga.length === 0) return res.status(404).json({ success: false, message: 'Manga not found' });
    if (!canManage(req.user, manga[0])) {
      return res.status(403).json({ success: false, message: 'You can only manage your own manga' });
    }

    const { title, author, artist, description, poster, genres, status, content_rating, demography, year } = req.body;

    await pool.query(
      `UPDATE mangas SET
          title = COALESCE(?, title),
          author = COALESCE(?, author),
          artist = COALESCE(?, artist),
          description = COALESCE(?, description),
          poster = COALESCE(?, poster),
          genres = COALESCE(?, genres),
          status = COALESCE(?, status),
          content_rating = COALESCE(?, content_rating),
          demography = COALESCE(?, demography),
          year = COALESCE(?, year)
        WHERE id = ?`,
      [
        title || null, author || null, req.body.artist || null, description || null,
        poster || null,
        Array.isArray(genres) ? genres.join(',') : (genres || null),
        status || null, content_rating || null, demography || null,
        year || null, req.params.id,
      ]
    );

    const [updated] = await pool.query('SELECT * FROM mangas WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: updated[0] });
  } catch (error) {
    console.error('Creator update manga error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete a manga the user owns (cascades chapters)
router.delete('/manga/:id', async (req, res) => {
  try {
    if (!canCreate(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied. Creator role required.' });
    }
    const pool = await getPool();
    const [manga] = await pool.query('SELECT * FROM mangas WHERE id = ?', [req.params.id]);
    if (manga.length === 0) return res.status(404).json({ success: false, message: 'Manga not found' });
    if (!canManage(req.user, manga[0])) {
      return res.status(403).json({ success: false, message: 'You can only manage your own manga' });
    }
    await pool.query('DELETE FROM mangas WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Manga deleted' });
  } catch (error) {
    console.error('Creator delete manga error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get chapters for a manga the user manages
router.get('/manga/:id/chapters', async (req, res) => {
  try {
    if (!canCreate(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied. Creator role required.' });
    }
    const pool = await getPool();
    const [manga] = await pool.query('SELECT * FROM mangas WHERE id = ?', [req.params.id]);
    if (manga.length === 0) return res.status(404).json({ success: false, message: 'Manga not found' });
    if (!canManage(req.user, manga[0])) {
      return res.status(403).json({ success: false, message: 'You can only manage your own manga' });
    }
    const [chapters] = await pool.query(
      'SELECT * FROM manga_chapters WHERE manga_id = ? ORDER BY CAST(chapter_number AS UNSIGNED) ASC, id ASC',
      [req.params.id]
    );
    res.json({ success: true, data: chapters });
  } catch (error) {
    console.error('Creator get chapters error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Add a chapter (external link supported) to a manga the user manages
router.post('/manga/:id/chapters', async (req, res) => {
  try {
    if (!canCreate(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied. Creator role required.' });
    }
    const pool = await getPool();
    const [manga] = await pool.query('SELECT * FROM mangas WHERE id = ?', [req.params.id]);
    if (manga.length === 0) return res.status(404).json({ success: false, message: 'Manga not found' });
    if (!canManage(req.user, manga[0])) {
      return res.status(403).json({ success: false, message: 'You can only manage your own manga' });
    }

    const { chapter_number, title, external_url } = req.body;
    if (!external_url) {
      return res.status(400).json({ success: false, message: 'external_url is required (link to the chapter content)' });
    }

    const chapterUuid = crypto.randomUUID();
    await pool.query(
      `INSERT INTO manga_chapters (manga_id, chapter_uuid, chapter_number, title, volume, language, scanlation_group, external_url)
       VALUES (?, ?, ?, ?, '', 'en', '', ?)`,
      [req.params.id, chapterUuid, chapter_number || '', title || `Chapter ${chapter_number || '?'}`, external_url]
    );

    const [chapters] = await pool.query(
      'SELECT * FROM manga_chapters WHERE manga_id = ? ORDER BY CAST(chapter_number AS UNSIGNED) ASC, id ASC',
      [req.params.id]
    );
    res.status(201).json({ success: true, data: chapters });
  } catch (error) {
    console.error('Creator add chapter error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete a chapter the user owns
router.delete('/manga/:id/chapters/:chapterId', async (req, res) => {
  try {
    if (!canCreate(req.user)) {
      return res.status(403).json({ success: false, message: 'Access denied. Creator role required.' });
    }
    const pool = await getPool();
    const [manga] = await pool.query('SELECT * FROM mangas WHERE id = ?', [req.params.id]);
    if (manga.length === 0) return res.status(404).json({ success: false, message: 'Manga not found' });
    if (!canManage(req.user, manga[0])) {
      return res.status(403).json({ success: false, message: 'You can only manage your own manga' });
    }
    await pool.query('DELETE FROM manga_chapters WHERE id = ? AND manga_id = ?', [req.params.chapterId, req.params.id]);
    res.json({ success: true, message: 'Chapter deleted' });
  } catch (error) {
    console.error('Creator delete chapter error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;