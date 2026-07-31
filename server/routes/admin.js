const express = require('express');
const { body, validationResult } = require('express-validator');
const { getPool } = require('../config/database');
const auth = require('../middleware/auth');
const { adminAuth, requirePermission } = require('../middleware/adminAuth');
const { generateSlug, generateToken, generateRedeemCode, paginate } = require('../utils/helpers');

const router = express.Router();

router.use(auth, adminAuth);

router.get('/dashboard', async (req, res) => {
  try {
    const pool = await getPool();
    const [totalUsers] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [totalAnime] = await pool.query('SELECT COUNT(*) as count FROM anime');
    const [totalEpisodes] = await pool.query('SELECT COUNT(*) as count FROM episodes');
    const [totalViews] = await pool.query('SELECT SUM(views) as count FROM anime');
    const [newUsersToday] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURDATE()'
    );
    const [newAnimeThisWeek] = await pool.query(
      'SELECT COUNT(*) as count FROM anime WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );
    const [pendingReports] = await pool.query(
      'SELECT COUNT(*) as count FROM reports WHERE status = "pending"'
    );
    const [pendingComments] = await pool.query(
      'SELECT COUNT(*) as count FROM comments WHERE status = "pending"'
    );

    const [recentUsers] = await pool.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5'
    );
    const [recentAnime] = await pool.query(
      'SELECT id, title, slug, status, created_at FROM anime ORDER BY created_at DESC LIMIT 5'
    );

    const [popularAnime] = await pool.query(
      'SELECT id, title, slug, views, rating FROM anime ORDER BY views DESC LIMIT 5'
    );

    const [premiumUsers] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE premium_until > NOW()'
    );

    res.json({
      success: true,
      data: {
        stats: {
          total_users: totalUsers[0].count,
          total_anime: totalAnime[0].count,
          total_episodes: totalEpisodes[0].count,
          total_views: totalViews[0].count || 0,
          new_users_today: newUsersToday[0].count,
          new_anime_this_week: newAnimeThisWeek[0].count,
          pending_reports: pendingReports[0].count,
          pending_comments: pendingComments[0].count,
          premium_users: premiumUsers[0].count
        },
        recent_users: recentUsers,
        recent_anime: recentAnime,
        popular_anime: popularAnime
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.get('/anime', async (req, res) => {
  try {
    const pool = await getPool();
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { search, status } = req.query;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (search) {
      whereClause += ' AND (title LIKE ? OR series_title LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (status) {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM anime ${whereClause}`,
      params
    );
    const total = countResult[0].count;

    const [anime] = await pool.query(
      `SELECT * FROM anime ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
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
    console.error('Admin get anime error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.post('/anime', requirePermission('manage_anime'), [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('genres').optional().trim(),
  body('status').optional().isIn(['ongoing', 'completed', 'upcoming', 'hiatus']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const pool = await getPool();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const {
      title, series_title, description, poster, banner, genres, studio,
      rating, mal_score, release_year, duration, language, status,
      broadcast_day, broadcast_time, season, episode_count,
      is_featured, is_premium, anilist_id, mal_id, anikoto_id
    } = req.body;

    const slug = generateSlug(title);

    const [existingSlug] = await pool.query('SELECT id FROM anime WHERE slug = ?', [slug]);
    let finalSlug = slug;
    if (existingSlug.length > 0) {
      finalSlug = `${slug}-${Date.now()}`;
    }

    const genresStr = Array.isArray(genres) ? genres.join(',') : (genres || '');

    const [result] = await pool.query(
      `INSERT INTO anime (title, slug, series_title, description, poster, banner, genres, studio,
        rating, mal_score, release_year, duration, language, status, broadcast_day, broadcast_time,
        season, episode_count, is_featured, is_premium, anilist_id, mal_id, anikoto_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, finalSlug, series_title || null, description || '', poster || '', banner || '', genresStr, studio || '',
        rating || 0, mal_score || 0, release_year || null, duration || '', language || 'sub', status || 'ongoing',
        broadcast_day || null, broadcast_time || null, season || null, episode_count || 0,
        is_featured ? 1 : 0, is_premium ? 1 : 0, anilist_id || null, mal_id || null, anikoto_id || null
      ]
    );

    const [newAnime] = await pool.query('SELECT * FROM anime WHERE id = ?', [result.insertId]);

    await pool.query(
      'INSERT INTO activity_feed (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'add_anime', `Added anime: ${title}`]
    );

    res.status(201).json({
      success: true,
      data: newAnime[0]
    });
  } catch (error) {
    console.error('Admin add anime error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.put('/anime/:id', requirePermission('manage_anime'), [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty')
], async (req, res) => {
  try {
    const pool = await getPool();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const updates = req.body;

    if (updates.title) {
      updates.slug = generateSlug(updates.title);
    }

    const fields = [];
    const params = [];

    const allowedFields = [
      'title', 'slug', 'series_title', 'description', 'poster', 'banner', 'genres', 'studio',
      'rating', 'mal_score', 'release_year', 'duration', 'language', 'status',
      'broadcast_day', 'broadcast_time', 'season', 'episode_count',
      'is_featured', 'is_premium', 'anilist_id', 'mal_id', 'anikoto_id'
    ];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        if (field === 'genres') {
          params.push(Array.isArray(updates[field]) ? updates[field].join(',') : updates[field]);
        } else {
          params.push(updates[field]);
        }
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(id);

    await pool.query(
      `UPDATE anime SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    const [updatedAnime] = await pool.query('SELECT * FROM anime WHERE id = ?', [id]);

    res.json({
      success: true,
      data: updatedAnime[0]
    });
  } catch (error) {
    console.error('Admin update anime error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.delete('/anime/:id', requirePermission('manage_anime'), async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [anime] = await pool.query('SELECT title FROM anime WHERE id = ?', [id]);
    if (anime.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Anime not found'
      });
    }

    await pool.query('DELETE FROM anime WHERE id = ?', [id]);

    await pool.query(
      'INSERT INTO activity_feed (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'delete_anime', `Deleted anime: ${anime[0].title}`]
    );

    res.json({
      success: true,
      message: 'Anime deleted'
    });
  } catch (error) {
    console.error('Admin delete anime error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.get('/episodes', async (req, res) => {
  try {
    const pool = await getPool();
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { anime_id } = req.query;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (anime_id) {
      whereClause += ' AND e.anime_id = ?';
      params.push(anime_id);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM episodes e ${whereClause}`,
      params
    );
    const total = countResult[0].count;

    const [episodes] = await pool.query(
      `SELECT e.*, a.title as anime_title
       FROM episodes e
       JOIN anime a ON e.anime_id = a.id
       ${whereClause}
       ORDER BY e.anime_id, e.episode_number
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    for (const ep of episodes) {
      const [sources] = await pool.query(
        'SELECT * FROM episode_sources WHERE episode_id = ? AND is_active = 1',
        [ep.id]
      );
      ep.sources = sources;
    }

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
    console.error('Admin get episodes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.post('/episodes', requirePermission('manage_episodes'), [
  body('anime_id').isInt().withMessage('Anime ID is required'),
  body('episode_number').isInt().withMessage('Episode number is required'),
  body('title').optional().trim()
], async (req, res) => {
  try {
    const pool = await getPool();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { anime_id, episode_number, title, description, thumbnail, duration, sources } = req.body;

    const [existing] = await pool.query(
      'SELECT id FROM episodes WHERE anime_id = ? AND episode_number = ?',
      [anime_id, episode_number]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Episode number already exists for this anime'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO episodes (anime_id, episode_number, title, description, thumbnail, duration) VALUES (?, ?, ?, ?, ?, ?)',
      [anime_id, episode_number, title, description, thumbnail, duration]
    );

    if (sources && Array.isArray(sources)) {
      for (const source of sources) {
        await pool.query(
          'INSERT INTO episode_sources (episode_id, language, server_name, video_url, embed_link, source_type) VALUES (?, ?, ?, ?, ?, ?)',
          [result.insertId, source.language, source.server_name, source.video_url, source.embed_link || null, source.source_type || 'embed']
        );
      }
    }

    await pool.query(
      'UPDATE anime SET episode_count = (SELECT COUNT(*) FROM episodes WHERE anime_id = ?) WHERE id = ?',
      [anime_id, anime_id]
    );

    const [newEpisode] = await pool.query('SELECT * FROM episodes WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      data: newEpisode[0]
    });
  } catch (error) {
    console.error('Admin add episode error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.put('/episodes/:id', requirePermission('manage_episodes'), async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;
    const updates = req.body;

    const fields = [];
    const params = [];

    const allowedFields = ['episode_number', 'title', 'description', 'thumbnail', 'duration'];

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        fields.push(`${field} = ?`);
        params.push(updates[field]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(id);

    await pool.query(
      `UPDATE episodes SET ${fields.join(', ')} WHERE id = ?`,
      params
    );

    if (updates.sources && Array.isArray(updates.sources)) {
      await pool.query('DELETE FROM episode_sources WHERE episode_id = ?', [id]);
      for (const source of updates.sources) {
        await pool.query(
          'INSERT INTO episode_sources (episode_id, language, server_name, video_url, embed_link, source_type) VALUES (?, ?, ?, ?, ?, ?)',
          [id, source.language, source.server_name, source.video_url, source.embed_link || null, source.source_type || 'embed']
        );
      }
    }

    const [updatedEpisode] = await pool.query('SELECT * FROM episodes WHERE id = ?', [id]);

    res.json({
      success: true,
      data: updatedEpisode[0]
    });
  } catch (error) {
    console.error('Admin update episode error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.delete('/episodes/:id', requirePermission('manage_episodes'), async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [episode] = await pool.query('SELECT anime_id FROM episodes WHERE id = ?', [id]);
    if (episode.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Episode not found'
      });
    }

    await pool.query('DELETE FROM episodes WHERE id = ?', [id]);

    await pool.query(
      'UPDATE anime SET episode_count = (SELECT COUNT(*) FROM episodes WHERE anime_id = ?) WHERE id = ?',
      [episode[0].anime_id, episode[0].anime_id]
    );

    res.json({
      success: true,
      message: 'Episode deleted'
    });
  } catch (error) {
    console.error('Admin delete episode error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.get('/users', async (req, res) => {
  try {
    const pool = await getPool();
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { search, role } = req.query;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (search) {
      whereClause += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (role) {
      whereClause += ' AND role = ?';
      params.push(role);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );
    const total = countResult[0].count;

    const [users] = await pool.query(
      `SELECT id, name, email, avatar, role, is_banned, xp, level, premium_until, created_at
       FROM users ${whereClause}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Admin get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.put('/users/:id/role', requirePermission('manage_users'), [
  body('role').isIn(['super_admin', 'content_admin', 'moderator', 'user']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const pool = await getPool();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { role } = req.body;

    if (req.user.role !== 'super_admin' && role === 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Only super admin can assign super admin role'
      });
    }

    const [users] = await pool.query('SELECT id, name FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id]);

    await pool.query(
      'INSERT INTO activity_feed (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'change_role', `Changed ${users[0].name}'s role to ${role}`]
    );

    res.json({
      success: true,
      message: 'Role updated'
    });
  } catch (error) {
    console.error('Admin change role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.put('/users/:id/ban', requirePermission('manage_users'), async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [users] = await pool.query('SELECT id, name, is_banned FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (users[0].id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot ban yourself'
      });
    }

    const newBannedStatus = users[0].is_banned ? 0 : 1;
    await pool.query('UPDATE users SET is_banned = ? WHERE id = ?', [newBannedStatus, id]);

    await pool.query(
      'INSERT INTO activity_feed (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, newBannedStatus ? 'ban_user' : 'unban_user', `${newBannedStatus ? 'Banned' : 'Unbanned'} user: ${users[0].name}`]
    );

    res.json({
      success: true,
      message: newBannedStatus ? 'User banned' : 'User unbanned'
    });
  } catch (error) {
    console.error('Admin ban user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.get('/comments', async (req, res) => {
  try {
    const pool = await getPool();
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { status } = req.query;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (status) {
      whereClause += ' AND c.status = ?';
      params.push(status);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM comments c ${whereClause}`,
      params
    );
    const total = countResult[0].count;

    const [comments] = await pool.query(
      `SELECT c.*, u.name as user_name, u.email as user_email
       FROM comments c
       JOIN users u ON c.user_id = u.id
       ${whereClause}
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Admin get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.put('/comments/:id/status', requirePermission('manage_comments'), [
  body('status').isIn(['pending', 'approved', 'flagged', 'removed']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const pool = await getPool();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    const [comments] = await pool.query('SELECT id FROM comments WHERE id = ?', [id]);
    if (comments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    await pool.query('UPDATE comments SET status = ? WHERE id = ?', [status, id]);

    res.json({
      success: true,
      message: 'Comment status updated'
    });
  } catch (error) {
    console.error('Admin moderate comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.get('/reports', async (req, res) => {
  try {
    const pool = await getPool();
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { status } = req.query;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (status) {
      whereClause += ' AND r.status = ?';
      params.push(status);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM reports r ${whereClause}`,
      params
    );
    const total = countResult[0].count;

    const [reports] = await pool.query(
      `SELECT r.*, u.name as reporter_name, u.email as reporter_email,
        c.content as comment_content, c.user_id as comment_user_id
       FROM reports r
       JOIN users u ON r.reporter_id = u.id
       LEFT JOIN comments c ON r.comment_id = c.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Admin get reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.put('/reports/:id', requirePermission('manage_reports'), [
  body('status').isIn(['pending', 'dismissed', 'resolved']).withMessage('Invalid status')
], async (req, res) => {
  try {
    const pool = await getPool();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    const [reports] = await pool.query('SELECT id, comment_id FROM reports WHERE id = ?', [id]);
    if (reports.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    await pool.query('UPDATE reports SET status = ? WHERE id = ?', [status, id]);

    if (status === 'resolved' && reports[0].comment_id) {
      await pool.query('UPDATE comments SET status = "removed" WHERE id = ?', [reports[0].comment_id]);
    }

    res.json({
      success: true,
      message: 'Report updated'
    });
  } catch (error) {
    console.error('Admin handle report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.get('/settings', async (req, res) => {
  try {
    const pool = await getPool();
    const [settings] = await pool.query('SELECT * FROM settings ORDER BY id ASC');

    const settingsObject = {};
    settings.forEach(s => {
      settingsObject[s.setting_key] = {
        value: s.setting_value,
        type: s.setting_type
      };
    });

    res.json({
      success: true,
      data: settingsObject
    });
  } catch (error) {
    console.error('Admin get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.put('/settings', requirePermission('manage_settings'), async (req, res) => {
  try {
    const pool = await getPool();
    const settings = req.body;

    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, value, value]
      );
    }

    res.json({
      success: true,
      message: 'Settings updated'
    });
  } catch (error) {
    console.error('Admin update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.get('/api-tokens', async (req, res) => {
  try {
    const pool = await getPool();
    const [tokens] = await pool.query(
      `SELECT at.*, u.name as user_name
       FROM api_tokens at
       JOIN users u ON at.user_id = u.id
       ORDER BY at.created_at DESC`
    );

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    console.error('Admin get tokens error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.post('/api-tokens', requirePermission('manage_tokens'), [
  body('user_id').isInt().withMessage('User ID is required'),
  body('name').trim().notEmpty().withMessage('Token name is required'),
  body('scope').isIn(['read', 'write', 'admin']).withMessage('Invalid scope')
], async (req, res) => {
  try {
    const pool = await getPool();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { user_id, name, scope } = req.body;

    const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [user_id]);
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const token = generateToken();

    const [result] = await pool.query(
      'INSERT INTO api_tokens (user_id, name, token, scope) VALUES (?, ?, ?, ?)',
      [user_id, name, token, scope]
    );

    const [newToken] = await pool.query('SELECT * FROM api_tokens WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      data: newToken[0]
    });
  } catch (error) {
    console.error('Admin create token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.delete('/api-tokens/:id', requirePermission('manage_tokens'), async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [tokens] = await pool.query('SELECT id FROM api_tokens WHERE id = ?', [id]);
    if (tokens.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Token not found'
      });
    }

    await pool.query('DELETE FROM api_tokens WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Token deleted'
    });
  } catch (error) {
    console.error('Admin delete token error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.get('/redeem-codes', async (req, res) => {
  try {
    const pool = await getPool();
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);

    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM redeem_codes');
    const total = countResult[0].count;

    const [codes] = await pool.query(
      `SELECT rc.*, u.name as redeemed_by_name
       FROM redeem_codes rc
       LEFT JOIN users u ON rc.redeemed_by = u.id
       ORDER BY rc.created_at DESC
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.json({
      success: true,
      data: {
        codes,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Admin get redeem codes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.post('/redeem-codes', requirePermission('manage_codes'), [
  body('reward_type').isIn(['xp', 'premium_days', 'credits']).withMessage('Invalid reward type'),
  body('reward_amount').isInt({ min: 1 }).withMessage('Reward amount must be positive'),
  body('count').optional().isInt({ min: 1, max: 100 }).withMessage('Count must be 1-100')
], async (req, res) => {
  try {
    const pool = await getPool();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { reward_type, reward_amount, count = 1, code: customCode } = req.body;
    console.log(`[ADMIN-REDEEM] Creating ${count} code(s): type=${reward_type}, amount=${reward_amount}, custom=${customCode || 'none'}`);

    const codes = [];
    for (let i = 0; i < count; i++) {
      const code = customCode && count === 1 ? customCode.trim().toUpperCase() : generateRedeemCode();
      try {
        await pool.query(
          'INSERT INTO redeem_codes (code, reward_type, reward_amount) VALUES (?, ?, ?)',
          [code, reward_type, reward_amount]
        );
        codes.push(code);
        console.log(`[ADMIN-REDEEM] Created code: ${code}`);
      } catch (insertErr) {
        if (insertErr.code === 'ER_DUP_ENTRY') {
          console.log(`[ADMIN-REDEEM] Duplicate code skipped: ${code}`);
          if (count === 1) {
            return res.status(400).json({ success: false, message: 'Code already exists' });
          }
          continue;
        }
        throw insertErr;
      }
    }

    res.status(201).json({
      success: true,
      data: {
        codes,
        count: codes.length
      }
    });
  } catch (error) {
    console.error('Admin create redeem codes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.delete('/redeem-codes/:id', requirePermission('manage_codes'), async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [codes] = await pool.query('SELECT id FROM redeem_codes WHERE id = ?', [id]);
    if (codes.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Code not found'
      });
    }

    await pool.query('DELETE FROM redeem_codes WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Code deleted'
    });
  } catch (error) {
    console.error('Admin delete redeem code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.get('/roles', async (req, res) => {
  try {
    const pool = await getPool();
    const roles = [
      {
        name: 'super_admin',
        description: 'Full access to all features',
        permissions: ['manage_users', 'manage_anime', 'manage_episodes', 'manage_settings', 'manage_roles', 'manage_comments', 'manage_reports', 'manage_tokens', 'manage_codes']
      },
      {
        name: 'content_admin',
        description: 'Manage anime and episodes',
        permissions: ['manage_anime', 'manage_episodes', 'manage_comments', 'view_reports']
      },
      {
        name: 'moderator',
        description: 'Manage comments and reports',
        permissions: ['manage_comments', 'manage_reports', 'view_users']
      },
      {
        name: 'user',
        description: 'Regular user',
        permissions: []
      }
    ];

    const [settings] = await pool.query(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      ['role_permissions']
    );

    if (settings.length > 0 && settings[0].setting_value) {
      try {
        const customPermissions = JSON.parse(settings[0].setting_value);
        for (const role of roles) {
          if (customPermissions[role.name]) {
            role.permissions = customPermissions[role.name];
          }
        }
      } catch (e) {
      }
    }

    res.json({
      success: true,
      data: roles
    });
  } catch (error) {
    console.error('Admin get roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.put('/roles/:role', requirePermission('manage_roles'), [
  body('permissions').isArray().withMessage('Permissions must be an array')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { role } = req.params;
    const { permissions } = req.body;

    const validRoles = ['super_admin', 'content_admin', 'moderator', 'user'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role'
      });
    }

    const [settings] = await pool.query(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      ['role_permissions']
    );

    let rolePermissions = {};
    if (settings.length > 0 && settings[0].setting_value) {
      try {
        rolePermissions = JSON.parse(settings[0].setting_value);
      } catch (e) {
        rolePermissions = {};
      }
    }

    rolePermissions[role] = permissions;

    await pool.query(
      'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
      ['role_permissions', JSON.stringify(rolePermissions), JSON.stringify(rolePermissions)]
    );

    res.json({
      success: true,
      message: 'Role permissions updated'
    });
  } catch (error) {
    console.error('Admin update role error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Admin: Create a new profile frame
router.post('/frames', requirePermission('manage_settings'), [
  body('name').trim().notEmpty().withMessage('Frame name is required'),
  body('image_url').trim().notEmpty().withMessage('Image URL is required'),
  body('price_xp').isInt({ min: 0 }).withMessage('Price must be 0 or more'),
  body('rarity').optional().isIn(['common', 'rare', 'epic', 'legendary']).withMessage('Invalid rarity'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    const pool = await getPool();
    const { name, image_url, price_xp, rarity = 'common', border_color = '#0ea5e9', sort_order = 0 } = req.body;
    const [result] = await pool.query(
      'INSERT INTO profile_frames (name, image_url, price_xp, rarity, border_color, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [name, image_url, price_xp, rarity, border_color, sort_order]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    console.error('Admin create frame error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin: Delete a profile frame
router.delete('/frames/:id', requirePermission('manage_settings'), async (req, res) => {
  try {
    const pool = await getPool();
    await pool.query('DELETE FROM profile_frames WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Frame deleted' });
  } catch (error) {
    console.error('Admin delete frame error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Admin: Toggle anime premium status
router.put('/anime/:id/premium', requirePermission('manage_anime'), async (req, res) => {
  try {
    const pool = await getPool();
    const { is_premium } = req.body;
    await pool.query('UPDATE anime SET is_premium = ? WHERE id = ?', [is_premium ? 1 : 0, req.params.id]);
    res.json({ success: true, message: `Anime ${is_premium ? 'set as premium' : 'set as free'}` });
  } catch (error) {
    console.error('Admin toggle premium error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Alias: /stats -> same as /dashboard
router.get('/stats', async (req, res) => {
  try {
    const pool = await getPool();
    const [totalUsers] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [totalAnime] = await pool.query('SELECT COUNT(*) as count FROM anime');
    const [totalEpisodes] = await pool.query('SELECT COUNT(*) as count FROM episodes');
    const [totalViews] = await pool.query('SELECT SUM(views) as count FROM anime');
    const [newUsersToday] = await pool.query('SELECT COUNT(*) as count FROM users WHERE DATE(created_at) = CURDATE()');
    const [newAnimeThisWeek] = await pool.query('SELECT COUNT(*) as count FROM anime WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)');
    const [pendingReports] = await pool.query('SELECT COUNT(*) as count FROM reports WHERE status = "pending"');
    const [pendingComments] = await pool.query('SELECT COUNT(*) as count FROM comments WHERE status = "pending"');
    const [premiumUsers] = await pool.query('SELECT COUNT(*) as count FROM users WHERE premium_until > NOW()');

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers[0].count,
        totalAnime: totalAnime[0].count,
        totalEpisodes: totalEpisodes[0].count,
        totalViews: totalViews[0].count || 0,
        newUsersToday: newUsersToday[0].count,
        newAnimeThisWeek: newAnimeThisWeek[0].count,
        pendingReports: pendingReports[0].count,
        pendingComments: pendingComments[0].count,
        premiumUsers: premiumUsers[0].count,
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Activities feed
router.get('/activities', async (req, res) => {
  try {
    const pool = await getPool();
    const limit = parseInt(req.query.limit) || 20;
    const [activities] = await pool.query(
      `SELECT af.*, u.name as user_name FROM activity_feed af
       LEFT JOIN users u ON af.user_id = u.id
       ORDER BY af.created_at DESC LIMIT ?`,
      [limit]
    );
    res.json({ success: true, data: { activities } });
  } catch (error) {
    console.error('Admin activities error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Comment bulk actions
router.post('/comments/bulk/:action', requirePermission('manage_comments'), async (req, res) => {
  try {
    const pool = await getPool();
    const { action } = req.params;
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, message: 'No comment IDs provided' });
    }
    const statusMap = { approve: 'approved', flag: 'flagged', remove: 'removed' };
    const status = statusMap[action];
    if (!status) return res.status(400).json({ success: false, message: 'Invalid action' });
    await pool.query(`UPDATE comments SET status = ? WHERE id IN (${ids.map(() => '?').join(',')})`, [status, ...ids]);
    res.json({ success: true, message: `${ids.length} comments ${action}d` });
  } catch (error) {
    console.error('Bulk comment action error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Analytics
router.get('/analytics', async (req, res) => {
  try {
    const pool = await getPool();
    const range = req.query.range || '7d';
    const days = range === '30d' ? 30 : range === '90d' ? 90 : 7;
    const [dailyUsers] = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count FROM users
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY DATE(created_at) ORDER BY date`,
      [days]
    );
    const [dailyAnime] = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count FROM anime
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY) GROUP BY DATE(created_at) ORDER BY date`,
      [days]
    );
    const [totalUsers] = await pool.query('SELECT COUNT(*) as count FROM users');
    const [totalAnime] = await pool.query('SELECT COUNT(*) as count FROM anime');
    const [totalViews] = await pool.query('SELECT SUM(views) as count FROM anime');
    const [topAnime] = await pool.query('SELECT id, title, views FROM anime ORDER BY views DESC LIMIT 10');

    res.json({
      success: true,
      data: {
        totalUsers: totalUsers[0].count,
        totalAnime: totalAnime[0].count,
        totalViews: totalViews[0].count || 0,
        dailyUsers,
        dailyAnime,
        topAnime,
      }
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Ads settings (alias to general settings)
router.get('/settings/ads', async (req, res) => {
  try {
    const pool = await getPool();
    const [settings] = await pool.query('SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE "ad_%"');
    const adsConfig = {};
    settings.forEach(s => { adsConfig[s.setting_key] = s.setting_value; });
    res.json({ success: true, data: adsConfig });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/settings/ads', requirePermission('manage_settings'), async (req, res) => {
  try {
    const pool = await getPool();
    const settings = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        'INSERT INTO settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [`ad_${key}`, value, value]
      );
    }
    res.json({ success: true, message: 'Ad settings updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ===== BADGE MANAGEMENT =====

// Get all badges
router.get('/badges', async (req, res) => {
  try {
    const pool = await getPool();
    const [badges] = await pool.query('SELECT * FROM badges ORDER BY is_verified DESC, id ASC');
    res.json({ success: true, data: badges });
  } catch (error) {
    console.error('Get badges error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create a new badge
router.post('/badges', requirePermission('manage_settings'), [
  body('name').trim().notEmpty().withMessage('Badge name required'),
  body('icon').trim().notEmpty().withMessage('Badge icon required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const pool = await getPool();
    const { name, icon, color = '#0ea5e9', description = '', is_verified = 0 } = req.body;
    const [result] = await pool.query(
      'INSERT INTO badges (name, icon, color, description, is_verified) VALUES (?, ?, ?, ?, ?)',
      [name, icon, color, description, is_verified ? 1 : 0]
    );
    res.status(201).json({ success: true, data: { id: result.insertId } });
  } catch (error) {
    console.error('Create badge error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update a badge
router.put('/badges/:id', requirePermission('manage_settings'), async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;
    const { name, icon, color, description, is_verified, is_active } = req.body;
    const fields = []; const params = [];
    if (name !== undefined) { fields.push('name = ?'); params.push(name); }
    if (icon !== undefined) { fields.push('icon = ?'); params.push(icon); }
    if (color !== undefined) { fields.push('color = ?'); params.push(color); }
    if (description !== undefined) { fields.push('description = ?'); params.push(description); }
    if (is_verified !== undefined) { fields.push('is_verified = ?'); params.push(is_verified ? 1 : 0); }
    if (is_active !== undefined) { fields.push('is_active = ?'); params.push(is_active ? 1 : 0); }
    if (fields.length === 0) return res.status(400).json({ success: false, message: 'No fields to update' });
    params.push(id);
    await pool.query(`UPDATE badges SET ${fields.join(', ')} WHERE id = ?`, params);
    res.json({ success: true, message: 'Badge updated' });
  } catch (error) {
    console.error('Update badge error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete a badge
router.delete('/badges/:id', requirePermission('manage_settings'), async (req, res) => {
  try {
    const pool = await getPool();
    await pool.query('DELETE FROM badges WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Badge deleted' });
  } catch (error) {
    console.error('Delete badge error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get badges for a specific user
router.get('/users/:id/badges', async (req, res) => {
  try {
    const pool = await getPool();
    const [badges] = await pool.query(
      `SELECT b.*, ub.assigned_at, ub.assigned_by,
        au.name as assigned_by_name
       FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.id
       LEFT JOIN users au ON ub.assigned_by = au.id
       WHERE ub.user_id = ?
       ORDER BY b.is_verified DESC, ub.assigned_at ASC`,
      [req.params.id]
    );
    res.json({ success: true, data: badges });
  } catch (error) {
    console.error('Get user badges error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Assign badge to user
router.post('/users/:id/badges', requirePermission('manage_users'), [
  body('badge_id').isInt().withMessage('Badge ID required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
    const pool = await getPool();
    const { badge_id } = req.body;
    const [badges] = await pool.query('SELECT id, name FROM badges WHERE id = ?', [badge_id]);
    if (badges.length === 0) return res.status(404).json({ success: false, message: 'Badge not found' });
    const [existing] = await pool.query(
      'SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?',
      [req.params.id, badge_id]
    );
    if (existing.length > 0) return res.status(400).json({ success: false, message: 'User already has this badge' });
    await pool.query(
      'INSERT INTO user_badges (user_id, badge_id, assigned_by) VALUES (?, ?, ?)',
      [req.params.id, badge_id, req.user.id]
    );
    const [users] = await pool.query('SELECT name FROM users WHERE id = ?', [req.params.id]);
    await pool.query(
      'INSERT INTO activity_feed (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'assign_badge', `Assigned "${badges[0].name}" badge to ${users[0]?.name || 'user'} #${req.params.id}`]
    );
    res.json({ success: true, message: 'Badge assigned!' });
  } catch (error) {
    console.error('Assign badge error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Remove badge from user
router.delete('/users/:userId/badges/:badgeId', requirePermission('manage_users'), async (req, res) => {
  try {
    const pool = await getPool();
    const [result] = await pool.query(
      'DELETE FROM user_badges WHERE user_id = ? AND badge_id = ?',
      [req.params.userId, req.params.badgeId]
    );
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Badge not assigned to user' });
    res.json({ success: true, message: 'Badge removed' });
  } catch (error) {
    console.error('Remove badge error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Public: Get badges for current user
router.get('/my-badges', async (req, res) => {
  try {
    const pool = await getPool();
    const [badges] = await pool.query(
      `SELECT b.*, ub.assigned_at
       FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.id
       WHERE ub.user_id = ? AND b.is_active = 1
       ORDER BY b.is_verified DESC, ub.assigned_at ASC`,
      [req.user.id]
    );
    res.json({ success: true, data: badges });
  } catch (error) {
    console.error('Get my badges error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Contact messages
router.get('/messages', async (req, res) => {
  try {
    const pool = await getPool();
    const { status, page = 1, limit = 20 } = req.query;
    const { paginate } = require('../utils/helpers');
    const { page: p, limit: l, offset } = paginate(page, limit);

    let whereClause = 'WHERE 1=1';
    let params = [];
    if (status) {
      whereClause += ' AND cm.status = ?';
      params.push(status);
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM contact_messages cm ${whereClause}`, params
    );
    const total = countResult[0].total;

    const [messages] = await pool.query(
      `SELECT cm.*, u.name as user_name, u.avatar as user_avatar
       FROM contact_messages cm
       LEFT JOIN users u ON cm.user_id = u.id
       ${whereClause}
       ORDER BY cm.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, l, offset]
    );

    res.json({
      success: true,
      data: { messages, pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) } }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/messages/:id', requirePermission('manage_comments'), async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;
    const { status } = req.body;

    if (!['new', 'read', 'resolved'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    await pool.query('UPDATE contact_messages SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, message: 'Message updated' });
  } catch (error) {
    console.error('Update message error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/messages/:id', requirePermission('manage_comments'), async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;
    await pool.query('DELETE FROM contact_messages WHERE id = ?', [id]);
    res.json({ success: true, message: 'Message deleted' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Visitor log
router.get('/visitors', async (req, res) => {
  try {
    const pool = await getPool();
    const { page = 1, limit = 30 } = req.query;
    const { paginate } = require('../utils/helpers');
    const { page: p, limit: l, offset } = paginate(page, limit);

    const [countResult] = await pool.query('SELECT COUNT(*) as total FROM visitor_log');
    const total = countResult[0].total;

    const [visitors] = await pool.query(
      `SELECT vl.*, u.name as user_name
       FROM visitor_log vl
       LEFT JOIN users u ON vl.user_id = u.id
       ORDER BY vl.visited_at DESC
       LIMIT ? OFFSET ?`,
      [l, offset]
    );

    const [todayCount] = await pool.query(
      "SELECT COUNT(*) as count FROM visitor_log WHERE DATE(visited_at) = CURDATE()"
    );

    res.json({
      success: true,
      data: {
        visitors,
        today: todayCount[0].count,
        total,
        pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) }
      }
    });
  } catch (error) {
    console.error('Get visitors error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
