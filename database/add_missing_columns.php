<?php
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'wmsu_ed';

$conn = new mysqli($host, $user, $password, $database);

echo "=== ADDING MISSING COLUMNS TO USERS TABLE ===\n\n";

// Check if columns exist first
$result = $conn->query("SHOW COLUMNS FROM users LIKE 'gradeLevel'");
if ($result->num_rows == 0) {
    $conn->query("ALTER TABLE users ADD COLUMN gradeLevel VARCHAR(50) DEFAULT 'Grade 3'");
    echo "✅ Added gradeLevel column\n";
} else {
    echo "✓ gradeLevel column already exists\n";
}

$result = $conn->query("SHOW COLUMNS FROM users LIKE 'section'");
if ($result->num_rows == 0) {
    $conn->query("ALTER TABLE users ADD COLUMN section VARCHAR(50) DEFAULT 'Wisdom'");
    echo "✅ Added section column\n";
} else {
    echo "✓ section column already exists\n";
}

// Verify columns
echo "\n=== USERS TABLE STRUCTURE ===\n";
$result = $conn->query("DESCRIBE users");
while ($row = $result->fetch_assoc()) {
    echo $row['Field'] . " (" . $row['Type'] . ")\n";
}

$conn->close();
?>
