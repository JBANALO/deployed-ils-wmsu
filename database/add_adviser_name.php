<?php
$conn = new mysqli('localhost', 'root', '', 'wmsu_portal');

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Add adviser_name column if it doesn't exist
$result = $conn->query("SHOW COLUMNS FROM classes LIKE 'adviser_name'");
if ($result->num_rows == 0) {
    $conn->query("ALTER TABLE classes ADD COLUMN adviser_name VARCHAR(200) AFTER adviser_id");
    echo "✓ Added adviser_name column to classes table\n";
} else {
    echo "✓ adviser_name column already exists\n";
}

$conn->close();
?>
