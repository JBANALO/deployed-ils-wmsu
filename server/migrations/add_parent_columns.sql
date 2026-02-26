-- Add parent information columns to users table
ALTER TABLE users 
ADD COLUMN parentFirstName VARCHAR(255) AFTER section,
ADD COLUMN parentLastName VARCHAR(255) AFTER parentFirstName,
ADD COLUMN parentEmail VARCHAR(255) AFTER parentLastName,
ADD COLUMN parentContact VARCHAR(20) AFTER parentEmail,
ADD COLUMN profilePic TEXT AFTER parentContact,
ADD COLUMN lrn VARCHAR(20) AFTER parentContact,
ADD COLUMN sex VARCHAR(10) AFTER lrn,
ADD COLUMN age INT AFTER sex,
ADD COLUMN middleName VARCHAR(255) AFTER firstName;
