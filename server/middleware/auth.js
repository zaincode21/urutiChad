const jwt = require('jsonwebtoken');
const database = require('../database/database');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await database.get('SELECT * FROM users WHERE id = ? AND is_active = true', [decoded.userId]);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token.' });
  }
};

const adminAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed.' });
  }
};

const managerAuth = async (req, res, next) => {
  try {
    await auth(req, res, () => {
      if (!['admin', 'manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied. Manager or Admin privileges required.' });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({ error: 'Authentication failed.' });
  }
};

module.exports = { auth, adminAuth, managerAuth }; 