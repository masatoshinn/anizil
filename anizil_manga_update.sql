-- =============================================
-- Anizil UPDATE SQL - Manga/Light Novel Section + Star-Rating/Review System
-- Direct import this into your hosting phpMyAdmin / MySQL / MariaDB.
-- Safe to run on an existing database (tables: IF NOT EXISTS, columns: try/catch).
-- =============================================

SET NAMES utf8mb4;

-- =============================================
-- 1) NEW TABLES
-- =============================================

-- Manga / Light Novel catalog (imported from MangaDex)
CREATE TABLE IF NOT EXISTS mangas (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chapters of each manga (chapter_uuid = MangaDex chapter id for live page loading)
CREATE TABLE IF NOT EXISTS manga_chapters (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- User star-ratings + reviews (works for both anime and manga)
CREATE TABLE IF NOT EXISTS content_ratings (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 2) ALTER TABLE (add aggregate columns to anime)
--    Uses stored procedures so ADD COLUMN only runs when the column is
--    missing (safe to re-import on both MySQL and MariaDB).
-- =============================================

DROP PROCEDURE IF EXISTS add_anime_rating_cols;
DELIMITER $$
CREATE PROCEDURE add_anime_rating_cols()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'anime' AND COLUMN_NAME = 'user_rating'
  ) THEN
    ALTER TABLE anime ADD COLUMN user_rating DECIMAL(3,1) DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'anime' AND COLUMN_NAME = 'rating_count'
  ) THEN
    ALTER TABLE anime ADD COLUMN rating_count INT DEFAULT 0;
  END IF;
END$$
DELIMITER ;
CALL add_anime_rating_cols();
DROP PROCEDURE IF EXISTS add_anime_rating_cols;

-- =============================================
-- 3) CREATOR SYSTEM (creator-created manga)
--    Adds created_by if missing (works on MySQL & MariaDB).
-- =============================================
DROP PROCEDURE IF EXISTS add_created_by_if_missing;
DELIMITER $$
CREATE PROCEDURE add_created_by_if_missing()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mangas' AND COLUMN_NAME = 'created_by'
  ) THEN
    ALTER TABLE mangas ADD COLUMN created_by INT DEFAULT NULL AFTER mangadex_id;
  END IF;
END$$
DELIMITER ;
CALL add_created_by_if_missing();
DROP PROCEDURE IF EXISTS add_created_by_if_missing;

-- =============================================
-- 4) NOTIFICATIONS (per-user direct notifications)
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================
-- 5) BADGES: widen icon column + FontAwesome default/role badges
-- =============================================
ALTER TABLE badges MODIFY COLUMN icon VARCHAR(50) NOT NULL DEFAULT 'fa-solid fa-star';

-- Insert a role badge only if it does not already exist (by name), then it
-- will be auto-assigned to matching users on every server start (migrate.js).
-- Role badges are NOT "verified" so they display their own FA icon.
INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'Super Admin', 'fa-solid fa-crown', '#ef4444', 'Site super administrator', 0
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Super Admin');

INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'Admin', 'fa-solid fa-user-shield', '#fbbf24', 'Site administrator', 0
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Admin');

INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'Moderator', 'fa-solid fa-shield-halved', '#0ea5e9', 'Community moderator', 0
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Moderator');

INSERT INTO badges (name, icon, color, description, is_verified)
SELECT 'Creator', 'fa-solid fa-pen-nib', '#ec4899', 'Site content creator', 0
WHERE NOT EXISTS (SELECT 1 FROM badges WHERE name = 'Creator');

-- Set FontAwesome icons for all default badges (fixes old emoji / truncated icons).
UPDATE badges SET icon = 'fa-solid fa-badge-check'    WHERE name = 'Verified';
UPDATE badges SET icon = 'fa-solid fa-gem'            WHERE name = 'VIP';
UPDATE badges SET icon = 'fa-solid fa-star'           WHERE name = 'Early Supporter';
UPDATE badges SET icon = 'fa-solid fa-trophy'         WHERE name = 'Top Contributor';
UPDATE badges SET icon = 'fa-solid fa-clapperboard'   WHERE name = 'Content Creator';
UPDATE badges SET icon = 'fa-solid fa-fire'           WHERE name = 'Legendary Watcher';
UPDATE badges SET icon = 'fa-solid fa-pen-to-square'  WHERE name = 'Master Reviewer';
UPDATE badges SET icon = 'fa-solid fa-hand-holding-heart' WHERE name = 'Community Helper';
UPDATE badges SET icon = 'fa-solid fa-award'          WHERE name = 'OG Member';
UPDATE badges SET icon = 'fa-solid fa-crosshairs'     WHERE name = 'Anime Master';
UPDATE badges SET icon = 'fa-solid fa-crown'          WHERE name = 'Super Admin';
UPDATE badges SET icon = 'fa-solid fa-user-shield'    WHERE name = 'Admin';
UPDATE badges SET icon = 'fa-solid fa-shield-halved'  WHERE name = 'Moderator';
UPDATE badges SET icon = 'fa-solid fa-pen-nib'        WHERE name = 'Creator';
-- Role badges show their own FA icon (not the green verified checkmark).
UPDATE badges SET is_verified = 0
  WHERE name IN ('Super Admin', 'Admin', 'Moderator', 'Creator');
