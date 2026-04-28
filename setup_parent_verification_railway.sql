-- Parent Verification System Setup for Railway
-- Run this after connecting to your Railway database

-- Create parent_verifications table
CREATE TABLE IF NOT EXISTS parent_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(255) NOT NULL,
  parent_email VARCHAR(255) NOT NULL,
  parent_name VARCHAR(255) NOT NULL,
  otp VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_student_otp (student_id, verified),
  INDEX idx_student_id (student_id),
  INDEX idx_parent_email (parent_email),
  INDEX idx_otp (otp),
  INDEX idx_expires_at (expires_at)
);

-- Add parent_verified column to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS parent_verified BOOLEAN DEFAULT FALSE;

-- Verify setup
SHOW TABLES LIKE 'parent_verifications';
SHOW COLUMNS FROM students LIKE 'parent_verified';
