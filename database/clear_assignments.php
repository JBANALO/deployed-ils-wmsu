<?php
// Clear all old subject teacher assignments
$conn = new mysqli('localhost', 'root', '', 'wmsu_portal');

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

try {
    // Delete all records from subject_teachers
    $conn->query("DELETE FROM subject_teachers");
    
    echo "✓ Cleared all subject teacher assignments!\n";
    echo "✓ Table is now empty - ready for fresh assignments.\n";
    echo "✓ Same teacher can now be assigned multiple times.\n";
    
} catch (Exception $e) {
    echo "✗ Error: " . $e->getMessage() . "\n";
}

$conn->close();
?>
