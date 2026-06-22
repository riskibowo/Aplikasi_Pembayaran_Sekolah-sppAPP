import os
import asyncio
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from jose import jwt
import requests

# Load env from backend/.env
dotenv_path = os.path.join(os.path.dirname(__file__), '../backend/.env')
load_dotenv(dotenv_path)

async def test():
    mongo_url = os.environ['MONGO_URL']
    db_name = os.environ['DB_NAME']
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Get actual admin user
    admin = await db.users.find_one({"username": "admin"})
    if not admin:
        print("Admin user not found in DB!")
        return
        
    admin_id = admin["id"]
    print(f"Found admin with ID: {admin_id}")
    
    secret_key = os.environ.get("SECRET_KEY")
    algorithm = "HS256"
    
    # Generate token
    token_data = {
        "user_id": admin_id,
        "role": "admin",
        "username": "admin"
    }
    
    token = jwt.encode(token_data, secret_key, algorithm=algorithm)
    
    payment_id = "ff74d243-e579-4f93-83a7-6a94fa61d3ea"
    receipt_url = f"http://127.0.0.1:8000/api/payments/{payment_id}/receipt/file"
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    print(f"Fetching receipt file from {receipt_url}...")
    r_file = requests.get(receipt_url, headers=headers)
    print(f"Response code: {r_file.status_code}")
    if r_file.status_code == 200:
        print(f"Success! Content length: {len(r_file.content)} bytes, Content type: {r_file.headers.get('content-type')}")
    else:
        print(f"Failed: {r_file.text}")

if __name__ == "__main__":
    asyncio.run(test())
