<?php
// Database connection parameters
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'wmsu_ed';

// Create connection
$conn = new mysqli($host, $user, $password, $database);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

echo "Connected to database successfully!\n\n";

// Insert default classes
$insert_classes = "INSERT IGNORE INTO classes (id, class_name, grade_level, section, adviser_id, createdAt) VALUES
('GR1-WISDOM', 'Grade 1 - Wisdom', 'Grade 1', 'Wisdom', NULL, NOW()),
('GR1-COURAGE', 'Grade 1 - Courage', 'Grade 1', 'Courage', NULL, NOW()),
('GR2-WISDOM', 'Grade 2 - Wisdom', 'Grade 2', 'Wisdom', NULL, NOW()),
('GR2-COURAGE', 'Grade 2 - Courage', 'Grade 2', 'Courage', NULL, NOW()),
('GR3-WISDOM', 'Grade 3 - Wisdom', 'Grade 3', 'Wisdom', NULL, NOW()),
('GR3-COURAGE', 'Grade 3 - Courage', 'Grade 3', 'Courage', NULL, NOW());";

if ($conn->query($insert_classes) === TRUE) {
    echo "Classes inserted successfully!\n";
    echo "Rows affected: " . $conn->affected_rows . "\n\n";
} else {
    echo "Error: " . $conn->error . "\n";
}

// Verify
$verify = $conn->query("SELECT COUNT(*) as count FROM students");
$row = $verify->fetch_assoc();
echo "Total students in database: " . $row['count'] . "\n";

$verify_classes = $conn->query("SELECT COUNT(*) as count FROM classes");
$row_classes = $verify_classes->fetch_assoc();
echo "Total classes in database: " . $row_classes['count'] . "\n";

echo "\n=== STUDENTS BY GRADE ===\n";
$grade_query = $conn->query("SELECT grade_level, COUNT(*) as count FROM students GROUP BY grade_level ORDER BY grade_level");
while ($row = $grade_query->fetch_assoc()) {
    echo $row['grade_level'] . ": " . $row['count'] . " students\n";
}

$conn->close();
?>
