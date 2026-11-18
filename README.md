# Smart Recipe Generator
**Aplikasi Web Pembuat Resep dari Bahan di Kulkas Berbasis Large Language Model (Gemini AI)**

Smart Recipe Generator adalah aplikasi web full-stack yang mengimplementasikan metodologi **Spec-Driven Execution** dalam kerangka kerja **Agile (Scrum)**. Aplikasi ini memungkinkan pengguna memasukkan bahan makanan yang ada di kulkas, menetapkan waktu memasak maksimal, dan memilih pantangan/alergi makanan. Spesifikasi masukan diperlakukan sebagai **kontrak ketat**, dieksekusi melalui template prompt statis ke Google Gemini API, dan keluarannya diverifikasi kepatuhannya oleh sistem validasi berlapis sebelum disajikan kepada pengguna.

---

## 🌟 Fitur Utama (F-01 s.d. F-10)

1. **F-01: Akun Pengguna**
   - Registrasi akun baru dengan enkripsi kata sandi menggunakan `bcrypt` (cost $\ge$ 10).
   - Login dengan cookie sesi aman (`HttpOnly`, `SameSite=Lax`, masa kedaluwarsa 60 menit).
   - Dialog konfirmasi sebelum keluar (logout) dan pembersihan sesi server.
2. **F-02: Formulir Spesifikasi Resep**
   - Masukan bahan utama dinamis berbentuk chip interaktif (dapat ditambah via koma/Enter dan dihapus via tombol silang).
   - Batas waktu memasak 5–180 menit dengan sinkronisasi slider dan input angka.
   - Pilihan pantangan cepat (tanpa kacang, tanpa susu, tanpa telur, tanpa seafood, tanpa gluten, rendah karbo, vegetarian) serta masukan pantangan kustom.
   - Tombol **"Isi Contoh"** (ayam, telur, bawang merah; 30 menit; tanpa kacang).
3. **F-03: Validasi & Deteksi Konflik Spesifikasi**
   - Validasi ganda (sisi klien dan sisi server) menggunakan modul bersama `shared/specValidator.js`.
   - Deteksi konflik otomatis antara bahan utama dan pantangan (misal: memasukkan *telur* bersamaan dengan pantangan *tanpa telur*). Tombol dinonaktifkan saat terjadi konflik.
4. **F-04: Eksekusi AI Terstruktur**
   - Memanfaatkan Google Gemini API dengan model keluarga **Gemini Flash**.
   - Template prompt statis dengan pemisah pembatas `<<< >>>` untuk mencegah injeksi prompt.
   - Respon terstruktur format JSON dengan skema baku (`RecipeResult`).
5. **F-05: Validasi Kepatuhan & Percobaan Ulang (Retry Mechanism)**
   - Validasi skema JSON keluaran AI menggunakan `Ajv`.
   - Validasi kepatuhan bahan (V-02: hanya bahan pengguna + bahan dasar dapur).
   - Validasi kepatuhan waktu (V-03: estimasi waktu $\le$ waktu maksimal).
   - Validasi bebas pantangan (V-04: tidak ada alergen di bahan maupun langkah memasak).
   - Maksimal 3 kali percobaan per permintaan. Catatan pelanggaran disertakan ke prompt berikutnya untuk koreksi otomatis.
6. **F-06: Tampilan Hasil Resep & Lencana Kepatuhan**
   - Menampilkan judul, estimasi waktu, daftar bahan dengan takaran, dan langkah memasak bernomor.
   - Tiga lencana kepatuhan bercentang: *"Waktu ≤ X menit"*, *"Hanya bahan yang diizinkan"*, dan *"Bebas pantangan"*.
   - Checkbox interaktif pada bahan dan langkah memasak untuk memantau proses memasak.
   - Label khusus `(bahan dasar)` pada bahan dapur umum (garam, gula, merica, minyak, air).
7. **F-07: Buat Ulang Resep (Regenerate)**
   - Meminta resep alternatif dari spesifikasi yang sama.
   - Judul resep sebelumnya dimasukkan ke dalam daftar hindari agar AI menghasilkan variasi baru.
8. **F-08: Pembatas Permintaan (Rate Limiting)**
   - Pembatasan pembuatan resep maksimal 10 permintaan per menit per alamat IP.
   - Pembatasan percobaan login gagal maksimal 5 kali per 15 menit per alamat IP.
9. **F-09: Simpan Resep**
   - Pengguna terdaftar dapat menyimpan resep ke basis data.
   - Pencegahan resep duplikat untuk pengguna yang sama.
   - Pengguna tamu (guest) yang menekan Simpan diarahkan ke halaman Login dengan resep tersimpan sementara di `sessionStorage` peramban.
10. **F-10: Resep Saya**
    - Halaman daftar resep tersimpan yang diurutkan dari yang terbaru.
    - Pencarian instan (*case-insensitive*) mencocokkan judul atau nama bahan masakan.
    - Halaman detail resep lengkap dengan spesifikasi awal yang digunakan.
    - Dialog konfirmasi sebelum penghapusan resep.
    - **Isolasi Data Antarpengguna (Multi-tenant Security):** Percobaan membuka atau menghapus id resep milik pengguna lain selalu menghasilkan respon `HTTP 404 Resep tidak ditemukan`.

---

## 🏗️ Arsitektur Sistem Tiga Lapis

```
[LAPIS PRESENTASI]
HalamanBeranda, HalamanAuth, HalamanResepSaya, DetailResep
(HTML5, CSS3 / Bootstrap 5, JavaScript ES6)
                      │
                      ▼ HTTPS / REST JSON
[LAPIS APLIKASI]
Express.js Router & Middleware (Helmet, Session, RateLimit)
Controllers: AuthController, RecipeController, SavedRecipeController
Services: PromptBuilder, GeminiService, OutputValidator (Ajv)
Shared: SpecRules, SpecValidator
                      │
                      ▼ Parameterized SQL / mysql2
[LAPIS DATA & AI]
MySQL 8 (Tabel `users`, `saved_recipes`) & Google Gemini API
```

---

## 📁 Struktur Direktori Proyek

```
smart-recipe-generator/
├── public/                     # Boundary / Lapis Presentasi (Web)
│   ├── index.html              # Halaman Beranda (Formulir + Hasil Resep)
│   ├── login.html              # Halaman Masuk
│   ├── register.html           # Halaman Pendaftaran
│   ├── resep-saya.html         # Halaman Daftar Resep Tersimpan
│   ├── detail.html             # Halaman Detail Resep
│   ├── css/
│   │   └── style.css           # Kustomisasi gaya dan tema kuliner
│   └── js/
│       ├── api.js              # Klien HTTP Fetch terpusat
│       ├── auth.js             # Logika halaman login & register
│       ├── beranda.js          # Logika formulir, chip, & generator resep
│       └── resep-saya.js       # Logika daftar resep, pencarian, & detail
├── shared/                     # Spesifikasi sebagai Kode (Klien & Server)
│   ├── spec-rules.js           # Konfigurasi bahan dasar, batas, & peta pantangan
│   └── specValidator.js        # Validasi BR-01..BR-03 & Deteksi Konflik BR-04
├── src/                        # Control / Lapis Aplikasi (Back-End)
│   ├── app.js                  # Konfigurasi Express, middleware, & rute
│   ├── server.js               # Entry point server web
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── recipeController.js
│   │   └── savedRecipeController.js
│   ├── models/
│   │   ├── user.js             # Entity User (Kueri terparameter)
│   │   └── savedRecipe.js      # Entity SavedRecipe (Kueri terparameter)
│   ├── middleware/
│   │   ├── rateLimit.js        # Pembatas permintaan BR-11 & BR-13
│   │   └── requireLogin.js     # Penjaga otorisasi sesi
│   ├── services/
│   │   ├── gemini.js           # Integrasi Google Gemini API
│   │   ├── promptBuilder.js    # Penyusun prompt statis BR-08
│   │   └── outputValidator.js  # Validasi skema & kepatuhan V-01..V-05
│   ├── schemas/
│   │   └── recipeResult.schema.json # JSON Schema RecipeResult
│   └── db/
│       └── db.js               # Abstraksi koneksi MySQL & adapter fallback
├── db/
│   └── schema.sql              # Skrip DDL tabel users & saved_recipes
├── tests/                      # Rangkaian Pengujian Otomatis
│   ├── specValidator.test.js   # Unit test logika spesifikasi (BR-01..BR-04)
│   ├── outputValidator.test.js # Unit test validator kepatuhan keluaran AI
│   ├── promptBuilder.test.js   # Unit test penyusunan template prompt
│   ├── api.test.js             # Uji integrasi endpoint API (TC-01..TC-46)
│   ├── compliance.test.js      # Uji skenario kepatuhan AI (SK-01..SK-10)
│   └── security.test.js        # Uji keamanan (SQLi, XSS, Prompt Injection, Sesi)
├── .env.example                # Template konfigurasi variabel lingkungan
├── .gitignore
├── package.json
└── README.md
```

---

## ⚙️ Persyaratan Sistem & Lingkungan

- **Node.js**: versi 20 LTS atau lebih baru (v20+ / v24+ didukung).
- **npm**: versi 10+ / 11+.
- **MySQL**: versi 8.0+ (Opsional saat pengujian/demo mandiri karena sistem dilengkapi dengan in-memory adapter otomatis).
- **Google Gemini API Key**: Dapatkan kunci dari Google AI Studio.

---

## 🚀 Panduan Instalasi dan Menjalankan Aplikasi

### 1. Kloning Repositori & Instal Dependensi
```bash
cd "c:\Users\User\Documents\Final Project Soft-Eng"
npm install
```

### 2. Konfigurasi Variabel Lingkungan (.env)
Salin berkas `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Buka berkas `.env` dan sesuaikan nilainya:
```env
PORT=3000
NODE_ENV=development
SESSION_SECRET=smart_recipe_generator_secret_key_change_in_production

# Kunci API Google Gemini
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-1.5-flash

# Konfigurasi MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=smart_recipe_db
```

### 3. Inisialisasi Basis Data MySQL
Buka MySQL CLI atau phpMyAdmin / Workbench, lalu jalankan skrip `db/schema.sql`:
```bash
mysql -u root -p < db/schema.sql
```

### 4. Menjalankan Server Aplikasi
Jalankan aplikasi dengan perintah:
```bash
npm start
```
Akses aplikasi melalui peramban: **`http://localhost:3000`**

---

## 🧪 Panduan Menjalankan Pengujian

Aplikasi ini dilengkapi rangkaian uji otomatis menggunakan **Jest** dan **Supertest** yang mencakup:
- **Unit Tests**: Menguji normalisasi masukan, validasi spesifikasi, deteksi konflik, skema JSON, dan validator kepatuhan.
- **Integration Tests (API)**: Menguji semua endpoint autentikasi, pembuatan resep, percobaan ulang AI, dan manajemen resep tersimpan.
- **Compliance Tests**: Menguji 10 skenario spesifikasi (SK-01 s.d. SK-10).
- **Security Tests**: Menguji ketahanan terhadap SQL Injection, XSS, Prompt Injection, proteksi kebocoran API Key, dan keamanan cookie sesi.

Jalankan seluruh pengujian dan laporan cakupan kode:
```bash
npm test
```

---

## 🛡️ Keamanan & Privasi

1. **Enkripsi Kata Sandi**: Menggunakan `bcrypt` dengan cost factor 10, kata sandi plain-text tidak pernah disimpan.
2. **Keamanan Sesi**: Sesi disimpan dengan cookie `HttpOnly` dan `SameSite=Lax` untuk mencegah pencurian sesi via skrip berbahaya.
3. **Kueri Terparameter**: Semua kueri SQL menggunakan parameterized queries (`?`) untuk mencegah serangan SQL Injection.
4. **Pencegahan XSS**: Seluruh keluaran teks pengguna dan resep dirender menggunakan `textContent` pada DOM (bukan `innerHTML`).
5. **Mitigasi Prompt Injection**: Masukan pengguna dibungkus dengan pembatas `<<< >>>` dan instruksi model secara eksplisit menyatakan bahwa teks di dalam pembatas adalah data dan bukan perintah.
6. **Perlindungan Kunci API**: Kunci `GEMINI_API_KEY` hanya berada di berkas `.env` sisi server dan tidak pernah dikirim ke kode klien atau dicatat dalam log publik.
7. **Privasi Pengguna**: Hanya nama, email, dan hash kata sandi yang disimpan. Identitas pengguna tidak pernah dikirim ke Google Gemini API (hanya data `RecipeSpec`).
8. **Isolasi Data**: Setiap operasi resep tersimpan diverifikasi secara ketat berdasarkan `user_id` sesi pengguna.
