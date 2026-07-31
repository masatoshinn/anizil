-- =============================================
-- Anizil Database - Full Setup

SET NAMES utf8mb4;

-- =============================================
-- TABLES
-- =============================================

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  avatar VARCHAR(500) DEFAULT NULL,
  bio TEXT,
  role ENUM('super_admin','content_admin','moderator','user') DEFAULT 'user',
  is_banned TINYINT(1) DEFAULT 0,
  xp INT DEFAULT 0,
  level INT DEFAULT 1,
  premium_until DATETIME DEFAULT NULL,
  referral_code VARCHAR(20) DEFAULT NULL,
  referred_by INT DEFAULT NULL,
  active_frame_id INT DEFAULT NULL,
  google_id VARCHAR(255) DEFAULT NULL,
  email_verified TINYINT(1) DEFAULT 1,
  verify_token VARCHAR(255) DEFAULT NULL,
  verify_token_expiry DATETIME DEFAULT NULL,
  reset_token VARCHAR(255) DEFAULT NULL,
  reset_token_expiry DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS anime (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  slug VARCHAR(500) UNIQUE NOT NULL,
  series_title VARCHAR(500),
  description TEXT,
  poster VARCHAR(500),
  banner VARCHAR(500),
  genres VARCHAR(500),
  studio VARCHAR(255),
  rating DECIMAL(3,1) DEFAULT 0,
  mal_score DECIMAL(3,1) DEFAULT 0,
  release_year INT,
  duration VARCHAR(50),
  language VARCHAR(50) DEFAULT 'sub',
  status ENUM('ongoing','completed','upcoming','hiatus') DEFAULT 'ongoing',
  broadcast_day VARCHAR(20),
  broadcast_time VARCHAR(20),
  season VARCHAR(20),
  episode_count INT DEFAULT 0,
  is_featured TINYINT(1) DEFAULT 0,
  is_premium TINYINT(1) DEFAULT 0,
  anilist_id INT DEFAULT NULL,
  mal_id INT DEFAULT NULL,
  anikoto_id VARCHAR(50) DEFAULT NULL,
  views INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS episodes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  anime_id INT NOT NULL,
  episode_number INT NOT NULL,
  title VARCHAR(500),
  description TEXT,
  thumbnail VARCHAR(500),
  duration VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE,
  UNIQUE KEY unique_ep (anime_id, episode_number)
);

CREATE TABLE IF NOT EXISTS episode_sources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  episode_id INT NOT NULL,
  language VARCHAR(50) NOT NULL,
  server_name VARCHAR(100),
  video_url VARCHAR(1000),
  embed_link VARCHAR(1000),
  source_type ENUM('embed','url') DEFAULT 'embed',
  is_active TINYINT(1) DEFAULT 1,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS watchlists (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  anime_id INT NOT NULL,
  status ENUM('watching','completed','plan_to_watch','on_hold','dropped') DEFAULT 'watching',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE,
  UNIQUE KEY unique_watchlist (user_id, anime_id)
);

CREATE TABLE IF NOT EXISTS watch_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  anime_id INT NOT NULL,
  episode_id INT NOT NULL,
  progress INT DEFAULT 0,
  completed TINYINT(1) DEFAULT 0,
  watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE,
  FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  episode_id INT,
  anime_id INT,
  content TEXT NOT NULL,
  parent_id INT DEFAULT NULL,
  status ENUM('pending','approved','flagged','removed') DEFAULT 'approved',
  likes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reporter_id INT NOT NULL,
  comment_id INT,
  reason TEXT NOT NULL,
  status ENUM('pending','dismissed','resolved') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS forum_posts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  category ENUM('general','recommendations','discussion','help') DEFAULT 'general',
  views INT DEFAULT 0,
  likes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS forum_replies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  post_id INT NOT NULL,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  likes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES forum_posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(500),
  content TEXT,
  is_read TINYINT(1) DEFAULT 0,
  type VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS achievements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(100),
  xp_reward INT DEFAULT 0,
  requirement_type VARCHAR(100),
  requirement_value INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  achievement_id INT NOT NULL,
  unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
  UNIQUE KEY unique_ua (user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS redeem_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  reward_type ENUM('xp','premium_days','credits') DEFAULT 'xp',
  reward_amount INT DEFAULT 0,
  is_redeemed TINYINT(1) DEFAULT 0,
  redeemed_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  redeemed_at DATETIME DEFAULT NULL,
  FOREIGN KEY (redeemed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS api_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  token VARCHAR(500) UNIQUE NOT NULL,
  scope ENUM('read','write','admin') DEFAULT 'read',
  is_active TINYINT(1) DEFAULT 1,
  last_used DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value TEXT,
  setting_type VARCHAR(50) DEFAULT 'text',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS profile_frames (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  price_xp INT NOT NULL DEFAULT 500,
  rarity ENUM('common','rare','epic','legendary') DEFAULT 'common',
  border_color VARCHAR(20) DEFAULT '#0ea5e9',
  is_active TINYINT(1) DEFAULT 1,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_frames (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  frame_id INT NOT NULL,
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_active TINYINT(1) DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (frame_id) REFERENCES profile_frames(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_frame (user_id, frame_id)
);

CREATE TABLE IF NOT EXISTS user_purchased_anime (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  anime_id INT NOT NULL,
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_anime (user_id, anime_id)
);

CREATE TABLE IF NOT EXISTS badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10) NOT NULL DEFAULT '⭐',
  color VARCHAR(20) NOT NULL DEFAULT '#0ea5e9',
  description VARCHAR(255) DEFAULT '',
  is_verified TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  badge_id INT NOT NULL,
  assigned_by INT DEFAULT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_badge (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS visitor_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page VARCHAR(500),
  ip_address VARCHAR(45),
  user_agent TEXT,
  user_id INT DEFAULT NULL,
  visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_feed (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  action VARCHAR(100),
  details TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- SEED DATA
-- =============================================

INSERT IGNORE INTO settings (setting_key, setting_value, setting_type) VALUES
('site_name', 'Anizil', 'text'),
('site_title', 'Anizil - Anime Streaming Portal', 'text'),
('site_description', 'Watch anime online for free', 'text'),
('logo_url', '', 'text'),
('favicon_url', '', 'text'),
('registration_enabled', '1', 'boolean'),
('forum_enabled', '1', 'boolean'),
('shop_enabled', '1', 'boolean'),
('maintenance_mode', '0', 'boolean'),
('announcement_enabled', '0', 'boolean'),
('announcement_text', 'Welcome to Anizil!', 'text'),
('ads_enabled', '1', 'boolean'),
('ads_publisher_tag', '', 'text'),
('ads_homepage_hero', '', 'text'),
('ads_watch_below_player', '', 'text'),
('ads_watch_sidebar', '', 'text'),
('ads_sticky_bottom', '', 'text'),
('free_episodes_count', '3', 'number'),
('premium_enabled', '0', 'boolean'),
('premium_monthly_xp', '5000', 'number'),
('premium_quarterly_xp', '12000', 'number'),
('premium_yearly_xp', '35000', 'number');

INSERT IGNORE INTO achievements (name, description, icon, xp_reward, requirement_type, requirement_value) VALUES
('First Watch', 'Watch your first episode', 'eye', 50, 'episodes_watched', 1),
('Binge Watcher', 'Watch 10 episodes', 'flame', 200, 'episodes_watched', 10),
('Otaku', 'Watch 100 episodes', 'star', 1000, 'episodes_watched', 100),
('Anime Master', 'Watch 500 episodes', 'crown', 5000, 'episodes_watched', 500),
('Social Butterfly', 'Post your first comment', 'message-circle', 50, 'comments', 1),
('Conversationalist', 'Post 50 comments', 'messages-square', 500, 'comments', 50),
('Collector', 'Add 5 anime to watchlist', 'heart', 100, 'watchlist', 5),
('Curator', 'Add 25 anime to watchlist', 'bookmark', 500, 'watchlist', 25),
('Early Bird', 'Join during beta', 'bird', 100, 'join', 1),
('Loyal Fan', 'Use Anizil for 30 days', 'calendar', 500, 'days_active', 30);

-- =============================================
-- DEFAULT SUPER ADMIN (password: admin123)
-- =============================================

INSERT IGNORE INTO users (name, email, password, role) VALUES
('Admin', 'admin@anizil.com', '$2a$10$jXoB/pZH7uAJgxJe8eNKuOjbYwLgMbGFt2rhotHdR/PkvL1NQFJHW', 'super_admin');

-- =============================================
-- PROFILE FRAMES (XP Shop items)
-- =============================================
INSERT INTO profile_frames (name, image_url, price_xp, rarity, border_color, sort_order) VALUES
('No Frame', '', 0, 'common', '#64748b', 0),
('Bronze Shield', 'https://api.dicebear.com/7.x/shapes/svg?seed=bronze&backgroundColor=78350f', 200, 'common', '#cd7f32', 1),
('Silver Wing', 'https://api.dicebear.com/7.x/shapes/svg?seed=silver&backgroundColor=475569', 500, 'rare', '#c0c0c0', 2),
('Golden Crown', 'https://api.dicebear.com/7.x/shapes/svg?seed=gold&backgroundColor=713f12', 1000, 'rare', '#ffd700', 3),
('Emerald Leaf', 'https://api.dicebear.com/7.x/shapes/svg?seed=emerald&backgroundColor=064e3b', 2000, 'epic', '#10b981', 4),
('Ruby Flame', 'https://api.dicebear.com/7.x/shapes/svg?seed=ruby&backgroundColor=7f1d1d', 3500, 'epic', '#ef4444', 5),
('Diamond Ice', 'https://api.dicebear.com/7.x/shapes/svg?seed=diamond&backgroundColor=1e3a5f', 5000, 'legendary', '#0ea5e9', 6),
('Sakura Blossom', 'https://api.dicebear.com/7.x/shapes/svg?seed=sakura&backgroundColor=831843', 7500, 'legendary', '#ec4899', 7),
('Dragon Heart', 'https://api.dicebear.com/7.x/shapes/svg?seed=dragon&backgroundColor=450a0a', 10000, 'legendary', '#f97316', 8),
('Galaxy Nova', 'https://api.dicebear.com/7.x/shapes/svg?seed=galaxy&backgroundColor=172554', 25000, 'legendary', '#a855f7', 9);

-- =============================================
-- ALTER TABLES for existing databases
-- =============================================
-- AUTO-LOGOUT FIX:
-- The auth middleware runs:
--   SELECT id, name, email, avatar, role, is_banned, xp, level, premium_until,
--          active_frame_id, email_verified, created_at FROM users WHERE id = ?
-- and /auth/me runs queries against badges / user_badges.
-- If any of these columns/tables are missing, every authenticated request throws
-- an SQL error -> API returns 401/500 -> the client clears the token -> you are
-- logged out right after logging in. This section guarantees they all exist.
-- (Uses "ADD COLUMN IF NOT EXISTS" — works on MariaDB 10.0+ and MySQL 8.0.29+,
-- requires no INFORMATION_SCHEMA access.)
-- =============================================

CREATE TABLE IF NOT EXISTS badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  icon VARCHAR(10) NOT NULL DEFAULT '⭐',
  color VARCHAR(20) NOT NULL DEFAULT '#0ea5e9',
  description VARCHAR(255) DEFAULT '',
  is_verified TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_badges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  badge_id INT NOT NULL,
  assigned_by INT DEFAULT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_badge (user_id, badge_id)
);

-- episode_sources: ensure embed_link and source_type columns exist.
-- Older schemas are missing them, so any "INSERT INTO episode_sources (... embed_link ...)"
-- fails with "Unknown column 'embed_link' in 'INSERT INTO'".
ALTER TABLE episode_sources ADD COLUMN IF NOT EXISTS embed_link VARCHAR(1000) DEFAULT NULL;
ALTER TABLE episode_sources ADD COLUMN IF NOT EXISTS source_type ENUM('embed','url') DEFAULT 'embed';

-- anime: ensure is_premium exists (referenced by INSERT INTO anime in admin/import code)
ALTER TABLE anime ADD COLUMN IF NOT EXISTS is_premium TINYINT(1) DEFAULT 0;

-- users: every column used by the login/auth flow (fixes auto-logout)
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_frame_id INT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified TINYINT(1) DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token_expiry DATETIME DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry DATETIME DEFAULT NULL;
