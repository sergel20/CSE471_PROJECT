// Restricts a route to specific roles. Must run after requireAuth, which
// populates req.user.role from the JWT.
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }
    next();
  };
}

module.exports = requireRole;
