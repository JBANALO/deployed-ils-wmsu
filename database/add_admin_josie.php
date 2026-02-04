<?php
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'wmsu_ed';

$conn = new mysqli($host, $user, $password, $database);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

echo "=== ADDING ADMIN JOSIE ACCOUNT ===\n\n";

// Generate hashed password for Password123
$hashedPassword = password_hash('Password123', PASSWORD_BCRYPT);

// Insert admin account
$insert_query = "INSERT INTO users (id, firstName, lastName, username, role, email, password, createdAt) 
                 VALUES ('admin-josie-001', 'Josie', 'Banalo', 'adminjossie', 'admin', 'adminjossie@wmsu.edu.ph', ?, NOW())";

$stmt = $conn->prepare($insert_query);
$stmt->bind_param('s', $hashedPassword);

if ($stmt->execute()) {
    echo "✅ Admin account created successfully!\n";
    echo "Email: adminjossie@wmsu.edu.ph\n";
    echo "Username: adminjossie\n";
    echo "Password: Password123\n";
} else {
    echo "❌ Error: " . $conn->error . "\n";
}

// Verify
echo "\n=== CURRENT ACCOUNTS ===\n";
$verify = $conn->query("SELECT username, email, role FROM users ORDER BY email");
while ($row = $verify->fetch_assoc()) {
    echo "- " . $row['email'] . " (" . $row['username'] . " - " . $row['role'] . ")\n";
}

$total = $conn->query("SELECT COUNT(*) as count FROM users");
$count_row = $total->fetch_assoc();
echo "\nTotal users: " . $count_row['count'] . "\n";

$stmt->close();
$conn->close();
?>
