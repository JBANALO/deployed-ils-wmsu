<?php
$conn = new mysqli('localhost', 'root', '', 'wmsu_ed');

echo "=== CHECKING TABLES ===\n";
$tables = $conn->query("SHOW TABLES");
while ($table = $tables->fetch_array()) {
    echo "- " . $table[0] . "\n";
}

echo "\n=== CHECKING CLASSES TABLE COLUMNS ===\n";
$columns = $conn->query("DESCRIBE classes");
if ($columns) {
    while ($col = $columns->fetch_assoc()) {
        echo "- " . $col['Field'] . " (" . $col['Type'] . ")\n";
    }
} else {
    echo "Error: " . $conn->error . "\n";
}

echo "\n=== CHECKING ACTUAL DATA IN CLASSES ===\n";
$result = $conn->query("SELECT COUNT(*) as count FROM classes");
$row = $result->fetch_assoc();
echo "Total rows in classes table: " . $row['count'] . "\n";

if ($row['count'] > 0) {
    $all = $conn->query("SELECT * FROM classes");
    while ($class = $all->fetch_assoc()) {
        echo "- ID: " . $class['id'] . ", Grade: " . $class['grade'] . ", Section: " . $class['section'] . "\n";
    }
}

$conn->close();
?>
