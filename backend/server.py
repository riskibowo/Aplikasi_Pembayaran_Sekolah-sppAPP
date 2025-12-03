from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.responses import StreamingResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone
from passlib.context import CryptContext
from jose import JWTError, jwt
from io import BytesIO
import pandas as pd
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4, letter
import mimetypes

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Configuration
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-this")
ALGORITHM = "HS256"

# Utility functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_token(data: dict) -> str:
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

# Models
class ClassUpdate(BaseModel):
    nama_kelas: str
    nominal_spp: float

@api_router.get("/receipt/bill/{bill_id}")
async def get_payment_receipt(bill_id: str):
    # 1. Cari tagihan (bill)
    bill = await db.bills.find_one({"id": bill_id}, {"_id": 0})
    if not bill:
        raise HTTPException(status_code=404, detail="Tagihan tidak ditemukan")
        
    # 2. Cari pembayaran (payment) berdasarkan id_tagihan
    payment = await db.payments.find_one({"id_tagihan": bill_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Pembayaran untuk tagihan ini tidak ditemukan")

    # 3. Cari data siswa
    student = await db.students.find_one({"id": bill["id_siswa"]}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Data siswa tidak ditemukan")

    # 4. Buat PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=(5*inch, 4*inch), leftMargin=0.5*inch, rightMargin=0.5*inch, topMargin=0.5*inch, bottomMargin=0.5*inch)
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['h1'], alignment=TA_CENTER, fontSize=16, spaceAfter=20, textColor=colors.HexColor('#1e3a8a'))
    normal_style = ParagraphStyle('Normal', parent=styles['BodyText'], fontSize=10, alignment=TA_LEFT, spaceAfter=6)

    elements.append(Paragraph("BUKTI PEMBAYARAN SPP", title_style))
    elements.append(Paragraph(f"<b>SMK MEKAR MURNI</b>", ParagraphStyle('SubTitle', parent=styles['h2'], alignment=TA_CENTER, fontSize=10, spaceAfter=20)))
    
    
    
    # Data Kuitansi
    receipt_data = [
        ["NIS", ":", student['nis']],
        ["Nama Siswa", ":", student['nama']],
        ["Kelas", ":", student['kelas']],
        ["Tanggal Bayar", ":", datetime.fromisoformat(payment['tanggal_bayar']).strftime('%d %B %Y %H:%M')],
        ["Pembayaran Bulan", ":", f"{bill['bulan']} {bill['tahun']}"],
        ["Jumlah", ":", f"<b>Rp {bill['jumlah']:,.0f}</b>"],
        ["Status", ":", "<b>LUNAS</b>"],
    ]

    table = Table(receipt_data, colWidths=[1.5*inch, 0.2*inch, 2.3*inch])
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        # Style untuk <b>
        ('FONTNAME', (2, 5), (2, 6), 'Helvetica-Bold'), 
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 0.5*inch))
    elements.append(Paragraph("Terima kasih atas pembayaran Anda.", normal_style))

    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=kuitansi_{student['nis']}_{bill['bulan']}_{bill['tahun']}.pdf"})

@api_router.get("/reports/annual")
async def get_annual_report():
    # Ini adalah contoh agregasi MongoDB
    pipeline = [
        {
            "$match": {"status": "lunas"}
        },
        {
            "$project": {
                "tahun": {
                    "$year": {"$dateFromString": {"dateString": "$tanggal_bayar"}}
                },
                "jumlah": "$jumlah"
            }
        },
        {
            "$group": {
                "_id": "$tahun",
                "total_pemasukan": {"$sum": "$jumlah"}
            }
        },
        {
            "$sort": {"_id": 1} # Urutkan berdasarkan tahun
        },
        {
            "$project": {
                "tahun": "$_id",
                "pemasukan": "$total_pemasukan",
                "_id": 0
            }
        }
    ]
    
    # Perlu motor v4+ untuk $dateFromString, jika tidak, lakukan manual
    # Jika agregasi di atas gagal, gunakan cara manual:
    payments = await db.payments.find({"status": "diterima"}, {"_id": 0}).to_list(1000)
    annual_data = {}
    for p in payments:
        try:
            # Pastikan tanggal_bayar adalah string ISO
            payment_date = datetime.fromisoformat(p["tanggal_bayar"])
            year = payment_date.year
            if year not in annual_data:
                annual_data[year] = 0
            annual_data[year] += p["jumlah"]
        except (TypeError, ValueError):
            continue # Abaikan format tanggal yang salah

    # Konversi ke format chart
    chart_data = [{"tahun": year, "pemasukan": total} for year, total in sorted(annual_data.items())]
    
    # Ambil total untuk tahun ini saja
    current_year_total = annual_data.get(datetime.now().year, 0)
    
    return {
        "total_pemasukan_tahun_ini": current_year_total,
        "chart_data": chart_data
    }

@api_router.put("/classes/{class_id}")
async def update_class(class_id: str, class_data: ClassUpdate):
    exists = await db.classes.find_one({"id": class_id})
    if not exists:
        raise HTTPException(status_code=404, detail="Kelas tidak ditemukan")
    
    updated_data = class_data.model_dump()
    await db.classes.update_one({"id": class_id}, {"$set": updated_data})
    return {"message": "Kelas berhasil diupdate"}

@api_router.delete("/classes/{class_id}")
async def delete_class(class_id: str):
    # Perlu ditambahkan: Cek apakah ada siswa yang masih menggunakan kelas ini sebelum menghapus
    student_exists = await db.students.find_one({"kelas": (await db.classes.find_one({"id": class_id}))["nama_kelas"]})
    if student_exists:
        raise HTTPException(status_code=400, detail="Tidak dapat menghapus, kelas masih digunakan oleh siswa.")

    result = await db.classes.delete_one({"id": class_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kelas tidak ditemukan")
    return {"message": "Kelas berhasil dihapus"}

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password: str
    nama: str
    role: str  # admin, kepsek, siswa
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Student(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nis: str
    nama: str
    kelas: str
    no_wa: str
    username: str
    password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Class(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nama_kelas: str
    nominal_spp: float
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Bill(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    id_siswa: str
    bulan: str
    tahun: int
    jumlah: float
    # --- UBAH BARIS INI ---
    status: str = "belum"  # belum, menunggu_konfirmasi, lunas
    # ---------------------
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    id_tagihan: str
    id_siswa: str
    tanggal_bayar: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metode: str = "transfer"
    jumlah: float
    status: str = "pending" 
    receipt_path: Optional[str] = None
    # Tambahan field baru
    nama_pengirim: str = "" 
    bank_asal: str = ""
    # --- UBAH BARIS INI ---
    status: str = "pending" # pending, diterima
    receipt_path: Optional[str] = None

# Request/Response Models
class LoginRequest(BaseModel):
    username: str
    password: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

class LoginResponse(BaseModel):
    token: str
    user: dict

class StudentCreate(BaseModel):
    nis: str
    nama: str
    kelas: str
    no_wa: str
    username: str
    password: str

class ClassCreate(BaseModel):
    nama_kelas: str
    nominal_spp: float

class BillGenerate(BaseModel):
    bulan: str
    tahun: int

class BillConfirm(BaseModel):
    status: str

class PaymentCreate(BaseModel):
    id_tagihan: str
    id_siswa: str
    jumlah: float
    nama_pengirim: str
    bank_asal: str

class ClassUpdate(BaseModel):
    nama_kelas: str
    nominal_spp: float

# Auth dependency
async def get_current_user(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Initialize database with default data
async def init_db():
    # Check if admin exists
    admin_exists = await db.users.find_one({"username": "admin"})
    if not admin_exists:
        admin_user = User(
            username="admin",
            password=hash_password("admin123"),
            nama="Administrator",
            role="admin"
        )
        doc = admin_user.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.users.insert_one(doc)

    # Check if kepsek exists
    kepsek_exists = await db.users.find_one({"username": "kepsek"})
    if not kepsek_exists:
        kepsek_user = User(
            username="kepsek",
            password=hash_password("kepsek123"),
            nama="Kepala Sekolah",
            role="kepsek"
        )
        doc = kepsek_user.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.users.insert_one(doc)

    # Check if sample class exists
    class_exists = await db.classes.find_one({"nama_kelas": "X-1"})
    if not class_exists:
        classes = [
            Class(nama_kelas="X-1", nominal_spp=500000),
            Class(nama_kelas="XI-1", nominal_spp=550000),
            Class(nama_kelas="XII-1", nominal_spp=600000),
        ]
        for cls in classes:
            doc = cls.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await db.classes.insert_one(doc)

# Routes
@api_router.get("/")
async def root():
    return {"message": "SPP System API"}

# Auth Routes
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    # Try to find in users collection (admin/kepsek)
    user = await db.users.find_one({"username": request.username}, {"_id": 0})
    if user:
        if verify_password(request.password, user['password']):
            token = create_token({"user_id": user['id'], "role": user['role']})
            user_data = {"id": user['id'], "username": user['username'], "nama": user['nama'], "role": user['role']}
            return {"token": token, "user": user_data}
    
    # Try to find in students collection
    student = await db.students.find_one({"username": request.username}, {"_id": 0})
    if student:
        if verify_password(request.password, student['password']):
            token = create_token({"user_id": student['id'], "role": "siswa"})
            user_data = {"id": student['id'], "username": student['username'], "nama": student['nama'], "role": "siswa", "nis": student['nis']}
            return {"token": token, "user": user_data}
    
    raise HTTPException(status_code=401, detail="Username atau password salah")

@api_router.get("/auth/me")
async def get_me(token: str):
    user_data = await get_current_user(token)
    return user_data

# Student Routes (Admin only)
@api_router.get("/students")
async def get_students():
    students = await db.students.find({}, {"_id": 0}).to_list(1000)
    return students

@api_router.post("/students")
async def create_student(student: StudentCreate):
    # Check if username or NIS already exists
    exists = await db.students.find_one({"$or": [{"username": student.username}, {"nis": student.nis}]})
    if exists:
        raise HTTPException(status_code=400, detail="NIS atau username sudah terdaftar")
    
    new_student = Student(
        nis=student.nis,
        nama=student.nama,
        kelas=student.kelas,
        no_wa=student.no_wa,
        username=student.username,
        password=hash_password(student.password)
    )
    doc = new_student.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.students.insert_one(doc)
    return new_student

@api_router.put("/students/{student_id}")
async def update_student(student_id: str, student: StudentCreate):
    # Check if student exists
    exists = await db.students.find_one({"id": student_id})
    if not exists:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")
    
    updated_data = {
        "nis": student.nis,
        "nama": student.nama,
        "kelas": student.kelas,
        "no_wa": student.no_wa,
        "username": student.username
    }
    
    if student.password:
        updated_data["password"] = hash_password(student.password)
    
    await db.students.update_one({"id": student_id}, {"$set": updated_data})
    return {"message": "Siswa berhasil diupdate"}

@api_router.delete("/students/{student_id}")
async def delete_student(student_id: str):
    result = await db.students.delete_one({"id": student_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")
    return {"message": "Siswa berhasil dihapus"}

# Class Routes
@api_router.get("/classes")
async def get_classes():
    classes = await db.classes.find({}, {"_id": 0}).to_list(1000)
    return classes

@api_router.post("/classes")
async def create_class(class_data: ClassCreate):
    new_class = Class(
        nama_kelas=class_data.nama_kelas,
        nominal_spp=class_data.nominal_spp
    )
    doc = new_class.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.classes.insert_one(doc)
    return new_class

# Bill Routes
@api_router.get("/bills")
async def get_bills(status: Optional[str] = None, id_siswa: Optional[str] = None):
    query = {}
    if status:
        query["status"] = status
    if id_siswa:
        query["id_siswa"] = id_siswa
    
    bills = await db.bills.find(query, {"_id": 0}).to_list(1000)
    
    # Enrich with student data
    for bill in bills:
        student = await db.students.find_one({"id": bill["id_siswa"]}, {"_id": 0})
        if student:
            bill["siswa"] = {"nama": student["nama"], "nis": student["nis"], "kelas": student["kelas"]}
    
    return bills

@api_router.post("/bills/generate")
async def generate_bills(bill_gen: BillGenerate):
    # Get all students
    students = await db.students.find({}, {"_id": 0}).to_list(1000)
    
    generated_count = 0
    for student in students:
        # Check if bill already exists for this month/year
        exists = await db.bills.find_one({
            "id_siswa": student["id"],
            "bulan": bill_gen.bulan,
            "tahun": bill_gen.tahun
        })
        
        if not exists:
            # Get SPP nominal from class
            class_data = await db.classes.find_one({"nama_kelas": student["kelas"]}, {"_id": 0})
            nominal = class_data["nominal_spp"] if class_data else 500000
            
            new_bill = Bill(
                id_siswa=student["id"],
                bulan=bill_gen.bulan,
                tahun=bill_gen.tahun,
                jumlah=nominal,
                status="belum"
            )
            doc = new_bill.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            await db.bills.insert_one(doc)
            generated_count += 1
    
    return {"message": f"Berhasil generate {generated_count} tagihan"}

@api_router.put("/bills/{bill_id}/confirm")
async def confirm_bill(bill_id: str, confirm: BillConfirm):
    # Dapatkan data tagihan
    bill = await db.bills.find_one({"id": bill_id}, {"_id": 0})
    if not bill:
        raise HTTPException(status_code=404, detail="Tagihan tidak ditemukan")

    # Update status tagihan
    result = await db.bills.update_one(
        {"id": bill_id},
        {"$set": {"status": confirm.status}}
    )
    
    if result.modified_count == 0:
        # Mungkin statusnya tidak berubah, tapi kita tetap lanjut
        pass
    
    # Jika status diubah menjadi "lunas"
    if confirm.status == "lunas":
        # Cek apakah sudah ada payment, jika belum, buat baru
        existing_payment = await db.payments.find_one({"id_tagihan": bill_id})
        
        if not existing_payment:
            # Buat catatan pembayaran baru
            payment = Payment(
                id_tagihan=bill_id,
                id_siswa=bill["id_siswa"],
                jumlah=bill["jumlah"],
                status="diterima" # Langsung diterima karena dikonfirmasi admin
            )
            doc = payment.model_dump()
            doc['tanggal_bayar'] = doc['tanggal_bayar'].isoformat()
            await db.payments.insert_one(doc)
        else:
            # Jika payment sudah ada (dari alur siswa), update statusnya
            await db.payments.update_one(
                {"id_tagihan": bill_id},
                {"$set": {"status": "diterima", "tanggal_bayar": datetime.now(timezone.utc).isoformat()}}
            )

        # Kirim notifikasi WA (Mock)
        student = await db.students.find_one({"id": bill["id_siswa"]}, {"_id": 0})
        if student:
            logging.info(f"[MOCK WA] Pembayaran SPP {bill['bulan']} {bill['tahun']} sebesar Rp {bill['jumlah']:,.0f} telah DITERIMA. Terima kasih! - SMK MEKAR MURNI. Kirim ke: {student['no_wa']}")
    
    return {"message": "Status tagihan berhasil diupdate"}

# Payment Routes
@api_router.get("/payments")
async def get_payments(id_siswa: Optional[str] = None):
    query = {}
    if id_siswa:
        query["id_siswa"] = id_siswa
    
    payments = await db.payments.find(query, {"_id": 0}).to_list(1000)
    
    # Enrich with student and bill data
    for payment in payments:
        student = await db.students.find_one({"id": payment["id_siswa"]}, {"_id": 0})
        bill = await db.bills.find_one({"id": payment["id_tagihan"]}, {"_id": 0})
        if student:
            payment["siswa"] = {"nama": student["nama"], "nis": student["nis"], "kelas": student["kelas"]}
        if bill:
            payment["tagihan"] = {"bulan": bill["bulan"], "tahun": bill["tahun"]}
    
    return payments

@api_router.post("/payments")
async def create_payment(payment_data: PaymentCreate):
    # Check if bill exists
    bill = await db.bills.find_one({"id": payment_data.id_tagihan}, {"_id": 0})
    if not bill:
        raise HTTPException(status_code=404, detail="Tagihan tidak ditemukan")
    
    # --- UBAH LOGIKA INI ---
    if bill["status"] == "lunas":
        raise HTTPException(status_code=400, detail="Tagihan sudah lunas")
    if bill["status"] == "menunggu_konfirmasi":
        raise HTTPException(status_code=400, detail="Tagihan ini sedang menunggu konfirmasi")
    
    # Cek apakah sudah ada payment pending
    existing_payment = await db.payments.find_one({"id_tagihan": payment_data.id_tagihan, "status": "pending"})
    if existing_payment:
        raise HTTPException(status_code=400, detail="Pembayaran untuk tagihan ini sudah dibuat dan sedang menunggu konfirmasi")

    # Create payment dengan status pending
    payment = Payment(
        id_tagihan=payment_data.id_tagihan,
        id_siswa=payment_data.id_siswa,
        jumlah=payment_data.jumlah,
        status="pending",
        # Simpan data baru ke database
        nama_pengirim=payment_data.nama_pengirim,
        bank_asal=payment_data.bank_asal
    )
    doc = payment.model_dump()
    doc['tanggal_bayar'] = doc['tanggal_bayar'].isoformat()
    await db.payments.insert_one(doc)
    
    # Update bill status menjadi "menunggu_konfirmasi"
    await db.bills.update_one(
        {"id": payment_data.id_tagihan},
        {"$set": {"status": "menunggu_konfirmasi"}} # Status diubah
    )
    
    # JANGAN kirim WA dulu di sini
    # ---------------------------
    
    return payment


# Upload receipt for a payment (student uploads PDF)
@api_router.post("/payments/{payment_id}/upload_receipt")
async def upload_payment_receipt(payment_id: str, file: UploadFile = File(...)):
    # Validate payment exists
    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    # 1. Cek Tipe Konten (Izinkan PDF dan Gambar)
    allowed_types = ["application/pdf", "image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Format file tidak didukung. Gunakan JPG, PNG, atau PDF.")

    receipts_dir = ROOT_DIR / 'receipts'
    receipts_dir.mkdir(parents=True, exist_ok=True)

    # 2. Tentukan Ekstensi File Secara Otomatis
    ext = mimetypes.guess_extension(file.content_type) or ".bin"
    # Koreksi untuk .jpe -> .jpg agar lebih umum
    if ext == ".jpe": ext = ".jpg"

    filename = f"receipt_{payment_id}{ext}"
    file_path = receipts_dir / filename

    with open(file_path, 'wb') as f:
        content = await file.read()
        f.write(content)

    # Update payment record
    await db.payments.update_one({"id": payment_id}, {"$set": {"receipt_path": str(file_path), "status": "menunggu_konfirmasi"}})
    await db.bills.update_one({"id": payment['id_tagihan']}, {"$set": {"status": "menunggu_konfirmasi"}})

    return {"message": "Receipt uploaded"}


# Serve receipt file for a payment (admin or student)
@api_router.get("/payments/{payment_id}/receipt")
async def get_payment_receipt(payment_id: str, token: str):
    user_payload = await get_current_user(token)

    payment = await db.payments.find_one({"id": payment_id}, {"_id": 0})
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    role = user_payload.get("role")
    user_id = user_payload.get("user_id")
    if role != "admin" and user_id != payment.get("id_siswa"):
        raise HTTPException(status_code=403, detail="Not authorized to access this receipt")

    receipt_path = payment.get('receipt_path')
    if not receipt_path:
        raise HTTPException(status_code=404, detail="Receipt not uploaded")

    file_path = Path(receipt_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Receipt file not found on server")

    # Deteksi media type otomatis (PDF/JPG/PNG)
    media_type, _ = mimetypes.guess_type(file_path)
    return FileResponse(path=str(file_path), media_type=media_type, filename=file_path.name)

# Dashboard Stats
@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    # Total students
    total_students = await db.students.count_documents({})
    
    # Total payment this month
    current_month = datetime.now(timezone.utc).strftime("%B")
    current_year = datetime.now(timezone.utc).year
    
    monthly_payments = await db.payments.find({}, {"_id": 0}).to_list(1000)
    total_bulan_ini = sum(p["jumlah"] for p in monthly_payments if isinstance(p["tanggal_bayar"], str) and p["tanggal_bayar"].startswith(str(current_year)))
    
    # Students with unpaid bills
    unpaid_bills = await db.bills.find({"status": "belum"}, {"_id": 0}).to_list(1000)
    siswa_menunggak = len(set(b["id_siswa"] for b in unpaid_bills))
    
    # Monthly income chart data
    payments = await db.payments.find({}, {"_id": 0}).to_list(1000)
    monthly_income = {}
    for payment in payments:
        date_str = payment["tanggal_bayar"]
        if isinstance(date_str, str):
            month_key = date_str[:7]  # YYYY-MM
            if month_key not in monthly_income:
                monthly_income[month_key] = 0
            monthly_income[month_key] += payment["jumlah"]
    
    chart_data = [{"bulan": k, "pemasukan": v} for k, v in sorted(monthly_income.items())[-6:]]
    
    return {
        "total_siswa": total_students,
        "total_bulan_ini": total_bulan_ini,
        "siswa_menunggak": siswa_menunggak,
        "chart_data": chart_data
    }
    
@api_router.get("/reports/annual")
async def get_annual_report():
    # Ambil semua pembayaran yang statusnya diterima
    payments = await db.payments.find({"status": "diterima"}, {"_id": 0}).to_list(1000)
    annual_data = {}

    current_year = datetime.now(timezone.utc).year
    total_pemasukan_tahun_ini = 0

    for p in payments:
        try:
            # Pastikan tanggal_bayar adalah string ISO
            payment_date = datetime.fromisoformat(p["tanggal_bayar"])
            year = payment_date.year

            if year not in annual_data:
                annual_data[year] = 0

            annual_data[year] += p["jumlah"]

            if year == current_year:
                total_pemasukan_tahun_ini += p["jumlah"]

        except (TypeError, ValueError):
            continue # Abaikan format tanggal yang salah atau data lama

    # Konversi ke format chart
    chart_data = [{"tahun": year, "pemasukan": total} for year, total in sorted(annual_data.items())]

    return {
        "total_pemasukan_tahun_ini": total_pemasukan_tahun_ini,
        "chart_data": chart_data
    }
# Reports
@api_router.get("/reports/daily")
async def get_daily_report():
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    payments = await db.payments.find({}, {"_id": 0}).to_list(1000)
    daily_payments = [p for p in payments if isinstance(p["tanggal_bayar"], str) and p["tanggal_bayar"].startswith(today)]
    
    total = sum(p["jumlah"] for p in daily_payments)
    
    # Enrich with student data
    for payment in daily_payments:
        student = await db.students.find_one({"id": payment["id_siswa"]}, {"_id": 0})
        bill = await db.bills.find_one({"id": payment["id_tagihan"]}, {"_id": 0})
        if student:
            payment["siswa"] = {"nama": student["nama"], "nis": student["nis"], "kelas": student["kelas"]}
        if bill:
            payment["tagihan"] = {"bulan": bill["bulan"], "tahun": bill["tahun"]}
    
    return {"total": total, "payments": daily_payments}

@api_router.get("/reports/monthly")
async def get_monthly_report(bulan: str, tahun: int):
    payments = await db.payments.find({}, {"_id": 0}).to_list(1000)
    bills = await db.bills.find({"bulan": bulan, "tahun": tahun}, {"_id": 0}).to_list(1000)
    
    # Filter payments for this month
    month_key = f"{tahun}-{str(list(calendar.month_name).index(bulan)).zfill(2) if bulan in calendar.month_name else '01'}"
    monthly_payments = [p for p in payments if isinstance(p["tanggal_bayar"], str) and p["tanggal_bayar"].startswith(month_key)]
    
    total = sum(p["jumlah"] for p in monthly_payments)
    total_tagihan = len(bills)
    total_lunas = len([b for b in bills if b["status"] == "lunas"])
    total_belum = total_tagihan - total_lunas
    
    return {
        "bulan": bulan,
        "tahun": tahun,
        "total_pemasukan": total,
        "total_tagihan": total_tagihan,
        "total_lunas": total_lunas,
        "total_belum_lunas": total_belum,
        "payments": monthly_payments
    }

import calendar

@api_router.get("/reports/export-pdf")
async def export_pdf(bulan: str, tahun: int):
    # Get data
    bills = await db.bills.find({"bulan": bulan, "tahun": tahun}, {"_id": 0}).to_list(1000)
    
    # Create PDF
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    
    # Styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#1e3a8a'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    # Title
    title = Paragraph(f"Laporan Pembayaran SPP<br/>{bulan} {tahun}<br/>SMK MEKAR MURNI", title_style)
    elements.append(title)
    elements.append(Spacer(1, 0.2*inch))
    
    # Table data
    data = [['No', 'NIS', 'Nama', 'Kelas', 'Jumlah', 'Status']]
    
    total_lunas = 0
    for idx, bill in enumerate(bills, 1):
        student = await db.students.find_one({"id": bill["id_siswa"]}, {"_id": 0})
        if student:
            data.append([
                str(idx),
                student['nis'],
                student['nama'],
                student['kelas'],
                f"Rp {bill['jumlah']:,.0f}",
                bill['status'].upper()
            ])
            if bill['status'] == 'lunas':
                total_lunas += bill['jumlah']
    
    # Add total row
    data.append(['', '', '', '', f"Total: Rp {total_lunas:,.0f}", ''])
    
    # Create table
    table = Table(data, colWidths=[0.5*inch, 1*inch, 2*inch, 1*inch, 1.5*inch, 1*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -2), colors.beige),
        ('GRID', (0, 0), (-1, -2), 1, colors.black),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#fbbf24')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ]))
    
    elements.append(table)
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=laporan_{bulan}_{tahun}.pdf"})

@api_router.get("/reports/export-excel")
async def export_excel(bulan: str, tahun: int):
    # Get data
    bills = await db.bills.find({"bulan": bulan, "tahun": tahun}, {"_id": 0}).to_list(1000)
    
    # Prepare data
    data_list = []
    for bill in bills:
        student = await db.students.find_one({"id": bill["id_siswa"]}, {"_id": 0})
        if student:
            data_list.append({
                'NIS': student['nis'],
                'Nama': student['nama'],
                'Kelas': student['kelas'],
                'Bulan': bill['bulan'],
                'Tahun': bill['tahun'],
                'Jumlah': bill['jumlah'],
                'Status': bill['status'].upper()
            })
    
    # Create Excel
    df = pd.DataFrame(data_list)
    buffer = BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Laporan SPP')
    buffer.seek(0)
    
    return StreamingResponse(buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename=laporan_{bulan}_{tahun}.xlsx"})
# ... (impor dan fungsi utility lainnya)

@api_router.get("/receipt/bill/{bill_id}")
async def get_payment_receipt(bill_id: str):
    # 1. Cari tagihan (bill)
    bill = await db.bills.find_one({"id": bill_id}, {"_id": 0})
    if not bill:
        raise HTTPException(status_code=404, detail="Tagihan tidak ditemukan")
        
    # 2. Cari pembayaran (payment)
    payment = await db.payments.find_one({"id_tagihan": bill_id}, {"_id": 0})
    if not payment:
        if bill["status"] != "lunas":
            raise HTTPException(status_code=404, detail="Pembayaran untuk tagihan ini belum dikonfirmasi")
        payment_date_str = datetime.now(timezone.utc).isoformat()
    else:
        payment_date_str = payment["tanggal_bayar"]
    
    # 3. Cari data siswa
    student = await db.students.find_one({"id": bill["id_siswa"]}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Data siswa tidak ditemukan")

    # 4. Buat PDF
    buffer = BytesIO()
    # Kertas 5x4 inch, margin 0.3 inch (diperkecil agar lebih padat)
    doc = SimpleDocTemplate(buffer, pagesize=(5*inch, 4*inch), leftMargin=0.3*inch, rightMargin=0.3*inch, topMargin=0.3*inch, bottomMargin=0.3*inch)
    elements = []
    
    styles = getSampleStyleSheet()
    # Judul sedikit lebih kecil dari sebelumnya (14pt)
    title_style = ParagraphStyle('Title', parent=styles['h1'], alignment=TA_CENTER, fontSize=14, spaceAfter=10, textColor=colors.HexColor('#1e3a8a'))
    # Subjudul (Nama Sekolah) sedikit lebih kecil (9pt)
    subtitle_style = ParagraphStyle('SubTitle', parent=styles['h2'], alignment=TA_CENTER, fontSize=9, spaceAfter=14)
    # Style normal untuk info tambahan
    normal_style = ParagraphStyle('Normal', parent=styles['BodyText'], fontSize=9, alignment=TA_LEFT, spaceAfter=6)

    elements.append(Paragraph("BUKTI PEMBAYARAN SPP", title_style))
    elements.append(Paragraph("SMK MEKAR MURNI", subtitle_style))
    
    # --- PERBAIKAN DAN PENAMBAHAN DETAIL UNTUK KUITANSI ---
    
    try:
        payment_datetime = datetime.fromisoformat(payment_date_str)
        tanggal_bayar_formatted = payment_datetime.strftime('%d %B %Y')
        waktu_bayar_formatted = payment_datetime.strftime('%H:%M:%S')
    except ValueError:
        tanggal_bayar_formatted = "Data Tanggal Invalid"
        waktu_bayar_formatted = ""

    # Tambahkan Nomor Kuitansi/ID Pembayaran (Jika ada di Payment)
    receipt_data = [
        ["No. Tagihan", ":", bill['id']],
        ["NIS", ":", student['nis']],
        ["Nama Siswa", ":", student['nama']],
        ["Kelas", ":", student['kelas']],
        ["Pembayaran Bulan", ":", f"{bill['bulan']} {bill['tahun']}"],
        ["Tanggal Bayar", ":", tanggal_bayar_formatted],
        ["Waktu Bayar", ":", waktu_bayar_formatted],
        ["Jumlah Dibayar", ":", f"Rp {bill['jumlah']:,.0f}"],
        ["Status", ":", bill['status'].upper()],
    ]

    # Atur lebar kolom agar lebih proporsional
    table = Table(receipt_data, colWidths=[1.5*inch, 0.1*inch, 2.5*inch])
    table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        
        # Penekanan pada Jumlah dan Status
        ('FONTNAME', (0, 7), (2, 8), 'Helvetica-Bold'),
        ('TEXTCOLOR', (2, 7), (2, 7), colors.HexColor('#1e3a8a')), # Warna biru tua untuk jumlah
        ('TEXTCOLOR', (2, 8), (2, 8), colors.HexColor('#10b981')), # Warna hijau untuk status LUNAS
        
        # Pastikan status LUNAS tercetak tebal (Baris ke-8, Kolom ke-2)
        ('FONTNAME', (2, 8), (2, 8), 'Helvetica-Bold'), 
    ]))
    
    elements.append(table)
    elements.append(Spacer(1, 0.2*inch))
    
    # Keterangan (Dibuat miring/italic agar rapi)
    elements.append(Paragraph(
        "<i>Terima kasih atas pembayaran Anda. Harap simpan bukti ini.</i>", 
        ParagraphStyle('Footer', parent=styles['BodyText'], fontSize=8, alignment=TA_LEFT, spaceAfter=6, textColor=colors.HexColor('#6b7280'))
    ))

    # --- AKHIR PERBAIKAN ---

    doc.build(elements)
    buffer.seek(0)
    
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=kuitansi_{student['nis']}_{bill['bulan']}_{bill['tahun']}.pdf"})
# ---------------------------

# Student Portal Routes
@api_router.get("/student/profile/{student_id}")
# WhatsApp Mock
@api_router.post("/whatsapp/send")
async def send_whatsapp(nomor: str, pesan: str):
    # Mock WhatsApp sending
    logging.info(f"[MOCK WA] Pesan: {pesan} | Kirim ke: {nomor}")
    return {"status": "success", "message": "Pesan WhatsApp berhasil dikirim (mock)"}

# Student Portal Routes
@api_router.get("/student/profile/{student_id}")
async def get_student_profile(student_id: str):
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")
    return student
@api_router.put("/student/change-password/{student_id}")
async def change_student_password(student_id: str, request: ChangePasswordRequest):
    # 1. Cari siswa
    student = await db.students.find_one({"id": student_id})
    if not student:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")
    
    # 2. Verifikasi password lama
    if not verify_password(request.old_password, student['password']):
        raise HTTPException(status_code=400, detail="Password lama salah")
    
    # 3. Update password baru
    hashed_new_password = hash_password(request.new_password)
    await db.students.update_one(
        {"id": student_id}, 
        {"$set": {"password": hashed_new_password}}
    )
    
    return {"message": "Password berhasil diubah"}

@api_router.get("/student/bills/{student_id}")
async def get_student_bills(student_id: str):
    bills = await db.bills.find({"id_siswa": student_id}, {"_id": 0}).to_list(1000)
    return bills

@api_router.get("/student/payments/{student_id}")
async def get_student_payments(student_id: str):
    payments = await db.payments.find({"id_siswa": student_id}, {"_id": 0}).to_list(1000)
    
    # Enrich with bill data
    for payment in payments:
        bill = await db.bills.find_one({"id": payment["id_tagihan"]}, {"_id": 0})
        if bill:
            payment["tagihan"] = {"bulan": bill["bulan"], "tahun": bill["tahun"]}
    
    return payments

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_event():
    await init_db()
    logger.info("Database initialized")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
