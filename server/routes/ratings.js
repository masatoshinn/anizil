const express = require('express');
const { body, validationResult } = require('express-validator');
const { getPool } = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

const VALID_TYPES = ['anime', 'manga'];

// Normalize a content type string to 'anime'/'manga' or null if invalid.
function normalizeType(t) {
  const value = String(t || '').toLowerCase();
  return VALID_TYPES.includes(value) ? value : null;
}

// Validate content exists and recompute aggregates
async function recomputeRating(pool, contentType, contentId) {
  const table = contentType === 'anime' ? 'anime' : 'mangas';
  const [agg] = await pool.query(
    `SELECT ROUND(AVG(rating), 1) as avg_rating, COUNT(*) as cnt
     FROM content_ratings WHERE content_type = ? AND content_id = ?`,
    [contentType, contentId]
  );
  const avg = agg[0].avg_rating || 0;
  const cnt = agg[0].cnt || 0;
  await pool.query(`UPDATE ${table} SET user_rating = ?, rating_count = ? WHERE id = ?`, [avg, cnt, contentId]);
  return { avg, count: cnt };
}

// Check whether the target anime or manga row exists in the database.
async function contentExists(pool, contentType, contentId) {
  const table = contentType === 'anime' ? 'anime' : 'mangas';
  const [rows] = await pool.query(`SELECT id FROM ${table} WHERE id = ?`, [contentId]);
  return rows.length > 0;
}

// Get all ratings/reviews for content + aggregate
router.get('/:contentType/:contentId', async (req, res) => {
  try {
    const pool = await getPool();
    const contentType = normalizeType(req.params.contentType);
    const contentId = parseInt(req.params.contentId);

    if (!contentType || !contentId) {
      return res.status(400).json({ success: false, message: 'Invalid content' });
    }
    if (!(await contentExists(pool, contentType, contentId))) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    const { page = 1, limit = 20 } = req.query;
    const p = Math.max(1, parseInt(page));
    const l = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (p - 1) * l;

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM content_ratings WHERE content_type = ? AND content_id = ? AND review IS NOT NULL AND review != ""',
      [contentType, contentId]
    );
    const total = countResult[0].total;

    const [reviews] = await pool.query(
      `SELECT cr.*, u.name as user_name, u.avatar as user_avatar, u.level as user_level,
              u.active_frame_id, u.active_name_color,
              pf.name as frame_name, pf.image_url as frame_image, pf.border_color as frame_color
       FROM content_ratings cr
       JOIN users u ON cr.user_id = u.id
       LEFT JOIN profile_frames pf ON u.active_frame_id = pf.id
       WHERE cr.content_type = ? AND cr.content_id = ? AND cr.review IS NOT NULL AND cr.review != ""
       ORDER BY cr.created_at DESC
       LIMIT ? OFFSET ?`,
      [contentType, contentId, l, offset]
    );

    // Attach badges to reviewers
    for (const review of reviews) {
      const [badges] = await pool.query(
        `SELECT b.id, b.name, b.icon, b.color, b.is_verified
         FROM user_badges ub JOIN badges b ON ub.badge_id = b.id
         WHERE ub.user_id = ? AND b.is_active = 1 ORDER BY b.is_verified DESC`,
        [review.user_id]
      );
      review.badges = badges;
    }

    const [aggregate] = await pool.query(
      'SELECT ROUND(AVG(rating), 1) as avg_rating, COUNT(*) as rating_count FROM content_ratings WHERE content_type = ? AND content_id = ?',
      [contentType, contentId]
    );
    const [dist] = await pool.query(
      'SELECT rating, COUNT(*) as count FROM content_ratings WHERE content_type = ? AND content_id = ? GROUP BY rating',
      [contentType, contentId]
    );
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    dist.forEach((d) => { distribution[d.rating] = d.count; });

    res.json({
      success: true,
      data: {
        reviews,
        aggregate: {
          avg: aggregate[0].avg_rating || 0,
          count: aggregate[0].rating_count || 0,
        },
        distribution,
        pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) },
      },
    });
  } catch (error) {
    console.error('Get ratings error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Current user's own rating for content
router.get('/:contentType/:contentId/mine', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const contentType = normalizeType(req.params.contentType);
    const contentId = parseInt(req.params.contentId);
    if (!contentType || !contentId) {
      return res.status(400).json({ success: false, message: 'Invalid content' });
    }

    const [rows] = await pool.query(
      'SELECT * FROM content_ratings WHERE content_type = ? AND content_id = ? AND user_id = ?',
      [contentType, contentId, req.user.id]
    );
    res.json({ success: true, data: rows[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create/update a rating + optional review
router.post('/:contentType/:contentId', auth, [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
  body('review').optional({ nullable: true }).isString().isLength({ max: 2000 }).withMessage('Review too long'),
], async (req, res) => {
  try {
    const pool = await getPool();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
    }

    const contentType = normalizeType(req.params.contentType);
    const contentId = parseInt(req.params.contentId);
    if (!contentType || !contentId) {
      return res.status(400).json({ success: false, message: 'Invalid content' });
    }
    if (!(await contentExists(pool, contentType, contentId))) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }

    const { rating, review } = req.body;
    const cleanedReview = (review || '').trim();

    const [existing] = await pool.query(
      'SELECT id FROM content_ratings WHERE content_type = ? AND content_id = ? AND user_id = ?',
      [contentType, contentId, req.user.id]
    );

    let xpEarned = 0;
    if (existing.length > 0) {
      await pool.query(
        'UPDATE content_ratings SET rating = ?, review = ? WHERE id = ?',
        [rating, cleanedReview || null, existing[0].id]
      );
    } else {
      await pool.query(
        'INSERT INTO content_ratings (content_type, content_id, user_id, rating, review) VALUES (?, ?, ?, ?, ?)',
        [contentType, contentId, req.user.id, rating, cleanedReview || null]
      );
      await pool.query('UPDATE users SET xp = xp + 10 WHERE id = ?', [req.user.id]);
      xpEarned = 10;
    }

    const aggregate = await recomputeRating(pool, contentType, contentId);

    const [mine] = await pool.query(
      'SELECT * FROM content_ratings WHERE content_type = ? AND content_id = ? AND user_id = ?',
      [contentType, contentId, req.user.id]
    );
    const [updatedUser] = await pool.query('SELECT xp FROM users WHERE id = ?', [req.user.id]);

    res.json({
      success: true,
      message: existing.length > 0 ? 'Rating updated' : 'Rating submitted! +10 XP',
      data: {
        rating: mine[0],
        aggregate,
        xp_earned: xpEarned,
        new_xp: updatedUser[0].xp,
      },
    });
  } catch (error) {
    console.error('Submit rating error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete own rating
router.delete('/:contentType/:contentId', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const contentType = normalizeType(req.params.contentType);
    const contentId = parseInt(req.params.contentId);
    if (!contentType || !contentId) {
      return res.status(400).json({ success: false, message: 'Invalid content' });
    }

    const [rows] = await pool.query(
      'SELECT id FROM content_ratings WHERE content_type = ? AND content_id = ? AND user_id = ?',
      [contentType, contentId, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'No rating found' });
    }

    await pool.query('DELETE FROM content_ratings WHERE id = ?', [rows[0].id]);
    const aggregate = await recomputeRating(pool, contentType, contentId);

    res.json({ success: true, message: 'Rating removed', data: { aggregate } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
