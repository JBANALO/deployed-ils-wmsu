-- School Years Table
-- Stores academic school years with their active status

CREATE TABLE IF NOT EXISTS `school_years` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `label` VARCHAR(50) NOT NULL COMMENT 'e.g., 2025-2026',
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `is_active` TINYINT(1) DEFAULT 0 COMMENT '1 = active, 0 = inactive',
  `is_archived` TINYINT(1) DEFAULT 0 COMMENT '1 = archived, 0 = not archived',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_label` (`label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default school year if none exists
INSERT INTO `school_years` (`label`, `start_date`, `end_date`, `is_active`) 
VALUES ('2025-2026', '2025-06-01', '2026-03-31', 1)
ON DUPLICATE KEY UPDATE `label` = `label`;
