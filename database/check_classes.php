<?php
$conn = new mysqli('localhost', 'root', '', 'wmsu_ed');

echo "=== CHECKING CLASSES ===\n";
$result = $conn->query('SELECT * FROM classes');
$count = 0;
while ($row = $result->fetch_assoc()) {
    echo $count + 1 . ". " . $row['grade'] . " - " . $row['section'] . "\n";
    $count++;
}
echo "\nTotal classes: $count\n";

echo "\n=== STUDENTS BY GRADE + SECTION ===\n";
$result = $conn->query('SELECT DISTINCT gradeLevel, section FROM users WHERE role = "student" ORDER BY gradeLevel, section');
while ($row = $result->fetch_assoc()) {
    echo "- " . $row['gradeLevel'] . " - " . $row['section'] . "\n";
}

$conn->close();
?>
