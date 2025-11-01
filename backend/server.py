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
    status: str = "belum"  # belum, lunas
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    id_tagihan: str
    id_siswa: str
    tanggal_bayar: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    metode: str = "transfer"
    jumlah: float
    status: str = "diterima"

# Request/Response Models
class LoginRequest(BaseModel):
    username: str
    password: str

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
    # Update bill status
    result = await db.bills.update_one(
        {"id": bill_id},
        {"$set": {"status": confirm.status}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Tagihan tidak ditemukan")
    
    # If confirmed, create payment record
    if confirm.status == "lunas":
        bill = await db.bills.find_one({"id": bill_id}, {"_id": 0})
        if bill:
            payment = Payment(
                id_tagihan=bill_id,
                id_siswa=bill["id_siswa"],
                jumlah=bill["jumlah"],
                status="diterima"
            )
            doc = payment.model_dump()
            doc['tanggal_bayar'] = doc['tanggal_bayar'].isoformat()
            await db.payments.insert_one(doc)
            
            # Mock WhatsApp notification
            student = await db.students.find_one({"id": bill["id_siswa"]}, {"_id": 0})
            if student:
                logging.info(f"[MOCK WA] Pembayaran SPP {bill['bulan']} {bill['tahun']} sebesar Rp {bill['jumlah']:,.0f} telah diterima. Terima kasih! - SMK MEKAR MURNI. Kirim ke: {student['no_wa']}")
    
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
    # Check if bill exists and not paid
    bill = await db.bills.find_one({"id": payment_data.id_tagihan}, {"_id": 0})
    if not bill:
        raise HTTPException(status_code=404, detail="Tagihan tidak ditemukan")
    
    if bill["status"] == "lunas":
        raise HTTPException(status_code=400, detail="Tagihan sudah lunas")
    
    # Create payment
    payment = Payment(
        id_tagihan=payment_data.id_tagihan,
        id_siswa=payment_data.id_siswa,
        jumlah=payment_data.jumlah,
        status="diterima"
    )
    doc = payment.model_dump()
    doc['tanggal_bayar'] = doc['tanggal_bayar'].isoformat()
    await db.payments.insert_one(doc)
    
    # Update bill status
    await db.bills.update_one(
        {"id": payment_data.id_tagihan},
        {"$set": {"status": "lunas"}}
    )
    
    # Mock WhatsApp notification
    student = await db.students.find_one({"id": payment_data.id_siswa}, {"_id": 0})
    if student:
        logging.info(f"[MOCK WA] Pembayaran SPP {bill['bulan']} {bill['tahun']} sebesar Rp {payment_data.jumlah:,.0f} telah diterima. Terima kasih! - SMK MEKAR MURNI. Kirim ke: {student['no_wa']}")
    
    return payment

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
