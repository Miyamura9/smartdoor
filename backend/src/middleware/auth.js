const { verifyJWT } = require('../lib/jwt');

/**
 * Express middleware — validates Bearer token in Authorization header.
 * Attaches decoded payload to req.user on success.
 * Returns 401 if token is missing, invalid, or expired.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication required', code: 'NO_TOKEN' });
  }

  try {
    const decoded = verifyJWT(token);
    req.user = decoded;
    next();
  } catch (err) {
    const code = err.message.includes('expired') ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    return res.status(401).json({ error: err.message, code });
  }
}

module.exports = { verifyToken };
