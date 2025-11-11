# Aplikasi Pembayaran Sekolah (README)

Panduan instalasi dan menjalankan proyek.

## 💻 Kebutuhan
* Git
* Python 3.10+
* Node.js 18+
* **MongoDB Community Server** (Pastikan servis sudah terinstal dan **berjalan**).

---

## 🚀 Backend (API)

1.  **Masuk ke folder backend & buat venv:**
    ```bash
    cd backend
    python -m venv venv
    .\venv\Scripts\activate
    ```
2.  **(Hanya Windows) Perbaikan `jq`:**
    Buka `requirements.txt` dan **hapus** baris yang berisi `jq==1.10.0`.

3.  **Instal dependensi Python:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Jalankan server (Biarkan terminal ini terbuka):**
    ```bash
    uvicorn server:app --reload
    ```
    *Backend berjalan di `http://1227.0.0.1:8000`.*

---

## 🖥️ Frontend (Aplikasi Web)

1.  **Buka Terminal BARU.**
2.  **Masuk ke folder frontend:**
    ```bash
    cd frontend
    ```
3.  **Atur Alamat API:**
    Buat *file* baru bernama `.env` di dalam folder `frontend` dan isi dengan:
    ```.env
    REACT_APP_BACKEND_URL=[http://127.0.0.1:8000](http://127.0.0.1:8000)
    ```
4.  **Instal dependensi Node.js (termasuk perbaikan):**
    Jalankan dua perintah ini secara berurutan:
    ```bash
    npm install --legacy-peer-deps
    npm install ajv@6
    ```
5.  **Jalankan server (Biarkan terminal ini terbuka):**
    ```bash
    npm run start
    ```
    *Aplikasi berjalan di `http://localhost:3000`.*

---

## 🔑 Login

Buka `http://localhost:3000` di browser Anda.

* **Username:** `admin`
* **Password:** `admin123`
<img width="1919" height="931" alt="image" src="https://github.com/user-attachments/assets/132fef0b-42fe-4b7d-aa92-a55939af9863" />
