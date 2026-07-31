-- =============================================
-- Anizil UPDATE SQL - Badge System + Email + Follow System + New Features
-- Direct import this into your hosting phpMyAdmin / MySQL / MariaDB.
-- Safe to run on an existing database (tables: IF NOT EXISTS, columns: IF NOT EXISTS).
-- =============================================

SET NAMES utf8mb4;

-- =============================================
-- 1) NEW TABLES
-- =============================================

-- Badge definitions (icons, colors, verified flag)
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

-- Which user owns which badges (admin-assigned)
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

-- Contact / report messages submitted from the Contact page
CREATE TABLE IF NOT EXISTS contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(255) DEFAULT '',
  message TEXT NOT NULL,
  category ENUM('general','report','bug','suggestion','copyright') DEFAULT 'general',
  status ENUM('new','read','resolved') DEFAULT 'new',
  user_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Follow / following relationships between users
CREATE TABLE IF NOT EXISTS follows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  follower_id INT NOT NULL,
  following_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_follow (follower_id, following_id)
);

-- Visitor log (admin page) - records page visits
CREATE TABLE IF NOT EXISTS visitor_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  page VARCHAR(500),
  ip_address VARCHAR(45),
  user_agent TEXT,
  user_id INT DEFAULT NULL,
  visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- 2) NEW COLUMNS ON EXISTING TABLES
-- =============================================
-- NOTE: Uses "ADD COLUMN IF NOT EXISTS" (MariaDB 10.0+ / MySQL 8.0.29+). It requires
-- no INFORMATION_SCHEMA access, unlike the previous PREPARE-based checks. If these
-- columns are missing, the auth middleware / /auth/me queries fail -> 401/500 -> user
-- is auto-logged out.

-- episode_sources: ensure embed_link and source_type columns exist.
-- Older schemas are missing them, so any "INSERT INTO episode_sources (... embed_link ...)"
-- fails with "Unknown column 'embed_link' in 'INSERT INTO'".
ALTER TABLE episode_sources ADD COLUMN IF NOT EXISTS embed_link VARCHAR(1000) DEFAULT NULL;
ALTER TABLE episode_sources ADD COLUMN IF NOT EXISTS source_type ENUM('embed','url') DEFAULT 'embed';

-- anime: ensure is_premium exists (referenced by INSERT INTO anime in admin/import code)
ALTER TABLE anime ADD COLUMN IF NOT EXISTS is_premium TINYINT(1) DEFAULT 0;

-- users: every column used by the login/auth flow
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_frame_id INT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) DEFAULT NULL;

-- Password reset token columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry DATETIME DEFAULT NULL;

-- Email verification columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified TINYINT(1) DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token_expiry DATETIME DEFAULT NULL;

-- Forum edit/delete support (updated_at timestamps)
ALTER TABLE forum_posts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;
ALTER TABLE forum_replies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- =============================================
-- 3) SEED BADGES (10 badges)
-- =============================================

INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'Verified', '✓', '#22c55e', 'Official verified account', 1
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Verified');

INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'VIP', '👑', '#fbbf24', 'Premium VIP member', 0
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'VIP');

INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'Early Supporter', '🌟', '#0ea5e9', 'Joined during beta', 0
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Early Supporter');

INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'Top Contributor', '🏆', '#a855f7', 'Top community contributor', 0
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Top Contributor');

INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'Content Creator', '🎬', '#ec4899', 'Creates anime content', 0
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Content Creator');

INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'Legendary Watcher', '🔥', '#f97316', 'Watched 500+ episodes', 0
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Legendary Watcher');

INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'Master Reviewer', '📝', '#06b6d4', 'Wrote 50+ reviews', 0
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Master Reviewer');

INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'Community Helper', '💙', '#3b82f6', 'Helped other members', 0
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Community Helper');

INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'OG Member', '⚜️', '#f59e0b', 'Member for over 1 year', 0
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'OG Member');

INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'Anime Master', '🎯', '#ef4444', 'Completed 100+ anime', 0
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Anime Master');

-- =============================================
-- 4) EXTRA PROFILE FRAMES (11 to 20)
--    (Frames 1-10 are already in anizil_database.sql)
-- =============================================

INSERT INTO profile_frames (name, image_url, price_xp, rarity, border_color, sort_order)
SELECT 'Thunder Bolt', 'https://api.dicebear.com/7.x/shapes/svg?seed=thunder&backgroundColor=1e1b4b', 4000, 'epic', '#fbbf24', 11
WHERE NOT EXISTS (SELECT 1 FROM profile_frames WHERE name = 'Thunder Bolt');

INSERT INTO profile_frames (name, image_url, price_xp, rarity, border_color, sort_order)
SELECT 'Ocean Wave', 'https://api.dicebear.com/7.x/shapes/svg?seed=ocean&backgroundColor=0f766e', 3000, 'epic', '#06b6d4', 12
WHERE NOT EXISTS (SELECT 1 FROM profile_frames WHERE name = 'Ocean Wave');

INSERT INTO profile_frames (name, image_url, price_xp, rarity, border_color, sort_order)
SELECT 'Crimson Fang', 'https://api.dicebear.com/7.x/shapes/svg?seed=crimson&backgroundColor=450a0a', 6000, 'legendary', '#dc2626', 13
WHERE NOT EXISTS (SELECT 1 FROM profile_frames WHERE name = 'Crimson Fang');

INSERT INTO profile_frames (name, image_url, price_xp, rarity, border_color, sort_order)
SELECT 'Frost Crystal', 'https://api.dicebear.com/7.x/shapes/svg?seed=frost&backgroundColor=0c4a6e', 5500, 'legendary', '#7dd3fc', 14
WHERE NOT EXISTS (SELECT 1 FROM profile_frames WHERE name = 'Frost Crystal');

INSERT INTO profile_frames (name, image_url, price_xp, rarity, border_color, sort_order)
SELECT 'Shadow Phantom', 'https://api.dicebear.com/7.x/shapes/svg?seed=shadow&backgroundColor=020617', 8000, 'legendary', '#6b7280', 15
WHERE NOT EXISTS (SELECT 1 FROM profile_frames WHERE name = 'Shadow Phantom');

INSERT INTO profile_frames (name, image_url, price_xp, rarity, border_color, sort_order)
SELECT 'Celestial Star', 'https://api.dicebear.com/7.x/shapes/svg?seed=celestial&backgroundColor=1e1b4b', 12000, 'legendary', '#818cf8', 16
WHERE NOT EXISTS (SELECT 1 FROM profile_frames WHERE name = 'Celestial Star');

INSERT INTO profile_frames (name, image_url, price_xp, rarity, border_color, sort_order)
SELECT 'Neon Pulse', 'https://api.dicebear.com/7.x/shapes/svg?seed=neon&backgroundColor=042f2e', 9000, 'legendary', '#22d3ee', 17
WHERE NOT EXISTS (SELECT 1 FROM profile_frames WHERE name = 'Neon Pulse');

INSERT INTO profile_frames (name, image_url, price_xp, rarity, border_color, sort_order)
SELECT 'Magical Moon', 'https://api.dicebear.com/7.x/shapes/svg?seed=moon&backgroundColor=1e1b4b', 15000, 'legendary', '#c084fc', 18
WHERE NOT EXISTS (SELECT 1 FROM profile_frames WHERE name = 'Magical Moon');

INSERT INTO profile_frames (name, image_url, price_xp, rarity, border_color, sort_order)
SELECT 'Solar Flare', 'https://api.dicebear.com/7.x/shapes/svg?seed=solar&backgroundColor=422006', 20000, 'legendary', '#fb923c', 19
WHERE NOT EXISTS (SELECT 1 FROM profile_frames WHERE name = 'Solar Flare');

INSERT INTO profile_frames (name, image_url, price_xp, rarity, border_color, sort_order)
SELECT 'Infinite Void', 'https://api.dicebear.com/7.x/shapes/svg?seed=void&backgroundColor=020617', 30000, 'legendary', '#38bdf8', 20
WHERE NOT EXISTS (SELECT 1 FROM profile_frames WHERE name = 'Infinite Void');

-- =============================================
-- 5) AUTO-ASSIGN VERIFIED BADGE TO SUPER ADMINS
--    Runs only if there is at least one super_admin and a verified badge.
-- =============================================

INSERT INTO user_badges (user_id, badge_id)
SELECT u.id, b.id
FROM users u
CROSS JOIN badges b
WHERE u.role = 'super_admin'
  AND b.is_verified = 1
  AND NOT EXISTS (
    SELECT 1 FROM user_badges ub
    WHERE ub.user_id = u.id AND ub.badge_id = b.id
  );

-- =============================================
-- 6) AUTO-LOGOUT FIX
--    Symptoms: after logging in you are instantly logged out.
--    Cause: the auth middleware runs
--      SELECT ... active_frame_id, email_verified, created_at FROM users WHERE id = ?
--    and /auth/me joins badges / user_badges. If any of those columns or tables are
--    missing, every authenticated request throws -> 401/500 -> the client clears the
--    token -> you appear logged out. This re-runs every check so it always fixes it.
-- =============================================

-- Make sure the badge tables exist (required by /auth/me)
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

-- If the badges table already exists with a wrong charset (e.g. latin1/utf8mb3),
-- convert it so the emoji icons/defaults are accepted (fixes "#1067 Invalid
-- default value for 'icon'"). Safe no-op if it is already utf8mb4. The CREATE
-- TABLE IF NOT EXISTS above guarantees the table exists.
ALTER TABLE badges CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

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

-- Make sure every users column used by the login/auth flow exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS active_frame_id INT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified TINYINT(1) DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verify_token_expiry DATETIME DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_token_expiry DATETIME DEFAULT NULL;

-- Make sure the settings row used by /auth/me exists (safe no-op if already present)
INSERT IGNORE INTO settings (setting_key, setting_value, setting_type) VALUES
('role_permissions', '', 'text');

-- Re-seed badges only if none exist yet
INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'Verified', '✓', '#22c55e', 'Official verified account', 1
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Verified');

INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'VIP', '👑', '#fbbf24', 'Premium VIP member', 0
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'VIP');

INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'Early Supporter', '🌟', '#0ea5e9', 'Joined during beta', 0
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Early Supporter');

INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'Top Contributor', '🏆', '#a855f7', 'Top community contributor', 0
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Top Contributor');

INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'Content Creator', '🎬', '#ec4899', 'Creates anime content', 0
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Content Creator');

INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'Legendary Watcher', '🔥', '#f97316', 'Watched 500+ episodes', 0
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Legendary Watcher');

INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'Master Reviewer', '📝', '#06b6d4', 'Wrote 50+ reviews', 0
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Master Reviewer');

INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'Community Helper', '💙', '#3b82f6', 'Helped other members', 0
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Community Helper');

INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'OG Member', '⚜️', '#f59e0b', 'Member for over 1 year', 0
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'OG Member');

INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'Anime Master', '🎯', '#ef4444', 'Completed 100+ anime', 0
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Anime Master');

-- Auto-assign the verified badge to all super admins
INSERT INTO user_badges (user_id, badge_id)
SELECT u.id, b.id
FROM users u
CROSS JOIN badges b
WHERE u.role = 'super_admin'
  AND b.is_verified = 1
  AND NOT EXISTS (
    SELECT 1 FROM user_badges ub
    WHERE ub.user_id = u.id AND ub.badge_id = b.id
  );

-- =============================================
-- DONE
-- =============================================
