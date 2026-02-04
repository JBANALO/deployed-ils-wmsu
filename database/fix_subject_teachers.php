<?php
// Connect to database
$conn = new mysqli('localhost', 'root', '', 'wmsu_portal');

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Start transaction
$conn->begin_transaction();

try {
    // Backup the old data
    $conn->query("CREATE TABLE `subject_teachers_backup` AS SELECT * FROM `subject_teachers`");
    echo "Backup created\n";
    
    // Drop the old table
    $conn->query("DROP TABLE `subject_teachers`");
    echo "Old table dropped\n";
    
    // Recreate without UNIQUE constraint
    $sql = "CREATE TABLE `subject_teachers` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $conn->query($sql);
    echo "New table created\n";
    
    // Restore the data
    $conn->query("INSERT INTO `subject_teachers` (id, class_id, teacher_id, teacher_name, subject, assignedAt)
                SELECT id, class_id, teacher_id, teacher_name, subject, assignedAt FROM `subject_teachers_backup`");
    echo "Data restored\n";
    
    // Drop the backup
    $conn->query("DROP TABLE `subject_teachers_backup`");
    echo "Backup dropped\n";
    
    // Commit transaction
    $conn->commit();
    echo "✓ Migration completed successfully!\n";
    
} catch (Exception $e) {
    $conn->rollback();
    echo "✗ Error: " . $e->getMessage() . "\n";
}

$conn->close();
?>
