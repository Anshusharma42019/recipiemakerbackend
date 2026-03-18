const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Access denied - No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({ error: 'User not found', logout: true });
    }
    
    if (user.isActive === false) {
      return res.status(401).json({ error: 'Account deactivated', logout: true });
    }
    
    req.user = { id: decoded.userId, role: decoded.role, ...decoded };
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', logout: true });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token', logout: true });
    } else {
      return res.status(401).json({ error: 'Authentication failed', logout: true });
    }
  }
};

module.exports = auth;
