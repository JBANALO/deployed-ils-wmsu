<?php
$conn = new mysqli('localhost', 'root', '', 'wmsu_ed');

echo "=== RECREATING CLASSES FROM STUDENTS ===\n\n";

// Delete old classes
$conn->query('DELETE FROM classes');
echo "✅ Deleted old classes\n";

// Get unique grade+section combinations from students
$result = $conn->query('SELECT DISTINCT gradeLevel, section FROM users WHERE role = "student" ORDER BY gradeLevel, section');

$createdCount = 0;
while ($row = $result->fetch_assoc()) {
    $grade = $row['gradeLevel'];
    $section = $row['section'];
    
    // Create class entry
    $classId = uniqid('class_');
    $conn->query("
        INSERT INTO classes (id, grade, section, adviser_id, subject_teachers, createdAt)
        VALUES ('$classId', '$grade', '$section', NULL, NULL, NOW())
    ");
    
    echo "✅ Created: $grade - $section\n";
    $createdCount++;
}

echo "\n=== NEW CLASSES ===\n";
$result = $conn->query('SELECT grade, section FROM classes ORDER BY grade, section');
while ($row = $result->fetch_assoc()) {
    echo "- " . $row['grade'] . " - " . $row['section'] . "\n";
}

echo "\n✅ Total classes created: $createdCount\n";

$conn->close();
?>
