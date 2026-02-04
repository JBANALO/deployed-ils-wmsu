-- WMSU School Management System - ATTENDANCE TABLE
-- Database: wmsu_portal
-- Version: 1.0

CREATE TABLE IF NOT EXISTS `attendance` (
  `id` VARCHAR(255) PRIMARY KEY COMMENT 'Timestamp-based ID',
  `studentId` VARCHAR(255) NOT NULL,
  `studentName` VARCHAR(200) NOT NULL,
  `gradeLevel` VARCHAR(50) NOT NULL,
  `section` VARCHAR(100) NOT NULL,
  `date` DATE NOT NULL,
  `time` VARCHAR(20),
  `timestamp` DATETIME NOT NULL,
  `status` ENUM('Present', 'Absent', 'Late', 'present', 'absent', 'late') NOT NULL,
  `period` VARCHAR(50) COMMENT 'morning/afternoon',
  `location` VARCHAR(100) COMMENT 'QR Portal/Mobile App',
  `teacherId` VARCHAR(255),
  `teacherName` VARCHAR(200),
  `deviceInfo` JSON,
  `qrData` JSON,
  `createdAt` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE,
  INDEX idx_student_date (studentId, date),
  INDEX idx_date (date),
  INDEX idx_grade_section (gradeLevel, section),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample attendance data
INSERT INTO `attendance` (
  `id`, `studentId`, `studentName`, `gradeLevel`, `section`, `date`, `timestamp`, 
  `status`, `period`, `location`, `createdAt`
) VALUES
('1769220481116', '20427c5a-318b-4c30-a6da-611e8effffeb', 'Shahid Abdulkarim', 'Grade 3', 'Wisdom', '2026-01-24', '2026-01-24 02:08:01', 'Present', 'morning', 'Test QR Portal', '2026-01-24 02:08:01'),
('1769221069872', '80e0ab6c-13da-4542-8e88-01db4fc1b866', 'Muhammad Omor Ahmad', 'Grade 3', 'Wisdom', '2026-01-24', '2026-01-24 02:17:49', 'Present', 'morning', 'QR Portal', '2026-01-24 02:17:49'),
('1769416535772', '853f29fa-9d10-4f49-ae06-747094315b1f', 'Matthew Xander Alacre', 'Grade 3', 'Diligence', '2026-01-26', '2026-01-26 08:35:35', 'Present', 'morning', 'QR Portal', '2026-01-26 08:35:35'),
('1769416621935', 'c25e0fb7-8af1-456d-b308-9630c0c9d4e3', 'Cid Raeed Aranan', 'Grade 3', 'Diligence', '2026-01-26', '2026-01-26 08:37:01', 'Present', 'morning', 'QR Portal', '2026-01-26 08:37:01'),
('1769417288235', '17664342848250040', 'Matthew Xander Alacre', 'Grade 3', 'Diligence', '2026-01-26', '2026-01-26 08:48:07', 'absent', 'afternoon', 'Mobile App', '2026-01-26 08:48:07'),
('1769418062981', '17664341466940000', 'Shahid Abdulkarim', 'Grade 3', 'Wisdom', '2026-01-26', '2026-01-26 09:01:02', 'absent', 'afternoon', 'Mobile App', '2026-01-26 09:01:02'),
('1769418775784', '17664341483410004', 'Ziyadh Gadjali', 'Grade 3', 'Wisdom', '2026-01-26', '2026-01-26 09:12:51', 'absent', 'afternoon', 'Mobile App', '2026-01-26 09:12:51'),
('1769621398446', '17664341466940000', 'Shahid Abdulkarim', 'Grade 3', 'Wisdom', '2026-01-28', '2026-01-28 17:29:57', 'present', 'morning', 'Mobile App', '2026-01-28 17:29:57'),
('1769667621234', '17664341478560002', 'Kafden Encilay', 'Grade 3', 'Wisdom', '2026-01-29', '2026-01-29 06:20:19', 'present', 'morning', 'Mobile App', '2026-01-29 06:20:19'),
('1769667656922', '17664341466940000', 'Shahid Abdulkarim', 'Grade 3', 'Wisdom', '2026-01-29', '2026-01-29 06:20:56', 'late', 'afternoon', 'Mobile App', '2026-01-29 06:20:56'),
('1769667727636', '17664341473010001', 'Muhammad Omor Ahmad', 'Grade 3', 'Wisdom', '2026-01-29', '2026-01-29 06:22:01', 'late', 'afternoon', 'Mobile App', '2026-01-29 06:22:01');
