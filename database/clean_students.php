<?php
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'wmsu_ed';

$conn = new mysqli($host, $user, $password, $database);

echo "=== CLEANING STUDENTS TABLE ===\n\n";

// Get count before deletion
$before = $conn->query("SELECT COUNT(*) as count FROM students");
$before_row = $before->fetch_assoc();
echo "Students BEFORE deletion: " . $before_row['count'] . "\n\n";

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
echo "Students AFTER deletion: " . $after_row['count'] . "\n\n";

// Verify user accounts are still intact
$users = $conn->query("SELECT email, firstName, lastName, role FROM users ORDER BY email");
echo "=== REMAINING USER ACCOUNTS ===\n";
while ($user_row = $users->fetch_assoc()) {
    echo "- " . $user_row['email'] . " (" . $user_row['firstName'] . " " . $user_row['lastName'] . " - " . $user_row['role'] . ")\n";
}

$total_users = $conn->query("SELECT COUNT(*) as count FROM users");
$users_count = $total_users->fetch_assoc();
echo "\nTotal user accounts: " . $users_count['count'] . "\n";

$conn->close();
?>
