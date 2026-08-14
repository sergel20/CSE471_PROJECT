const jwt = require('jsonwebtoken');

// Verifies the Bearer token on the request and attaches { id, role } to req.user.
// The role travels inside the token itself (set at signup/login), so route guards
// downstream (see middleware/role.js) never need an extra DB lookup to check it.
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

module.exports = requireAuth;
