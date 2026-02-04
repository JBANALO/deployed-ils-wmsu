<?php
$conn = new mysqli('localhost', 'root', '', 'wmsu_portal');

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

echo "=== Fixing classes table ===\n\n";

// Show current structure
echo "Current columns:\n";
$result = $conn->query("SHOW COLUMNS FROM classes");
while ($row = $result->fetch_assoc()) {
    echo "  {$row['Field']}\n";
}

// Try to add adviser_name column
echo "\nAttempting to add adviser_name...\n";
$conn->query("ALTER TABLE classes DROP COLUMN adviser_name");
$result = $conn->query("ALTER TABLE classes ADD COLUMN adviser_name VARCHAR(200) AFTER adviser_id");

if ($result) {
    echo "✓ Successfully added adviser_name column!\n";
} else {
    echo "✗ Error: " . $conn->error . "\n";
}

// Verify
echo "\nNew columns:\n";
$result = $conn->query("SHOW COLUMNS FROM classes");
while ($row = $result->fetch_assoc()) {
    echo "  {$row['Field']}\n";
}

$conn->close();
?>
