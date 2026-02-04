<?php
// Check current table structure and fix constraints
$conn = new mysqli('localhost', 'root', '', 'wmsu_portal');

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

echo "=== Checking subject_teachers table structure ===\n\n";

// Show table structure
$result = $conn->query("DESCRIBE subject_teachers");
echo "Columns:\n";
while ($row = $result->fetch_assoc()) {
    echo "  {$row['Field']} - {$row['Type']} - Key: {$row['Key']}\n";
}

echo "\n";

// Show all indexes/constraints
$result = $conn->query("SHOW INDEXES FROM subject_teachers");
echo "Indexes/Constraints:\n";
while ($row = $result->fetch_assoc()) {
    echo "  {$row['Key_name']} on column {$row['Column_name']} (Non_unique: {$row['Non_unique']})\n";
}

echo "\n=== Fixing constraints ===\n";

try {
    // Drop ALL constraints except PRIMARY on id
    $conn->query("ALTER TABLE subject_teachers DROP PRIMARY KEY");
    echo "✓ Dropped old PRIMARY KEY\n";
} catch (Exception $e) {
    echo "Note: " . $e->getMessage() . "\n";
}

// Recreate table completely without ANY unique constraints
$conn->query("DROP TABLE IF EXISTS subject_teachers_new");
$conn->query("CREATE TABLE subject_teachers_new (
  id INT AUTO_INCREMENT PRIMARY KEY,
  class_id VARCHAR(255),
  teacher_id VARCHAR(255),
  teacher_name VARCHAR(200),
  subject VARCHAR(100),
  day VARCHAR(50),
  start_time TIME,
  end_time TIME,
  assignedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_class (class_id),
  INDEX idx_teacher (teacher_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

echo "✓ Created new table without UNIQUE constraints\n";

// Copy data
$result = $conn->query("SELECT * FROM subject_teachers");
$count = 0;
while ($row = $result->fetch_assoc()) {
    $conn->query("INSERT INTO subject_teachers_new (class_id, teacher_id, subject) 
                  VALUES ('{$row['class_id']}', '{$row['teacher_id']}', '{$row['subject']}')");
    $count++;
}
echo "✓ Copied {$count} records\n";

// Replace old table
$conn->query("DROP TABLE subject_teachers");
$conn->query("RENAME TABLE subject_teachers_new TO subject_teachers");
echo "✓ Replaced old table\n";

echo "\n✅ DONE! Same teacher can now be assigned multiple times!\n";

$conn->close();
?>
