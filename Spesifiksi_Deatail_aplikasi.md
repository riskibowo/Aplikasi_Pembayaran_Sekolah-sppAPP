# Spesifikasi Detail Aplikasi Pembayaran Sekolah (sppAPP)

Aplikasi Pembayaran Sekolah (**sppAPP**) adalah sistem manajemen keuangan sekolah berbasis *full-stack web application* yang dirancang untuk mengelola tagihan SPP (Sumbangan Pembinaan Pendidikan), konfirmasi pembayaran, pelaporan keuangan, serta dilengkapi fitur keamanan tingkat tinggi untuk mendeteksi dan mencegah serangan siber (seperti brute-force).

---

## 🛠️ Arsitektur & Teknologi (Tech Stack)

### Backend (API Server)
* **Framework Utama**: FastAPI (Python 3.10+) - Menghasilkan performa tinggi, dokumentasi OpenAPI otomatis, dan dukungan asinkronus penuh.
* **Database**: MongoDB Community Server dengan **Motor** (Async MongoDB Driver).
* **Autentikasi & Otorisasi**: JWT (*JSON Web Tokens*) dengan algoritma `HS256`, dikombinasikan dengan hashing password menggunakan **Bcrypt** (via Passlib).
* **Penyimpanan Berkas**: 
  * Penyimpanan lokal (folder `uploads` & `receipts`).
  * Integrasi **Google Drive API (OAuth2)** untuk penyimpanan awan (cloud) bukti pembayaran siswa agar aman dan mudah diakses via tautan publik.
* **Dokumen Generator**:
  * **ReportLab** untuk membuat Kuitansi PDF (format Half-Letter Landscape) dan Laporan PDF.
  * **Pandas & Openpyxl** untuk mengimpor dan mengekspor Laporan Keuangan ke format Excel (`.xlsx`).
* **Pengujian Keamanan**: **Locust** untuk simulasi uji ketahanan brute-force.

### Frontend (User Interface)
* **Framework Utama**: React.js (Node.js 18+) dengan arsitektur berbasis komponen.
* **Styling**: Vanilla CSS dikombinasikan dengan **Tailwind CSS** (dikonfigurasi via Craco) untuk antarmuka yang modern, responsif, dan dinamis.
* **Komunikasi Real-time**: **WebSockets** untuk *online presence tracking* dan transmisi log aktivitas serta log keamanan secara instan (*real-time*).
* **State & Env Management**: Konfigurasi variabel lingkungan melalui berkas `.env`.

---

## 👥 Hak Akses & Fitur Pengguna (Role-based Features)

Sistem ini membagi akses menjadi 4 peran utama untuk menjaga integritas data dan keamanan operasional:

### 1. Siswa (Student)
Hak akses khusus bagi siswa untuk melakukan administrasi mandiri:
* **Dashboard Siswa**: Menampilkan ringkasan tagihan yang belum dibayar dan riwayat pembayaran terbaru.
* **Informasi Tagihan**: Melihat tagihan bulanan detail yang aktif.
* **Metode Pembayaran**: Melakukan konfirmasi pembayaran transfer bank dengan memasukkan data pengirim (Nama Pengirim, Bank Asal) serta mengunggah bukti transfer (foto/screenshot).
* **Status Transaksi**: Memantau status bukti transfer secara berkala (`Pending`, `Lunas`, atau `Ditolak`).
* **Profil**: Mengelola data pribadi siswa dan foto profil.

### 2. Admin (Petugas Keuangan)
Hak akses operasional sekolah untuk mengelola data master keuangan dan siswa:
* **Dashboard Admin**: Menyajikan grafik statistik total pendapatan bulanan/tahunan, nominal tunggakan SPP, serta bagan visualisasi data.
* **Manajemen Kelas**: CRUD data kelas beserta penetapan nominal tarif SPP untuk masing-masing kelas.
* **Manajemen Siswa**: CRUD data siswa lengkap (NIS, Nama, Kelas, Angkatan, No. WhatsApp, Akun Login).
* **Pembuatan Tagihan (Generate Bills)**: Membuat tagihan SPP secara otomatis dan massal untuk bulan/tahun tertentu berdasarkan tarif kelas masing-masing siswa.
* **Verifikasi Pembayaran**: Memvalidasi bukti transfer yang diunggah siswa. Admin dapat menyetujui transaksi (mengubah status menjadi `Lunas` dan otomatis memperbarui tagihan) atau menolak jika bukti tidak sah.
* **Cetak Kuitansi Resmi**: Menghasilkan dokumen kuitansi digital instan dalam format PDF berdesain struk kasir (*Half-Letter Landscape* menggunakan font monospace *Courier*).
* **Eksportir Laporan**: Menghasilkan dan mengunduh laporan keuangan harian, bulanan, tahunan, rekapitulasi kelas, rekapitulasi angkatan, serta daftar penunggak dalam format **PDF** dan **Excel (.xlsx)**.
* **Profil Sekolah**: Mengatur informasi sekolah (nama, alamat, logo) dan nomor rekening bank sekolah untuk tujuan transfer pembayaran.

### 3. Kepala Sekolah (Kepsek)
Hak akses pemantauan (*read-only*) untuk transparansi keuangan:
* **Dashboard Statistik**: Memantau grafik pendapatan sekolah dan memproyeksikan sisa tunggakan yang perlu ditagih.
* **Laporan Keuangan**: Mengakses seluruh fitur laporan keuangan (tahunan, bulanan, harian, rekap) dan mengekspornya ke PDF/Excel, namun tanpa izin memodifikasi data siswa, kelas, atau transaksi pembayaran.

### 4. Master Administrator (Super Admin)
Hak akses sistem tertinggi untuk pemeliharaan infrastruktur dan keamanan:
* **Dashboard Master**: Menyajikan visualisasi pengguna aktif (*online*), log aktivitas, dan status keamanan server.
* **Manajemen Staf**: CRUD akun pengguna untuk staf ber-role Admin atau Kepala Sekolah.
* **Security Monitoring & Traffic Login**: Memantau log masuk secara langsung (*real-time WebSocket feeds*).
* **Manajemen Keamanan (Ban/Unban)**:
  * Memblokir (*Ban*) atau mengaktifkan kembali (*Unban*) pengguna secara manual.
  * Mengelola daftar hitam IP (*Blocked IPs*) untuk memblokir akses komputer penyerang ke API.
  * Menghapus log keamanan lama untuk mengoptimalkan database.

---

## 🔒 Sistem Keamanan Tingkat Lanjut (Security Mechanism)

Aplikasi ini dilengkapi dengan modul keamanan otomatis pada *auth endpoint* untuk mendeteksi *Cyber Attack* (khususnya brute-force):

| Kriteria Deteksi | Tindakan Sistem | Penjelasan Teknis |
| :--- | :--- | :--- |
| **Aktivitas Mencurigakan** | Ditandai `is_suspicious = True` | Jika sebuah alamat IP melakukan **>= 5 kali kegagalan login** dalam kurun waktu 5 menit. |
| **Auto-Ban Akun** | Menonaktifkan Akun (`is_active = False`) | Jika percobaan login gagal berlanjut hingga **>= 10 kali** pada satu akun, sistem otomatis menonaktifkan akun tersebut demi melindungi data pengguna. |
| **Global IP Block** | Blokir Permanen IP (`blocked_ips`) | Jika IP yang sama melakukan **>= 20 kali kegagalan login** dalam 10 menit, sistem secara otomatis memasukkan IP tersebut ke daftar blokir permanen. IP terblokir tidak akan bisa mengakses endpoint API apa pun. |

> [!NOTE]
> Semua kejadian keamanan di atas akan langsung ditransmisikan secara *real-time* ke dasbor Master Administrator melalui WebSocket sehingga administrator dapat mengambil tindakan pencegahan secara cepat.

---

## 🗄️ Skema Koleksi Database (MongoDB Collections)

Aplikasi menggunakan database MongoDB dengan beberapa koleksi utama sebagai berikut:
1. `users`: Menyimpan kredensial staf (Admin, Kepsek, Master).
2. `students`: Menyimpan data profil siswa dan kredensial login siswa.
3. `classes`: Menyimpan daftar kelas dan nominal SPP bulanan kelas tersebut.
4. `bills`: Menyimpan tagihan bulanan siswa (Bulan, Tahun, Nominal, Status Pembayaran).
5. `payments`: Menyimpan transaksi pembayaran, metode pembayaran, bank asal, nama pengirim, dan jalur berkas bukti transfer.
6. `school_profile`: Menyimpan data profil sekolah dan informasi rekening tujuan pembayaran.
7. `login_logs`: Menyimpan catatan lalu lintas login (IP, User Agent, Status, Deteksi Suspicious).
8. `activity_logs`: Menyimpan jejak audit (*audit trail*) tindakan pengguna (operasi CRUD, transaksi, dll.).
9. `blocked_ips`: Menyimpan daftar alamat IP yang diblokir oleh sistem karena aktivitas berbahaya.
