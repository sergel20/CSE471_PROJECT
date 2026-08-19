const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

// Must run after requireAuth so req.user is available. Falls back to IP (via the
// library's IPv6-safe helper) if somehow unauthenticated — shouldn't happen given
// route order, but keeps the limiter safe.
const chatbotRateLimit = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  handler: (req, res) => {
    res.status(429).json({ message: 'Too many messages sent. Please wait a moment and try again.' });
  },
});

module.exports = chatbotRateLimit;
