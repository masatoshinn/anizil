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
-- =============================================

ALTER TABLE anime ADD COLUMN user_rating DECIMAL(3,1) DEFAULT 0;
ALTER TABLE anime ADD COLUMN rating_count INT DEFAULT 0;
