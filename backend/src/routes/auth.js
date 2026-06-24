const express = require('express');
const router  = express.Router();
const { signJWT, verifyJWT, verifyPassword } = require('../lib/jwt');
const { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } = require('@simplewebauthn/server');
const store = require('../lib/store');

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'SmartDoor2024!';
const ADMIN_PIN = process.env.ADMIN_PIN || '123456';
const RP_ID = process.env.RP_ID || 'localhost';
const expectedOrigin = process.env.FRONTEND_URL || 'http://localhost:3000';

// Storage for WebAuthn challenges (in-memory is fine for single admin)
const challenges = {};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const usernameMatch = username === ADMIN_USERNAME;
  const passwordMatch = verifyPassword(password, ADMIN_PASSWORD);

  if (!usernameMatch || !passwordMatch) {
    console.warn(`[Auth] Failed login attempt for username: "${username}"`);
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = signJWT({ username, role: 'admin' });
  console.log(`[Auth] Login successful: ${username}`);
  res.json({ token, user: { username, role: 'admin' }, message: 'Login successful' });
});

// ── POST /api/auth/login-pin ──────────────────────────────────────────────────
router.post('/login-pin', (req, res) => {
  const { pin } = req.body || {};

  if (!pin) {
    return res.status(400).json({ error: 'PIN is required' });
  }

  if (pin !== ADMIN_PIN) {
    console.warn(`[Auth] Failed PIN login attempt`);
    return res.status(401).json({ error: 'Invalid PIN' });
  }

  const token = signJWT({ username: ADMIN_USERNAME, role: 'admin' });
  console.log(`[Auth] PIN Login successful`);
  res.json({ token, user: { username: ADMIN_USERNAME, role: 'admin' }, message: 'Login successful' });
});

// ── GET /api/auth/webauthn/register-options ──────────────────────────────────
router.get('/webauthn/register-options', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  // Must be authenticated to register a device
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    verifyJWT(token);
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const user = store.getUser();
  const options = generateRegistrationOptions({
    rpName: 'Smart Door Lock',
    rpID: RP_ID,
    userID: Buffer.from(user.id),
    userName: user.username,
    // Avoid re-registering existing authenticators
    excludeCredentials: user.devices.map(dev => ({
      id: Buffer.from(dev.credentialID, 'base64url'),
      type: 'public-key',
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform', // Use device biometrics
    },
  });

  challenges['admin_reg'] = options.challenge;
  res.json(options);
});

// ── POST /api/auth/webauthn/register-verify ──────────────────────────────────
router.post('/webauthn/register-verify', async (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    verifyJWT(token);
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { body } = req;
  const expectedChallenge = challenges['admin_reg'];

  if (!expectedChallenge) {
    return res.status(400).json({ error: 'No active registration challenge' });
  }

  try {
    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: RP_ID,
    });

    if (verification.verified) {
      const { registrationInfo } = verification;
      const { credentialPublicKey, credentialID, counter } = registrationInfo;

      const newDevice = {
        credentialID: Buffer.from(credentialID).toString('base64url'),
        credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
        transports: body.response.transports,
      };

      store.saveNewDevice(newDevice);
      delete challenges['admin_reg'];

      console.log(`[WebAuthn] Device registered successfully`);
      return res.json({ verified: true });
    }
  } catch (error) {
    console.error('[WebAuthn] Registration error:', error);
    return res.status(400).json({ error: error.message });
  }
  return res.status(400).json({ verified: false });
});

// ── GET /api/auth/webauthn/auth-options ──────────────────────────────────────
router.get('/webauthn/auth-options', (req, res) => {
  const user = store.getUser();
  const options = generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: user.devices.map(dev => ({
      id: Buffer.from(dev.credentialID, 'base64url'),
      type: 'public-key',
      transports: dev.transports,
    })),
    userVerification: 'preferred',
  });

  challenges['admin_auth'] = options.challenge;
  res.json(options);
});

// ── POST /api/auth/webauthn/auth-verify ──────────────────────────────────────
router.post('/webauthn/auth-verify', async (req, res) => {
  const { body } = req;
  const expectedChallenge = challenges['admin_auth'];

  if (!expectedChallenge) {
    return res.status(400).json({ error: 'No active auth challenge' });
  }

  const user = store.getUser();
  const authenticator = user.devices.find(dev => dev.credentialID === body.id);

  if (!authenticator) {
    return res.status(400).json({ error: 'Device not registered' });
  }

  try {
    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: Buffer.from(authenticator.credentialID, 'base64url'),
        credentialPublicKey: Buffer.from(authenticator.credentialPublicKey, 'base64url'),
        counter: authenticator.counter,
      },
    });

    if (verification.verified) {
      delete challenges['admin_auth'];
      const token = signJWT({ username: ADMIN_USERNAME, role: 'admin' });
      console.log(`[WebAuthn] Login successful`);
      return res.json({ token, user: { username: ADMIN_USERNAME, role: 'admin' }, message: 'Login successful' });
    }
  } catch (error) {
    console.error('[WebAuthn] Auth error:', error);
    return res.status(400).json({ error: error.message });
  }
  return res.status(400).json({ verified: false });
});


// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token provided', code: 'NO_TOKEN' });
  try {
    const decoded = verifyJWT(token);
    res.json({ user: { username: decoded.username, role: decoded.role }, valid: true });
  } catch (err) {
    const code = err.message.includes('expired') ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN';
    res.status(401).json({ error: err.message, code, valid: false });
  }
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (token) {
    try {
      const decoded = verifyJWT(token);
      console.log(`[Auth] Logout: ${decoded.username}`);
    } catch {}
  }
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
