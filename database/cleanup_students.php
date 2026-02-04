<?php
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'wmsu_ed';

$conn = new mysqli($host, $user, $password, $database);

echo "=== CLEANING UP STUDENTS TABLE ===\n\n";

// Get count before deletion
$before = $conn->query("SELECT COUNT(*) as count FROM students");
$before_row = $before->fetch_assoc();
echo "Students in database BEFORE deletion: " . $before_row['count'] . "\n\n";

// Delete all student records
$delete_result = $conn->query("DELETE FROM students");

if ($delete_result) {
    echo "✅ DELETION COMPLETED\n";
    echo "Rows deleted: " . $conn->affected_rows . "\n\n";
} else {
    echo "❌ Error: " . $conn->error . "\n";
}

// Verify
$after = $conn->query("SELECT COUNT(*) as count FROM students");
$after_row = $after->fetch_assoc();
echo "Students in database AFTER deletion: " . $after_row['count'] . "\n\n";

// Verify classes are still intact
$classes = $conn->query("SELECT COUNT(*) as count FROM classes");
$classes_row = $classes->fetch_assoc();
echo "Classes remaining: " . $classes_row['count'] . " ✅\n";

// Verify users are still intact
$users = $conn->query("SELECT COUNT(*) as count FROM users");
$users_row = $users->fetch_assoc();
echo "Users remaining: " . $users_row['count'] . " ✅\n";

$conn->close();
?>
