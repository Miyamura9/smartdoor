/**
 * JWT + Password hashing menggunakan Node.js built-in `crypto`
 * Tidak memerlukan package eksternal (jsonwebtoken / bcryptjs)
 */
const crypto = require('crypto');

const JWT_SECRET  = process.env.JWT_SECRET  || 'changeme-super-secret-key-32chars!!';
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '7d';

// ── JWT helpers ───────────────────────────────────────────────────────────────

function base64url(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function parseDuration(d) {
  const match = String(d).match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 3600; // default 7 days
  const n = parseInt(match[1]);
  const unit = match[2];
  return unit === 's' ? n : unit === 'm' ? n * 60 : unit === 'h' ? n * 3600 : n * 86400;
}

/**
 * Sign a JWT with HMAC-SHA256
 * @param {object} payload
 * @returns {string} token
 */
function signJWT(payload) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp    = Math.floor(Date.now() / 1000) + parseDuration(JWT_EXPIRES);
  const body   = base64url(JSON.stringify({ ...payload, exp, iat: Math.floor(Date.now() / 1000) }));
  const sig    = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  return `${header}.${body}.${sig}`;
}

/**
 * Verify & decode a JWT
 * @param {string} token
 * @returns {object} decoded payload
 * @throws if invalid or expired
 */
function verifyJWT(token) {
  const parts = (token || '').split('.');
  if (parts.length !== 3) throw new Error('Invalid token format');

  const [header, body, sig] = parts;
  const expectedSig = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) {
    throw new Error('Invalid token signature');
  }

  const payload = JSON.parse(Buffer.from(body, 'base64').toString());
  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error('Token expired');
  }
  return payload;
}

// ── Password helpers ──────────────────────────────────────────────────────────

/**
 * Hash a password using PBKDF2 (built-in crypto)
 * @param {string} password
 * @returns {string} hash string (salt:hash)
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a password against a stored hash
 * @param {string} password
 * @param {string} stored  — "salt:hash" format, or plain-text from .env
 * @returns {boolean}
 */
function verifyPassword(password, stored) {
  // Support plain-text comparison for simple .env password (no hash prefix)
  if (!stored.includes(':')) {
    // Pad both to same length to keep timingSafeEqual safe
    const a = Buffer.from(password);
    const b = Buffer.from(stored);
    const maxLen = Math.max(a.length, b.length);
    const pa = Buffer.concat([a, Buffer.alloc(maxLen - a.length)]);
    const pb = Buffer.concat([b, Buffer.alloc(maxLen - b.length)]);
    return crypto.timingSafeEqual(pa, pb) && a.length === b.length;
  }
  const [salt, storedHash] = stored.split(':');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  // Both hashes are same length (hex of 64 bytes = 128 chars), safe to compare directly
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
}

module.exports = { signJWT, verifyJWT, hashPassword, verifyPassword };
