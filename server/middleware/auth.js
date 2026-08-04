const jwt = require('jsonwebtoken');
const pool = require('../config/database');

// Verify JWT and attach the user to the request
const auth = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, no token'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [users] = await pool.query('SELECT id, name, email, avatar, role, is_banned, xp, level, premium_until, active_frame_id, active_name_color, active_banner_id, email_verified, referral_code, created_at FROM users WHERE id = ?', [decoded.id]);

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized, user not found'
      });
    }

    if (users[0].is_banned) {
      return res.status(403).json({
        success: false,
        message: 'Account is banned'
      });
    }

    req.user = users[0];
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized, token invalid'
    });
  }
};

module.exports = auth;
