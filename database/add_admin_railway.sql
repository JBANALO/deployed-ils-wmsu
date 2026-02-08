-- Setup Railway Database with Admin Account
-- Run this on Railway MySQL database

-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS `users` (
  `id` varchar(50) NOT NULL,
  `firstName` varchar(100) NOT NULL,
  `lastName` varchar(100) NOT NULL,
  `username` varchar(100) NOT NULL,
  `role` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Add Admin Account
-- Email: adminjossie@wmsu.edu.ph
-- Password: Admin123
INSERT INTO users (id, firstName, lastName, username, role, email, password, createdAt) 
VALUES (
  '97d78aa1-af71-4fe2-ad4a-c3584b6459f2',
  'Josie',
  'Banalo',
  'jossie',
  'admin',
  'adminjossie@wmsu.edu.ph',
  '$2b$12$q10CO7iLzzqmCWk8DjieSusCZou4Tfz9jHfJnLWH72a6bk4reFScW',
  NOW()
)
ON DUPLICATE KEY UPDATE
  email = 'adminjossie@wmsu.edu.ph';

-- Verify
SELECT '=== Admin Account Created ===' as '';
SELECT id, firstName, lastName, email, username, role, createdAt FROM users WHERE role = 'admin';
