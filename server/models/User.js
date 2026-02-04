// server/models/User.js
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { readUsers, writeUsers } = require('../utils/fileStorage');

class User {
  static async create(userData) {
    const users = readUsers();
    const userExists = users.some(
      (u) => u.email === userData.email || u.username === userData.username
    );

    if (userExists) {
      throw new Error('User with this email or username already exists');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 12);
    
    // Determine status: pending for new signups, approved only if explicitly marked as admin-created
    let status = 'pending';
    if (userData.adminCreated === true) {
      status = 'approved';
    }
    
    // Remove password and status from userData to prevent them from being spread into newUser
    const { password, status: existingStatus, ...cleanUserData } = userData;
    
    const newUser = {
      id: uuidv4(),
      ...cleanUserData,
      password: hashedPassword,
      // Store plain password for admin-created users (for viewing credentials)
      plainPassword: userData.adminCreated ? userData.password : undefined,
      // ALL user signups start as pending and require admin approval
      // Only users created by admin get auto-approved
      status: status,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    const success = writeUsers(users);

    if (!success) {
      throw new Error('Failed to save user');
    }

    // Remove password before returning
    const { password: pwd, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  static async createBatch(usersData) {
    // Optimized batch create for bulk imports
    const users = readUsers();
    const newUsers = [];
    
    // Hash passwords and check for duplicates
    for (const userData of usersData) {
      const userExists = users.some(
        (u) => u.email === userData.email || u.username === userData.username
      ) || newUsers.some(
        (u) => u.email === userData.email || u.username === userData.username
      );

      if (userExists) {
        throw new Error(`User with email ${userData.email} or username ${userData.username} already exists`);
      }

      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const newUser = {
        id: uuidv4(),
        ...userData,
        password: hashedPassword,
        // Set status to 'approved' for admin/student, 'pending' for teacher/subject_teacher/adviser
        status: ['teacher', 'subject_teacher', 'adviser'].includes(userData.role) ? 'pending' : 'approved',
        createdAt: new Date().toISOString(),
      };
      newUsers.push(newUser);
    }

    // Write all users at once
    const allUsers = [...users, ...newUsers];
    const success = writeUsers(allUsers);

    if (!success) {
      throw new Error('Failed to save users');
    }

    // Return users without passwords
    return newUsers.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  static async findByEmail(email) {
    const users = readUsers();
    return users.find((user) => user.email === email);
  }

  static async findById(id) {
    const users = readUsers();
    return users.find((user) => user.id === id);
  }

  static async comparePassword(candidatePassword, hashedPassword) {
    return bcrypt.compare(candidatePassword, hashedPassword);
  }

  static deleteByEmail(email) {
    const users = readUsers();
    const filteredUsers = users.filter((user) => user.email !== email);
    const success = writeUsers(filteredUsers);
    return success && users.length > filteredUsers.length;
  }

  static deleteById(id) {
    const users = readUsers();
    const filteredUsers = users.filter((user) => user.id !== id);
    const success = writeUsers(filteredUsers);
    return success && users.length > filteredUsers.length;
  }
}

module.exports = User;