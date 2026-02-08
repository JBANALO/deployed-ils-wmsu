<?php
// database/add_google_oauth_columns.php
// Add googleId and avatar columns to users table for Google OAuth support

require_once 'test_connection.php';

try {
    // Check if googleId column exists
    $checkGoogleId = $conn->query("SHOW COLUMNS FROM users LIKE 'googleId'");
    
    if ($checkGoogleId->num_rows == 0) {
        $conn->query("ALTER TABLE users ADD COLUMN googleId VARCHAR(255) UNIQUE NULL AFTER id");
        echo "✅ Added googleId column\n";
    } else {
        echo "✅ googleId column already exists\n";
    }
    
    // Check if avatar column exists
    $checkAvatar = $conn->query("SHOW COLUMNS FROM users LIKE 'avatar'");
    
    if ($checkAvatar->num_rows == 0) {
        $conn->query("ALTER TABLE users ADD COLUMN avatar LONGTEXT NULL AFTER email");
        echo "✅ Added avatar column\n";
    } else {
        echo "✅ avatar column already exists\n";
    }
    
    // Check if status column exists
    $checkStatus = $conn->query("SHOW COLUMNS FROM users LIKE 'status'");
    
    if ($checkStatus->num_rows == 0) {
        $conn->query("ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'approved' AFTER password");
        echo "✅ Added status column\n";
    } else {
        echo "✅ status column already exists\n";
    }
    
    echo "\n✅ Database migration for Google OAuth completed successfully!\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage();
    exit(1);
}

$conn->close();
?>
