-- Schema Database Smart Recipe Generator - PRD Version 3.0
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS smart_recipe_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE smart_recipe_db;

-- Tabel users (BR-12, F-12, KF-22)
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nama VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  profil_pantangan JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabel saved_recipes / riwayat resep (BR-14, BR-15, F-10, F-11, KF-20, KF-21)
CREATE TABLE IF NOT EXISTS saved_recipes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  judul VARCHAR(150) NOT NULL,
  estimasi_waktu SMALLINT UNSIGNED NOT NULL,
  spesifikasi JSON NOT NULL,
  daftar_bahan JSON NOT NULL,
  langkah_memasak JSON NOT NULL,
  catatan VARCHAR(1000) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_saved_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrasi inkremental untuk basis data yang sudah ada sebelumnya:
-- ALTER TABLE users ADD COLUMN IF NOT EXISTS profil_pantangan JSON NULL;
-- ALTER TABLE saved_recipes ADD COLUMN IF NOT EXISTS catatan VARCHAR(1000) NULL;
