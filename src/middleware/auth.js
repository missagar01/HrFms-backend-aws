const jwt = require('jsonwebtoken');

const fs = require('fs');
const path = require('path');

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [, token] = authHeader.split(' ');
  const logFile = 'f:\\HR_FMS and TravalFms\\backend\\auth_debug.log';

  if (!token) {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] Missing token for ${req.method} ${req.url}\n`);
    return res.status(401).json({ success: false, message: 'Missing token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (error) {
    fs.appendFileSync(logFile, `[${new Date().toISOString()}] Token verification failed for ${req.method} ${req.url}: ${error.message}. Token: ${token.substring(0, 10)}...\n`);
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!roles.length) {
      return next();
    }

    if (!req.user || !req.user.role) {
      return res.status(403).json({ success: false, message: 'Role required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    return next();
  };
}

module.exports = {
  authenticateToken,
  authorizeRoles
};
