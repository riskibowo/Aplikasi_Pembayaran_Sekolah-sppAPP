import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check_inactive():
    mongo_url = "mongodb://localhost:27017"
    db_name = "test_database"
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    users = await db.users.find({"is_active": False}).to_list(100)
    students = await db.students.find({"is_active": False}).to_list(100)
    
    if users:
        print(f"Found {len(users)} inactive staff accounts:")
        for u in users:
            print(f" - {u['username']} ({u['role']})")
            # Reactivate them
            await db.users.update_one({"id": u["id"]}, {"$set": {"is_active": True}})
            print(f"   Reactivated {u['username']}")
            
    if students:
        print(f"Found {len(students)} inactive student accounts:")
        for s in students:
            print(f" - {s['username']}")
            # Reactivate them
            await db.students.update_one({"id": s["id"]}, {"$set": {"is_active": True}})
            print(f"   Reactivated {s['username']}")
            
    if not users and not students:
        print("No accounts are currently disabled.")
        
    client.close()

if __name__ == "__main__":
    asyncio.run(check_inactive())
