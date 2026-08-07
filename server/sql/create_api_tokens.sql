-- Anizil: create the api_tokens table missing from the database.
-- Run this in phpMyAdmin (SQL tab) once. Migrate.js now creates it too.
CREATE TABLE IF NOT EXISTS `api_tokens` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `token` VARCHAR(191) NOT NULL,
  `scope` ENUM('read','write','admin') DEFAULT 'read',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_api_token` (`token`),
  INDEX `idx_api_tokens_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional: insert one API token directly without the admin UI.
-- Replace 1 with the real user_id you want to own the token.
-- (REPLACE(UUID(),'-','') generates a unique 32-char hex token.)
INSERT INTO `api_tokens` (`user_id`, `name`, `token`, `scope`)
SELECT 1, 'Anizil App', REPLACE(UUID(), '-', ''), 'read';