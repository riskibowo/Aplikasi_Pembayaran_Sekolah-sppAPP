Aplikasi Pembayaran Sekolah
Ini adalah aplikasi SPP (Pembayaran Sekolah) full-stack yang dibangun menggunakan React (Frontend) dan FastAPI (Backend) dengan database MongoDB.

🚀 Kebutuhan Sistem
Sebelum memulai, pastikan Anda telah menginstal perangkat lunak berikut:

Python (versi 3.10+)

Node.js (versi 18+)

Git

MongoDB Community Server (Wajib terinstal dan servisnya berjalan)

⚙️ Instalasi dan Menjalankan Proyek
1. Kloning Repositori
Bash

git clone https://github.com/riskibowo/Aplikasi_Pembayaran_Sekolah.git
cd Aplikasi_Pembayaran_Sekolah
2. Backend (FastAPI & MongoDB)
Navigasi ke folder backend

Bash

cd backend
Buat dan aktifkan virtual environment

Bash

# Membuat venv
python -m venv venv

# Mengaktifkan venv (Windows)
.\venv\Scripts\activate
Instal dependensi

Catatan Windows: Instalasi mungkin gagal pada paket jq. Jika ya, buka file requirements.txt, hapus baris jq==1.10.0, simpan, lalu jalankan perintah di bawah ini.

Bash

pip install -r requirements.txt
Pastikan MongoDB Berjalan Pastikan servis MongoDB Anda sudah berjalan (dapat diperiksa melalui aplikasi Services di Windows).

Jalankan server backend File utama dalam proyek ini adalah server.py.

Bash

uvicorn server:app --reload
Server backend akan berjalan di http://127.0.0.1:8000. Biarkan terminal ini tetap terbuka.

3. Frontend (React)
Buka terminal BARU (Biarkan terminal backend tetap berjalan).

Navigasi ke folder frontend

Bash

# (Jika Anda di folder 'backend', keluar dulu)
# cd ..
cd frontend
Konfigurasi Alamat API (PENTING) Buat file baru di dalam folder frontend bernama .env. Salin dan tempelkan baris berikut ke dalamnya. Ini untuk memberitahu frontend agar terhubung ke backend lokal Anda, bukan ke server online.

Cuplikan kode

REACT_APP_BACKEND_URL=http://127.0.0.1:8000
Instal dependensi Node.js Proyek ini memiliki beberapa konflik dependensi. Gunakan --legacy-peer-deps untuk mengabaikannya.

Bash

npm install --legacy-peer-deps
Perbaikan Error ajv Setelah instalasi, jalankan perintah ini untuk memperbaiki masalah kompatibilitas ajv yang dapat menyebabkan aplikasi crash.

Bash

npm install ajv@6
Jalankan server frontend

Bash

npm run start
Server frontend akan berjalan di http://localhost:3000.

🔑 Menggunakan Aplikasi
Akses Frontend: Buka http://localhost:3000 di browser Anda.

Akun Admin: Saat pertama kali dijalankan, backend akan secara otomatis membuat akun admin di database MongoDB (spp_db).

Gunakan kredensial berikut untuk login:

Username: admin

Password: admin123