<?php
$conn = new mysqli('localhost', 'root', '', 'wmsu_ed');

echo "=== CHECKING STUDENTS ===\n\n";

// Check total students
$total = $conn->query('SELECT COUNT(*) as count FROM students');
$count_row = $total->fetch_assoc();
echo "Total students: " . $count_row['count'] . "\n\n";

// Check by grade level
echo "=== STUDENTS BY GRADE LEVEL ===\n";
$result = $conn->query('SELECT COUNT(*) as count, grade_level FROM students GROUP BY grade_level');
while ($row = $result->fetch_assoc()) {
    echo "Grade: " . ($row['grade_level'] ? $row['grade_level'] : 'NULL') . " - Count: " . $row['count'] . "\n";
}

// Show first few students
echo "\n=== SAMPLE STUDENTS ===\n";
$sample = $conn->query('SELECT first_name, last_name, grade_level, section FROM students LIMIT 5');
while ($row = $sample->fetch_assoc()) {
    echo "- " . $row['first_name'] . " " . $row['last_name'] . " (Grade: " . $row['grade_level'] . ", Section: " . $row['section'] . ")\n";
}

$conn->close();
?>
