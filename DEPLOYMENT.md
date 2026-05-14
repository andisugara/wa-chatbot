# Panduan Deployment Server Produksi

Aplikasi WA Chatbot Agent ini telah dikonfigurasi untuk berjalan di dalam kontainer Docker menggunakan **PM2** (Backend) dan **Nginx** (Frontend), dengan desain arsitektur yang ringan via _multi-stage builds_. Keduanya berjalan dalam jaringan `msa-networks`.

## Persiapan Server

Sebelum melakukan deployment, pastikan server Anda telah ter-install:
- Docker & Docker Compose
- *Network* eksternal `msa-networks` sudah dibuat:
  ```bash
  docker network create msa-networks
  ```

## 1. Persiapan File Konfigurasi (.env)

Pastikan file `.env` berada di dalam folder `wa-chatbot-be/` dan berisi *environment variables* produksi. Contohnya:

```env
DATABASE_URL="postgresql://chatbot_user:chatbot_password@wa-chatbot-db:5432/chatbot_db?schema=public"
JWT_SECRET="rahasia_super_kuat"
FIREWORKS_API_KEY="fw_xxxx"
PORT=3000
```
> **Catatan Penting**: Karena semua layanan sekarang berjalan di dalam Docker dengan *network* yang sama (`msa-networks`), `DATABASE_URL` wajib diarahkan ke nama kontainer database yaitu `wa-chatbot-db` menggunakan *port* bawaan PostgreSQL yaitu `5432`, BUKAN `localhost:5433` (port eksternal host).

## 2. Proses Build & Deployment

Buka terminal di *root folder* proyek Anda (folder yang berisi `docker-compose.prod.yml`), lalu jalankan perintah berikut:

```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

Perintah ini akan:
1. Menjalankan *builder image* untuk Backend (`tsc` untuk *compile* TypeScript).
2. Menjalankan *builder image* untuk Frontend (`vite build` untuk *compile* Vue).
3. Membuat *image* yang sangat ringan (hanya Nginx dan Node+PM2).
4. Menyambungkan kontainer `wa-chatbot-fe`, `wa-chatbot-be`, dan `wa-chatbot-db` ke `msa-networks`.

## 3. Menjalankan Migrasi Database (Wajib untuk Instalasi Baru)
Karena *database* PostgreSQL di _server production_ masih kosong (belum ada tabel), Anda perlu menjalankan migrasi Prisma agar struktur tabel dibuat secara otomatis. Anda cukup melakukan ini **satu kali saja** setelah kontainer menyala:

Jalankan perintah berikut di terminal server Anda:
```bash
docker exec -it wa-chatbot-be npx prisma migrate deploy
```
*(Perintah ini akan membaca folder `prisma/migrations` dan mengeksekusinya ke dalam database produksi).*

## 4. Pemantauan & Manajemen

**Melihat Status Kontainer:**
```bash
docker-compose -f docker-compose.prod.yml ps
```

**Melihat Log (PM2 Backend / Nginx Frontend):**
```bash
# Log Backend (melihat status bot WA & PM2)
docker logs -f wa-chatbot-be

# Log Frontend (melihat akses web)
docker logs -f wa-chatbot-fe
```

**Restart Aplikasi:**
```bash
docker-compose -f docker-compose.prod.yml restart
```

## 5. Arsitektur Port

Berdasarkan `docker-compose.prod.yml`, aplikasi dapat diakses di server Anda melalui *port* berikut:
- **Frontend**: `http://IP_SERVER_ANDA:8098`
- **Backend API**: `http://IP_SERVER_ANDA:3000`

Jika Anda menggunakan Nginx *Reverse Proxy* (seperti Nginx Proxy Manager), Anda bisa mengarahkan domain Anda langsung ke nama kontainer (`wa-chatbot-fe` port 80 dan `wa-chatbot-be` port 3000) karena mereka berada dalam jaringan `msa-networks` yang sama.

## Manajemen Autentikasi WhatsApp
*Session* (sesi *login*) WhatsApp Web dari library Baileys akan otomatis disimpan (*mounted* via volume) ke folder `./wa-chatbot-be/wa_auth` di _host_ Anda. 
Artinya, jika Anda me-_redeploy_ atau me-_restart_ kontainer `wa-chatbot-be`, Anda **tidak perlu _scan_ QR ulang**.

Jika Anda ingin *Logout* secara paksa dari sisi *server*:
```bash
# Matikan kontainer
docker-compose -f docker-compose.prod.yml stop wa-chatbot-be

# Hapus folder auth
rm -rf ./wa-chatbot-be/wa_auth/*

# Nyalakan kembali
docker-compose -f docker-compose.prod.yml start wa-chatbot-be
```
