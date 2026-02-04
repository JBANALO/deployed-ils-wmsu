<?php
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'wmsu_ed';

$conn = new mysqli($host, $user, $password, $database);

echo "=== CHECKING ACCOUNT hz202305178 ===\n\n";

// Check if user exists
$result = $conn->query("SELECT id, firstName, lastName, email, role, password FROM users WHERE email = 'Hz202305178@wmsu.edu.ph' OR username LIKE '%hz202305178%'");

if ($result->num_rows > 0) {
    $row = $result->fetch_assoc();
    echo "User Found:\n";
    echo "ID: " . $row['id'] . "\n";
    echo "Name: " . $row['firstName'] . " " . $row['lastName'] . "\n";
    echo "Email: " . $row['email'] . "\n";
    echo "Role: " . $row['role'] . "\n";
    echo "Current Password Hash: " . substr($row['password'], 0, 20) . "...\n\n";
    
    // Update password to 'password123'
    $newPassword = 'password123';
    $hashedPassword = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
    
    $updateResult = $conn->query("UPDATE users SET password = '$hashedPassword' WHERE email = 'Hz202305178@wmsu.edu.ph'");
    
    if ($updateResult) {
        echo "✅ PASSWORD UPDATED SUCCESSFULLY\n\n";
        echo "=== LOGIN CREDENTIALS ===\n";
        echo "Email: Hz202305178@wmsu.edu.ph\n";
        echo "Password: password123\n\n";
        
        // Verify the update
        $verify = $conn->query("SELECT password FROM users WHERE email = 'Hz202305178@wmsu.edu.ph'");
        $verify_row = $verify->fetch_assoc();
        echo "New Password Hash (first 20 chars): " . substr($verify_row['password'], 0, 20) . "...\n";
        echo "Hash Valid: " . (password_verify($newPassword, $verify_row['password']) ? "YES ✅" : "NO ❌") . "\n";
    } else {
        echo "❌ Error updating password: " . $conn->error . "\n";
    }
} else {
    echo "❌ User not found with email Hz202305178@wmsu.edu.ph\n";
    echo "Searching all teacher accounts...\n\n";
    
    $all_teachers = $conn->query("SELECT id, firstName, lastName, email, role FROM users WHERE role = 'teacher' LIMIT 10");
    echo "Available teacher accounts:\n";
    while ($teacher = $all_teachers->fetch_assoc()) {
        echo "- " . $teacher['email'] . " (" . $teacher['firstName'] . " " . $teacher['lastName'] . ")\n";
    }
}

$conn->close();
?>
