const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [, token] = authHeader.split(' ');

  if (!token) {
    return res.status(401).json({ success: false, message: 'Missing token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    return next();
  } catch (error) {
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
