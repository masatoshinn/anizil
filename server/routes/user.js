const express = require('express');
const { body, validationResult } = require('express-validator');
const { getPool } = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

// Return the current user's profile with activity stats.
router.get('/profile', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const [watchlistCount] = await pool.query(
      'SELECT COUNT(*) as count FROM watchlists WHERE user_id = ?',
      [req.user.id]
    );

    const [historyCount] = await pool.query(
      'SELECT COUNT(*) as count FROM watch_history WHERE user_id = ?',
      [req.user.id]
    );

    const [achievementCount] = await pool.query(
      'SELECT COUNT(*) as count FROM user_achievements WHERE user_id = ?',
      [req.user.id]
    );

    const [commentCount] = await pool.query(
      'SELECT COUNT(*) as count FROM comments WHERE user_id = ?',
      [req.user.id]
    );

    const [recentActivity] = await pool.query(
      'SELECT * FROM activity_feed WHERE user_id = ? ORDER BY created_at DESC LIMIT 10',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        ...req.user,
        stats: {
          watchlist: watchlistCount[0].count,
          watched: historyCount[0].count,
          achievements: achievementCount[0].count,
          comments: commentCount[0].count
        },
        recent_activity: recentActivity
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Update the current user's name, bio, or avatar.
router.put('/profile', auth, [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('bio').optional().trim(),
  body('avatar').optional().trim()
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

    const { name, bio, avatar } = req.body;
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      params.push(bio);
    }
    if (avatar !== undefined) {
      updates.push('avatar = ?');
      params.push(avatar);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    params.push(req.user.id);

    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    const [updatedUser] = await pool.query(
      'SELECT id, name, email, avatar, bio, role, xp, level, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      data: updatedUser[0]
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// List the user's watchlist, optionally filtered by status.
router.get('/watchlist', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const { status } = req.query;

    let query = `
      SELECT w.*, a.title, a.slug, a.poster, a.rating, a.status as anime_status, a.episode_count
      FROM watchlists w
      JOIN anime a ON w.anime_id = a.id
      WHERE w.user_id = ?
    `;
    const params = [req.user.id];

    if (status) {
      query += ' AND w.status = ?';
      params.push(status);
    }

    query += ' ORDER BY w.created_at DESC';

    const [watchlist] = await pool.query(query, params);

    res.json({
      success: true,
      data: watchlist
    });
  } catch (error) {
    console.error('Get watchlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Add or update a watchlist entry and award achievement XP.
router.post('/watchlist', auth, [
  body('animeId').isInt().withMessage('Anime ID is required'),
  body('status').optional().isIn(['watching', 'completed', 'plan_to_watch', 'on_hold', 'dropped']).withMessage('Invalid status')
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

    const { animeId, status = 'watching' } = req.body;

    const [anime] = await pool.query('SELECT id FROM anime WHERE id = ?', [animeId]);
    if (anime.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Anime not found'
      });
    }

    const [existing] = await pool.query(
      'SELECT id FROM watchlists WHERE user_id = ? AND anime_id = ?',
      [req.user.id, animeId]
    );

    if (existing.length > 0) {
      await pool.query(
        'UPDATE watchlists SET status = ? WHERE user_id = ? AND anime_id = ?',
        [status, req.user.id, animeId]
      );
    } else {
      await pool.query(
        'INSERT INTO watchlists (user_id, anime_id, status) VALUES (?, ?, ?)',
        [req.user.id, animeId, status]
      );

      const [userAchievements] = await pool.query(
        'SELECT COUNT(*) as count FROM watchlists WHERE user_id = ?',
        [req.user.id]
      );
      const watchlistCount = userAchievements[0].count;

      const [achievements] = await pool.query(
        'SELECT * FROM achievements WHERE requirement_type = "watchlist" AND requirement_value <= ?',
        [watchlistCount]
      );

      for (const achievement of achievements) {
        await pool.query(
          'INSERT IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
          [req.user.id, achievement.id]
        );

        const [existingAch] = await pool.query(
          'SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
          [req.user.id, achievement.id]
        );
        if (existingAch.length === 1) {
          await pool.query(
            'UPDATE users SET xp = xp + ? WHERE id = ?',
            [achievement.xp_reward, req.user.id]
          );
        }
      }
    }

    res.json({
      success: true,
      message: 'Watchlist updated'
    });
  } catch (error) {
    console.error('Add to watchlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Remove an anime from the user's watchlist.
router.delete('/watchlist/:animeId', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const { animeId } = req.params;

    const [result] = await pool.query(
      'DELETE FROM watchlists WHERE user_id = ? AND anime_id = ?',
      [req.user.id, animeId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Not found in watchlist'
      });
    }

    res.json({
      success: true,
      message: 'Removed from watchlist'
    });
  } catch (error) {
    console.error('Remove from watchlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Return the user's paginated watch history.
router.get('/history', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const { page, limit, offset } = require('../utils/helpers').paginate(req.query.page, req.query.limit);

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM watch_history WHERE user_id = ?',
      [req.user.id]
    );
    const total = countResult[0].total;

    const [history] = await pool.query(
      `SELECT wh.*, a.title, a.slug, a.poster, e.episode_number, e.title as episode_title
       FROM watch_history wh
       JOIN anime a ON wh.anime_id = a.id
       JOIN episodes e ON wh.episode_id = e.id
       WHERE wh.user_id = ?
       ORDER BY wh.watched_at DESC
       LIMIT ? OFFSET ?`,
      [req.user.id, limit, offset]
    );

    res.json({
      success: true,
      data: {
        history,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Record watch progress, awarding XP and achievements.
router.post('/history', auth, [
  body('animeId').isInt().withMessage('Anime ID is required'),
  body('episodeId').isInt().withMessage('Episode ID is required'),
  body('progress').optional().isInt({ min: 0, max: 100 }).withMessage('Progress must be 0-100'),
  body('completed').optional().isBoolean().withMessage('Completed must be boolean')
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

    const { animeId, episodeId, progress = 0, completed = false } = req.body;

    const [existing] = await pool.query(
      'SELECT id FROM watch_history WHERE user_id = ? AND episode_id = ?',
      [req.user.id, episodeId]
    );

    if (existing.length > 0) {
      await pool.query(
        'UPDATE watch_history SET progress = ?, completed = ?, watched_at = NOW() WHERE user_id = ? AND episode_id = ?',
        [progress, completed ? 1 : 0, req.user.id, episodeId]
      );
    } else {
      await pool.query(
        'INSERT INTO watch_history (user_id, anime_id, episode_id, progress, completed) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, animeId, episodeId, progress, completed ? 1 : 0]
      );

      // Award XP for watching (10 XP per episode, 50 XP if completed)
      const xpReward = completed ? 50 : 10;
      await pool.query('UPDATE users SET xp = xp + ? WHERE id = ?', [xpReward, req.user.id]);

      const [episodeCount] = await pool.query(
        'SELECT COUNT(DISTINCT episode_id) as count FROM watch_history WHERE user_id = ?',
        [req.user.id]
      );
      const episodesWatched = episodeCount[0].count;

      const [achievements] = await pool.query(
        'SELECT * FROM achievements WHERE requirement_type = "episodes_watched" AND requirement_value <= ?',
        [episodesWatched]
      );

      for (const achievement of achievements) {
        await pool.query(
          'INSERT IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
          [req.user.id, achievement.id]
        );

        const [existingAch] = await pool.query(
          'SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
          [req.user.id, achievement.id]
        );
        if (existingAch.length === 1) {
          await pool.query(
            'UPDATE users SET xp = xp + ? WHERE id = ?',
            [achievement.xp_reward, req.user.id]
          );

          await pool.query(
            'INSERT INTO notifications (user_id, title, content, type) VALUES (?, ?, ?, ?)',
            [req.user.id, 'Achievement Unlocked!', `You earned "${achievement.name}" and ${achievement.xp_reward} XP!`, 'achievement']
          );
        }
      }
    }

    res.json({
      success: true,
      message: 'History updated'
    });
  } catch (error) {
    console.error('Add history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Clear all of the user's watch history.
router.delete('/history', auth, async (req, res) => {
  try {
    const pool = await getPool();
    await pool.query('DELETE FROM watch_history WHERE user_id = ?', [req.user.id]);

    res.json({
      success: true,
      message: 'History cleared'
    });
  } catch (error) {
    console.error('Clear history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Return achievements with unlock status and total XP.
router.get('/achievements', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const [achievements] = await pool.query(
      `SELECT a.*, ua.unlocked_at,
        CASE WHEN ua.id IS NOT NULL THEN 1 ELSE 0 END as unlocked
       FROM achievements a
       LEFT JOIN user_achievements ua ON a.id = ua.achievement_id AND ua.user_id = ?
       ORDER BY a.id ASC`,
      [req.user.id]
    );

    const [totalXp] = await pool.query(
      'SELECT SUM(a.xp_reward) as total_xp FROM achievements a JOIN user_achievements ua ON a.id = ua.achievement_id WHERE ua.user_id = ?',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        achievements,
        total_xp: totalXp[0].total_xp || 0,
        unlocked_count: achievements.filter(a => a.unlocked).length,
        total_count: achievements.length
      }
    });
  } catch (error) {
    console.error('Get achievements error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Return the user's latest notifications and unread count.
router.get('/notifications', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const [notifications] = await pool.query(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );

    const [unreadCount] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        notifications,
        unread_count: unreadCount[0].count
      }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Mark all of the user's notifications as read.
router.put('/notifications/read', auth, async (req, res) => {
  try {
    const pool = await getPool();
    await pool.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    res.json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark notifications read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Get current user's badges
router.get('/badges', auth, async (req, res) => {
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
    console.error('Get badges error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Public user profile (no auth required)
router.get('/users/:id', async (req, res) => {  try {
    const pool = await getPool();
    const { id } = req.params;

    if (!Number.isInteger(Number(id))) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }

    const [users] = await pool.query(
      `SELECT u.id, u.name, u.avatar, u.bio, u.role, u.xp, u.level, u.created_at, u.active_frame_id, u.active_name_color,
        u.active_banner_id, pb.image_url as banner_image, pb.name as banner_name
       FROM users u
       LEFT JOIN profile_banners pb ON u.active_banner_id = pb.id
       WHERE u.id = ?`,
      [id]
    );
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = users[0];

    const [badges] = await pool.query(
      `SELECT b.*, ub.assigned_at
       FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.id
       WHERE ub.user_id = ? AND b.is_active = 1
       ORDER BY b.is_verified DESC, ub.assigned_at ASC`,
      [id]
    );

    const [watchlistCount] = await pool.query(
      'SELECT COUNT(*) as count FROM watchlists WHERE user_id = ?', [id]
    );
    const [completedCount] = await pool.query(
      "SELECT COUNT(*) as count FROM watch_history WHERE user_id = ? AND completed = 1", [id]
    );
    const [commentCount] = await pool.query(
      'SELECT COUNT(*) as count FROM comments WHERE user_id = ?', [id]
    );
    const [achievementCount] = await pool.query(
      'SELECT COUNT(*) as count FROM user_achievements WHERE user_id = ?', [id]
    );

    const [followersCount] = await pool.query(
      'SELECT COUNT(*) as count FROM follows WHERE following_id = ?', [id]
    );
    const [followingCount] = await pool.query(
      'SELECT COUNT(*) as count FROM follows WHERE follower_id = ?', [id]
    );

    const [recentWatchlist] = await pool.query(
      `SELECT a.id, a.title, a.slug, a.poster, w.status
       FROM watchlists w JOIN anime a ON w.anime_id = a.id
       WHERE w.user_id = ?
       ORDER BY w.created_at DESC LIMIT 12`,
      [id]
    );

    const [recentComments] = await pool.query(
      `SELECT c.id, c.content, c.created_at, a.title as anime_title, a.slug as anime_slug
       FROM comments c
       LEFT JOIN anime a ON c.anime_id = a.id
       WHERE c.user_id = ? AND c.status IN ('approved', 'active')
       ORDER BY c.created_at DESC LIMIT 10`,
      [id]
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          avatar: user.avatar,
          bio: user.bio,
          role: user.role,
          xp: user.xp,
          level: user.level,
          created_at: user.created_at,
          active_frame_id: user.active_frame_id,
          active_name_color: user.active_name_color,
          banner_image: user.banner_image,
          banner_name: user.banner_name,
          badges
        },
        stats: {
          watchlist: watchlistCount[0].count,
          completed: completedCount[0].count,
          comments: commentCount[0].count,
          achievements: achievementCount[0].count,
          followers: followersCount[0].count,
          following: followingCount[0].count
        },
        recent_watchlist: recentWatchlist,
        recent_comments: recentComments
      }
    });
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Leaderboard - top users by XP
router.get('/leaderboard', async (req, res) => {  try {
    const pool = await getPool();
    const { period = 'all', page = 1, limit = 20 } = req.query;
    const { paginate } = require('../utils/helpers');
    const { page: p, limit: l, offset } = paginate(page, limit);

    let dateClause = '';
    if (period === 'weekly') dateClause = 'AND u.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    else if (period === 'monthly') dateClause = 'AND u.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)';

    const [users] = await pool.query(
      `SELECT u.id, u.name, u.avatar, u.role, u.xp, u.level, u.active_frame_id,
        u.created_at, u.is_banned,
        (SELECT COUNT(*) FROM user_badges ub WHERE ub.user_id = u.id) as badge_count
       FROM users u
       WHERE u.is_banned = 0 ${dateClause}
       ORDER BY u.xp DESC, u.created_at ASC
       LIMIT ? OFFSET ?`,
      [l, offset]
    );

    // Fetch badges for top users
    for (const user of users) {
      const [badges] = await pool.query(
        `SELECT b.id, b.name, b.icon, b.color, b.is_verified
         FROM user_badges ub
         JOIN badges b ON ub.badge_id = b.id
         WHERE ub.user_id = ? AND b.is_active = 1
         ORDER BY b.is_verified DESC`,
        [user.id]
      );
      user.badges = badges;
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM users u WHERE u.is_banned = 0 ${dateClause}`
    );
    const total = countResult[0].total;

    res.json({
      success: true,
      data: {
        users,
        pagination: { page: p, limit: l, total, pages: Math.ceil(total / l) }
      }
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ===== FOLLOW SYSTEM =====

// Follow a user
router.post('/follow/:id', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    if (!Number.isInteger(Number(id))) {
      return res.status(400).json({ success: false, message: 'Invalid user id' });
    }
    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself' });
    }

    const [users] = await pool.query('SELECT id, name FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await pool.query(
      'INSERT IGNORE INTO follows (follower_id, following_id) VALUES (?, ?)',
      [req.user.id, id]
    );

    // Notify the followed user
    const [existing] = await pool.query(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
      [req.user.id, id]
    );
    if (existing.length === 1) {
      await pool.query(
        'INSERT INTO notifications (user_id, title, content, type) VALUES (?, ?, ?, ?)',
        [id, 'New Follower', `${req.user.name} started following you`, 'follow']
      );
    }

    res.json({ success: true, message: 'User followed' });
  } catch (error) {
    console.error('Follow error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Unfollow a user
router.delete('/follow/:id', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    await pool.query(
      'DELETE FROM follows WHERE follower_id = ? AND following_id = ?',
      [req.user.id, id]
    );

    res.json({ success: true, message: 'User unfollowed' });
  } catch (error) {
    console.error('Unfollow error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Check if current user follows target user (public)
router.get('/follow-status/:id', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [existing] = await pool.query(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
      [req.user.id, id]
    );

    res.json({ success: true, data: { is_following: existing.length > 0 } });
  } catch (error) {
    console.error('Follow status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get users that a user is following
router.get('/following/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [following] = await pool.query(
      `SELECT u.id, u.name, u.avatar, u.level, u.xp
       FROM follows f
       JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = ?
       ORDER BY f.created_at DESC`,
      [id]
    );

    res.json({ success: true, data: following });
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get followers of a user
router.get('/followers/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [followers] = await pool.query(
      `SELECT u.id, u.name, u.avatar, u.level, u.xp
       FROM follows f
       JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = ?
       ORDER BY f.created_at DESC`,
      [id]
    );

    res.json({ success: true, data: followers });
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
