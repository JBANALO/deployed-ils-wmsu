-- Add parent columns to students table for Grade 4-6 students
-- These columns will support parent information for the approval workflow

-- Add parent information columns to students table
ALTER TABLE students 
ADD COLUMN parentFirstName VARCHAR(255) AFTER contact,
ADD COLUMN parentLastName VARCHAR(255) AFTER parentFirstName,
ADD COLUMN parentEmail VARCHAR(255) AFTER parentLastName,
ADD COLUMN parentContact VARCHAR(20) AFTER parentEmail;

-- Check if the columns were added successfully
DESCRIBE students;
