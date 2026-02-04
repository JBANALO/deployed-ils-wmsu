<?php
$conn = new mysqli('localhost', 'root', '', 'wmsu_ed');

// Enable autocommit explicitly
$conn->autocommit(TRUE);

echo "=== CREATING ALL CLASSES ===\n\n";

// First, clear old classes
$conn->query('DELETE FROM classes');
echo "✅ Cleared old classes\n\n";

// Get unique grade+section combinations from students
$result = $conn->query('SELECT DISTINCT gradeLevel, section FROM users WHERE role = "student" ORDER BY gradeLevel, section');

$created = 0;
$classes = array();

while ($row = $result->fetch_assoc()) {
    $grade = $row['gradeLevel'];
    $section = $row['section'];
    $classId = uniqid('class_', true);
    
    $conn->query("INSERT INTO classes (id, grade, section, adviser_id, subject_teachers, createdAt) 
                 VALUES ('$classId', '$grade', '$section', NULL, NULL, NOW())");
    
    $classes[] = array('id' => $classId, 'grade' => $grade, 'section' => $section);
    echo "✅ Created: $grade - $section (ID: $classId)\n";
    $created++;
}

echo "\n=== VERIFYING IN DATABASE ===\n";
$verify = $conn->query('SELECT id, grade, section FROM classes ORDER BY grade, section');
while ($row = $verify->fetch_assoc()) {
    echo "- {$row['grade']} - {$row['section']} (ID: {$row['id']})\n";
}

echo "\n✅ Total classes created: $created\n";

// Verify again that data was saved
echo "\n=== FINAL VERIFICATION FROM DATABASE ===\n";
$verify = $conn->query('SELECT id, grade, section FROM classes');
$dbCount = 0;
while ($row = $verify->fetch_assoc()) {
    echo "✅ DB: {$row['grade']} - {$row['section']}\n";
    $dbCount++;
}
echo "Classes actually in database: $dbCount\n";

// Test API response format
echo "\n=== SIMULATING API RESPONSE ===\n";
$response = array(
    'status' => 'success',
    'data' => $classes,
    'classes' => $classes
);
echo json_encode($response, JSON_PRETTY_PRINT) . "\n";

$conn->close();
?>
