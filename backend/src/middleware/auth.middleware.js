const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

/**
 * Verifies JWT and attaches user to req.user
 */
const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized — no token provided' });
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, email: true, phone: true, role: true }
    });

    if (!user) return res.status(401).json({ error: 'Unauthorized — user not found' });

    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized — invalid token' });
  }
};

/**
 * Restricts access to specified roles
 * @param {...string} roles - Allowed roles (e.g., 'ADMIN', 'AGENT')
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden — insufficient permissions' });
  }
  next();
};

module.exports = { requireAuth, requireRole };
