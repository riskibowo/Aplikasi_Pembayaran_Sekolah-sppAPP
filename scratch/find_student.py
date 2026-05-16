import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
from pathlib import Path

async def get_students():
    ROOT_DIR = Path(__file__).parent.parent / 'backend'
    load_dotenv(ROOT_DIR / '.env')
    
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    students = await db.students.find({}, {"username": 1, "password": 1, "nama": 1}).to_list(10)
    for s in students:
        print(f"Username: {s['username']}, Nama: {s['nama']}")

if __name__ == "__main__":
    asyncio.run(get_students())
