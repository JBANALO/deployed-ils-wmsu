<?php
/**
 * WMSU Portal - MySQL Connection Test
 * Test kung connected ka sa database
 */

// Database Configuration
$db_host = 'localhost';
$db_user = 'root';
$db_password = '';
$db_name = 'wmsu_portal';
$db_port = 3306;

echo "=== WMSU Portal - Database Connection Test ===\n\n";

// Test 1: Connect to MySQL
echo "Test 1: Connecting to MySQL...\n";
$conn = new mysqli($db_host, $db_user, $db_password, '', $db_port);

if ($conn->connect_error) {
    echo "❌ FAILED: " . $conn->connect_error . "\n";
    exit(1);
} else {
    echo "✅ Connected to MySQL server\n\n";
}

// Test 2: Check if database exists
echo "Test 2: Checking database '$db_name'...\n";
$result = $conn->query("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='$db_name'");

if ($result->num_rows > 0) {
    echo "✅ Database '$db_name' exists\n\n";
} else {
    echo "❌ Database '$db_name' NOT found\n";
    echo "   Please import wmsu_portal_complete.sql first\n\n";
    exit(1);
}

// Test 3: Connect to specific database
echo "Test 3: Connecting to database '$db_name'...\n";
$conn->select_db($db_name);

if ($conn->connect_error) {
    echo "❌ FAILED: " . $conn->connect_error . "\n";
    exit(1);
} else {
    echo "✅ Connected to database '$db_name'\n\n";
}

// Test 4: Check tables
echo "Test 4: Checking tables...\n";
$tables = ['users', 'students', 'classes', 'subject_teachers', 'attendance', 'grades'];
$missing_tables = [];

foreach ($tables as $table) {
    $result = $conn->query("SHOW TABLES LIKE '$table'");
    if ($result->num_rows > 0) {
        // Count rows
        $count_result = $conn->query("SELECT COUNT(*) as cnt FROM $table");
        $count_row = $count_result->fetch_assoc();
        echo "  ✅ Table '$table' exists (" . $count_row['cnt'] . " records)\n";
    } else {
        echo "  ❌ Table '$table' NOT found\n";
        $missing_tables[] = $table;
    }
}

if (!empty($missing_tables)) {
    echo "\n❌ Missing tables: " . implode(', ', $missing_tables) . "\n";
    echo "   Please import the SQL files\n";
    exit(1);
}

// Test 5: Check sample data
echo "\nTest 5: Checking sample data...\n";

// Check users
$users_result = $conn->query("SELECT COUNT(*) as cnt FROM users");
$users_row = $users_result->fetch_assoc();
echo "  Users: " . $users_row['cnt'] . " total\n";

// Check admin user
$admin_result = $conn->query("SELECT * FROM users WHERE role='admin' LIMIT 1");
if ($admin_result->num_rows > 0) {
    $admin = $admin_result->fetch_assoc();
    echo "    ✅ Admin found: " . $admin['username'] . " (" . $admin['email'] . ")\n";
}

// Check teachers
$teacher_result = $conn->query("SELECT COUNT(*) as cnt FROM users WHERE role='teacher'");
$teacher_row = $teacher_result->fetch_assoc();
echo "  Teachers: " . $teacher_row['cnt'] . " total\n";

// Check students
$student_count_result = $conn->query("SELECT COUNT(*) as cnt FROM students");
$student_count = $student_count_result->fetch_assoc();
echo "  Students: " . $student_count['cnt'] . " total\n";

// Check classes
$class_result = $conn->query("SELECT COUNT(*) as cnt FROM classes");
$class_row = $class_result->fetch_assoc();
echo "  Classes: " . $class_row['cnt'] . " total\n";

// Check attendance
$attendance_result = $conn->query("SELECT COUNT(*) as cnt FROM attendance");
$attendance_row = $attendance_result->fetch_assoc();
echo "  Attendance records: " . $attendance_row['cnt'] . " total\n";

// Check grades
$grades_result = $conn->query("SELECT COUNT(*) as cnt FROM grades");
$grades_row = $grades_result->fetch_assoc();
echo "  Grades: " . $grades_row['cnt'] . " total\n";

// Test 6: Check foreign keys
echo "\nTest 6: Checking relationships...\n";
$fk_check = $conn->query("SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE WHERE TABLE_NAME='attendance' AND COLUMN_NAME='studentId' AND REFERENCED_TABLE_NAME='students'");
if ($fk_check->num_rows > 0) {
    echo "  ✅ Foreign keys configured correctly\n";
} else {
    echo "  ⚠️  Warning: Foreign keys may not be configured\n";
}

// Summary
echo "\n" . str_repeat("=", 50) . "\n";
echo "✅ ALL TESTS PASSED!\n";
echo "✅ Database is ready to use\n";
echo str_repeat("=", 50) . "\n";

// Show connection info
echo "\nConnection Details:\n";
echo "  Host: $db_host\n";
echo "  User: $db_user\n";
echo "  Database: $db_name\n";
echo "  Port: $db_port\n";

// Show quick stats
echo "\nDatabase Statistics:\n";
$total_users = $conn->query("SELECT COUNT(*) as cnt FROM users")->fetch_assoc()['cnt'];
$total_students = $conn->query("SELECT COUNT(*) as cnt FROM students")->fetch_assoc()['cnt'];
echo "  Total Users: " . $total_users . "\n";
echo "  Total Students: " . $total_students . "\n";

$conn->close();
echo "\n✅ Connection closed successfully\n";
?>
