-- Add missing Josie Banalo teacher account
INSERT INTO users (id, firstName, lastName, username, email, password, role, createdAt)
VALUES (
  UUID(),
  'Josie',
  'Banalo',
  'hz202305178',
  'Hz202305178@wmsu.edu.ph',
  '$2a$12$R9h7cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss8KKUgQlzwiOHSm',
  'teacher',
  NOW()
);
