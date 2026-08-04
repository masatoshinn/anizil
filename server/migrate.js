const mysql = require('mysql2/promise');
require('dotenv').config();

// Run schema creation and seed routines against the database
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
    `CREATE TABLE IF NOT EXISTS visitor_log (
      id INT AUTO_INCREMENT PRIMARY KEY,
      page VARCHAR(255) NOT NULL,
      ip_address VARCHAR(45) DEFAULT NULL,
      user_agent VARCHAR(300) DEFAULT NULL,
      user_id INT DEFAULT NULL,
      visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_visitor_page (page),
      INDEX idx_visitor_created (visited_at)
    )`,
    `CREATE TABLE IF NOT EXISTS contact_messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL,
      subject VARCHAR(255) DEFAULT '',
      message TEXT NOT NULL,
      category ENUM('general','report','bug','suggestion','copyright') DEFAULT 'general',
      status ENUM('new','read','resolved') DEFAULT 'new',
      user_id INT DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS follows (
      id INT AUTO_INCREMENT PRIMARY KEY,
      follower_id INT NOT NULL,
      following_id INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_follow (follower_id, following_id)
    )`,
    `CREATE TABLE IF NOT EXISTS name_colors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(50) NOT NULL,
      color_value VARCHAR(100) NOT NULL,
      color_type ENUM('solid','gradient','animated') DEFAULT 'solid',
      price_xp INT NOT NULL DEFAULT 500,
      rarity ENUM('common','rare','epic','legendary') DEFAULT 'common',
      is_active TINYINT(1) DEFAULT 1,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS user_name_colors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      color_id INT NOT NULL,
      purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (color_id) REFERENCES name_colors(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_color (user_id, color_id)
    )`,
    `CREATE TABLE IF NOT EXISTS profile_banners (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      image_url VARCHAR(500) NOT NULL,
      price_xp INT NOT NULL DEFAULT 1000,
      rarity ENUM('common','rare','epic','legendary') DEFAULT 'common',
      is_active TINYINT(1) DEFAULT 1,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS user_banners (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      banner_id INT NOT NULL,
      purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (banner_id) REFERENCES profile_banners(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_banner (user_id, banner_id)
    )`,
    `CREATE TABLE IF NOT EXISTS mangas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(500) NOT NULL,
      slug VARCHAR(500) UNIQUE NOT NULL,
      description TEXT,
      poster VARCHAR(500),
      author VARCHAR(255),
      artist VARCHAR(255),
      status VARCHAR(50) DEFAULT 'ongoing',
      genres VARCHAR(500),
      demography VARCHAR(100),
      content_rating VARCHAR(50),
      year INT,
      rating DECIMAL(3,1) DEFAULT 0,
      follow_count INT DEFAULT 0,
      mangadex_id VARCHAR(100) DEFAULT NULL,
      created_by INT DEFAULT NULL,
      user_rating DECIMAL(3,1) DEFAULT 0,
      rating_count INT DEFAULT 0,
      views INT DEFAULT 0,
      is_featured TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY unique_mangadex_id (mangadex_id)
    )`,
    `CREATE TABLE IF NOT EXISTS manga_chapters (
      id INT AUTO_INCREMENT PRIMARY KEY,
      manga_id INT NOT NULL,
      chapter_uuid VARCHAR(100) NOT NULL,
      chapter_number VARCHAR(50) DEFAULT NULL,
      title VARCHAR(500),
      volume VARCHAR(50),
      language VARCHAR(20) DEFAULT 'en',
      scanlation_group VARCHAR(255),
      external_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (manga_id) REFERENCES mangas(id) ON DELETE CASCADE,
      UNIQUE KEY unique_manga_chapter (manga_id, chapter_uuid)
    )`,
    `CREATE TABLE IF NOT EXISTS content_ratings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      content_type ENUM('anime','manga') DEFAULT 'anime',
      content_id INT NOT NULL,
      user_id INT NOT NULL,
      rating TINYINT NOT NULL,
      review TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE KEY unique_user_content (content_type, content_id, user_id),
      INDEX idx_content (content_type, content_id)
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(255),
      content TEXT,
      type VARCHAR(50) DEFAULT 'general',
      link VARCHAR(500),
      is_read TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_notif_user (user_id, is_read),
      INDEX idx_notif_user_created (user_id, created_at)
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

  try {
    await pool.query('ALTER TABLE users ADD COLUMN email_verified TINYINT(1) DEFAULT 1');
    console.log('Added email_verified column');
  } catch (e) {
    console.log('email_verified column already exists');
  }

  try {
    await pool.query('ALTER TABLE users ADD COLUMN verify_token VARCHAR(255) DEFAULT NULL');
    console.log('Added verify_token column');
  } catch (e) {
    console.log('verify_token column already exists');
  }

  try {
    await pool.query('ALTER TABLE users ADD COLUMN verify_token_expiry DATETIME DEFAULT NULL');
    console.log('Added verify_token_expiry column');
  } catch (e) {
    console.log('verify_token_expiry column already exists');
  }

  try {
    await pool.query('ALTER TABLE forum_posts ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    console.log('Added forum_posts.updated_at column');
  } catch (e) {
    console.log('forum_posts.updated_at column already exists');
  }

  try {
    await pool.query('ALTER TABLE forum_replies ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');
    console.log('Added forum_replies.updated_at column');
  } catch (e) {
    console.log('forum_replies.updated_at column already exists');
  }

  try {
    await pool.query('ALTER TABLE users ADD COLUMN active_name_color VARCHAR(100) DEFAULT NULL');
    console.log('Added active_name_color column');
  } catch (e) {
    console.log('active_name_color column already exists');
  }

  try {
    await pool.query('ALTER TABLE users ADD COLUMN active_banner_id INT DEFAULT NULL');
    console.log('Added active_banner_id column');
  } catch (e) {
    console.log('active_banner_id column already exists');
  }

  try {
    await pool.query('ALTER TABLE badges ADD COLUMN price_xp INT NOT NULL DEFAULT 0');
    console.log('Added badges.price_xp column');
  } catch (e) {
    console.log('badges.price_xp column already exists');
  }

  try {
    await pool.query('ALTER TABLE anime ADD COLUMN user_rating DECIMAL(3,1) DEFAULT 0');
    console.log('Added anime.user_rating column');
  } catch (e) {
    console.log('anime.user_rating column already exists');
  }

  try {
    await pool.query('ALTER TABLE anime ADD COLUMN rating_count INT DEFAULT 0');
    console.log('Added anime.rating_count column');
  } catch (e) {
    console.log('anime.rating_count column already exists');
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
      icon VARCHAR(50) NOT NULL DEFAULT 'fa-solid fa-star',
      color VARCHAR(20) NOT NULL DEFAULT '#0ea5e9',
      description VARCHAR(255) DEFAULT '',
      is_verified TINYINT(1) DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      price_xp INT NOT NULL DEFAULT 0,
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
    ['Verified', 'fa-solid fa-badge-check', '#22c55e', 'Official verified account', 1],
    ['VIP', 'fa-solid fa-gem', '#fbbf24', 'Premium VIP member', 0],
    ['Early Supporter', 'fa-solid fa-star', '#0ea5e9', 'Joined during beta', 0],
    ['Top Contributor', 'fa-solid fa-trophy', '#a855f7', 'Top community contributor', 0],
    ['Content Creator', 'fa-solid fa-clapperboard', '#ec4899', 'Creates anime content', 0],
    ['Legendary Watcher', 'fa-solid fa-fire', '#f97316', 'Watched 500+ episodes', 0],
    ['Master Reviewer', 'fa-solid fa-pen-to-square', '#06b6d4', 'Wrote 50+ reviews', 0],
    ['Community Helper', 'fa-solid fa-hand-holding-heart', '#3b82f6', 'Helped other members', 0],
    ['OG Member', 'fa-solid fa-award', '#f59e0b', 'Member for over 1 year', 0],
    ['Anime Master', 'fa-solid fa-crosshairs', '#ef4444', 'Completed 100+ anime', 0],
  ];

  // Widen icon column on existing databases (idempotent on every boot).
  try {
    await pool.query('ALTER TABLE badges MODIFY COLUMN icon VARCHAR(50) NOT NULL DEFAULT "fa-solid fa-star"');
  } catch (e) {
    console.log('Badge icon column already compatible:', e.message);
  }

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

  // Default role badges + auto-assign to matching users (runs every boot,
  // safe: seeded by name and assigned with INSERT IGNORE).
  const roleBadges = [
    ['Super Admin', 'fa-solid fa-crown', '#ef4444', 'Site super administrator', 0, 'super_admin'],
    ['Admin', 'fa-solid fa-user-shield', '#fbbf24', 'Site administrator', 0, 'content_admin'],
    ['Moderator', 'fa-solid fa-shield-halved', '#0ea5e9', 'Community moderator', 0, 'moderator'],
    ['Creator', 'fa-solid fa-pen-nib', '#ec4899', 'Site content creator', 0, 'creator'],
  ];
  for (const [name, icon, color, desc, verified, role] of roleBadges) {
    const [existing] = await pool.query('SELECT id FROM badges WHERE name = ?', [name]);
    let badgeId = existing[0]?.id;
    if (!badgeId) {
      const [ins] = await pool.query(
        'INSERT INTO badges (name, icon, color, description, is_verified) VALUES (?, ?, ?, ?, ?)',
        [name, icon, color, desc, verified]
      );
      badgeId = ins.insertId;
      console.log('Seeded role badge:', name);
    }
    const [users] = await pool.query('SELECT id FROM users WHERE role = ?', [role]);
    for (const u of users) {
      await pool.query('INSERT IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)', [u.id, badgeId]);
    }
  }

  // Keep FontAwesome icons in sync for existing databases (runs every boot,
  // fixes old emoji icons and any values truncated before the column was widened).
  const defaultIconMap = {
    'Verified': 'fa-solid fa-badge-check',
    'Super Admin': 'fa-solid fa-crown',
    'Admin': 'fa-solid fa-user-shield',
    'Moderator': 'fa-solid fa-shield-halved',
    'Creator': 'fa-solid fa-pen-nib',
    'VIP': 'fa-solid fa-gem',
    'Early Supporter': 'fa-solid fa-star',
    'Top Contributor': 'fa-solid fa-trophy',
    'Content Creator': 'fa-solid fa-clapperboard',
    'Legendary Watcher': 'fa-solid fa-fire',
    'Master Reviewer': 'fa-solid fa-pen-to-square',
    'Community Helper': 'fa-solid fa-hand-holding-heart',
    'OG Member': 'fa-solid fa-award',
    'Anime Master': 'fa-solid fa-crosshairs',
  };
  for (const [name, icon] of Object.entries(defaultIconMap)) {
    await pool.query('UPDATE badges SET icon = ? WHERE name = ?', [icon, name]);
  }
  // Role badges show their own icon (NOT the green verified checkmark).
  await pool.query(
    "UPDATE badges SET is_verified = 0 WHERE name IN ('Super Admin','Admin','Moderator','Creator')"
  );

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

  // ===== NAME COLORS =====
  const [colorCount] = await pool.query('SELECT COUNT(*) as cnt FROM name_colors');
  if (colorCount[0].cnt === 0) {
    const colors = [
      ['Default', '#f8fafc', 'solid', 0, 'common', 0],
      ['Crimson Red', '#ef4444', 'solid', 200, 'common', 1],
      ['Ocean Blue', '#0ea5e9', 'solid', 200, 'common', 2],
      ['Forest Green', '#22c55e', 'solid', 200, 'common', 3],
      ['Golden Sun', '#fbbf24', 'solid', 300, 'common', 4],
      ['Royal Purple', '#a855f7', 'solid', 500, 'rare', 5],
      ['Hot Pink', '#ec4899', 'solid', 500, 'rare', 6],
      ['Tangerine', '#f97316', 'solid', 500, 'rare', 7],
      ['Cyan Neon', '#22d3ee', 'solid', 800, 'rare', 8],
      ['Ruby Red', '#dc2626', 'solid', 1000, 'epic', 9],
      ['Emerald Glow', '#10b981', 'solid', 1000, 'epic', 10],
      ['Amethyst', '#8b5cf6', 'solid', 1500, 'epic', 11],
      ['Sunset Gradient', 'linear-gradient(90deg, #f97316, #ef4444)', 'gradient', 2000, 'epic', 12],
      ['Ocean Gradient', 'linear-gradient(90deg, #0ea5e9, #6366f1)', 'gradient', 2000, 'epic', 13],
      ['Gold Gradient', 'linear-gradient(90deg, #fbbf24, #f59e0b)', 'gradient', 2500, 'epic', 14],
      ['Neon Purple Gradient', 'linear-gradient(90deg, #a855f7, #ec4899)', 'gradient', 2500, 'epic', 15],
      ['Rainbow Animated', 'linear-gradient(90deg, #ef4444, #f97316, #fbbf24, #22c55e, #0ea5e9, #a855f7)', 'animated', 5000, 'legendary', 16],
      ['Fire Animated', 'linear-gradient(90deg, #f97316, #ef4444, #fbbf24)', 'animated', 6000, 'legendary', 17],
      ['Aurora Animated', 'linear-gradient(90deg, #22d3ee, #a855f7, #ec4899)', 'animated', 7000, 'legendary', 18],
    ];
    for (const c of colors) {
      await pool.query('INSERT INTO name_colors (name, color_value, color_type, price_xp, rarity, sort_order) VALUES (?, ?, ?, ?, ?, ?)', c);
    }
    console.log('Seeded', colors.length, 'name colors');
  } else {
    console.log('Name colors already exist:', colorCount[0].cnt);
  }

  // ===== PROFILE BANNERS =====
  const [bannerCount] = await pool.query('SELECT COUNT(*) as cnt FROM profile_banners');
  if (bannerCount[0].cnt === 0) {
    const banners = [
      ['No Banner', '', 0, 'common', 0],
      ['Sunset Horizon', 'https://api.dicebear.com/7.x/shapes/svg?seed=bannerSunset&backgroundColor=7c2d12', 1000, 'rare', 1],
      ['Ocean Waves', 'https://api.dicebear.com/7.x/shapes/svg?seed=bannerOcean&backgroundColor=0c4a6e', 1500, 'rare', 2],
      ['Neon City', 'https://api.dicebear.com/7.x/shapes/svg?seed=bannerNeon&backgroundColor=1e1b4b', 2500, 'epic', 3],
      ['Forest Mist', 'https://api.dicebear.com/7.x/shapes/svg?seed=bannerForest&backgroundColor=052e16', 2500, 'epic', 4],
      ['Galaxy Night', 'https://api.dicebear.com/7.x/shapes/svg?seed=bannerGalaxy&backgroundColor=172554', 4000, 'epic', 5],
      ['Sakura Wind', 'https://api.dicebear.com/7.x/shapes/svg?seed=bannerSakura&backgroundColor=4a044e', 6000, 'legendary', 6],
      ['Volcano Fury', 'https://api.dicebear.com/7.x/shapes/svg?seed=bannerVolcano&backgroundColor=450a0a', 8000, 'legendary', 7],
      ['Celestial Dream', 'https://api.dicebear.com/7.x/shapes/svg?seed=bannerCelestial&backgroundColor=1e1b4b', 12000, 'legendary', 8],
    ];
    for (const b of banners) {
      await pool.query('INSERT INTO profile_banners (name, image_url, price_xp, rarity, sort_order) VALUES (?, ?, ?, ?, ?)', b);
    }
    console.log('Seeded', banners.length, 'profile banners');
  } else {
    console.log('Profile banners already exist:', bannerCount[0].cnt);
  }

  // ===== BUYABLE BADGES =====
  const shopBadges = [
    ['XP Hoarder', '💰', '#fbbf24', 'Owned 10000+ XP at once', 500],
    ['Frame Collector', '🖼️', '#0ea5e9', 'Owned 5+ profile frames', 1500],
    ['Color Artist', '🎨', '#a855f7', 'Owned 5+ name colors', 2000],
    ['Premium Elite', '💎', '#22c55e', 'Premium member badge', 3000],
  ];
  for (const sb of shopBadges) {
    const [exists] = await pool.query('SELECT id FROM badges WHERE name = ?', [sb[0]]);
    if (exists.length === 0) {
      await pool.query(
        'INSERT INTO badges (name, icon, color, description, is_verified, is_active, price_xp) VALUES (?, ?, ?, ?, 0, 1, ?)',
        [sb[0], sb[1], sb[2], sb[3], sb[4]]
      );
    }
  }
  console.log('Seeded buyable badges');

  await pool.end();
  console.log('Done!');
})();
