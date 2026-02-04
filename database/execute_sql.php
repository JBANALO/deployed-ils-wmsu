<?php
// Database connection parameters
$host = 'localhost';
$user = 'root';
$password = '';
$database = 'wmsu_ed';

// Create connection
$conn = new mysqli($host, $user, $password, $database);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

echo "Connected to database successfully!\n\n";

// Read and execute the SQL file
$sql_file = __DIR__ . '/populate_students.sql';
$sql_content = file_get_contents($sql_file);

// Split by semicolon to execute multiple statements
$statements = array_filter(array_map('trim', explode(';', $sql_content)));

$total_affected = 0;
foreach ($statements as $statement) {
    if (!empty($statement)) {
        if ($conn->query($statement) === TRUE) {
            $affected = $conn->affected_rows;
            $total_affected += $affected;
            echo "Executed: " . substr($statement, 0, 50) . "...\n";
            echo "Rows affected: $affected\n\n";
        } else {
            echo "Error executing statement: " . $conn->error . "\n";
            echo "Statement: " . substr($statement, 0, 100) . "...\n\n";
        }
    }
}

echo "=== SUMMARY ===\n";
echo "Total rows affected: $total_affected\n";

// Verify insertion
$verify = $conn->query("SELECT COUNT(*) as count FROM students");
$row = $verify->fetch_assoc();
echo "Total students in database: " . $row['count'] . "\n";

$verify_classes = $conn->query("SELECT COUNT(*) as count FROM classes");
$row_classes = $verify_classes->fetch_assoc();
echo "Total classes in database: " . $row_classes['count'] . "\n";

$conn->close();
?>
