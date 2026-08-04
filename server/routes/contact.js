const express = require('express');
const { body, validationResult } = require('express-validator');
const { getPool } = require('../config/database');
const { sendMail, mailEnabled } = require('../utils/mailer');

const router = express.Router();

const contactLimiter = require('../middleware/rateLimit').apiLimiter;

// Attach req.user if a valid token is present; otherwise pass through.
const optionalAuth = async (req, res, next) => {
  try {
    const jwt = require('jsonwebtoken');
    const token = (req.cookies && req.cookies.token) ||
      (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const pool = await getPool();
      const [users] = await pool.query('SELECT id FROM users WHERE id = ?', [decoded.id]);
      if (users.length > 0) req.user = users[0];
    }
  } catch (e) { /* ignore */ }
  next();
};

// Validate and store a contact message, optionally notifying the owner by email.
router.post('/', optionalAuth, contactLimiter, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('message').trim().notEmpty().withMessage('Message is required'),
  body('subject').optional().trim(),
  body('category').optional().isIn(['general', 'report', 'bug', 'suggestion', 'copyright']).withMessage('Invalid category')
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

    const { name, email, message, subject, category = 'general' } = req.body;

    const [result] = await pool.query(
      'INSERT INTO contact_messages (name, email, subject, message, category, user_id) VALUES (?, ?, ?, ?, ?, ?)',
      [name, email, subject || `Contact - ${category}`, message, category, req.user ? req.user.id : null]
    );

    if (mailEnabled && process.env.MAIL_CONTACT_TO) {
      sendMail(
        process.env.MAIL_CONTACT_TO,
        `[Anizil] ${category.toUpperCase()}: ${subject || 'New message'} from ${name}`,
        `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Category:</strong> ${category}</p><p><strong>Message:</strong></p><p>${message.replace(/\n/g, '<br/>')}</p>`
      ).catch((err) => console.error('Contact email error:', err.message));
    }

    await pool.query(
      'INSERT INTO activity_feed (user_id, action, details) VALUES (?, ?, ?)',
      [req.user ? req.user.id : null, 'contact_message', `${name} submitted a ${category} message`]
    );

    res.status(201).json({
      success: true,
      message: 'Message sent successfully'
    });
  } catch (error) {
    console.error('Contact message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error sending message'
    });
  }
});

module.exports = router;
