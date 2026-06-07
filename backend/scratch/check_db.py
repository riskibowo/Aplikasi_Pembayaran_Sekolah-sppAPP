import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def main():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["test_database"]
    print("Collections:", await db.list_collection_names())
    
    blocked = await db.blocked_ips.find({}).to_list(100)
    print("Blocked IPs in DB:")
    for b in blocked:
        print(f" - {b}")
        
    users = await db.users.find({}).to_list(100)
    print("Users in DB:")
    for u in users:
        print(f" - Username: {u.get('username')}, Role: {u.get('role')}, Is Active: {u.get('is_active', True)}")
        
    students = await db.students.find({}).to_list(100)
    print("Students in DB:")
    for s in students:
        print(f" - Username: {s.get('username')}, Nis: {s.get('nis')}, Is Active: {s.get('is_active', True)}")

    client.close()

if __name__ == "__main__":
    asyncio.run(main())
