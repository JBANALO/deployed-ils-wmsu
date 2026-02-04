<?php
// Delete all subject teacher assignments from the database

$conn = new mysqli('localhost', 'root', '', 'wmsu_portal');

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

try {
    // Delete all records from subject_teachers
    $result = $conn->query("DELETE FROM subject_teachers");
    
    if ($result) {
        echo "✓ All subject teacher assignments have been deleted!\n";
        echo "You can now start fresh with new assignments.\n";
    } else {
        echo "✗ Error deleting records: " . $conn->error . "\n";
    }
    
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}

$conn->close();
?>
