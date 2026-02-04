<?php
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'wmsu_ed';

$conn = new mysqli($host, $user, $password, $database);

echo "=== CHECKING REMAINING USERS ===\n\n";

$result = $conn->query("SELECT id, email, firstName, lastName, role FROM users ORDER BY role DESC, email");
echo "All users:\n";
$count = 0;
while ($row = $result->fetch_assoc()) {
    echo ($count + 1) . ". " . $row['email'] . " (" . $row['firstName'] . " " . $row['lastName'] . " - " . $row['role'] . ")\n";
    $count++;
}

// Check by role
$roleResult = $conn->query("SELECT role, COUNT(*) as count FROM users GROUP BY role");
echo "\n=== USERS BY ROLE ===\n";
while ($row = $roleResult->fetch_assoc()) {
    echo $row['role'] . ": " . $row['count'] . "\n";
}

echo "\nTotal users: $count\n";

$conn->close();
?>
