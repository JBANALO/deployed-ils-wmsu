<?php
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'wmsu_ed';

$conn = new mysqli($host, $user, $password, $database);

echo "=== DELETING ALL ACCOUNTS EXCEPT 2 ===\n\n";

// Delete all except the 2 required accounts (by email)
$delete_query = "DELETE FROM users WHERE email != 'adminjossie@wmsu.edu.ph' AND email != 'Hz202305178@wmsu.edu.ph'";
$delete_result = $conn->query($delete_query);

if ($delete_result) {
    echo "✅ DELETION COMPLETED\n";
    echo "Rows deleted: " . $conn->affected_rows . "\n\n";
} else {
    echo "❌ Error: " . $conn->error . "\n";
}

// Verify remaining
echo "=== REMAINING ACCOUNTS ===\n";
$verify = $conn->query("SELECT id, username, email, firstName, lastName, role FROM users ORDER BY username");
while ($row = $verify->fetch_assoc()) {
    echo "- " . $row['username'] . " | " . $row['email'] . " (" . $row['firstName'] . " " . $row['lastName'] . " - " . $row['role'] . ")\n";
}

$total = $conn->query("SELECT COUNT(*) as count FROM users");
$count_row = $total->fetch_assoc();
echo "\nTotal users remaining: " . $count_row['count'] . "\n";

$conn->close();
?>
