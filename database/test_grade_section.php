<?php
$conn = new mysqli('localhost', 'root', '', 'wmsu_ed');

echo "=== CHECK STUDENT GRAKELEVEL/SECTION ===\n\n";

$result = $conn->query('SELECT id, firstName, lastName, gradeLevel, section FROM users WHERE role="student" LIMIT 5');
while ($row = $result->fetch_assoc()) {
    echo $row['firstName'] . ' ' . $row['lastName'] . ' - Grade: ' . ($row['gradeLevel'] ?? 'NULL') . ', Section: ' . ($row['section'] ?? 'NULL') . "\n";
}

echo "\n=== STUDENTS BY GRADE+SECTION ===\n";
$result = $conn->query('SELECT gradeLevel, section, COUNT(*) as count FROM users WHERE role="student" GROUP BY gradeLevel, section ORDER BY gradeLevel, section');
if ($result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        echo $row['gradeLevel'] . ' - ' . $row['section'] . ': ' . $row['count'] . " students\n";
    }
} else {
    echo "No students with gradeLevel/section!\n";
}

$conn->close();
?>
