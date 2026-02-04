-- WMSU School Management System - GRADES TABLE
-- Database: wmsu_portal
-- Version: 1.0

CREATE TABLE IF NOT EXISTS `grades` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `studentId` VARCHAR(255) NOT NULL,
  `studentName` VARCHAR(200) NOT NULL,
  `gradeLevel` VARCHAR(50) NOT NULL,
  `section` VARCHAR(100) NOT NULL,
  `subject` VARCHAR(100) NOT NULL,
  `q1` DECIMAL(5, 2) DEFAULT 0,
  `q2` DECIMAL(5, 2) DEFAULT 0,
  `q3` DECIMAL(5, 2) DEFAULT 0,
  `q4` DECIMAL(5, 2) DEFAULT 0,
  `average` DECIMAL(5, 2) GENERATED ALWAYS AS ((q1 + q2 + q3 + q4) / 4) STORED,
  `teacherId` VARCHAR(255),
  `teacherName` VARCHAR(200),
  `lastEditedBy` VARCHAR(255),
  `lastEditedAt` DATETIME,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (studentId) REFERENCES students(id) ON DELETE CASCADE,
  INDEX idx_student_subject (studentId, subject),
  INDEX idx_grade_section (gradeLevel, section),
  INDEX idx_subject (subject)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample grades data
INSERT INTO `grades` (
  `studentId`, `studentName`, `gradeLevel`, `section`, `subject`, `q1`, `q2`, `q3`, `q4`, `lastEditedAt`
) VALUES
('20427c5a-318b-4c30-a6da-611e8effffeb', 'Shahid Abdulkarim', 'Grade 3', 'Wisdom', 'English', 90, 0, 0, 0, '2026-01-06 18:03:43'),
('20427c5a-318b-4c30-a6da-611e8effffeb', 'Shahid Abdulkarim', 'Grade 3', 'Wisdom', 'Mathematics', 85, 0, 0, 0, '2026-01-06 18:03:43'),
('20427c5a-318b-4c30-a6da-611e8effffeb', 'Shahid Abdulkarim', 'Grade 3', 'Wisdom', 'Filipino', 98, 0, 0, 0, '2026-01-06 18:03:43'),
('20427c5a-318b-4c30-a6da-611e8effffeb', 'Shahid Abdulkarim', 'Grade 3', 'Wisdom', 'Science', 99, 0, 0, 0, '2026-01-06 18:03:43'),
('20427c5a-318b-4c30-a6da-611e8effffeb', 'Shahid Abdulkarim', 'Grade 3', 'Wisdom', 'Araling Panlipunan', 90, 0, 0, 0, '2026-01-06 18:03:43'),
('20427c5a-318b-4c30-a6da-611e8effffeb', 'Shahid Abdulkarim', 'Grade 3', 'Wisdom', 'MAPEH', 97, 0, 0, 0, '2026-01-06 18:03:43');
