<?php
$conn = new mysqli('localhost', 'root', '', 'wmsu_ed');

echo "=== STUDENTS BY GRADE LEVEL ===\n";
$result = $conn->query('SELECT DISTINCT gradeLevel, COUNT(*) as count FROM users WHERE role = "student" GROUP BY gradeLevel ORDER BY gradeLevel');
while ($row = $result->fetch_assoc()) {
    echo $row['gradeLevel'] . ": " . $row['count'] . " students\n";
}

echo "\n=== STUDENTS BY SECTION ===\n";
$result = $conn->query('SELECT DISTINCT section, COUNT(*) as count FROM users WHERE role = "student" GROUP BY section ORDER BY section');
while ($row = $result->fetch_assoc()) {
    echo $row['section'] . ": " . $row['count'] . " students\n";
}

echo "\n=== GRADE + SECTION COMBINATIONS ===\n";
$result = $conn->query('SELECT gradeLevel, section, COUNT(*) as count FROM users WHERE role = "student" GROUP BY gradeLevel, section ORDER BY gradeLevel, section');
while ($row = $result->fetch_assoc()) {
    echo $row['gradeLevel'] . " - " . $row['section'] . ": " . $row['count'] . " students\n";
}

$conn->close();
?>
