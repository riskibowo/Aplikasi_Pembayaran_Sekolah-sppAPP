"""
Script untuk membersihkan referensi foto profil yang filenya sudah tidak ada.
Akan me-reset field 'profile_pic' di DB untuk semua user/siswa yang
foto profilnya disimpan lokal tapi filenya sudah tidak ada di filesystem.
"""
import asyncio
import sys
import os
from pathlib import Path

# Fix encoding untuk Windows terminal
if sys.stdout.encoding != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = "mongodb://localhost:27017"
DB_NAME = "test_database"

# Path ke folder profiles (relatif dari script ini)
BACKEND_DIR = Path(__file__).parent.parent / "backend"
PROFILES_DIR = BACKEND_DIR / "uploads" / "profiles"

async def fix_missing_profiles():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    
    print(f"[INFO] Mengecek folder: {PROFILES_DIR}")
    print(f"[INFO] Folder ada: {PROFILES_DIR.exists()}")
    files_in_dir = list(PROFILES_DIR.iterdir()) if PROFILES_DIR.exists() else []
    print(f"[INFO] File di profiles: {files_in_dir if files_in_dir else '(kosong)'}")
    print()

    fixed_users = 0
    fixed_students = 0

    # --- Cek koleksi users ---
    users = await db.users.find({"profile_pic": {"$exists": True, "$ne": None, "$ne": ""}}).to_list(None)
    print(f"[INFO] Users dengan profile_pic: {len(users)}")
    for user in users:
        pic_path = user.get("profile_pic", "")
        # Hanya proses foto lokal (bukan Drive)
        if pic_path and pic_path.startswith("/uploads/profiles/"):
            filename = pic_path.split("/uploads/profiles/")[-1]
            local_file = PROFILES_DIR / filename
            if not local_file.exists():
                print(f"  [MISSING] File hilang untuk user '{user.get('username')}': {filename}")
                await db.users.update_one(
                    {"id": user["id"]},
                    {"$unset": {"profile_pic": ""}}
                )
                fixed_users += 1
            else:
                print(f"  [OK] File ada untuk user '{user.get('username')}': {filename}")

    print()

    # --- Cek koleksi students ---
    students = await db.students.find({"profile_pic": {"$exists": True, "$ne": None, "$ne": ""}}).to_list(None)
    print(f"[INFO] Siswa dengan profile_pic: {len(students)}")
    for student in students:
        pic_path = student.get("profile_pic", "")
        if pic_path and pic_path.startswith("/uploads/profiles/"):
            filename = pic_path.split("/uploads/profiles/")[-1]
            local_file = PROFILES_DIR / filename
            if not local_file.exists():
                print(f"  [MISSING] File hilang untuk siswa '{student.get('nama', student.get('username'))}': {filename}")
                await db.students.update_one(
                    {"id": student["id"]},
                    {"$unset": {"profile_pic": ""}}
                )
                fixed_students += 1
            else:
                print(f"  [OK] File ada untuk siswa '{student.get('nama', student.get('username'))}': {filename}")

    print()
    print(f"[DONE] Selesai! Fixed {fixed_users} user(s) dan {fixed_students} student(s).")
    client.close()

if __name__ == "__main__":
    asyncio.run(fix_missing_profiles())
