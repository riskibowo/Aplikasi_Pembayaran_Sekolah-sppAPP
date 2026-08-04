import asyncio
import os
import uuid
import random
from datetime import datetime, timezone, timedelta
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

load_dotenv()
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
hashed_password = pwd_context.hash("siswa123")

async def seed():
    print("Deleting old data...")
    await db.students.delete_many({})
    await db.bills.delete_many({})
    await db.payments.delete_many({})

    print("Fetching classes...")
    classes = await db.classes.find({}).to_list(100)
    if not classes:
        print("No classes found. Please add classes first.")
        return

    print("Updating classes nominal to be at least 200k...")
    for c in classes:
        new_nom = random.choice([200000, 250000, 300000])
        await db.classes.update_one({"id": c["id"]}, {"$set": {"nominal_spp": new_nom}})
        c["nominal_spp"] = new_nom
    
    angkatan_list = ["2021", "2022", "2023", "2024"]

    print("Generating 3000 students...")
    students = []
    
    first_names = ["Andi", "Budi", "Citra", "Dewi", "Eka", "Fajar", "Gita", "Hadi", "Intan", "Joko", "Rina", "Siti", "Ahmad", "Reza", "Putri", "Dian", "Agus", "Ayu", "Sri", "Wahyu"]
    last_names = ["Saputra", "Wijaya", "Pratama", "Sari", "Lestari", "Kusuma", "Nugroho", "Wahyuni", "Santoso", "Hidayat", "Setiawan", "Utama", "Ramadhan", "Siregar"]
    
    for i in range(1, 3001):
        nis = str(random.randint(1000000000, 9999999999))
        nama = f"{random.choice(first_names)} {random.choice(last_names)}"
        kelas = random.choice(classes)
        angkatan = random.choice(angkatan_list)
        
        student = {
            "id": str(uuid.uuid4()),
            "nis": nis,
            "nama": nama,
            "kelas": kelas["nama_kelas"],
            "angkatan": angkatan,
            "no_wa": "-",
            "username": f"siswa{i}",
            "password": hashed_password,
            "profile_pic": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "is_active": True
        }
        students.append(student)

    # Insert in batches
    batch_size = 500
    for i in range(0, len(students), batch_size):
        await db.students.insert_many(students[i:i+batch_size])
        print(f"Inserted {i+batch_size} students...")

    print("Generating bills and payments...")
    bills = []
    payments = []
    
    for student in students:
        nominal = next((c["nominal_spp"] for c in classes if c["nama_kelas"] == student["kelas"]), 200000)
        
        for idx, bulan in enumerate(["Januari", "Februari", "Maret", "April", "Mei", "Juni"]):
            bill_id = str(uuid.uuid4())
            paid_chance = 0.9 - (idx * 0.1) 
            is_paid = random.random() < paid_chance
            
            status = "lunas" if is_paid else "belum"
            
            bill = {
                "id": bill_id,
                "id_siswa": student["id"],
                "bulan": bulan,
                "tahun": 2024,
                "jumlah": nominal,
                "status": status,
                "created_at": (datetime.now(timezone.utc) - timedelta(days=100-idx*15)).isoformat()
            }
            bills.append(bill)
            
            if is_paid:
                payment_id = str(uuid.uuid4())
                payment = {
                    "id": payment_id,
                    "id_tagihan": bill_id,
                    "id_siswa": student["id"],
                    "tanggal_bayar": (datetime.now(timezone.utc) - timedelta(days=90-idx*15)).isoformat(),
                    "metode": random.choice(["transfer", "tunai"]),
                    "jumlah": nominal,
                    "status": "success",
                    "receipt_path": None,
                    "nama_pengirim": student["nama"],
                    "bank_asal": random.choice(["BCA", "BRI", "BNI", "Mandiri"])
                }
                payments.append(payment)
                
    print(f"Inserting {len(bills)} bills...")
    for i in range(0, len(bills), 5000):
        await db.bills.insert_many(bills[i:i+5000])

    print(f"Inserting {len(payments)} payments...")
    for i in range(0, len(payments), 5000):
        await db.payments.insert_many(payments[i:i+5000])
        
    print("Database seeding completed.")

if __name__ == "__main__":
    asyncio.run(seed())
