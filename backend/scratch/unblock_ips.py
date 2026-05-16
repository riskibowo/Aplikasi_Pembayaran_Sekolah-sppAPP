import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def check_and_clear_blocks():
    # Load config from .env if possible, but we'll use defaults for now
    mongo_url = "mongodb://localhost:27017"
    db_name = "test_database"
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    print("Checking for blocked IPs...")
    blocked = await db.blocked_ips.find({}).to_list(100)
    if not blocked:
        print("No IPs are currently blocked.")
    else:
        print(f"Found {len(blocked)} blocked IPs:")
        for item in blocked:
            print(f" - {item.get('ip_address')} (Reason: {item.get('reason')})")
        
        # Optionally clear them if user requested
        print("\nClearing all blocked IPs...")
        result = await db.blocked_ips.delete_many({})
        print(f"Successfully cleared {result.deleted_count} block(s).")
    
    client.close()

if __name__ == "__main__":
    asyncio.run(check_and_clear_blocks())
