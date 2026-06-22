import os
import asyncio
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load env from backend/.env
dotenv_path = os.path.join(os.path.dirname(__file__), '../backend/.env')
load_dotenv(dotenv_path)

async def check():
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("=== DATA PEMBAYARAN ===")
    payments = await db.payments.find({}, {"_id": 0}).to_list(100)
    for p in payments:
        print(f"ID Pembayaran : {p.get('id')}")
        print(f"ID Tagihan    : {p.get('id_tagihan')}")
        print(f"Status        : {p.get('status')}")
        print(f"Receipt Path  : {p.get('receipt_path')}")
        print(f"Drive File ID : {p.get('drive_file_id')}")
        print(f"Nama Pengirim : {p.get('nama_pengirim')}")
        print(f"Bank Asal     : {p.get('bank_asal')}")
        print("-" * 30)

if __name__ == "__main__":
    asyncio.run(check())
