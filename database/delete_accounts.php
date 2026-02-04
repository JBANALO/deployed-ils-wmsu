<?php
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'wmsu_ed';

$conn = new mysqli($host, $user, $password, $database);

echo "=== DELETING ACCOUNTS ===\n\n";

// Get list of accounts to keep
$keep_emails = ['adminjossie@wmsu.edu.ph', 'Hz202305178@wmsu.edu.ph'];

// Get list of accounts to delete
$result = $conn->query("SELECT id, email, firstName, lastName, role FROM users WHERE email NOT IN ('" . implode("','", $keep_emails) . "')");

echo "Accounts to DELETE:\n";
$accounts_to_delete = [];
while ($row = $result->fetch_assoc()) {
    $accounts_to_delete[] = $row['email'];
    echo "- " . $row['email'] . " (" . $row['firstName'] . " " . $row['lastName'] . " - " . $row['role'] . ")\n";
}

echo "\nTotal accounts to delete: " . count($accounts_to_delete) . "\n\n";

// Delete accounts
$delete_query = "DELETE FROM users WHERE email NOT IN ('" . implode("','", $keep_emails) . "')";
$delete_result = $conn->query($delete_query);

if ($delete_result) {
    echo "✅ DELETION COMPLETED\n";
    echo "Rows deleted: " . $conn->affected_rows . "\n\n";
} else {
    echo "❌ Error: " . $conn->error . "\n";
}

// Verify remaining accounts
echo "=== REMAINING ACCOUNTS ===\n";
$verify = $conn->query("SELECT id, email, firstName, lastName, role FROM users ORDER BY email");
while ($row = $verify->fetch_assoc()) {
    echo "- " . $row['email'] . " (" . $row['firstName'] . " " . $row['lastName'] . " - " . $row['role'] . ")\n";
}

$total = $conn->query("SELECT COUNT(*) as count FROM users");
$count_row = $total->fetch_assoc();
echo "\nTotal accounts remaining: " . $count_row['count'] . "\n";

$conn->close();
?>
