const fs = require('fs');
const path = require('path');

const STORE_PATH = path.join(__dirname, '..', 'data', 'webauthn.json');

// Ensure data directory exists
const dir = path.dirname(STORE_PATH);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

// Load credentials
function getCredentials() {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('[WebAuthn Store] Error loading credentials:', err);
  }
  return [];
}

// Save credentials
function saveCredentials(credentials) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(credentials, null, 2), 'utf8');
  } catch (err) {
    console.error('[WebAuthn Store] Error saving credentials:', err);
  }
}

// Get user (for WebAuthn verification)
// Since this is a single admin system, the user is always 'admin'
function getUser() {
  return {
    id: 'admin-user-id',
    username: 'admin',
    devices: getCredentials()
  };
}

// Add a device to the user
function saveNewDevice(device) {
  const credentials = getCredentials();
  credentials.push(device);
  saveCredentials(credentials);
}

module.exports = {
  getUser,
  saveNewDevice,
  getCredentials
};
