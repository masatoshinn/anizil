const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { getPool } = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();

const REACTIONS = ['👍', '❤️', '😂', '😢', '🔥'];

// Resolve the logged-in user id without failing when the request is anonymous
function getOptionalUserId(req) {
  try {
    let token = req.cookies?.token;
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) return null;
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.id || null;
  } catch (e) {
    return null;
  }
}

async function attachReactions(pool, comment, currentUserId) {
  const [reactions] = await pool.query(
    'SELECT reaction, COUNT(*) as count FROM comment_reactions WHERE comment_id = ? GROUP BY reaction',
    [comment.id]
  );
  comment.reactions = reactions;
  comment.my_reaction = null;
  if (currentUserId) {
    const [mine] = await pool.query(
      'SELECT reaction FROM comment_reactions WHERE comment_id = ? AND user_id = ? LIMIT 1',
      [comment.id, currentUserId]
    );
    comment.my_reaction = mine.length ? mine[0].reaction : null;
  }
}

// Get comments by episode_id OR anime_id
router.get('/', async (req, res) => {
  try {
    const pool = await getPool();
    const currentUserId = getOptionalUserId(req);
    const { episode_id, anime_id, page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, Math.max(1, parseInt(limit)));

    let whereClause;
    let param;
    if (anime_id) {
      whereClause = 'c.anime_id = ?';
      param = anime_id;
    } else if (episode_id) {
      whereClause = 'c.episode_id = ?';
      param = episode_id;
    } else {
      return res.json({ success: true, data: { comments: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } } });
    }

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM comments c WHERE ${whereClause} AND c.status = 'approved'`,
      [param]
    );
    const total = countResult[0].total;

    const [comments] = await pool.query(
      `SELECT c.*, u.name as user_name, u.avatar as user_avatar, u.level as user_level, u.active_frame_id, u.active_name_color,
        pf.name as frame_name, pf.image_url as frame_image, pf.border_color as frame_color
       FROM comments c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN profile_frames pf ON u.active_frame_id = pf.id
       WHERE ${whereClause} AND c.status = 'approved' AND c.parent_id IS NULL
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [param, Math.min(100, Math.max(1, parseInt(limit))), offset]
    );

    for (let comment of comments) {
      const [replies] = await pool.query(
        `SELECT c.*, u.name as user_name, u.avatar as user_avatar, u.level as user_level, u.active_frame_id, u.active_name_color,
          pf.name as frame_name, pf.image_url as frame_image, pf.border_color as frame_color
         FROM comments c
         JOIN users u ON c.user_id = u.id
         LEFT JOIN profile_frames pf ON u.active_frame_id = pf.id
         WHERE c.parent_id = ? AND c.status = 'approved'
         ORDER BY c.created_at ASC
         LIMIT 5`,
        [comment.id]
      );

      // Fetch badges for each comment author
      const [badges] = await pool.query(
        `SELECT b.id, b.name, b.icon, b.color, b.is_verified
         FROM user_badges ub
         JOIN badges b ON ub.badge_id = b.id
         WHERE ub.user_id = ? AND b.is_active = 1
         ORDER BY b.is_verified DESC`,
        [comment.user_id]
      );
      comment.badges = badges;
      await attachReactions(pool, comment, currentUserId);

      for (let reply of replies) {
        const [replyBadges] = await pool.query(
          `SELECT b.id, b.name, b.icon, b.color, b.is_verified
           FROM user_badges ub
           JOIN badges b ON ub.badge_id = b.id
           WHERE ub.user_id = ? AND b.is_active = 1
           ORDER BY b.is_verified DESC`,
          [reply.user_id]
        );
        reply.badges = replyBadges;
        await attachReactions(pool, reply, currentUserId);
      }
      comment.replies = replies;

      const [replyCount] = await pool.query(
        'SELECT COUNT(*) as count FROM comments WHERE parent_id = ? AND status = "approved"',
        [comment.id]
      );
      comment.reply_count = replyCount[0].count;
    }

    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          page: Math.max(1, parseInt(page)),
          limit: Math.min(100, Math.max(1, parseInt(limit))),
          total,
          pages: Math.ceil(total / Math.min(100, Math.max(1, parseInt(limit))))
        }
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Legacy route: get by episode ID in URL
router.get('/:episodeId', async (req, res) => {
  try {
    const pool = await getPool();
    const currentUserId = getOptionalUserId(req);
    const { episodeId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, Math.max(1, parseInt(limit)));

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM comments WHERE episode_id = ? AND status = "approved"',
      [episodeId]
    );
    const total = countResult[0].total;

    const [comments] = await pool.query(
      `SELECT c.*, u.name as user_name, u.avatar as user_avatar, u.level as user_level, u.active_name_color
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.episode_id = ? AND c.status = 'approved' AND c.parent_id IS NULL
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [episodeId, Math.min(100, Math.max(1, parseInt(limit))), offset]
    );

    for (let comment of comments) {
      const [replies] = await pool.query(
        `SELECT c.*, u.name as user_name, u.avatar as user_avatar, u.level as user_level, u.active_name_color
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.parent_id = ? AND c.status = 'approved'
         ORDER BY c.created_at ASC
         LIMIT 5`,
        [comment.id]
      );

      const [badges] = await pool.query(
        `SELECT b.id, b.name, b.icon, b.color, b.is_verified
         FROM user_badges ub
         JOIN badges b ON ub.badge_id = b.id
         WHERE ub.user_id = ? AND b.is_active = 1
         ORDER BY b.is_verified DESC`,
        [comment.user_id]
      );
      comment.badges = badges;
      await attachReactions(pool, comment, currentUserId);

      for (let reply of replies) {
        const [replyBadges] = await pool.query(
          `SELECT b.id, b.name, b.icon, b.color, b.is_verified
           FROM user_badges ub
           JOIN badges b ON ub.badge_id = b.id
           WHERE ub.user_id = ? AND b.is_active = 1
           ORDER BY b.is_verified DESC`,
          [reply.user_id]
        );
        reply.badges = replyBadges;
        await attachReactions(pool, reply, currentUserId);
      }
      comment.replies = replies;

      const [replyCount] = await pool.query(
        'SELECT COUNT(*) as count FROM comments WHERE parent_id = ? AND status = "approved"',
        [comment.id]
      );
      comment.reply_count = replyCount[0].count;
    }

    res.json({
      success: true,
      data: {
        comments,
        pagination: {
          page: Math.max(1, parseInt(page)),
          limit: Math.min(100, Math.max(1, parseInt(limit))),
          total,
          pages: Math.ceil(total / Math.min(100, Math.max(1, parseInt(limit))))
        }
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.post('/', auth, [
  body('content').trim().notEmpty().withMessage('Comment content is required'),
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

    const { content, episodeId, animeId, anime_id, episode_id, parentId, parent_id } = req.body;
    const epId = episodeId || episode_id || null;
    const anId = animeId || anime_id || null;
    const pId = parentId || parent_id || null;

    if (!epId && !anId) {
      return res.status(400).json({
        success: false,
        message: 'Either episodeId or animeId is required'
      });
    }

    if (pId) {
      const [parentComment] = await pool.query(
        'SELECT id FROM comments WHERE id = ?',
        [pId]
      );
      if (parentComment.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Parent comment not found'
        });
      }
    }

    const [result] = await pool.query(
      'INSERT INTO comments (user_id, episode_id, anime_id, content, parent_id, status) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, epId, anId, content, pId, 'approved']
    );

    const [newComment] = await pool.query(
      `SELECT c.*, u.name as user_name, u.avatar as user_avatar, u.level as user_level, u.active_frame_id, u.active_name_color,
        pf.name as frame_name, pf.image_url as frame_image, pf.border_color as frame_color
       FROM comments c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN profile_frames pf ON u.active_frame_id = pf.id
       WHERE c.id = ?`,
      [result.insertId]
    );

    // Award XP for comment
    await pool.query('UPDATE users SET xp = xp + 5 WHERE id = ?', [req.user.id]);

    // Check comment achievements
    const [commentCount] = await pool.query(
      'SELECT COUNT(*) as count FROM comments WHERE user_id = ?',
      [req.user.id]
    );
    const commentsPosted = commentCount[0].count;

    const [achievements] = await pool.query(
      'SELECT * FROM achievements WHERE requirement_type = "comments" AND requirement_value <= ?',
      [commentsPosted]
    );

    for (const achievement of achievements) {
      const [existingAch] = await pool.query(
        'SELECT id FROM user_achievements WHERE user_id = ? AND achievement_id = ?',
        [req.user.id, achievement.id]
      );
      if (existingAch.length === 0) {
        await pool.query(
          'INSERT IGNORE INTO user_achievements (user_id, achievement_id) VALUES (?, ?)',
          [req.user.id, achievement.id]
        );
        await pool.query('UPDATE users SET xp = xp + ? WHERE id = ?', [achievement.xp_reward, req.user.id]);
      }
    }

    const [updatedUser] = await pool.query('SELECT xp FROM users WHERE id = ?', [req.user.id]);

    res.status(201).json({
      success: true,
      data: { ...newComment[0], reactions: [], my_reaction: null, xp_earned: 5, new_xp: updatedUser[0].xp }
    });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.put('/:id', auth, [
  body('content').trim().notEmpty().withMessage('Comment content is required')
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
    const { content } = req.body;

    const [comments] = await pool.query(
      'SELECT * FROM comments WHERE id = ?',
      [id]
    );

    if (comments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    if (comments[0].user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to edit this comment'
      });
    }

    await pool.query('UPDATE comments SET content = ? WHERE id = ?', [content, id]);

    const [updatedComment] = await pool.query(
      `SELECT c.*, u.name as user_name, u.avatar as user_avatar, u.level as user_level
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [id]
    );

    res.json({
      success: true,
      data: { ...updatedComment[0], reactions: [], my_reaction: null }
    });
  } catch (error) {
    console.error('Edit comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [comments] = await pool.query(
      'SELECT * FROM comments WHERE id = ?',
      [id]
    );

    if (comments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    if (comments[0].user_id !== req.user.id && !['super_admin', 'content_admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment'
      });
    }

    await pool.query('DELETE FROM comments WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Comment deleted'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.post('/:id/like', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [comments] = await pool.query(
      'SELECT * FROM comments WHERE id = ?',
      [id]
    );

    if (comments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    await pool.query('UPDATE comments SET likes = likes + 1 WHERE id = ?', [id]);

    const [updatedComment] = await pool.query(
      'SELECT likes FROM comments WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      data: {
        likes: updatedComment[0].likes
      }
    });
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.post('/:id/reaction', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;
    const { reaction } = req.body;

    if (!REACTIONS.includes(reaction)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reaction'
      });
    }

    const [comments] = await pool.query(
      'SELECT id FROM comments WHERE id = ?',
      [id]
    );
    if (comments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const [existing] = await pool.query(
      'SELECT id, reaction FROM comment_reactions WHERE comment_id = ? AND user_id = ?',
      [id, req.user.id]
    );

    let myReaction = reaction;
    if (existing.length > 0) {
      if (existing[0].reaction === reaction) {
        await pool.query('DELETE FROM comment_reactions WHERE id = ?', [existing[0].id]);
        myReaction = null;
      } else {
        await pool.query('UPDATE comment_reactions SET reaction = ? WHERE id = ?', [reaction, existing[0].id]);
      }
    } else {
      await pool.query(
        'INSERT INTO comment_reactions (comment_id, user_id, reaction) VALUES (?, ?, ?)',
        [id, req.user.id, reaction]
      );
    }

    const [reactions] = await pool.query(
      'SELECT reaction, COUNT(*) as count FROM comment_reactions WHERE comment_id = ? GROUP BY reaction',
      [id]
    );

    res.json({
      success: true,
      data: { reactions, my_reaction: myReaction }
    });
  } catch (error) {
    console.error('Comment reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

router.post('/:id/report', auth, [
  body('reason').trim().notEmpty().withMessage('Reason is required')
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
    const { reason } = req.body;

    const [comments] = await pool.query(
      'SELECT id FROM comments WHERE id = ?',
      [id]
    );

    if (comments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const [existingReport] = await pool.query(
      'SELECT id FROM reports WHERE reporter_id = ? AND comment_id = ? AND status = "pending"',
      [req.user.id, id]
    );

    if (existingReport.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already reported this comment'
      });
    }

    await pool.query(
      'INSERT INTO reports (reporter_id, comment_id, reason) VALUES (?, ?, ?)',
      [req.user.id, id, reason]
    );

    await pool.query('UPDATE comments SET status = "flagged" WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Report submitted'
    });
  } catch (error) {
    console.error('Report comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
