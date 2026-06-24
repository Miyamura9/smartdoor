# 🚀 Panduan Deployment: Smart Door Lock System (Internet Ready)

Dokumen ini berisi panduan *step-by-step* untuk mendeploy sistem dari awal hingga bisa didemokan di luar jaringan rumah (misalnya di kampus) menggunakan **Debian Server**, **HiveMQ Cloud (MQTT)**, dan **Cloudflared Tunnel**.

---

## 📋 Persiapan (Prerequisites)
1. **Debian Home Server** yang sudah terinstall:
   - Docker & Docker Compose
   - Node.js (versi 18+) & npm
2. **Akun HiveMQ Cloud** (Gratis)
3. **Akun Cloudflare** (Untuk Tunneling, opsional jika pakai Quick Tunnel)
4. **Hardware ESP32** dan komponen yang sudah dirangkai.

---

## Tahap 1: Setup MQTT Broker (HiveMQ Cloud)
Karena perangkat akan berada di kampus dan server di rumah, kita menggunakan **HiveMQ Cloud** sebagai jembatan penengah di internet.

1. Buka [hivemq.com/mqtt-cloud-broker](https://www.hivemq.com/mqtt-cloud-broker/) dan buat akun gratis.
2. Buat **Cluster** baru (gratis selamanya untuk 100 koneksi).
3. Salin **Cluster URL**. Contoh: `abc12345.s1.eu.hivemq.cloud`.
4. Buka menu **Access Management**, tambahkan kredensial:
   - **Username**: `esp32_admin` (contoh)
   - **Password**: `Rahasia123!` (contoh)

---

## Tahap 2: Konfigurasi & Flash ESP32
Update konfigurasi di firmware agar ESP32 bisa nyambung ke internet kampus dan HiveMQ.

1. Buka file `firmware/esp32-smart-door-lock/esp32-smart-door-lock.ino`.
2. Ubah konfigurasi WiFi ke jaringan yang akan dipakai di kampus (bisa tethering HP):
   ```cpp
   const char* WIFI_SSID     = "Hotspot_Kampus";
   const char* WIFI_PASSWORD = "PasswordHotspot";
   ```
3. Update kredensial HiveMQ sesuai dengan yang dibuat di Tahap 1:
   ```cpp
   const char* MQTT_SERVER   = "abc12345.s1.eu.hivemq.cloud";
   const int   MQTT_PORT     = 8883; // Wajib 8883 untuk MQTTS (TLS)
   const char* MQTT_USERNAME = "esp32_admin";
   const char* MQTT_PASSWORD = "Rahasia123!";
   ```
4. **Compile & Upload** ke ESP32.

---

## Tahap 3: Menjalankan Database di Server Debian
Karena kita pindah ke HiveMQ, kita hanya butuh PostgreSQL dari Docker.

1. Di server Debian, masuk ke folder project.
2. Jalankan PostgreSQL:
   ```bash
   docker-compose up -d postgres
   ```
   *(Catatan: Container `mosquitto` bawaan docker-compose boleh diabaikan atau dihapus).*

---

## Tahap 4: Setup Backend (Node.js)
1. Masuk ke folder `backend`:
   ```bash
   cd backend
   npm install
   ```
2. Buat file `.env` (atau copy dari `.env.example`) dan isi:
   ```env
   DATABASE_URL="postgresql://postgres:password_kamu@localhost:5432/smart_door_lock"
   
   MQTT_BROKER="mqtts://abc12345.s1.eu.hivemq.cloud"
   MQTT_PORT=8883
   MQTT_USERNAME="esp32_admin"
   MQTT_PASSWORD="Rahasia123!"

   PORT=5000
   FRONTEND_URL=http://localhost:3000
   ```
3. Sinkronkan database dengan Prisma:
   ```bash
   npx prisma db push
   ```
4. Jalankan Backend (Gunakan PM2 agar jalan terus di background):
   ```bash
   # Jika belum punya pm2: npm install -g pm2
   pm2 start src/index.js --name "door-backend"
   ```

---

## Tahap 5: Setup Frontend (Next.js)
1. Masuk ke folder `frontend`:
   ```bash
   cd ../frontend
   npm install
   ```
2. Buat file `.env` dan isi:
   ```env
   # Ganti dengan URL Cloudflared Backend nanti jika backend juga ditunnel. 
   # Tapi jika frontend dan backend satu server, akses lokal cukup.
   NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
   ```
3. Build dan jalankan Frontend:
   ```bash
   npm run build
   pm2 start npm --name "door-frontend" -- start
   ```
   Frontend sekarang berjalan di `http://localhost:3000`.

---

## Tahap 6: Expose ke Internet (Cloudflared Tunnel)
Agar web dashboard yang jalan di `localhost:3000` di server rumah bisa dibuka dari HP saat Anda di kampus.

### Opsi A: Quick Tunnel (Tanpa Akun, Paling Cepat)
Gunakan opsi ini jika Anda hanya ingin demo singkat (URL akan berubah setiap kali dijalankan).
```bash
cloudflared tunnel --url http://localhost:3000
```
*Cloudflared akan memberikan link acak seperti `https://xxx-yyy.trycloudflare.com`.*

### Opsi B: Persistent Tunnel (Dengan Akun Cloudflare, Disarankan)
1. Login ke Cloudflare Zero Trust Dashboard.
2. Ke menu **Networks** -> **Tunnels** -> **Create a tunnel**.
3. Pilih **Cloudflared**.
4. Beri nama (misal: `smart-door-tunnel`).
5. Copy command instalasi yang diberikan dan jalankan di terminal Debian Anda.
6. Di halaman konfigurasi Public Hostname:
   - **Subdomain**: `doorlock`
   - **Domain**: `[pilih domain Anda yang ada di Cloudflare]`
   - **Service**: `HTTP` -> `localhost:3000`
7. Save tunnel. Sekarang dashboard bisa diakses permanen via `https://doorlock.domainanda.com`.

---

## 🔍 Alur Pengujian di Kampus
1. Colok ESP32 ke power (Powerbank / Adaptor). Pastikan HP pemberi Hotspot menyala.
2. Buka URL Cloudflare (`https://doorlock...`) di browser HP atau laptop.
3. Tekan tombol **UNLOCK** di web dashboard.
4. **Alur Data yang Terjadi:**
   - HP (Kampus) -> Cloudflare Tunnel -> Frontend (Rumah)
   - Frontend (Rumah) -> Backend API (Rumah)
   - Backend API mem-publish pesan "UNLOCK" ke -> HiveMQ Cloud (Internet)
   - HiveMQ Cloud mengirim pesan "UNLOCK" ke -> ESP32 (Kampus)
   - ESP32 membuka Relay! (Terdengar bunyi "Ctek!" dan Buzzer "Tit-Tit").

**🎉 SELAMAT! SISTEM IoT ANDA SUDAH FULLY ONLINE & SIAP DEMO! 🎉**
