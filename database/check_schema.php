<?php
$conn = new mysqli('localhost', 'root', '', 'wmsu_ed');
echo "=== CLASSES TABLE STRUCTURE ===\n";
$result = $conn->query('DESCRIBE classes');
while ($row = $result->fetch_assoc()) {
    echo $row['Field'] . ' - ' . $row['Type'] . ' - ' . ($row['Null'] == 'YES' ? 'NULL' : 'NOT NULL') . '\n';
}

echo "\n=== STUDENTS TABLE STRUCTURE (first 10 columns) ===\n";
$result = $conn->query('DESCRIBE students');
$count = 0;
while ($row = $result->fetch_assoc() && $count < 10) {
    echo $row['Field'] . ' - ' . $row['Type'] . '\n';
    $count++;
}
?>
