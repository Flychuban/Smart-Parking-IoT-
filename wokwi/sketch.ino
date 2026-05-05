// Smart Parking — ESP32 sketch with on-board LED diagnostic.
// LED on GPIO 2 acts as a visible "Serial Monitor replacement":
//   off                    -> just booted
//   slow blink (1Hz)       -> WiFi connecting
//   solid ON               -> WiFi connected, idle
//   3 short fast blinks    -> POST succeeded (HTTP 2xx)
//   5 long slow blinks     -> POST failed (negative error or non-2xx)
//   single brief flash     -> heartbeat (loop is alive)

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

// ====== CONFIG ======
const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASS = "";

// EDIT ME: current ngrok URL (it changes every restart). Must be HTTPS.
const char* SERVER_URL = "some-ngrok-server/api/sensor";

// Public smoke-test endpoint (always 200). Used at boot to prove the ESP32
// can reach the open internet over HTTPS at all, independent of ngrok.
const char* SMOKE_URL  = "https://httpbin.org/post";

#define NUM_SENSORS 4
#define OCCUPIED_THRESHOLD_CM 50.0
#define LOOP_DELAY_MS 1000
#define LED_PIN 2

const int TRIG_PINS[NUM_SENSORS] = {5, 18, 21, 23};
const int ECHO_PINS[NUM_SENSORS] = {4, 19, 22, 25};
const char* SENSOR_IDS[NUM_SENSORS] = {"A1", "A2", "B1", "B2"};

bool lastState[NUM_SENSORS]   = {false, false, false, false};
bool initialized[NUM_SENSORS] = {false, false, false, false};

// ---- LED helpers ------------------------------------------------------------
void ledOn()  { digitalWrite(LED_PIN, HIGH); }
void ledOff() { digitalWrite(LED_PIN, LOW); }

void ledBlink(int times, int onMs, int offMs) {
  for (int i = 0; i < times; i++) {
    ledOn();  delay(onMs);
    ledOff(); delay(offMs);
  }
}

void signalSuccess() { ledBlink(3, 80, 80);  ledOn(); }
void signalFailure() { ledBlink(5, 300, 200); ledOn(); }
void signalHeartbeat() { ledOff(); delay(40); ledOn(); }

// ---- Sensor reading ---------------------------------------------------------
float singleMeasurement(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH, 30000);
  if (duration == 0) return 999.0;
  return duration * 0.0343 / 2.0;
}

float medianFilter(int trigPin, int echoPin) {
  float a = singleMeasurement(trigPin, echoPin); delay(30);
  float b = singleMeasurement(trigPin, echoPin); delay(30);
  float c = singleMeasurement(trigPin, echoPin);
  if ((a >= b && a <= c) || (a <= b && a >= c)) return a;
  if ((b >= a && b <= c) || (b <= a && b >= c)) return b;
  return c;
}

// ---- HTTP -------------------------------------------------------------------
// Returns the HTTP status code (positive = real status, negative = client error).
int httpsPost(const char* url, const String& body) {
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  if (!http.begin(client, url)) {
    Serial.println("http.begin() failed");
    return -1000;
  }
  http.addHeader("Content-Type", "application/json");
  http.addHeader("ngrok-skip-browser-warning", "true");
  http.setTimeout(8000);

  Serial.print(">> POST ");
  Serial.print(url);
  Serial.print(" body=");
  Serial.println(body);

  int code = http.POST(body);
  Serial.print("<< HTTP ");
  Serial.println(code);
  if (code > 0) {
    String resp = http.getString();
    if (resp.length() > 200) resp = resp.substring(0, 200) + "...";
    Serial.print("   body: ");
    Serial.println(resp);
  } else {
    Serial.print("   error: ");
    Serial.println(http.errorToString(code));
  }
  http.end();
  return code;
}

void sendStatusUpdate(const char* sensorId, bool occupied, float distance) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected — skipping POST");
    signalFailure();
    return;
  }

  String payload = "{\"sensor_id\":\"";
  payload += sensorId;
  payload += "\",\"status\":\"";
  payload += (occupied ? "OCCUPIED" : "FREE");
  payload += "\",\"distance_cm\":";
  payload += String(distance, 1);
  payload += "}";

  int code = httpsPost(SERVER_URL, payload);
  if (code >= 200 && code < 300) signalSuccess();
  else                            signalFailure();
}

// ---- Setup ------------------------------------------------------------------
void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  ledOff();
  delay(150);
  Serial.println("\n=== Smart Parking System ===");

  for (int i = 0; i < NUM_SENSORS; i++) {
    pinMode(TRIG_PINS[i], OUTPUT);
    pinMode(ECHO_PINS[i], INPUT);
    digitalWrite(TRIG_PINS[i], LOW);
  }

  Serial.print("Connecting to WiFi: "); Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  unsigned long t0 = millis();
  while (WiFi.status() != WL_CONNECTED) {
    ledBlink(1, 200, 800);   // slow blink while connecting
    Serial.print(".");
    if (millis() - t0 > 30000) {
      Serial.println(" WiFi timeout, retrying");
      WiFi.disconnect(); delay(200);
      WiFi.begin(WIFI_SSID, WIFI_PASS);
      t0 = millis();
    }
  }
  ledOn();
  Serial.println();
  Serial.print("WiFi up. IP: "); Serial.println(WiFi.localIP());

  // ---- BOOT SELF-TEST -------------------------------------------------------
  // (1) Generic HTTPS smoke test against httpbin.org. If this fails, the ESP32
  //     can't do TLS at all -> Wokwi network issue, NOT our code.
  Serial.println("[boot] smoke test -> httpbin.org");
  int smoke = httpsPost(SMOKE_URL, "{\"hello\":\"world\"}");
  if (smoke >= 200 && smoke < 300) {
    Serial.println("[boot] smoke test OK");
    signalSuccess();
  } else {
    Serial.println("[boot] smoke test FAILED — generic HTTPS broken");
    signalFailure();
  }
  delay(800);

  // (2) Boot ping to the ngrok server. Lets us see immediately whether ngrok
  //     is reachable, before any sensor reading happens.
  Serial.println("[boot] ping -> ngrok");
  int ping = httpsPost(SERVER_URL,
    "{\"sensor_id\":\"A1\",\"status\":\"FREE\",\"distance_cm\":99}");
  if (ping >= 200 && ping < 300) {
    Serial.println("[boot] ngrok ping OK");
    signalSuccess();
  } else {
    Serial.println("[boot] ngrok ping FAILED");
    signalFailure();
  }
  delay(800);
  ledOn();
}

// ---- Loop -------------------------------------------------------------------
void loop() {
  signalHeartbeat();  // brief LED dip every cycle so we know loop is running

  for (int i = 0; i < NUM_SENSORS; i++) {
    float dist = medianFilter(TRIG_PINS[i], ECHO_PINS[i]);
    bool occupied = dist < OCCUPIED_THRESHOLD_CM;

    if (!initialized[i] || occupied != lastState[i]) {
      Serial.print("["); Serial.print(SENSOR_IDS[i]);
      Serial.print("] dist="); Serial.print(dist);
      Serial.print(" cm -> "); Serial.println(occupied ? "OCCUPIED" : "FREE");
      sendStatusUpdate(SENSOR_IDS[i], occupied, dist);
      lastState[i] = occupied;
      initialized[i] = true;
    }
  }
  delay(LOOP_DELAY_MS);
}
