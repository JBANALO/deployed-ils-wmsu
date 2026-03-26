-- Help Center Support Messages Table for Teachers
CREATE TABLE IF NOT EXISTS help_center_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    teacher_id VARCHAR(255) NOT NULL,
    teacher_name VARCHAR(255) NOT NULL,
    teacher_email VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    category ENUM('Technical', 'Academic', 'Account', 'Other') DEFAULT 'Other',
    priority ENUM('Low', 'Medium', 'High', 'Urgent') DEFAULT 'Medium',
    status ENUM('Pending', 'In Progress', 'Resolved', 'Closed') DEFAULT 'Pending',
    admin_reply TEXT NULL,
    admin_id VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_teacher_id (teacher_id),
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_priority (priority),
    INDEX idx_created_at (created_at)
);

-- Insert sample data for testing
INSERT INTO help_center_messages (
    teacher_id, teacher_name, teacher_email, subject, message, category, priority
) VALUES 
(
    'teacher-001',
    'John Doe',
    'john.doe@wmsu.edu.ph',
    'Grade Entry Issue',
    'I cannot enter grades for my Grade 3 students. The system shows an error when I try to save.',
    'Technical',
    'High'
),
(
    'teacher-002',
    'Jane Smith',
    'jane.smith@wmsu.edu.ph',
    'Class Schedule Question',
    'My class schedule seems incorrect. Can someone help me update it?',
    'Academic',
    'Medium'
);
