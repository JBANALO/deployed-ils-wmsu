-- Fix subject_teachers table to allow same teacher to teach multiple subjects in same class
-- This is a full table recreation to remove the problematic UNIQUE constraint

-- Backup the old data
CREATE TABLE `subject_teachers_backup` AS SELECT * FROM `subject_teachers`;

-- Drop the old table
DROP TABLE `subject_teachers`;

-- Recreate without UNIQUE constraint on (class_id, teacher_id, subject)
CREATE TABLE `subject_teachers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `class_id` VARCHAR(255) NOT NULL,
  `teacher_id` VARCHAR(255) NOT NULL,
  `teacher_name` VARCHAR(200),
  `subject` VARCHAR(100) NOT NULL,
  `day` VARCHAR(50),
  `start_time` TIME,
  `end_time` TIME,
  `assignedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_class (class_id),
  INDEX idx_teacher (teacher_id),
  INDEX idx_subject (subject)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Restore the data
INSERT INTO `subject_teachers` (id, class_id, teacher_id, teacher_name, subject, assignedAt)
SELECT id, class_id, teacher_id, teacher_name, subject, assignedAt FROM `subject_teachers_backup`;

-- Drop the backup
DROP TABLE `subject_teachers_backup`;
