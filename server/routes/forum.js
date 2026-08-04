const express = require('express');
const { body, validationResult } = require('express-validator');
const { getPool } = require('../config/database');
const auth = require('../middleware/auth');
const { paginate } = require('../utils/helpers');

const router = express.Router();

// List forum posts with category filter and sorting.
router.get('/posts', async (req, res) => {
  try {
    const pool = await getPool();
    const { page, limit, offset } = paginate(req.query.page, req.query.limit);
    const { category, sort } = req.query;

    let whereClause = 'WHERE 1=1';
    let params = [];

    if (category) {
      whereClause += ' AND fp.category = ?';
      params.push(category);
    }

    let orderClause = 'ORDER BY fp.created_at DESC';
    if (sort === 'popular') orderClause = 'ORDER BY fp.likes DESC, fp.views DESC';
    else if (sort === 'views') orderClause = 'ORDER BY fp.views DESC';

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM forum_posts fp ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    const [posts] = await pool.query(
      `SELECT fp.*, u.name as user_name, u.avatar as user_avatar, u.level as user_level,
        (SELECT COUNT(*) FROM forum_replies WHERE post_id = fp.id) as reply_count
       FROM forum_posts fp
       JOIN users u ON fp.user_id = u.id
       ${whereClause}
       ${orderClause}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({
      success: true,
      data: {
        posts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get forum posts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Return a single forum post with replies and increment views.
router.get('/posts/:id', async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [posts] = await pool.query(
      `SELECT fp.*, u.name as user_name, u.avatar as user_avatar, u.level as user_level
       FROM forum_posts fp
       JOIN users u ON fp.user_id = u.id
       WHERE fp.id = ?`,
      [id]
    );

    if (posts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    await pool.query('UPDATE forum_posts SET views = views + 1 WHERE id = ?', [id]);

    const [replies] = await pool.query(
      `SELECT fr.*, u.name as user_name, u.avatar as user_avatar, u.level as user_level
       FROM forum_replies fr
       JOIN users u ON fr.user_id = u.id
       WHERE fr.post_id = ?
       ORDER BY fr.created_at ASC`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...posts[0],
        views: posts[0].views + 1,
        replies
      }
    });
  } catch (error) {
    console.error('Get forum post detail error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Create a forum post if the forum is enabled.
router.post('/posts', auth, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('content').trim().notEmpty().withMessage('Content is required'),
  body('category').optional().isIn(['general', 'recommendations', 'discussion', 'help']).withMessage('Invalid category')
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

    const { title, content, category = 'general' } = req.body;

    const [settings] = await pool.query(
      'SELECT setting_value FROM settings WHERE setting_key = ?',
      ['forum_enabled']
    );

    if (settings.length > 0 && settings[0].setting_value === '0') {
      return res.status(403).json({
        success: false,
        message: 'Forum is currently disabled'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO forum_posts (user_id, title, content, category) VALUES (?, ?, ?, ?)',
      [req.user.id, title, content, category]
    );

    const [newPost] = await pool.query(
      `SELECT fp.*, u.name as user_name, u.avatar as user_avatar, u.level as user_level
       FROM forum_posts fp
       JOIN users u ON fp.user_id = u.id
       WHERE fp.id = ?`,
      [result.insertId]
    );

    await pool.query(
      'INSERT INTO activity_feed (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'forum_post', `Created forum post: ${title}`]
    );

    res.status(201).json({
      success: true,
      data: newPost[0]
    });
  } catch (error) {
    console.error('Create forum post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Add a reply to a post, notifying the author.
router.post('/posts/:id/reply', auth, [
  body('content').trim().notEmpty().withMessage('Content is required')
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

    const [posts] = await pool.query('SELECT id FROM forum_posts WHERE id = ?', [id]);
    if (posts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO forum_replies (post_id, user_id, content) VALUES (?, ?, ?)',
      [id, req.user.id, content]
    );

    const [newReply] = await pool.query(
      `SELECT fr.*, u.name as user_name, u.avatar as user_avatar, u.level as user_level
       FROM forum_replies fr
       JOIN users u ON fr.user_id = u.id
       WHERE fr.id = ?`,
      [result.insertId]
    );

    const [postAuthor] = await pool.query(
      'SELECT user_id FROM forum_posts WHERE id = ?',
      [id]
    );

    if (postAuthor.length > 0 && postAuthor[0].user_id !== req.user.id) {
      await pool.query(
        'INSERT INTO notifications (user_id, title, content, type) VALUES (?, ?, ?, ?)',
        [
          postAuthor[0].user_id,
          'New Reply',
          `${req.user.name} replied to your forum post`,
          'forum_reply'
        ]
      );
    }

    res.status(201).json({
      success: true,
      data: newReply[0]
    });
  } catch (error) {
    console.error('Reply to forum post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Increment the like count on a forum post.
router.post('/posts/:id/like', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [posts] = await pool.query('SELECT id FROM forum_posts WHERE id = ?', [id]);
    if (posts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    await pool.query('UPDATE forum_posts SET likes = likes + 1 WHERE id = ?', [id]);

    const [updatedPost] = await pool.query('SELECT likes FROM forum_posts WHERE id = ?', [id]);

    res.json({
      success: true,
      data: {
        likes: updatedPost[0].likes
      }
    });
  } catch (error) {
    console.error('Like forum post error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Edit a forum post if owned by user or admin.
router.put('/posts/:id', auth, [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('content').optional().trim().notEmpty().withMessage('Content cannot be empty'),
  body('category').optional().isIn(['general', 'recommendations', 'discussion', 'help']).withMessage('Invalid category')
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
    const { title, content, category } = req.body;

    const [posts] = await pool.query('SELECT * FROM forum_posts WHERE id = ?', [id]);
    if (posts.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const isAdmin = ['super_admin', 'content_admin', 'moderator'].includes(req.user.role);
    if (posts[0].user_id !== req.user.id && !isAdmin) {
      return res.status(403).json({ success: false, message: 'You can only edit your own posts' });
    }

    const updates = [];
    const params = [];
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (content !== undefined) { updates.push('content = ?'); params.push(content); }
    if (category !== undefined) { updates.push('category = ?'); params.push(category); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');
    params.push(id);
    await pool.query(`UPDATE forum_posts SET ${updates.join(', ')} WHERE id = ?`, params);

    const [updatedPost] = await pool.query(
      `SELECT fp.*, u.name as user_name, u.avatar as user_avatar, u.level as user_level
       FROM forum_posts fp JOIN users u ON fp.user_id = u.id
       WHERE fp.id = ?`, [id]
    );

    res.json({ success: true, data: updatedPost[0] });
  } catch (error) {
    console.error('Edit forum post error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete a forum post and its replies if authorized.
router.delete('/posts/:id', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [posts] = await pool.query('SELECT user_id FROM forum_posts WHERE id = ?', [id]);
    if (posts.length === 0) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }

    const isAdmin = ['super_admin', 'content_admin', 'moderator'].includes(req.user.role);
    if (posts[0].user_id !== req.user.id && !isAdmin) {
      return res.status(403).json({ success: false, message: 'You can only delete your own posts' });
    }

    await pool.query('DELETE FROM forum_replies WHERE post_id = ?', [id]);
    await pool.query('DELETE FROM forum_posts WHERE id = ?', [id]);

    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    console.error('Delete forum post error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Edit a reply if owned by user or admin.
router.put('/replies/:id', auth, [
  body('content').trim().notEmpty().withMessage('Content is required')
], async (req, res) => {
  try {
    const pool = await getPool();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation errors', errors: errors.array() });
    }

    const { id } = req.params;
    const { content } = req.body;

    const [replies] = await pool.query('SELECT * FROM forum_replies WHERE id = ?', [id]);
    if (replies.length === 0) {
      return res.status(404).json({ success: false, message: 'Reply not found' });
    }

    const isAdmin = ['super_admin', 'content_admin', 'moderator'].includes(req.user.role);
    if (replies[0].user_id !== req.user.id && !isAdmin) {
      return res.status(403).json({ success: false, message: 'You can only edit your own replies' });
    }

    await pool.query('UPDATE forum_replies SET content = ?, updated_at = NOW() WHERE id = ?', [content, id]);

    const [updatedReply] = await pool.query(
      `SELECT fr.*, u.name as user_name, u.avatar as user_avatar, u.level as user_level
       FROM forum_replies fr JOIN users u ON fr.user_id = u.id
       WHERE fr.id = ?`, [id]
    );

    res.json({ success: true, data: updatedReply[0] });
  } catch (error) {
    console.error('Edit reply error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete a reply if owned by user or admin.
router.delete('/replies/:id', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const { id } = req.params;

    const [replies] = await pool.query('SELECT user_id FROM forum_replies WHERE id = ?', [id]);
    if (replies.length === 0) {
      return res.status(404).json({ success: false, message: 'Reply not found' });
    }

    const isAdmin = ['super_admin', 'content_admin', 'moderator'].includes(req.user.role);
    if (replies[0].user_id !== req.user.id && !isAdmin) {
      return res.status(403).json({ success: false, message: 'You can only delete your own replies' });
    }

    await pool.query('DELETE FROM forum_replies WHERE id = ?', [id]);
    res.json({ success: true, message: 'Reply deleted' });
  } catch (error) {
    console.error('Delete reply error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
