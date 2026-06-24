const mqtt = require('mqtt');
const prisma = require('../lib/prisma');

let client = null;
let _io = null;

// Topics
const TOPICS = {
  STATUS:    'smartdoorlock/door/status',
  LOG:       'smartdoorlock/door/log',
  ALERT:     'smartdoorlock/door/alert',
  WHITELIST: 'smartdoorlock/door/whitelist',
  CONTROL:   'smartdoorlock/door/control',
};

/**
 * Connect to the MQTT broker and wire up all message handlers.
 * Supports both local Mosquitto (mqtt://) and HiveMQ Cloud (mqtts://).
 * @param {import('socket.io').Server} io
 */
function connect(io) {
  _io = io;

  const brokerUrl  = process.env.MQTT_BROKER   || 'mqtt://localhost:1883';
  const username   = process.env.MQTT_USERNAME  || undefined;
  const password   = process.env.MQTT_PASSWORD  || undefined;
  const port       = process.env.MQTT_PORT      ? parseInt(process.env.MQTT_PORT) : undefined;

  const isSecure = brokerUrl.startsWith('mqtts://') || brokerUrl.startsWith('wss://');

  console.log(`[MQTT] Connecting to broker: ${brokerUrl} (${isSecure ? 'TLS/MQTTS' : 'plain'})`);

  const connectOptions = {
    reconnectPeriod: 5000,
    connectTimeout:  15000,
    // Credentials — only set when provided (HiveMQ Cloud requires these)
    ...(username && { username }),
    ...(password && { password }),
    ...(port     && { port }),
    // TLS options for MQTTS — use system CA store to validate HiveMQ certificate
    ...(isSecure && {
      rejectUnauthorized: true, // Always verify TLS cert in production
    }),
  };

  client = mqtt.connect(brokerUrl, connectOptions);

  // ── Connected ──────────────────────────────────────────────────────────────
  client.on('connect', () => {
    console.log('[MQTT] Connected to broker');

    const subscribeTopics = [
      TOPICS.STATUS,
      TOPICS.LOG,
      TOPICS.ALERT,
      TOPICS.WHITELIST,
    ];

    client.subscribe(subscribeTopics, (err) => {
      if (err) {
        console.error('[MQTT] Subscription error:', err.message);
      } else {
        console.log('[MQTT] Subscribed to topics:', subscribeTopics);
      }
    });
  });

  // ── Reconnecting ───────────────────────────────────────────────────────────
  client.on('reconnect', () => {
    console.log('[MQTT] Reconnecting to broker…');
  });

  // ── Error ──────────────────────────────────────────────────────────────────
  client.on('error', (err) => {
    console.error('[MQTT] Connection error:', err.message);
  });

  // ── Offline ────────────────────────────────────────────────────────────────
  client.on('offline', () => {
    console.warn('[MQTT] Client is offline');
  });

  // ── Messages ───────────────────────────────────────────────────────────────
  client.on('message', async (topic, message) => {
    const raw = message.toString();
    console.log(`[MQTT] Message on "${topic}": ${raw}`);

    try {
      switch (topic) {
        case TOPICS.STATUS:
          await handleStatus(raw);
          break;
        case TOPICS.LOG:
          await handleLog(raw);
          break;
        case TOPICS.ALERT:
          handleAlert(raw);
          break;
        default:
          // WHITELIST acknowledgement or unknown — just log
          break;
      }
    } catch (err) {
      console.error(`[MQTT] Error processing message on "${topic}":`, err.message);
    }
  });
}

// ── Handlers ───────────────────────────────────────────────────────────────────

/**
 * smartdoorlock/door/status
 * Expected payload: { status: "LOCKED"|"UNLOCKED", source?: string }
 */
async function handleStatus(raw) {
  const payload = JSON.parse(raw);
  const status  = payload.status  || 'UNKNOWN';
  const source  = payload.source  || 'SYSTEM';

  // Always insert a new row (history) – "upsert" here means replace the
  // single "latest" record by deleting all old rows first then inserting,
  // so the /api/status/latest query stays fast.  For simplicity we just
  // create a new row every time (history is preserved).
  const record = await prisma.doorStatus.create({ data: { status, source } });

  if (_io) {
    _io.emit('door:status', record);
  }
}

/**
 * smartdoorlock/door/log
 * Expected payload: { method, status, uid?, message? }
 */
async function handleLog(raw) {
  const payload = JSON.parse(raw);
  const { method, status, uid = null, message = null } = payload;

  const record = await prisma.accessLog.create({
    data: { method, status, uid, message },
  });

  if (_io) {
    _io.emit('door:log', record);
  }
}

/**
 * smartdoorlock/door/alert
 * Forward raw parsed JSON directly to connected clients.
 */
function handleAlert(raw) {
  const payload = JSON.parse(raw);

  if (_io) {
    _io.emit('door:alert', payload);
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Publish a command to the broker.
 * @param {string} topic
 * @param {string|object} payload  – objects are JSON-stringified automatically
 */
function publishCommand(topic, payload) {
  if (!client || !client.connected) {
    console.warn('[MQTT] Cannot publish – client not connected');
    return;
  }

  const message = typeof payload === 'object' ? JSON.stringify(payload) : String(payload);
  client.publish(topic, message, { qos: 1 }, (err) => {
    if (err) {
      console.error(`[MQTT] Publish error on "${topic}":`, err.message);
    } else {
      console.log(`[MQTT] Published to "${topic}": ${message}`);
    }
  });
}

module.exports = { connect, publishCommand, TOPICS };
