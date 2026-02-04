<?php
// This script distributes the existing 155 students across the three sections
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'wmsu_ed';

$conn = new mysqli($host, $user, $password, $database);

echo "=== DISTRIBUTING STUDENTS ACROSS SECTIONS ===\n\n";

// Get all student users
$students = $conn->query('SELECT id, firstName FROM users WHERE role = "student" ORDER BY id');
$sections = ['Wisdom', 'Diligence', 'Love'];
$sectionIndex = 0;
$updated = 0;

while ($row = $students->fetch_assoc()) {
    $section = $sections[$sectionIndex % 3];
    $conn->query("UPDATE users SET section = '$section' WHERE id = '{$row['id']}'");
    $updated++;
    $sectionIndex++;
}

echo "✅ Updated $updated students\n\n";

// Show distribution
echo "=== STUDENTS BY SECTION ===\n";
$result = $conn->query('SELECT section, COUNT(*) as count FROM users WHERE role = "student" GROUP BY section ORDER BY section');
while ($row = $result->fetch_assoc()) {
    echo $row['section'] . ": " . $row['count'] . " students\n";
}

$conn->close();
?>
