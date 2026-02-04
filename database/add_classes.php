<?php
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'wmsu_ed';

$conn = new mysqli($host, $user, $password, $database);

echo "Connected to database successfully!\n\n";

// First, get unique grade levels from students table
$grade_query = $conn->query("SELECT DISTINCT grade_level FROM students ORDER BY grade_level");
$grades = [];
while ($row = $grade_query->fetch_assoc()) {
    $grades[] = $row['grade_level'];
}

echo "Found grades: " . implode(", ", $grades) . "\n\n";

// Define sections
$sections = ['Wisdom', 'Courage', 'Knowledge', 'Unity'];

// Insert classes
$insert_count = 0;
foreach ($grades as $grade) {
    foreach ($sections as $section) {
        $class_id = str_replace(' ', '-', $grade) . '-' . strtoupper($section);
        $sql = "INSERT IGNORE INTO classes (id, grade, section, adviser_id, createdAt, updatedAt) 
                VALUES ('$class_id', '$grade', '$section', NULL, NOW(), NOW())";
        
        if ($conn->query($sql)) {
            if ($conn->affected_rows > 0) {
                $insert_count++;
                echo "Inserted class: $class_id\n";
            }
        } else {
            echo "Error: " . $conn->error . "\n";
        }
    }
}

echo "\n=== SUMMARY ===\n";
echo "Classes inserted: $insert_count\n";

// Verify
$verify = $conn->query("SELECT COUNT(*) as count FROM students");
$row = $verify->fetch_assoc();
echo "Total students: " . $row['count'] . "\n";

$verify_classes = $conn->query("SELECT COUNT(*) as count FROM classes");
$row_classes = $verify_classes->fetch_assoc();
echo "Total classes: " . $row_classes['count'] . "\n";

echo "\n=== CLASSES LIST ===\n";
$classes_list = $conn->query("SELECT id, grade, section FROM classes ORDER BY grade, section");
while ($row = $classes_list->fetch_assoc()) {
    echo $row['id'] . " - " . $row['grade'] . " " . $row['section'] . "\n";
}

$conn->close();
?>
