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
    
    print("=== DATA USER ===")
    users = await db.users.find({}, {"_id": 0}).to_list(100)
    for u in users:
        print(f"Username : {u.get('username')}")
        print(f"Nama     : {u.get('nama')}")
        print(f"Role     : {u.get('role')}")
        print(f"Active   : {u.get('is_active', True)}")
        print("-" * 30)

if __name__ == "__main__":
    asyncio.run(check())
