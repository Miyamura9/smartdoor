/*
 * ============================================================
 *  Smart Door Lock System — ESP32 Firmware
 *  ============================================================
 *  Hardware:
 *    - ESP32 DevKit v1
 *    - RFID RC522 (SPI)
 *    - Fingerprint Sensor AS608 (UART)
 *    - Keypad 4x4 (GPIO)
 *    - LCD I2C 16x2 (I2C)
 *    - Relay (solenoid lock control)
 *    - Active Buzzer
 *
 *  Libraries required (install via Arduino Library Manager):
 *    - MFRC522 by GithubCommunity
 *    - Adafruit Fingerprint Sensor Library by Adafruit
 *    - Keypad by Mark Stanley & Alexander Brevig
 *    - LiquidCrystal_I2C by Frank de Brabander
 *    - PubSubClient by Nick O'Leary
 *    - ArduinoJson by Benoit Blanchon
 * ============================================================
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>   // Tambahan: untuk MQTTS (TLS)
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>
#include <Adafruit_Fingerprint.h>
#include <Keypad.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <Preferences.h>

// ============================================================
//  WiFi & MQTT Configuration — EDIT THIS SECTION
// ============================================================
const char* WIFI_SSID     = "NAMA_WIFI_KAMU";
const char* WIFI_PASSWORD = "PASSWORD_WIFI_KAMU";

// ─── HiveMQ Cloud (MQTTS) ───────────────────────────────────
// Daftar gratis: https://www.hivemq.com/mqtt-cloud-broker/
// Ganti nilai di bawah dengan info cluster Anda:
const char* MQTT_SERVER   = "009d5a2f5dc94527a21dfa8a15efd711.s1.eu.hivemq.cloud";
const int   MQTT_PORT     = 8883;          // Port TLS HiveMQ Cloud
const char* MQTT_USERNAME = "heathcliff";
const char* MQTT_PASSWORD = "Lukluk12";
const char* MQTT_CLIENT_ID = "ESP32-SmartDoorLock";

// ============================================================
//  MQTT Topics
// ============================================================
const char* TOPIC_CONTROL   = "smartdoorlock/door/control";
const char* TOPIC_STATUS    = "smartdoorlock/door/status";
const char* TOPIC_LOG       = "smartdoorlock/door/log";
const char* TOPIC_ALERT     = "smartdoorlock/door/alert";
const char* TOPIC_WHITELIST = "smartdoorlock/door/whitelist";

// ============================================================
//  Pin Definitions
// ============================================================
// RFID RC522 (SPI)
#define RFID_SS_PIN   5
#define RFID_RST_PIN  27
// SPI pins are fixed: SCK=18, MISO=19, MOSI=23

// LCD I2C
// SDA=21, SCL=22 (default I2C on ESP32)
#define LCD_I2C_ADDR  0x27
#define LCD_COLS      16
#define LCD_ROWS      2

// Fingerprint Sensor (UART2)
#define FP_RX_PIN  16
#define FP_TX_PIN  17

// Relay (active LOW: LOW=relay ON/door UNLOCKED)
#define RELAY_PIN         13
#define RELAY_ACTIVE_LOW  true   // Set false if relay is active HIGH

// Buzzer
#define BUZZER_PIN  4

// Keypad 4x4
const byte KEYPAD_ROWS = 4;
const byte KEYPAD_COLS = 4;
char keys[KEYPAD_ROWS][KEYPAD_COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte rowPins[KEYPAD_ROWS] = {32, 33, 25, 26};
byte colPins[KEYPAD_COLS] = {14, 12, 15, 2};

// ============================================================
//  Default Whitelist (used if no whitelist received via MQTT)
// ============================================================
// RFID UIDs — add your card UIDs here (8 hex chars, uppercase)
String defaultAllowedUIDs[] = {"A1B2C3D4", "E5F6A7B8"};
int defaultAllowedUIDCount  = 2;

// Fingerprint IDs (enrolled via Adafruit fingerprint example first)
int defaultAllowedFingers[] = {1, 2, 3};
int defaultAllowedFingerCount = 3;

// PIN codes (4-digit)
String defaultAllowedPINs[] = {"1234", "5678"};
int defaultAllowedPINCount  = 2;

// ============================================================
//  Runtime whitelist (can be updated via MQTT)
// ============================================================
#define MAX_WHITELIST 50
String allowedUIDs[MAX_WHITELIST];
int    allowedUIDCount = 0;
int    allowedFingers[MAX_WHITELIST];
int    allowedFingerCount = 0;
String allowedPINs[MAX_WHITELIST];
int    allowedPINCount = 0;

// ============================================================
//  State
// ============================================================
bool    isDoorLocked = true;
unsigned long doorUnlockTimer = 0;
const unsigned long AUTO_LOCK_MS = 5000; // Auto-lock after 5 seconds

String  keypadBuffer = "";
unsigned long lastKeyTime = 0;
const unsigned long KEYPAD_TIMEOUT_MS = 10000; // 10 sec PIN entry timeout

unsigned long lastStatusPublish = 0;
const unsigned long STATUS_INTERVAL_MS = 30000; // publish status every 30s

unsigned long lastReconnectAttempt = 0;

// ============================================================
//  Objects
// ============================================================
WiFiClientSecure wifiClient;           // Secure client untuk MQTTS TLS
PubSubClient     mqttClient(wifiClient);
MFRC522       rfid(RFID_SS_PIN, RFID_RST_PIN);
HardwareSerial fpSerial(2);
Adafruit_Fingerprint finger(&fpSerial);
Keypad        keypad = Keypad(makeKeymap(keys), rowPins, colPins, KEYPAD_ROWS, KEYPAD_COLS);
LiquidCrystal_I2C lcd(LCD_I2C_ADDR, LCD_COLS, LCD_ROWS);
Preferences   prefs;

// ============================================================
//  Utility Functions
// ============================================================

void setRelay(bool unlock) {
  if (RELAY_ACTIVE_LOW) {
    digitalWrite(RELAY_PIN, unlock ? LOW : HIGH);
  } else {
    digitalWrite(RELAY_PIN, unlock ? HIGH : LOW);
  }
  isDoorLocked = !unlock;
}

void beepSuccess() {
  // Two short beeps
  for (int i = 0; i < 2; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100);
    digitalWrite(BUZZER_PIN, LOW);
    delay(100);
  }
}

void beepFailed() {
  // One long beep
  digitalWrite(BUZZER_PIN, HIGH);
  delay(500);
  digitalWrite(BUZZER_PIN, LOW);
}

void beepPing() {
  // One short beep
  digitalWrite(BUZZER_PIN, HIGH);
  delay(50);
  digitalWrite(BUZZER_PIN, LOW);
}

void lcdPrint(const char* line1, const char* line2 = "") {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
}

String rfidUIDToString(MFRC522::Uid uid) {
  String uidStr = "";
  for (byte i = 0; i < uid.size; i++) {
    if (uid.uidByte[i] < 0x10) uidStr += "0";
    uidStr += String(uid.uidByte[i], HEX);
  }
  uidStr.toUpperCase();
  return uidStr;
}

bool isUIDAllowed(String uid) {
  for (int i = 0; i < allowedUIDCount; i++) {
    if (allowedUIDs[i] == uid) return true;
  }
  return false;
}

bool isFingerAllowed(int id) {
  for (int i = 0; i < allowedFingerCount; i++) {
    if (allowedFingers[i] == id) return true;
  }
  return false;
}

bool isPINAllowed(String pin) {
  for (int i = 0; i < allowedPINCount; i++) {
    if (allowedPINs[i] == pin) return true;
  }
  return false;
}

// ============================================================
//  MQTT Publish Helpers
// ============================================================

void publishStatus() {
  StaticJsonDocument<128> doc;
  doc["status"]  = isDoorLocked ? "LOCKED" : "UNLOCKED";
  doc["uptime"]  = millis() / 1000;
  doc["wifi_rssi"] = WiFi.RSSI();
  char buf[128];
  serializeJson(doc, buf);
  mqttClient.publish(TOPIC_STATUS, buf, true); // retained
}

void publishLog(const char* method, const char* status, const char* uid = "", const char* message = "") {
  StaticJsonDocument<256> doc;
  doc["method"]  = method;
  doc["status"]  = status;
  if (strlen(uid) > 0)     doc["uid"]     = uid;
  if (strlen(message) > 0) doc["message"] = message;
  char buf[256];
  serializeJson(doc, buf);
  mqttClient.publish(TOPIC_LOG, buf);
}

void publishAlert(const char* method, const char* uid, const char* reason) {
  StaticJsonDocument<256> doc;
  doc["method"] = method;
  doc["uid"]    = uid;
  doc["reason"] = reason;
  char buf[256];
  serializeJson(doc, buf);
  mqttClient.publish(TOPIC_ALERT, buf);
}

// ============================================================
//  Door Access Control
// ============================================================

void grantAccess(const char* method, const char* uid = "", const char* label = "") {
  Serial.printf("[ACCESS] GRANTED | Method: %s | UID: %s\n", method, uid);
  lcdPrint("Access Granted", label);
  beepSuccess();
  setRelay(true); // Unlock
  publishStatus();
  publishLog(method, "success", uid, "Access granted");
  doorUnlockTimer = millis(); // Start auto-lock timer
}

void denyAccess(const char* method, const char* uid = "", const char* reason = "Not authorized") {
  Serial.printf("[ACCESS] DENIED  | Method: %s | UID: %s | Reason: %s\n", method, uid, reason);
  lcdPrint("Access Denied", reason);
  beepFailed();
  publishLog(method, "failed", uid, reason);
  publishAlert(method, uid, reason);
  delay(2000);
  lcdPrint(isDoorLocked ? "Door: LOCKED" : "Door: UNLOCKED", "Ready...");
}

// ============================================================
//  Whitelist Update from MQTT
// ============================================================

void updateWhitelistFromJSON(const char* payload, bool saveToNVS = true) {
  StaticJsonDocument<4096> doc;
  DeserializationError err = deserializeJson(doc, payload);
  if (err) {
    Serial.println("[WHITELIST] JSON parse error");
    return;
  }

  // Update RFID whitelist
  allowedUIDCount = 0;
  JsonArray rfidArr = doc["rfid"].as<JsonArray>();
  for (JsonVariant v : rfidArr) {
    if (allowedUIDCount < MAX_WHITELIST) {
      allowedUIDs[allowedUIDCount++] = v.as<String>();
    }
  }

  // Update finger whitelist
  allowedFingerCount = 0;
  JsonArray fingerArr = doc["fingers"].as<JsonArray>();
  for (JsonVariant v : fingerArr) {
    if (allowedFingerCount < MAX_WHITELIST) {
      allowedFingers[allowedFingerCount++] = v.as<int>();
    }
  }

  // Update PIN whitelist
  allowedPINCount = 0;
  JsonArray pinArr = doc["pins"].as<JsonArray>();
  for (JsonVariant v : pinArr) {
    if (allowedPINCount < MAX_WHITELIST) {
      allowedPINs[allowedPINCount++] = v.as<String>();
    }
  }

  Serial.printf("[WHITELIST] Updated: %d RFIDs, %d Fingers, %d PINs\n",
    allowedUIDCount, allowedFingerCount, allowedPINCount);

  if (saveToNVS) {
    prefs.putString("whitelist", payload);
    Serial.println("[WHITELIST] Saved to NVS (Flash)");
  }

  lcdPrint("Whitelist", "Updated!");
  delay(1500);
  lcdPrint(isDoorLocked ? "Door: LOCKED" : "Door: UNLOCKED", "Ready...");
}

void loadSavedOrDefaultWhitelist() {
  String saved = prefs.getString("whitelist", "");
  if (saved.length() > 5) {
    Serial.println("[WHITELIST] Loading from NVS...");
    updateWhitelistFromJSON(saved.c_str(), false);
  } else {
    Serial.println("[WHITELIST] Loading default whitelist...");
    allowedUIDCount = defaultAllowedUIDCount;
    for (int i = 0; i < allowedUIDCount; i++) allowedUIDs[i] = defaultAllowedUIDs[i];

    allowedFingerCount = defaultAllowedFingerCount;
    for (int i = 0; i < allowedFingerCount; i++) allowedFingers[i] = defaultAllowedFingers[i];

    allowedPINCount = defaultAllowedPINCount;
    for (int i = 0; i < allowedPINCount; i++) allowedPINs[i] = defaultAllowedPINs[i];
  }
}

// ============================================================
//  MQTT Callback
// ============================================================

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String topicStr = String(topic);
  String msg = "";
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  msg.trim();

  Serial.printf("[MQTT] Topic: %s | Msg: %s\n", topic, msg.c_str());

  if (topicStr == TOPIC_CONTROL) {
    if (msg == "UNLOCK") {
      Serial.println("[CMD] Remote UNLOCK");
      lcdPrint("Remote Unlock", "via Dashboard");
      beepSuccess();
      setRelay(true);
      publishStatus();
      publishLog("REMOTE", "success", "", "Remote unlock via web dashboard");
      doorUnlockTimer = millis();
    } else if (msg == "LOCK") {
      Serial.println("[CMD] Remote LOCK");
      lcdPrint("Remote Lock", "via Dashboard");
      beepPing();
      setRelay(false);
      publishStatus();
      publishLog("REMOTE", "success", "", "Remote lock via web dashboard");
    } else if (msg == "PING") {
      Serial.println("[CMD] PING received");
      beepPing();
      publishStatus();
    }
  } else if (topicStr == TOPIC_WHITELIST) {
    updateWhitelistFromJSON(msg.c_str());
  }
}

// ============================================================
//  WiFi Connection
// ============================================================

void connectWiFi() {
  Serial.printf("[WiFi] Connecting to %s", WIFI_SSID);
  lcdPrint("Connecting WiFi", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.printf("[WiFi] Connected! IP: %s\n", WiFi.localIP().toString().c_str());
    lcdPrint("WiFi Connected!", WiFi.localIP().toString().c_str());
    delay(1500);
  } else {
    Serial.println("\n[WiFi] FAILED — running in offline mode");
    lcdPrint("WiFi FAILED", "Offline Mode");
    delay(2000);
  }
}

// ============================================================
//  MQTT Connection
// ============================================================

bool connectMQTT() {
  if (WiFi.status() != WL_CONNECTED) return false;

  Serial.printf("[MQTT] Connecting to %s:%d (MQTTS/TLS)...\n", MQTT_SERVER, MQTT_PORT);
  lcdPrint("Connecting MQTT", "HiveMQ Cloud");

  // Gunakan setInsecure() agar tidak perlu upload certificate CA.
  // Koneksi tetap TERENKRIPSI TLS — hanya verifikasi sertifikat server dilewati.
  // Untuk produksi penuh, ganti dengan setCACert(hivemq_root_ca).
  wifiClient.setInsecure();

  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
  mqttClient.setKeepAlive(60);
  mqttClient.setBufferSize(1024);

  // connect() dengan username dan password (WAJIB untuk HiveMQ Cloud)
  if (mqttClient.connect(MQTT_CLIENT_ID, MQTT_USERNAME, MQTT_PASSWORD)) {
    Serial.println("[MQTT] Connected to HiveMQ Cloud!");
    lcdPrint("MQTT Connected", "HiveMQ Cloud");

    // Subscribe to topics
    mqttClient.subscribe(TOPIC_CONTROL);
    mqttClient.subscribe(TOPIC_WHITELIST);

    // Publish online status
    publishStatus();

    delay(1000);
    return true;
  } else {
    Serial.printf("[MQTT] Failed, rc=%d\n", mqttClient.state());
    Serial.println("[MQTT] Periksa: MQTT_SERVER, MQTT_USERNAME, MQTT_PASSWORD");
    lcdPrint("MQTT Failed!", "Cek Credentials");
    delay(2000);
    return false;
  }
}

// ============================================================
//  RFID Handler
// ============================================================

void handleRFID() {
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  String uid = rfidUIDToString(rfid.uid);
  Serial.printf("[RFID] Card detected: %s\n", uid.c_str());
  lcdPrint("RFID Detected", uid.c_str());

  if (isUIDAllowed(uid)) {
    grantAccess("RFID", uid.c_str(), "Welcome!");
  } else {
    denyAccess("RFID", uid.c_str(), "Unknown card");
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

// ============================================================
//  Fingerprint Handler
// ============================================================

void handleFingerprint() {
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK) return; // No finger present

  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) {
    Serial.println("[FINGER] Image to template failed");
    return;
  }

  p = finger.fingerSearch();
  if (p == FINGERPRINT_OK) {
    int fingerID = finger.fingerID;
    int confidence = finger.confidence;
    Serial.printf("[FINGER] Match found! ID: %d, Confidence: %d\n", fingerID, confidence);

    if (isFingerAllowed(fingerID) && confidence >= 50) {
      char uidStr[16];
      snprintf(uidStr, sizeof(uidStr), "ID:%d", fingerID);
      grantAccess("FINGERPRINT", uidStr, "Finger OK");
    } else {
      char uidStr[16];
      snprintf(uidStr, sizeof(uidStr), "ID:%d", fingerID);
      denyAccess("FINGERPRINT", uidStr, "Not authorized");
    }
  } else if (p == FINGERPRINT_NOTFOUND) {
    Serial.println("[FINGER] No match found");
    denyAccess("FINGERPRINT", "", "No match found");
  }
}

// ============================================================
//  Keypad Handler
// ============================================================

void handleKeypad() {
  char key = keypad.getKey();
  if (!key) return;

  Serial.printf("[KEYPAD] Key: %c\n", key);
  lastKeyTime = millis();

  if (key == '*') {
    // Cancel / clear input
    keypadBuffer = "";
    lcdPrint("PIN Cleared", "Enter PIN:");
    beepPing();
    return;
  }

  if (key == '#') {
    // Confirm PIN
    if (keypadBuffer.length() < 4) {
      lcdPrint("PIN too short!", "Min 4 digits");
      beepFailed();
      delay(1500);
      keypadBuffer = "";
      lcdPrint("Enter PIN:", "");
      return;
    }

    String pin = keypadBuffer;
    keypadBuffer = "";
    Serial.printf("[KEYPAD] PIN entered: %s\n", pin.c_str());

    if (isPINAllowed(pin)) {
      grantAccess("KEYPAD", pin.c_str(), "PIN OK");
    } else {
      denyAccess("KEYPAD", pin.c_str(), "Wrong PIN");
    }
    return;
  }

  // Add digit to buffer
  if (keypadBuffer.length() == 0) {
    lcdPrint("Enter PIN:", "");
  }

  keypadBuffer += key;

  // Show masked input
  String masked = "";
  for (unsigned int i = 0; i < keypadBuffer.length(); i++) masked += "*";
  lcd.setCursor(0, 1);
  lcd.print("                "); // clear line
  lcd.setCursor(0, 1);
  lcd.print(masked);
}

// ============================================================
//  Auto-lock Timer
// ============================================================

void checkAutoLock() {
  if (!isDoorLocked && doorUnlockTimer > 0) {
    if (millis() - doorUnlockTimer >= AUTO_LOCK_MS) {
      Serial.println("[AUTO-LOCK] Auto-locking door");
      setRelay(false);
      lcdPrint("Auto-Lock", "Door Secured");
      beepPing();
      publishStatus();
      doorUnlockTimer = 0;
      delay(1500);
      lcdPrint("Door: LOCKED", "Ready...");
    }
  }
}

// ============================================================
//  Keypad Timeout
// ============================================================

void checkKeypadTimeout() {
  if (keypadBuffer.length() > 0 && millis() - lastKeyTime > KEYPAD_TIMEOUT_MS) {
    Serial.println("[KEYPAD] PIN timeout, clearing");
    keypadBuffer = "";
    lcdPrint("PIN Timeout", "Cleared");
    delay(1000);
    lcdPrint(isDoorLocked ? "Door: LOCKED" : "Door: UNLOCKED", "Ready...");
  }
}

// ============================================================
//  Reconnection Handler
// ============================================================

void handleReconnect() {
  // Reconnect WiFi if needed
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastReconnectAttempt > 30000) {
      lastReconnectAttempt = millis();
      Serial.println("[WiFi] Attempting reconnect...");
      WiFi.disconnect();
      WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    }
    return;
  }

  // Reconnect MQTT if needed
  if (!mqttClient.connected()) {
    if (millis() - lastReconnectAttempt > 5000) {
      lastReconnectAttempt = millis();
      Serial.println("[MQTT] Attempting reconnect...");
      if (!connectMQTT()) {
        Serial.println("[MQTT] Reconnect failed, will retry");
      }
    }
  }
}

// ============================================================
//  Periodic Status Publish
// ============================================================

void handlePeriodicStatus() {
  if (mqttClient.connected() && millis() - lastStatusPublish > STATUS_INTERVAL_MS) {
    lastStatusPublish = millis();
    publishStatus();
  }
}

// ============================================================
//  Setup
// ============================================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n========================================");
  Serial.println("  Smart Door Lock System — ESP32");
  Serial.println("========================================");

  // Initialize GPIO
  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  setRelay(false); // Start locked
  digitalWrite(BUZZER_PIN, LOW);

  // Initialize LCD
  Wire.begin();
  lcd.init();
  lcd.backlight();
  lcdPrint("Smart Door Lock", "Initializing...");
  delay(1000);

  // Initialize SPI (RFID)
  SPI.begin();
  rfid.PCD_Init();
  rfid.PCD_DumpVersionToSerial();
  Serial.println("[RFID] RC522 initialized");

  // Initialize Fingerprint Sensor
  fpSerial.begin(57600, SERIAL_8N1, FP_RX_PIN, FP_TX_PIN);
  finger.begin(57600);
  delay(100);

  if (finger.verifyPassword()) {
    Serial.println("[FINGER] Sensor found and verified");
    lcdPrint("Fingerprint", "Sensor OK");
  } else {
    Serial.println("[FINGER] Sensor NOT found — check wiring");
    lcdPrint("Fingerprint", "SENSOR ERROR!");
  }
  delay(1000);

  // Load whitelist
  prefs.begin("smartdoor", false);
  loadSavedOrDefaultWhitelist();

  // Connect to WiFi
  connectWiFi();

  // Connect to MQTT
  if (WiFi.status() == WL_CONNECTED) {
    connectMQTT();
  }

  // Ready
  lcdPrint("Door: LOCKED", "Ready...");
  beepPing();
  Serial.println("[SETUP] System ready!");
  Serial.println("  - Tap RFID card to authenticate");
  Serial.println("  - Place finger on sensor");
  Serial.println("  - Enter PIN on keypad, press # to confirm");
}

// ============================================================
//  Main Loop
// ============================================================

void loop() {
  // Handle MQTT messages
  if (mqttClient.connected()) {
    mqttClient.loop();
  }

  // Reconnect if needed
  handleReconnect();

  // 1. Check RFID
  handleRFID();

  // 2. Check Fingerprint
  handleFingerprint();

  // 3. Check Keypad
  handleKeypad();

  // 4. Auto-lock timer
  checkAutoLock();

  // 5. Keypad timeout
  checkKeypadTimeout();

  // 6. Periodic status publish
  handlePeriodicStatus();

  delay(10); // Small delay for stability
}
