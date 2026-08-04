import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
import uuid
from datetime import datetime, timezone, timedelta
import calendar

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

async def seed_data():
    print("Memulai proses seeding data...")

    # 1. Update School Profile
    print("Mengupdate profil sekolah...")
    await db.school_profile.update_one(
        {"id": "main_profile"},
        {"$set": {
            "bank_nama": "-",
            "bank_rekening": "-",
            "bank_atas_nama": "-"
        }}
    )

    # 2. Ambil data kelas untuk nominal
    classes = await db.classes.find({}).to_list(None)
    class_nominal_map = {c["nama_kelas"]: c.get("nominal_spp", 500000) for c in classes}

    # 3. Ambil semua siswa
    students = await db.students.find({}).to_list(None)
    print(f"Ditemukan {len(students)} siswa. Membuat tagihan dan pembayaran...")

    months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]
    years = [2024, 2025, 2026]

    new_bills = []
    new_payments = []

    for student in students:
        student_id = student["id"]
        nominal_spp = class_nominal_map.get(student.get("kelas"), 500000)

        for year in years:
            for month_idx, month_name in enumerate(months):
                month_num = month_idx + 1
                
                # Buat id tagihan unik
                bill_id = str(uuid.uuid4())
                
                # Tentukan status tagihan
                if year == 2024 or year == 2025:
                    status_bill = "lunas"
                elif year == 2026:
                    if month_num <= 7:
                        status_bill = "lunas"
                    elif month_num == 8:
                        status_bill = "menunggu_konfirmasi"
                    else:
                        status_bill = "belum"
                else:
                    status_bill = "belum"

                # Buat dummy created_at (sekitar awal bulan)
                created_at = datetime(year, month_num, 5, 8, 0, tzinfo=timezone.utc).isoformat()

                bill = {
                    "id": bill_id,
                    "id_siswa": student_id,
                    "bulan": month_name,
                    "tahun": year,
                    "jumlah": nominal_spp,
                    "status": status_bill,
                    "created_at": created_at
                }
                new_bills.append(bill)

                # Jika lunas, buat payment
                if status_bill == "lunas":
                    payment_id = str(uuid.uuid4())
                    # Tanggal bayar = beberapa hari setelah tagihan dibuat
                    payment_date = datetime(year, month_num, 10, 10, 30, tzinfo=timezone.utc).isoformat()
                    payment = {
                        "id": payment_id,
                        "id_tagihan": bill_id,
                        "id_siswa": student_id,
                        "tanggal_bayar": payment_date,
                        "metode": "langsung",
                        "jumlah": nominal_spp,
                        "status": "verified",
                        "receipt_path": None,
                        "nama_pengirim": "-",
                        "bank_asal": "-"
                    }
                    new_payments.append(payment)
                elif status_bill == "menunggu_konfirmasi":
                    payment_id = str(uuid.uuid4())
                    payment_date = datetime(year, month_num, 15, 14, 00, tzinfo=timezone.utc).isoformat()
                    payment = {
                        "id": payment_id,
                        "id_tagihan": bill_id,
                        "id_siswa": student_id,
                        "tanggal_bayar": payment_date,
                        "metode": "langsung",
                        "jumlah": nominal_spp,
                        "status": "pending",
                        "receipt_path": None,
                        "nama_pengirim": "-",
                        "bank_asal": "-"
                    }
                    new_payments.append(payment)

    print(f"Total tagihan dibuat: {len(new_bills)}")
    print(f"Total pembayaran dibuat: {len(new_payments)}")
    
    # Hapus data bills/payments lama jika perlu (Opsional, di sini kita langsung masukan)
    print("Menghapus data tagihan dan pembayaran lama...")
    await db.bills.delete_many({})
    await db.payments.delete_many({})

    print("Memasukkan data ke MongoDB (Mohon tunggu sebentar)...")
    batch_size = 10000
    for i in range(0, len(new_bills), batch_size):
        await db.bills.insert_many(new_bills[i:i+batch_size])
    
    for i in range(0, len(new_payments), batch_size):
        await db.payments.insert_many(new_payments[i:i+batch_size])

    print("SELESAI! Data berhasil digenerate.")

if __name__ == "__main__":
    asyncio.run(seed_data())
