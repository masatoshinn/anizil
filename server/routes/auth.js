const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { body, validationResult } = require('express-validator');
const { getPool } = require('../config/database');
const auth = require('../middleware/auth');
const { generateToken } = require('../utils/helpers');
const { sendPasswordReset, sendVerification, mailEnabled } = require('../utils/mailer');

const router = express.Router();

const googleOAuthEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// Google OAuth Strategy
if (googleOAuthEnabled) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3001/api/auth/google/callback',
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const pool = await getPool();
      const email = profile.emails?.[0]?.value || `${profile.id}@google.user`;
      const name = profile.displayName || profile.username || 'Google User';
      const avatar = profile.photos?.[0]?.value || null;

      const [existing] = await pool.query(
        'SELECT * FROM users WHERE (email = ? OR google_id = ?)',
        [email, profile.id]
      );

      if (existing.length > 0) {
        const user = existing[0];
        if (user.google_id !== profile.id) {
          await pool.query('UPDATE users SET google_id = ?, avatar = COALESCE(?, avatar) WHERE id = ?', [profile.id, avatar, user.id]);
        }
        return done(null, user);
      }

      const referralCode = generateToken().substring(0, 8).toUpperCase();
      const [result] = await pool.query(
        'INSERT INTO users (name, email, avatar, google_id, referral_code) VALUES (?, ?, ?, ?, ?)',
        [name, email, avatar, profile.id, referralCode]
      );

      const [newUser] = await pool.query('SELECT * FROM users WHERE id = ?', [result.insertId]);

      await pool.query(
        'INSERT INTO activity_feed (user_id, action, details) VALUES (?, ?, ?)',
        [result.insertId, 'register', `${name} joined via Google`]
      );

      return done(null, newUser[0]);
    } catch (err) {
      return done(err, null);
    }
  }));
}

// Google OAuth routes
router.get('/google',
  (req, res) => {
    if (!googleOAuthEnabled) {
      return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/login?error=google_disabled`);
    }
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })(req, res, () => {});
  }
);

router.get('/google/callback',
  (req, res, next) => {
    if (!googleOAuthEnabled) {
      return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/login?error=google_disabled`);
    }
    passport.authenticate('google', { session: false, failureRedirect: '/login' }, async (err, user) => {
      if (err || !user) {
        return res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/login?error=google_auth_failed`);
      }

      try {
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
          expiresIn: process.env.JWT_EXPIRE || '7d'
        });

        res.cookie('token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 * 1000
        });

        const redirectUrl = `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/dashboard?token=${token}`;
        res.redirect(redirectUrl);
      } catch (err) {
        res.redirect(`${process.env.CORS_ORIGIN || 'http://localhost:5173'}/login?error=server_error`);
      }
    })(req, res, next);
  }
);

// Register a new user with optional referral and verification email.
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
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

    const { name, email, password, referralCode: enteredReferralCode } = req.body;

    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Validate referral code (optional): the entered code belongs to the referrer
    let referredBy = null;
    if (enteredReferralCode && enteredReferralCode.trim()) {
      const [referrer] = await pool.query(
        'SELECT id FROM users WHERE referral_code = ?',
        [enteredReferralCode.trim().toUpperCase()]
      );
      if (referrer.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invalid referral code'
        });
      }
      referredBy = referrer[0].id;
    }

    const [settings] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['registration_enabled']);
    if (settings.length > 0 && settings[0].setting_value === '0') {
      return res.status(403).json({
        success: false,
        message: 'Registration is currently disabled'
      });
    }

    // Auto-assign random anime avatar
    let avatar = null;
    try {
      const avResponse = await fetch('https://anikotoapi.site/recent-anime?page=1&per_page=50');
      if (avResponse.ok) {
        const avData = await avResponse.json();
        const avList = avData.data || [];
        if (avList.length > 0) {
          const randomAnime = avList[Math.floor(Math.random() * avList.length)];
          avatar = randomAnime.poster || randomAnime.image || null;
        }
      }
    } catch (e) {
      // Fallback: use DiceBear avatar
      avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(name)}${Date.now()}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const referralCode = generateToken().substring(0, 8).toUpperCase();
    const verifyToken = mailEnabled ? generateToken() : null;
    const verifyExpiry = mailEnabled ? new Date(Date.now() + 24 * 3600000) : null;

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password, avatar, referral_code, referred_by, email_verified, verify_token, verify_token_expiry) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, avatar, referralCode, referredBy, mailEnabled ? 0 : 1, verifyToken, verifyExpiry]
    );

    if (mailEnabled && verifyToken) {
      sendVerification(email, name, verifyToken).catch((err) =>
        console.error('Verification email error:', err.message)
      );
    }

    const token = jwt.sign({ id: result.insertId }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    const [newUser] = await pool.query(
      'SELECT id, name, email, avatar, role, xp, level, created_at, email_verified, referral_code FROM users WHERE id = ?',
      [result.insertId]
    );

    await pool.query(
      'INSERT INTO activity_feed (user_id, action, details) VALUES (?, ?, ?)',
      [result.insertId, 'register', `${name} joined Anizil`]
    );

    res.status(201).json({
      success: true,
      data: {
        user: newUser[0],
        token,
        email_verification_required: mailEnabled
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// Authenticate a user and issue a JWT session cookie.
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
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

    const { email, password } = req.body;

    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    if (user.is_banned) {
      return res.status(403).json({
        success: false,
        message: 'Account is banned. Please contact support.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '7d'
    });

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    await pool.query(
      'INSERT INTO activity_feed (user_id, action, details) VALUES (?, ?, ?)',
      [user.id, 'login', `${user.name} logged in`]
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          xp: user.xp,
          level: user.level,
          premium_until: user.premium_until,
          email_verified: user.email_verified,
          referral_code: user.referral_code,
          created_at: user.created_at
        },
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// Clear the session token cookie to log the user out.
router.post('/logout', (req, res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0)
  });

  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Verify email via token
router.get('/verify-email', async (req, res) => {
  try {
    const pool = await getPool();
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Verification token is required'
      });
    }

    const [users] = await pool.query(
      'SELECT id FROM users WHERE verify_token = ? AND verify_token_expiry > NOW()',
      [token]
    );
    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    await pool.query(
      'UPDATE users SET email_verified = 1, verify_token = NULL, verify_token_expiry = NULL WHERE id = ?',
      [users[0].id]
    );

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Resend verification email
router.post('/resend-verification', auth, async (req, res) => {
  try {
    const pool = await getPool();
    if (req.user.email_verified) {
      return res.json({
        success: true,
        message: 'Email already verified'
      });
    }

    const verifyToken = generateToken();
    const verifyExpiry = new Date(Date.now() + 24 * 3600000);

    await pool.query(
      'UPDATE users SET verify_token = ?, verify_token_expiry = ? WHERE id = ?',
      [verifyToken, verifyExpiry, req.user.id]
    );

    await sendVerification(req.user.email, req.user.name, verifyToken);

    res.json({
      success: true,
      message: 'Verification email sent'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Return the current user's profile, badges, permissions, and stats.
router.get('/me', auth, async (req, res) => {
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

    const [unreadNotifications] = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    );

    const [badges] = await pool.query(
      `SELECT b.*, ub.assigned_at
       FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.id
       WHERE ub.user_id = ? AND b.is_active = 1
       ORDER BY b.is_verified DESC, ub.assigned_at ASC`,
      [req.user.id]
    );

    const [roles] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['role_permissions']);
    let rolePermissions = {};
    if (roles.length > 0 && roles[0].setting_value) {
      try { rolePermissions = JSON.parse(roles[0].setting_value); } catch (e) { rolePermissions = {}; }
    }
    const defaultPermissions = {
      super_admin: ['manage_users', 'manage_anime', 'manage_episodes', 'manage_settings', 'manage_roles', 'manage_comments', 'manage_reports', 'manage_tokens', 'manage_codes'],
      content_admin: ['manage_anime', 'manage_episodes', 'manage_comments', 'view_reports'],
      moderator: ['manage_comments', 'manage_reports', 'view_users'],
      user: []
    };
    const permissions = rolePermissions[req.user.role] || defaultPermissions[req.user.role] || [];

    res.json({
      success: true,
      data: {
        ...req.user,
        permissions,
        badges,
        stats: {
          watchlist: watchlistCount[0].count,
          watched: historyCount[0].count,
          achievements: achievementCount[0].count,
          unread_notifications: unreadNotifications[0].count
        }
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Send a password reset link to the provided email if it exists.
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email is required')
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

    const { email } = req.body;

    const [users] = await pool.query('SELECT id, name, email FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.json({
        success: true,
        message: 'If the email exists, a reset link has been sent'
      });
    }

    const resetToken = generateToken();
    const resetExpiry = new Date(Date.now() + 3600000);

    await pool.query(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
      [resetToken, resetExpiry, users[0].id]
    );

    sendPasswordReset(users[0].email, users[0].name, resetToken).catch((err) =>
      console.error('Reset email error:', err.message)
    );

    res.json({
      success: true,
      message: 'If the email exists, a reset link has been sent'
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// Reset the password using a valid, unexpired reset token.
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
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

    const { token, password } = req.body;

    const [users] = await pool.query(
      'SELECT id FROM users WHERE reset_token = ? AND reset_token_expiry > NOW()',
      [token]
    );
    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await pool.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?',
      [hashedPassword, users[0].id]
    );

    res.json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;
