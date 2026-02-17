// server/middleware/auth.js
const verifyUser = (req, res, next) => {
  // For now, extract user from query or body or headers
  // In production, verify JWT token
  
  const userToken = req.headers['x-user-token'] || req.body.user || req.query.user;
  
  if (!userToken) {
    // If no user provided, assume admin for testing
    req.user = {
      id: 'admin-test',
      role: 'admin',
      subjectsHandled: [],
      sectionHandled: null
    };
  } else {
    try {
      // In production, verify JWT here
      // For now, just parse the JSON
      req.user = typeof userToken === 'string' ? JSON.parse(userToken) : userToken;
    } catch (err) {
      req.user = { role: 'admin' };
    }
  }
  
  next();
};

module.exports = { verifyUser };
