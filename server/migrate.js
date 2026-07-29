const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'anizil'
  });

  const stmts = [
    `CREATE TABLE IF NOT EXISTS profile_frames (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      image_url VARCHAR(500) NOT NULL,
      price_xp INT NOT NULL DEFAULT 500,
      rarity ENUM('common','rare','epic','legendary') DEFAULT 'common',
      border_color VARCHAR(20) DEFAULT '#0ea5e9',
      is_active TINYINT(1) DEFAULT 1,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS user_frames (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      frame_id INT NOT NULL,
      purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active TINYINT(1) DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (frame_id) REFERENCES profile_frames(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_frame (user_id, frame_id)
    )`,
    `CREATE TABLE IF NOT EXISTS user_purchased_anime (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      anime_id INT NOT NULL,
      purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_anime (user_id, anime_id)
    )`,
  ];

  for (const sql of stmts) {
    await pool.query(sql);
  }
  console.log('Tables created');

  try {
    await pool.query('ALTER TABLE users ADD COLUMN active_frame_id INT DEFAULT NULL');
    console.log('Added active_frame_id column');
  } catch (e) {
    console.log('active_frame_id column already exists');
  }

  try {
    await pool.query('ALTER TABLE users ADD COLUMN google_id VARCHAR(255) DEFAULT NULL');
    console.log('Added google_id column');
  } catch (e) {
    console.log('google_id column already exists');
  }

  try {
    await pool.query('ALTER TABLE users ADD COLUMN reset_token VARCHAR(255) DEFAULT NULL');
    console.log('Added reset_token column');
  } catch (e) {
    console.log('reset_token column already exists');
  }

  try {
    await pool.query('ALTER TABLE users ADD COLUMN reset_token_expiry DATETIME DEFAULT NULL');
    console.log('Added reset_token_expiry column');
  } catch (e) {
    console.log('reset_token_expiry column already exists');
  }

  try {
    await pool.query('ALTER TABLE anime ADD COLUMN is_premium TINYINT(1) DEFAULT 0');
    console.log('Added is_premium column');
  } catch (e) {
    console.log('is_premium column already exists');
  }

  try {
    await pool.query('ALTER TABLE episode_sources ADD COLUMN embed_link VARCHAR(1000) DEFAULT NULL');
    console.log('Added embed_link column');
  } catch (e) {
    console.log('embed_link column already exists');
  }

  const frames = [
    ['No Frame', '', 0, 'common', '#64748b', 0],
    ['Bronze Shield', 'https://api.dicebear.com/7.x/shapes/svg?seed=bronze&backgroundColor=78350f', 200, 'common', '#cd7f32', 1],
    ['Silver Wing', 'https://api.dicebear.com/7.x/shapes/svg?seed=silver&backgroundColor=475569', 500, 'rare', '#c0c0c0', 2],
    ['Golden Crown', 'https://api.dicebear.com/7.x/shapes/svg?seed=gold&backgroundColor=713f12', 1000, 'rare', '#ffd700', 3],
    ['Emerald Leaf', 'https://api.dicebear.com/7.x/shapes/svg?seed=emerald&backgroundColor=064e3b', 2000, 'epic', '#10b981', 4],
    ['Ruby Flame', 'https://api.dicebear.com/7.x/shapes/svg?seed=ruby&backgroundColor=7f1d1d', 3500, 'epic', '#ef4444', 5],
    ['Diamond Ice', 'https://api.dicebear.com/7.x/shapes/svg?seed=diamond&backgroundColor=1e3a5f', 5000, 'legendary', '#0ea5e9', 6],
    ['Sakura Blossom', 'https://api.dicebear.com/7.x/shapes/svg?seed=sakura&backgroundColor=831843', 7500, 'legendary', '#ec4899', 7],
    ['Dragon Heart', 'https://api.dicebear.com/7.x/shapes/svg?seed=dragon&backgroundColor=450a0a', 10000, 'legendary', '#f97316', 8],
    ['Galaxy Nova', 'https://api.dicebear.com/7.x/shapes/svg?seed=galaxy&backgroundColor=172554', 25000, 'legendary', '#a855f7', 9],
    ['Thunder Bolt', 'https://api.dicebear.com/7.x/shapes/svg?seed=thunder&backgroundColor=1e1b4b', 4000, 'epic', '#fbbf24', 10],
    ['Ocean Wave', 'https://api.dicebear.com/7.x/shapes/svg?seed=ocean&backgroundColor=0f766e', 3000, 'epic', '#06b6d4', 11],
    ['Crimson Fang', 'https://api.dicebear.com/7.x/shapes/svg?seed=crimson&backgroundColor=450a0a', 6000, 'legendary', '#dc2626', 12],
    ['Frost Crystal', 'https://api.dicebear.com/7.x/shapes/svg?seed=frost&backgroundColor=0c4a6e', 5500, 'legendary', '#7dd3fc', 13],
    ['Shadow Phantom', 'https://api.dicebear.com/7.x/shapes/svg?seed=shadow&backgroundColor=020617', 8000, 'legendary', '#6b7280', 14],
    ['Celestial Star', 'https://api.dicebear.com/7.x/shapes/svg?seed=celestial&backgroundColor=1e1b4b', 12000, 'legendary', '#818cf8', 15],
    ['Neon Pulse', 'https://api.dicebear.com/7.x/shapes/svg?seed=neon&backgroundColor=042f2e', 9000, 'legendary', '#22d3ee', 16],
    ['Magical Moon', 'https://api.dicebear.com/7.x/shapes/svg?seed=moon&backgroundColor=1e1b4b', 15000, 'legendary', '#c084fc', 17],
    ['Solar Flare', 'https://api.dicebear.com/7.x/shapes/svg?seed=solar&backgroundColor=422006', 20000, 'legendary', '#fb923c', 18],
    ['Infinite Void', 'https://api.dicebear.com/7.x/shapes/svg?seed=void&backgroundColor=020617', 30000, 'legendary', '#38bdf8', 19],
  ];

  const [existing] = await pool.query('SELECT COUNT(*) as cnt FROM profile_frames');
  if (existing[0].cnt === 0) {
    for (const f of frames) {
      await pool.query('INSERT INTO profile_frames (name, image_url, price_xp, rarity, border_color, sort_order) VALUES (?, ?, ?, ?, ?, ?)', f);
    }
    console.log('Seeded', frames.length, 'profile frames');
  } else {
    console.log('Profile frames already exist:', existing[0].cnt);
  }

  // ===== BADGES SYSTEM =====
  const badgeStmts = [
    `CREATE TABLE IF NOT EXISTS badges (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      icon VARCHAR(10) NOT NULL DEFAULT '⭐',
      color VARCHAR(20) NOT NULL DEFAULT '#0ea5e9',
      description VARCHAR(255) DEFAULT '',
      is_verified TINYINT(1) DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS user_badges (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      badge_id INT NOT NULL,
      assigned_by INT DEFAULT NULL,
      assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_badge (user_id, badge_id)
    )`,
  ];

  for (const sql of badgeStmts) {
    await pool.query(sql);
  }
  console.log('Badge tables created');

  const badgeList = [
    ['Verified', '✓', '#22c55e', 'Official verified account', 1],
    ['VIP', '👑', '#fbbf24', 'Premium VIP member', 0],
    ['Early Supporter', '🌟', '#0ea5e9', 'Joined during beta', 0],
    ['Top Contributor', '🏆', '#a855f7', 'Top community contributor', 0],
    ['Content Creator', '🎬', '#ec4899', 'Creates anime content', 0],
    ['Legendary Watcher', '🔥', '#f97316', 'Watched 500+ episodes', 0],
    ['Master Reviewer', '📝', '#06b6d4', 'Wrote 50+ reviews', 0],
    ['Community Helper', '💙', '#3b82f6', 'Helped other members', 0],
    ['OG Member', '⚜️', '#f59e0b', 'Member for over 1 year', 0],
    ['Anime Master', '🎯', '#ef4444', 'Completed 100+ anime', 0],
  ];

  const [badgeCount] = await pool.query('SELECT COUNT(*) as cnt FROM badges');
  if (badgeCount[0].cnt === 0) {
    for (const b of badgeList) {
      await pool.query(
        'INSERT INTO badges (name, icon, color, description, is_verified) VALUES (?, ?, ?, ?, ?)',
        b
      );
    }
    console.log('Seeded', badgeList.length, 'badges');
  } else {
    console.log('Badges already exist:', badgeCount[0].cnt);
  }

  // Auto-assign Verified badge to all super_admin users
  const [superAdmins] = await pool.query("SELECT id FROM users WHERE role = 'super_admin'");
  const [verifiedBadge] = await pool.query("SELECT id FROM badges WHERE is_verified = 1");
  if (verifiedBadge.length > 0 && superAdmins.length > 0) {
    for (const admin of superAdmins) {
      await pool.query(
        'INSERT IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)',
        [admin.id, verifiedBadge[0].id]
      );
    }
    console.log('Assigned Verified badge to', superAdmins.length, 'super admin(s)');
  }

  await pool.end();
  console.log('Done!');
})();
