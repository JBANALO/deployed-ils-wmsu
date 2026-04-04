-- Add super admin Collen Super
INSERT INTO `users` (id, first_name, last_name, username, email, password, role, created_at, updated_at)
VALUES (
  'super-collen-001',
  'Collen',
  'Super',
  'collensuper',
  'collensuper@wmsu.edu.ph',
  '$2b$12$Ysrdz/9QY1JRFq7nFW0YFO52PVmKqpPlFWHD3CMlPYNPp5I.8l4H.',
  'super_admin',
  NOW(),
  NOW()
);
