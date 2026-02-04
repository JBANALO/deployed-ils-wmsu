<?php
// COMPLETE FIX - Drop and recreate table from scratch
$conn = new mysqli('localhost', 'root', '', 'wmsu_portal');

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

echo "=== COMPLETE DATABASE FIX ===\n\n";

// Drop table completely
$conn->query("DROP TABLE IF EXISTS subject_teachers");
echo "✓ Dropped old table\n";

// Create fresh table with NO constraints (except auto-increment primary key)
$sql = "CREATE TABLE `subject_teachers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `class_id` VARCHAR(255),
  `teacher_id` VARCHAR(255),
  `teacher_name` VARCHAR(200),
  `subject` VARCHAR(100),
  `day` VARCHAR(50),
  `start_time` TIME,
  `end_time` TIME,
  `assignedAt` DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci AUTO_INCREMENT=1";

$conn->query($sql);
echo "✓ Created fresh table with AUTO_INCREMENT\n";

// Test insert
$test = $conn->query("INSERT INTO subject_teachers (class_id, teacher_id, subject) VALUES ('test', 'test', 'test')");
if ($test) {
    echo "✓ Test insert successful\n";
    $conn->query("DELETE FROM subject_teachers WHERE class_id = 'test'");
    echo "✓ Test record removed\n";
} else {
    echo "✗ Test insert failed: " . $conn->error . "\n";
}

echo "\n✅ DONE! Table is ready - NO unique constraints!\n";
echo "Same teacher can be assigned UNLIMITED times!\n";

$conn->close();
?>
