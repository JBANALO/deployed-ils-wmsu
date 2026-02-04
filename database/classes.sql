-- WMSU School Management System - CLASSES TABLE
-- Database: wmsu_portal
-- Version: 1.0

CREATE TABLE IF NOT EXISTS `classes` (
  `id` VARCHAR(255) PRIMARY KEY COMMENT 'Unique class identifier',
  `grade` VARCHAR(50) NOT NULL,
  `section` VARCHAR(100) NOT NULL,
  `adviser_id` VARCHAR(255),
  `adviser_name` VARCHAR(200),
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `grade_section` (grade, section),
  INDEX idx_adviser (adviser_id),
  FOREIGN KEY (adviser_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create subject_teachers table for many-to-many relationship
CREATE TABLE IF NOT EXISTS `subject_teachers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `class_id` VARCHAR(255) NOT NULL,
  `teacher_id` VARCHAR(255) NOT NULL,
  `teacher_name` VARCHAR(200) NOT NULL,
  `subject` VARCHAR(100) NOT NULL,
  `assignedAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
  FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_class_teacher (class_id, teacher_id),
  INDEX idx_subject (subject)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample classes data
INSERT INTO `classes` (
  `id`, `grade`, `section`, `adviser_id`, `adviser_name`, `createdAt`
) VALUES
('kindergarten-love', 'Kindergarten', 'Love', NULL, NULL, '2025-12-30 00:00:00'),
('grade-1-wisdom', 'Grade 1', 'Wisdom', NULL, NULL, '2025-12-30 00:00:00'),
('grade-2-kindness', 'Grade 2', 'Kindness', '63bc1bd0-359f-4372-8581-5a626e5e16f7', 'Josie Banalo', '2025-12-30 05:26:32'),
('grade-3-diligence', 'Grade 3', 'Diligence', NULL, NULL, '2025-12-30 05:24:35'),
('grade-1-humility', 'Grade 1', 'Humility', NULL, NULL, '2025-12-30 05:28:43'),
('grade-3-wisdom', 'Grade 3', 'Wisdom', NULL, NULL, '2026-01-03 07:13:25');

-- Insert subject teachers
INSERT INTO `subject_teachers` (
  `class_id`, `teacher_id`, `teacher_name`, `subject`, `assignedAt`
) VALUES
('grade-2-kindness', '63bc1bd0-359f-4372-8581-5a626e5e16f7', 'Josie Banalo', 'Music', '2026-01-24 03:15:34'),
('grade-3-diligence', '63bc1bd0-359f-4372-8581-5a626e5e16f7', 'Josie Banalo', 'Filipino', '2026-01-24 03:14:57'),
('grade-1-humility', '63bc1bd0-359f-4372-8581-5a626e5e16f7', 'Josie Banalo', 'English', '2026-01-06 18:12:52'),
('grade-3-wisdom', '63bc1bd0-359f-4372-8581-5a626e5e16f7', 'Josie Banalo', 'English', '2026-01-24 03:06:39');
