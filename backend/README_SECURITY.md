# Panduan Simulasi Keamanan (Brute-Force Attack)

Dokumen ini menjelaskan cara menjalankan simulasi serangan brute-force untuk menguji fitur **Auto-Ban** dan **Suspicious Activity Monitoring** pada Sistem Pembayaran Sekolah (sppAPP).

## Prasyarat
- Python 3.x terinstal.
- Virtual Environment (`venv`) sudah terkonfigurasi di folder `backend`.
- Semua dependensi (`fastapi`, `uvicorn`, `locust`, `websockets`) sudah terinstal.

## Langkah-langkah Menjalankan Simulasi

### 1. Jalankan Backend Server
Buka terminal baru di folder `backend`, aktifkan venv, lalu jalankan server:
```powershell
.\venv\Scripts\activate
uvicorn server:app --reload
```
*Pastikan server berjalan di http://localhost:8000.*

### 2. Jalankan Simulasi Locust (Mode Web UI)
Buka terminal kedua di folder `backend`, aktifkan venv, lalu jalankan Locust:
```powershell
.\venv\Scripts\activate
locust -f locustfile.py --host http://localhost:8000
```
- Buka browser di: **[http://localhost:8089](http://localhost:8089)**
- Masukkan jumlah user (contoh: 10) dan spawn rate (contoh: 2).
- Klik **Start Swarming**.

### 3. Jalankan Simulasi Locust (Mode Headless/Terminal)
Jika ingin menjalankan langsung di terminal tanpa membuka browser:
```powershell
.\venv\Scripts\activate
locust -f locustfile.py --headless -u 10 -r 2 --run-time 1m --host http://localhost:8000
```

## Apa yang Diuji?
1. **Suspicious Activity**: Jika 1 IP melakukan >5 kegagalan login dalam 5 menit, sistem akan mencatatnya sebagai aktivitas mencurigakan.
2. **Auto-Ban**: Jika kegagalan login berlanjut hingga >10 kali, akun yang ditargetkan akan otomatis **Dinonaktifkan (is_active = False)**.
3. **WebSocket Monitoring**: Fitur real-time akan tetap mencatat log aktivitas serangan ke dashboard Admin/Master secara instan.

## Cara Melihat Hasil
- Cek tab **Failures** di Web UI Locust.
- Lihat output terminal **uvicorn** untuk pesan `[ACTIVITY] ... AKUN DIBANNED OTOMATIS`.
- Periksa dashboard master pada bagian **Security Logs**.
