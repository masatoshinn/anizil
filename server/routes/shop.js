const express = require('express');
const { getPool } = require('../config/database');
const auth = require('../middleware/auth');
const { generateRedeemCode } = require('../utils/helpers');

const router = express.Router();

// Redeem a code
router.post('/redeem', auth, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: 'Code is required' });
    }

    const pool = await getPool();
    const upperCode = code.trim().toUpperCase();
    console.log(`[REDEEM] User ${req.user.id} attempting to redeem: "${upperCode}"`);

    const [codes] = await pool.query(
      'SELECT * FROM redeem_codes WHERE code = ? AND is_redeemed = 0',
      [upperCode]
    );

    if (codes.length === 0) {
      const [allCodes] = await pool.query('SELECT code, is_redeemed FROM redeem_codes ORDER BY id DESC LIMIT 10');
      console.log(`[REDEEM] Code not found. Recent codes in DB:`, allCodes);
      return res.status(400).json({ success: false, message: 'Invalid or already redeemed code' });
    }

    const redeemCode = codes[0];
    console.log(`[REDEEM] Found code:`, { id: redeemCode.id, type: redeemCode.reward_type, amount: redeemCode.reward_amount });

    // Apply reward
    if (redeemCode.reward_type === 'xp' || redeemCode.reward_type === 'credits') {
      await pool.query('UPDATE users SET xp = xp + ? WHERE id = ?', [redeemCode.reward_amount, req.user.id]);
    } else if (redeemCode.reward_type === 'premium_days') {
      await pool.query(
        'UPDATE users SET premium_until = GREATEST(COALESCE(premium_until, NOW()), NOW()) + INTERVAL ? DAY WHERE id = ?',
        [redeemCode.reward_amount, req.user.id]
      );
    }

    // Mark as redeemed
    await pool.query(
      'UPDATE redeem_codes SET is_redeemed = 1, redeemed_by = ?, redeemed_at = NOW() WHERE id = ?',
      [req.user.id, redeemCode.id]
    );

    // Activity log
    await pool.query(
      'INSERT INTO activity_feed (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'redeem_code', `Redeemed code: ${redeemCode.code} (+${redeemCode.reward_amount} ${redeemCode.reward_type})`]
    );

    const [updatedUser] = await pool.query('SELECT xp, level FROM users WHERE id = ?', [req.user.id]);
    console.log(`[REDEEM] Success! User XP: ${updatedUser[0].xp}`);

    res.json({
      success: true,
      message: `Successfully redeemed ${redeemCode.reward_amount} ${redeemCode.reward_type.replace('_', ' ')}!`,
      data: { new_xp: updatedUser[0].xp }
    });
  } catch (error) {
    console.error('[REDEEM] Error:', error);
    res.status(500).json({ success: false, message: 'Server error: ' + error.message });
  }
});

// Get user inventory (earned items)
router.get('/inventory', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const [items] = await pool.query(
      'SELECT * FROM activity_feed WHERE user_id = ? AND action IN ("redeem_code", "purchase", "achievement") ORDER BY created_at DESC LIMIT 20',
      [req.user.id]
    );
    res.json({ success: true, data: { items } });
  } catch (error) {
    console.error('Inventory error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Purchase XP pack (simulated - in real app would integrate payment gateway)
router.post('/purchase', auth, async (req, res) => {
  try {
    const { itemId } = req.body;
    const pool = await getPool();

    const PACKS = {
      tiny: { xp: 250, price: '$0.49' },
      small: { xp: 500, price: '$0.99' },
      medium: { xp: 1500, price: '$2.49' },
      large: { xp: 5000, price: '$6.99' },
      mega: { xp: 15000, price: '$17.99' },
      ultimate: { xp: 50000, price: '$49.99' },
    };

    const pack = PACKS[itemId];
    if (!pack) {
      return res.status(400).json({ success: false, message: 'Invalid pack' });
    }

    // For demo, directly add XP (in production, redirect to payment gateway)
    await pool.query('UPDATE users SET xp = xp + ? WHERE id = ?', [pack.xp, req.user.id]);

    await pool.query(
      'INSERT INTO activity_feed (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'purchase', `Purchased ${pack.xp} XP pack`]
    );

    res.json({
      success: true,
      message: `Successfully purchased ${pack.xp} XP!`,
      data: { xp_added: pack.xp }
    });
  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Debug: check redeem codes table status (remove in production)
router.get('/redeem-debug', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const [count] = await pool.query('SELECT COUNT(*) as total FROM redeem_codes');
    const [unredeemed] = await pool.query('SELECT COUNT(*) as total FROM redeem_codes WHERE is_redeemed = 0');
    const [recent] = await pool.query('SELECT id, code, reward_type, reward_amount, is_redeemed FROM redeem_codes ORDER BY id DESC LIMIT 10');
    res.json({
      success: true,
      data: {
        total_codes: count[0].total,
        unredeemed_codes: unredeemed[0].total,
        recent,
        user: { id: req.user.id, xp: req.user.xp }
      }
    });
  } catch (error) {
    console.error('[REDEEM-DEBUG] Error:', error);
    res.status(500).json({ success: false, message: 'Debug error: ' + error.message });
  }
});

// Get all profile frames
router.get('/frames', async (req, res) => {
  try {
    const pool = await getPool();
    const [frames] = await pool.query('SELECT * FROM profile_frames WHERE is_active = 1 ORDER BY sort_order ASC, price_xp ASC');
    res.json({ success: true, data: frames });
  } catch (error) {
    console.error('Get frames error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user's purchased frames + active frame
router.get('/frames/my', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const [purchased] = await pool.query(
      `SELECT uf.*, pf.name, pf.image_url, pf.border_color, pf.rarity
       FROM user_frames uf
       JOIN profile_frames pf ON uf.frame_id = pf.id
       WHERE uf.user_id = ? ORDER BY pf.rarity DESC`,
      [req.user.id]
    );
    const [user] = await pool.query('SELECT active_frame_id FROM users WHERE id = ?', [req.user.id]);
    res.json({
      success: true,
      data: {
        frames: purchased,
        active_frame_id: user[0]?.active_frame_id || null,
      }
    });
  } catch (error) {
    console.error('Get my frames error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Purchase a profile frame with XP
router.post('/frames/purchase', auth, async (req, res) => {
  try {
    const { frame_id } = req.body;
    if (!frame_id) return res.status(400).json({ success: false, message: 'frame_id is required' });

    const pool = await getPool();
    const [frames] = await pool.query('SELECT * FROM profile_frames WHERE id = ? AND is_active = 1', [frame_id]);
    if (frames.length === 0) return res.status(404).json({ success: false, message: 'Frame not found' });

    const frame = frames[0];

    const [existing] = await pool.query('SELECT id FROM user_frames WHERE user_id = ? AND frame_id = ?', [req.user.id, frame_id]);
    if (existing.length > 0) return res.status(400).json({ success: false, message: 'You already own this frame' });

    const [user] = await pool.query('SELECT xp FROM users WHERE id = ?', [req.user.id]);
    if (user[0].xp < frame.price_xp) {
      return res.status(400).json({ success: false, message: `Not enough XP. Need ${frame.price_xp} XP, you have ${user[0].xp} XP` });
    }

    await pool.query('UPDATE users SET xp = xp - ? WHERE id = ?', [frame.price_xp, req.user.id]);
    await pool.query('INSERT INTO user_frames (user_id, frame_id) VALUES (?, ?)', [req.user.id, frame_id]);

    await pool.query(
      'INSERT INTO activity_feed (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'purchase_frame', `Purchased frame: ${frame.name} (-${frame.price_xp} XP)`]
    );

    const [updatedUser] = await pool.query('SELECT xp FROM users WHERE id = ?', [req.user.id]);
    res.json({ success: true, message: `Purchased ${frame.name}!`, data: { new_xp: updatedUser[0].xp } });
  } catch (error) {
    console.error('Purchase frame error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Set active frame
router.post('/frames/activate', auth, async (req, res) => {
  try {
    const { frame_id } = req.body;
    const pool = await getPool();

    if (frame_id === null || frame_id === 0) {
      await pool.query('UPDATE users SET active_frame_id = NULL WHERE id = ?', [req.user.id]);
      return res.json({ success: true, message: 'Frame removed' });
    }

    const [owned] = await pool.query('SELECT id FROM user_frames WHERE user_id = ? AND frame_id = ?', [req.user.id, frame_id]);
    if (owned.length === 0) return res.status(400).json({ success: false, message: 'You do not own this frame' });

    await pool.query('UPDATE users SET active_frame_id = ? WHERE id = ?', [frame_id, req.user.id]);
    res.json({ success: true, message: 'Frame activated!' });
  } catch (error) {
    console.error('Activate frame error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Purchase premium anime with XP
router.post('/purchase-anime', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const [premiumSetting] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['premium_enabled']);
    if (premiumSetting.length > 0 && premiumSetting[0].setting_value === '0') {
      return res.status(400).json({ success: false, message: 'Premium system is disabled' });
    }

    const { anime_id } = req.body;
    if (!anime_id) return res.status(400).json({ success: false, message: 'anime_id is required' });

    const [animes] = await pool.query('SELECT * FROM anime WHERE id = ? AND is_premium = 1', [anime_id]);
    if (animes.length === 0) return res.status(400).json({ success: false, message: 'Anime not found or not premium' });

    const [existing] = await pool.query('SELECT id FROM user_purchased_anime WHERE user_id = ? AND anime_id = ?', [req.user.id, anime_id]);
    if (existing.length > 0) return res.status(400).json({ success: false, message: 'You already have access to this anime' });

    const PREMIUM_PRICE = 200;
    const [user] = await pool.query('SELECT xp FROM users WHERE id = ?', [req.user.id]);
    if (user[0].xp < PREMIUM_PRICE) {
      return res.status(400).json({ success: false, message: `Not enough XP. Need ${PREMIUM_PRICE} XP, you have ${user[0].xp} XP` });
    }

    await pool.query('UPDATE users SET xp = xp - ? WHERE id = ?', [PREMIUM_PRICE, req.user.id]);
    await pool.query('INSERT INTO user_purchased_anime (user_id, anime_id) VALUES (?, ?)', [req.user.id, anime_id]);

    await pool.query(
      'INSERT INTO activity_feed (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'purchase_anime', `Unlocked premium anime: ${animes[0].title} (-${PREMIUM_PRICE} XP)`]
    );

    const [updatedUser] = await pool.query('SELECT xp FROM users WHERE id = ?', [req.user.id]);
    res.json({ success: true, message: `Unlocked ${animes[0].title}!`, data: { new_xp: updatedUser[0].xp } });
  } catch (error) {
    console.error('Purchase anime error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Check if user has access to premium anime
router.get('/anime-access/:animeId', auth, async (req, res) => {
  try {
    const pool = await getPool();

    const [premiumSetting] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['premium_enabled']);
    if (premiumSetting.length > 0 && premiumSetting[0].setting_value === '0') {
      return res.json({ success: true, data: { has_access: true } });
    }

    const animeId = req.params.animeId;

    if (req.user.role === 'super_admin' || req.user.role === 'content_admin') {
      return res.json({ success: true, data: { has_access: true } });
    }

    if (req.user.premium_until && new Date(req.user.premium_until) > new Date()) {
      return res.json({ success: true, data: { has_access: true } });
    }

    const [purchased] = await pool.query('SELECT id FROM user_purchased_anime WHERE user_id = ? AND anime_id = ?', [req.user.id, animeId]);
    if (purchased.length > 0) {
      return res.json({ success: true, data: { has_access: true } });
    }

    res.json({ success: true, data: { has_access: false } });
  } catch (error) {
    console.error('Check access error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get XP earning methods info
router.get('/xp-info', auth, async (req, res) => {
  res.json({
    success: true,
    data: {
      methods: [
        { action: 'Watch an episode', xp: 10, icon: 'play' },
        { action: 'Complete an anime', xp: 50, icon: 'check' },
        { action: 'Post a comment', xp: 5, icon: 'message' },
        { action: 'Add to watchlist', xp: 5, icon: 'list' },
        { action: 'Daily login', xp: 20, icon: 'calendar' },
        { action: 'Redeem a code', xp: 0, icon: 'gift', note: 'Variable' },
        { action: 'Purchase XP pack', xp: 0, icon: 'coins', note: 'Variable' },
      ],
      level_thresholds: {
        formula: 'level = floor(xp / 1000) + 1',
        next_level_at: 'every 1000 XP',
      }
    }
  });
});

// =============================================
// NAME COLORS (username/comment color)
// =============================================

// List all active name colors
router.get('/name-colors', async (req, res) => {
  try {
    const pool = await getPool();
    const [colors] = await pool.query(
      'SELECT * FROM name_colors WHERE is_active = 1 ORDER BY sort_order ASC, price_xp ASC'
    );
    res.json({ success: true, data: colors });
  } catch (error) {
    console.error('Get name colors error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user's purchased colors + active color
router.get('/name-colors/my', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const [purchased] = await pool.query(
      `SELECT nc.* FROM user_name_colors unc
       JOIN name_colors nc ON unc.color_id = nc.id
       WHERE unc.user_id = ? ORDER BY nc.sort_order ASC`,
      [req.user.id]
    );
    const [user] = await pool.query('SELECT active_name_color FROM users WHERE id = ?', [req.user.id]);
    res.json({
      success: true,
      data: {
        colors: purchased,
        active_name_color: user[0]?.active_name_color || null,
      }
    });
  } catch (error) {
    console.error('Get my colors error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Purchase a name color with XP
router.post('/name-colors/purchase', auth, async (req, res) => {
  try {
    const { color_id } = req.body;
    if (!color_id) return res.status(400).json({ success: false, message: 'color_id is required' });

    const pool = await getPool();
    const [colors] = await pool.query('SELECT * FROM name_colors WHERE id = ? AND is_active = 1', [color_id]);
    if (colors.length === 0) return res.status(404).json({ success: false, message: 'Color not found' });

    const color = colors[0];
    if (color.price_xp === 0) return res.status(400).json({ success: false, message: 'This color is free (default)' });

    const [existing] = await pool.query(
      'SELECT id FROM user_name_colors WHERE user_id = ? AND color_id = ?',
      [req.user.id, color_id]
    );
    if (existing.length > 0) return res.status(400).json({ success: false, message: 'You already own this color' });

    const [user] = await pool.query('SELECT xp FROM users WHERE id = ?', [req.user.id]);
    if (user[0].xp < color.price_xp) {
      return res.status(400).json({ success: false, message: `Not enough XP. Need ${color.price_xp} XP, you have ${user[0].xp} XP` });
    }

    await pool.query('UPDATE users SET xp = xp - ? WHERE id = ?', [color.price_xp, req.user.id]);
    await pool.query('INSERT INTO user_name_colors (user_id, color_id) VALUES (?, ?)', [req.user.id, color_id]);

    await pool.query(
      'INSERT INTO activity_feed (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'purchase_color', `Purchased name color: ${color.name} (-${color.price_xp} XP)`]
    );

    const [updatedUser] = await pool.query('SELECT xp FROM users WHERE id = ?', [req.user.id]);
    res.json({ success: true, message: `Purchased ${color.name}!`, data: { new_xp: updatedUser[0].xp } });
  } catch (error) {
    console.error('Purchase color error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Set active name color (or clear it)
router.post('/name-colors/activate', auth, async (req, res) => {
  try {
    const { color_id } = req.body;
    const pool = await getPool();

    if (color_id === null || color_id === 0) {
      await pool.query('UPDATE users SET active_name_color = NULL WHERE id = ?', [req.user.id]);
      return res.json({ success: true, message: 'Name color removed' });
    }

    const [colors] = await pool.query('SELECT * FROM name_colors WHERE id = ? AND is_active = 1', [color_id]);
    if (colors.length === 0) return res.status(404).json({ success: false, message: 'Color not found' });

    const color = colors[0];
    if (color.price_xp > 0) {
      const [owned] = await pool.query(
        'SELECT id FROM user_name_colors WHERE user_id = ? AND color_id = ?',
        [req.user.id, color_id]
      );
      if (owned.length === 0) return res.status(400).json({ success: false, message: 'You do not own this color' });
    }

    await pool.query('UPDATE users SET active_name_color = ? WHERE id = ?', [color.color_value, req.user.id]);
    res.json({ success: true, message: 'Name color applied!' });
  } catch (error) {
    console.error('Activate color error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =============================================
// PROFILE BANNERS
// =============================================

// List all active profile banners
router.get('/banners', async (req, res) => {
  try {
    const pool = await getPool();
    const [banners] = await pool.query(
      'SELECT * FROM profile_banners WHERE is_active = 1 ORDER BY sort_order ASC, price_xp ASC'
    );
    res.json({ success: true, data: banners });
  } catch (error) {
    console.error('Get banners error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user's purchased banners + active banner
router.get('/banners/my', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const [purchased] = await pool.query(
      `SELECT pb.* FROM user_banners ub
       JOIN profile_banners pb ON ub.banner_id = pb.id
       WHERE ub.user_id = ? ORDER BY pb.sort_order ASC`,
      [req.user.id]
    );
    const [user] = await pool.query('SELECT active_banner_id FROM users WHERE id = ?', [req.user.id]);
    res.json({
      success: true,
      data: {
        banners: purchased,
        active_banner_id: user[0]?.active_banner_id || null,
      }
    });
  } catch (error) {
    console.error('Get my banners error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Purchase a profile banner with XP
router.post('/banners/purchase', auth, async (req, res) => {
  try {
    const { banner_id } = req.body;
    if (!banner_id) return res.status(400).json({ success: false, message: 'banner_id is required' });

    const pool = await getPool();
    const [banners] = await pool.query('SELECT * FROM profile_banners WHERE id = ? AND is_active = 1', [banner_id]);
    if (banners.length === 0) return res.status(404).json({ success: false, message: 'Banner not found' });

    const banner = banners[0];
    if (banner.price_xp === 0) return res.status(400).json({ success: false, message: 'This banner is free (default)' });

    const [existing] = await pool.query(
      'SELECT id FROM user_banners WHERE user_id = ? AND banner_id = ?',
      [req.user.id, banner_id]
    );
    if (existing.length > 0) return res.status(400).json({ success: false, message: 'You already own this banner' });

    const [user] = await pool.query('SELECT xp FROM users WHERE id = ?', [req.user.id]);
    if (user[0].xp < banner.price_xp) {
      return res.status(400).json({ success: false, message: `Not enough XP. Need ${banner.price_xp} XP, you have ${user[0].xp} XP` });
    }

    await pool.query('UPDATE users SET xp = xp - ? WHERE id = ?', [banner.price_xp, req.user.id]);
    await pool.query('INSERT INTO user_banners (user_id, banner_id) VALUES (?, ?)', [req.user.id, banner_id]);

    await pool.query(
      'INSERT INTO activity_feed (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'purchase_banner', `Purchased profile banner: ${banner.name} (-${banner.price_xp} XP)`]
    );

    const [updatedUser] = await pool.query('SELECT xp FROM users WHERE id = ?', [req.user.id]);
    res.json({ success: true, message: `Purchased ${banner.name}!`, data: { new_xp: updatedUser[0].xp } });
  } catch (error) {
    console.error('Purchase banner error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Set active banner (or clear it)
router.post('/banners/activate', auth, async (req, res) => {
  try {
    const { banner_id } = req.body;
    const pool = await getPool();

    if (banner_id === null || banner_id === 0) {
      await pool.query('UPDATE users SET active_banner_id = NULL WHERE id = ?', [req.user.id]);
      return res.json({ success: true, message: 'Banner removed' });
    }

    const [owned] = await pool.query(
      'SELECT id FROM user_banners WHERE user_id = ? AND banner_id = ?',
      [req.user.id, banner_id]
    );
    if (owned.length === 0) return res.status(400).json({ success: false, message: 'You do not own this banner' });

    await pool.query('UPDATE users SET active_banner_id = ? WHERE id = ?', [banner_id, req.user.id]);
    res.json({ success: true, message: 'Banner activated!' });
  } catch (error) {
    console.error('Activate banner error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =============================================
// BUY PREMIUM DAYS WITH XP
// =============================================
const PREMIUM_XP_PLANS = {
  '7': 1500,
  '30': 5000,
  '90': 12000,
};

router.post('/premium/purchase', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const [premiumSetting] = await pool.query('SELECT setting_value FROM settings WHERE setting_key = ?', ['premium_enabled']);
    if (premiumSetting.length > 0 && premiumSetting[0].setting_value === '0') {
      return res.status(400).json({ success: false, message: 'Premium system is disabled' });
    }

    const { days } = req.body;
    const cost = PREMIUM_XP_PLANS[String(days)];
    if (!cost) {
      return res.status(400).json({ success: false, message: 'Invalid plan. Choose 7, 30 or 90 days' });
    }

    const [user] = await pool.query('SELECT xp FROM users WHERE id = ?', [req.user.id]);
    if (user[0].xp < cost) {
      return res.status(400).json({ success: false, message: `Not enough XP. Need ${cost} XP, you have ${user[0].xp} XP` });
    }

    await pool.query('UPDATE users SET xp = xp - ? WHERE id = ?', [cost, req.user.id]);
    await pool.query(
      'UPDATE users SET premium_until = GREATEST(COALESCE(premium_until, NOW()), NOW()) + INTERVAL ? DAY WHERE id = ?',
      [days, req.user.id]
    );

    await pool.query(
      'INSERT INTO activity_feed (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'purchase_premium', `Bought ${days} days of premium (-${cost} XP)`]
    );

    const [updatedUser] = await pool.query('SELECT xp, premium_until FROM users WHERE id = ?', [req.user.id]);
    res.json({
      success: true,
      message: `Added ${days} days of Premium!`,
      data: { new_xp: updatedUser[0].xp, premium_until: updatedUser[0].premium_until }
    });
  } catch (error) {
    console.error('Purchase premium error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =============================================
// BUYABLE BADGES (with XP)
// =============================================

// List all badges (includes price_xp for purchasable ones)
router.get('/badges', async (req, res) => {
  try {
    const pool = await getPool();
    const [badges] = await pool.query('SELECT * FROM badges WHERE is_active = 1 ORDER BY price_xp DESC, is_verified DESC, id ASC');
    res.json({ success: true, data: badges });
  } catch (error) {
    console.error('Get badges error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get user's owned badges
router.get('/badges/my', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const [badges] = await pool.query(
      `SELECT b.id, b.name, b.icon, b.color, b.description, b.price_xp, b.is_verified
       FROM user_badges ub
       JOIN badges b ON ub.badge_id = b.id
       WHERE ub.user_id = ? AND b.is_active = 1`,
      [req.user.id]
    );
    res.json({ success: true, data: badges });
  } catch (error) {
    console.error('Get my badges error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Purchase a badge with XP
router.post('/badges/purchase', auth, async (req, res) => {
  try {
    const { badge_id } = req.body;
    if (!badge_id) return res.status(400).json({ success: false, message: 'badge_id is required' });

    const pool = await getPool();
    const [badges] = await pool.query('SELECT * FROM badges WHERE id = ? AND is_active = 1', [badge_id]);
    if (badges.length === 0) return res.status(404).json({ success: false, message: 'Badge not found' });

    const badge = badges[0];
    if (!badge.price_xp || badge.price_xp <= 0) {
      return res.status(400).json({ success: false, message: 'This badge is not purchasable' });
    }

    const [existing] = await pool.query(
      'SELECT id FROM user_badges WHERE user_id = ? AND badge_id = ?',
      [req.user.id, badge_id]
    );
    if (existing.length > 0) return res.status(400).json({ success: false, message: 'You already own this badge' });

    const [user] = await pool.query('SELECT xp FROM users WHERE id = ?', [req.user.id]);
    if (user[0].xp < badge.price_xp) {
      return res.status(400).json({ success: false, message: `Not enough XP. Need ${badge.price_xp} XP, you have ${user[0].xp} XP` });
    }

    await pool.query('UPDATE users SET xp = xp - ? WHERE id = ?', [badge.price_xp, req.user.id]);
    await pool.query('INSERT INTO user_badges (user_id, badge_id, assigned_by) VALUES (?, ?, ?)', [req.user.id, badge_id, req.user.id]);

    await pool.query(
      'INSERT INTO activity_feed (user_id, action, details) VALUES (?, ?, ?)',
      [req.user.id, 'purchase_badge', `Purchased badge: ${badge.name} (-${badge.price_xp} XP)`]
    );

    const [updatedUser] = await pool.query('SELECT xp FROM users WHERE id = ?', [req.user.id]);
    res.json({ success: true, message: `Purchased ${badge.name} badge!`, data: { new_xp: updatedUser[0].xp } });
  } catch (error) {
    console.error('Purchase badge error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// =============================================
// DAILY REWARD
// =============================================
const DAILY_REWARD_XP = 25;

// Get daily reward status (already claimed today? streak?)
router.get('/daily', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      "SELECT created_at FROM activity_feed WHERE user_id = ? AND action = 'daily_claim' ORDER BY created_at DESC LIMIT 1",
      [req.user.id]
    );
    const last = rows[0]?.created_at || null;
    const claimedToday = last ? new Date(last).toDateString() === new Date().toDateString() : false;
    res.json({
      success: true,
      data: { claimed_today: claimedToday, last_claim: last, reward: DAILY_REWARD_XP }
    });
  } catch (error) {
    console.error('Daily status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Claim the daily reward (once per calendar day)
router.post('/daily/claim', auth, async (req, res) => {
  try {
    const pool = await getPool();
    const [rows] = await pool.query(
      "SELECT id FROM activity_feed WHERE user_id = ? AND action = 'daily_claim' AND DATE(created_at) = CURRENT_DATE LIMIT 1",
      [req.user.id]
    );
    if (rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Daily reward already claimed today' });
    }

    await pool.query('UPDATE users SET xp = xp + ? WHERE id = ?', [DAILY_REWARD_XP, req.user.id]);
    await pool.query(
      "INSERT INTO activity_feed (user_id, action, details) VALUES (?, 'daily_claim', ?)",
      [req.user.id, `Claimed daily reward (+${DAILY_REWARD_XP} XP)`]
    );

    const [user] = await pool.query('SELECT xp FROM users WHERE id = ?', [req.user.id]);
    res.json({
      success: true,
      message: `Daily reward claimed! +${DAILY_REWARD_XP} XP`,
      data: { new_xp: user[0].xp }
    });
  } catch (error) {
    console.error('Daily claim error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
