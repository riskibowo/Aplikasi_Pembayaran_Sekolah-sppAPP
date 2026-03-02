from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import bcrypt # Added for fix
from pathlib import Path

# Fix for Passlib/Bcrypt incompatibility error
if not hasattr(bcrypt, "__about__"):
    bcrypt.__about__ = type("About", (object,), {"__version__": bcrypt.__version__})

from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Annotated
import uuid
import sys
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
from io import BytesIO
import pandas as pd
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
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

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    error_msg = f"Validation error at {request.url.path}: {exc.errors()}"
    sys.stderr.write(error_msg + "\n")
    logging.error(error_msg)
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()},
    )

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Configuration
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-this")
ALGORITHM = "HS256"

# Connection Manager for WebSockets
class ConnectionManager:
    def __init__(self):
        self.active_connections: dict[str, set[WebSocket]] = {}

    async def connect(self, user_id: str, websocket: WebSocket):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        print(f"[WS] User {user_id} connected. Total active: {len(self.active_connections)}")

    def disconnect(self, user_id: str, websocket: WebSocket):
        if user_id in self.active_connections:
            self.active_connections[user_id].discard(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        print(f"[WS] User {user_id} disconnected. Remaining users: {len(self.active_connections)}")

    def get_online_users(self):
        return list(self.active_connections.keys())

    def is_user_online(self, user_id: str):
        return user_id in self.active_connections

manager = ConnectionManager()

# Utility functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_token(data: dict) -> str:
    return jwt.encode(data, SECRET_KEY, algorithm=ALGORITHM)

security = HTTPBearer()

async def get_current_user(credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)]):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def log_activity(username: str, role: str, activity_type: str, description: str, ip_address: str = None, user_id: str = None):
    log = ActivityLog(
        username=username,
        user_id=user_id,
        role=role,
        activity_type=activity_type,
        description=description,
        ip_address=ip_address
    )
    doc = log.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.activity_logs.insert_one(doc)
    
    # Also log to console for visibility
    print(f"[ACTIVITY] {datetime.now().strftime('%H:%M:%S')} - {role.upper()}:{username} - {activity_type}: {description}")

# Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password: str
    nama: str
    role: str  # admin, kepsek, siswa
    profile_pic: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Student(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nis: str
    nama: str
    kelas: str
    angkatan: str
    no_wa: str
    username: str
    password: str
    profile_pic: Optional[str] = None
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
    status: str = "belum"  # belum, menunggu_konfirmasi, lunas
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
    nama_pengirim: str = "" 
    bank_asal: str = ""

class SchoolProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "main_profile"
    nama_sekolah: str = "SMK MEKAR MURNI"
    alamat: str = "Jl. Pendidikan No. 123, Kota Pendidikan"
    no_telp: str = "-"
    bank_nama: str = "BRI"
    bank_rekening: str = "0000-01-000000-00-0"
    bank_atas_nama: str = "SMK MEKAR MURNI"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LoginLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    user_id: Optional[str] = None
    ip_address: str
    user_agent: str
    status: str # "success" or "failed"
    role: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_suspicious: bool = False

class ActivityLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    user_id: Optional[str] = None
    role: str
    activity_type: str # "payment", "student_mgmt", "class_mgmt", "staff_mgmt", "security"
    description: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ip_address: Optional[str] = None

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
    model_config = ConfigDict(extra="ignore")
    nis: str
    nama: str
    kelas: str
    angkatan: str
    no_wa: str
    username: str
    password: str

class ClassCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    nama_kelas: str
    nominal_spp: float

class BillGenerate(BaseModel):
    bulan: str
    tahun: int

class BillConfirm(BaseModel):
    status: str

class PaymentCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id_tagihan: str
    id_siswa: str
    jumlah: float
    nama_pengirim: str
    bank_asal: str

class ClassUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    nama_kelas: str
    nominal_spp: float

class StaffCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    username: str
    password: Optional[str] = None
    nama: str
    role: str # admin or kepsek

class SchoolProfileUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    nama_sekolah: str
    alamat: str
    no_telp: str
    bank_nama: str
    bank_rekening: str
    bank_atas_nama: str

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

    # 4. Cari Info Sekolah
    school = await db.school_profile.find_one({"id": "main_profile"}, {"_id": 0})
    if not school:
        school = {
            "nama_sekolah": "SMK MEKAR MURNI",
            "alamat": "Jl. Pendidikan No. 123, Kota Pendidikan",
            "no_telp": "-"
        }

    # 5. Buat PDF
    buffer = BytesIO()
    # Half-Letter Landscape (8.5 x 5.5 inch)
    doc = SimpleDocTemplate(buffer, pagesize=(8.5*inch, 5.5*inch), leftMargin=0.4*inch, rightMargin=0.4*inch, topMargin=0.3*inch, bottomMargin=0.3*inch)
    elements = []
    
    styles = getSampleStyleSheet()
    
    # Define styles with Courier (Monospace)
    f_bold = 'Courier-Bold'
    f_norm = 'Courier'
    
    header_style = ParagraphStyle('Header', fontSize=12, alignment=TA_CENTER, fontName=f_bold, leading=14)
    addr_style = ParagraphStyle('Addr', fontSize=9, alignment=TA_CENTER, fontName=f_norm, leading=11)
    title_style = ParagraphStyle('Title', fontSize=11, alignment=TA_CENTER, fontName=f_bold, spaceBefore=2, spaceAfter=2)
    
    label_style = ParagraphStyle('Label', fontSize=9, fontName=f_norm)
    value_style = ParagraphStyle('Value', fontSize=9, fontName=f_bold)
    
    table_header = ParagraphStyle('THeader', fontSize=9, fontName=f_bold, alignment=TA_CENTER)
    table_cell = ParagraphStyle('TCell', fontSize=9, fontName=f_norm)
    table_right = ParagraphStyle('TRight', fontSize=9, fontName=f_norm, alignment=TA_RIGHT)
    table_bold_right = ParagraphStyle('TBoldRight', fontSize=9, fontName=f_bold, alignment=TA_RIGHT)
    
    footer_style = ParagraphStyle('Footer', fontSize=9, fontName=f_norm, alignment=TA_CENTER)

    def p(text, style):
        return Paragraph(str(text), style)

    # --- 1. Header with Logo ---
    logo_path = uploads_dir / "logo.png"
    if logo_path.exists():
        # Create a table for header: [Logo, School Info]
        logo_img = Image(str(logo_path), width=0.7*inch, height=0.7*inch)
        
        school_info = [
            [p(school['nama_sekolah'].upper(), header_style)],
            [p(school['alamat'], addr_style)],
            [p(f"Telp: {school['no_telp']}", addr_style)]
        ]
        info_table = Table(school_info, colWidths=[6.5*inch])
        info_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        
        header_table = Table([[logo_img, info_table]], colWidths=[0.8*inch, 6.7*inch])
        header_table.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ]))
        elements.append(header_table)
    else:
        elements.append(p(school['nama_sekolah'].upper(), header_style))
        elements.append(p(school['alamat'], addr_style))
        elements.append(p(f"Telp: {school['no_telp']}", addr_style))
    
    # Separator Line
    line_str = "-" * 85
    elements.append(p(line_str, addr_style))
    
    # --- 2. Title ---
    elements.append(p("BUKTI PEMBAYARAN", title_style))
    
    # --- 3. Info Section (Two Columns) ---
    # Convert ISO date if needed
    tgl_bayar = payment['tanggal_bayar']
    if isinstance(tgl_bayar, str):
        try:
            tgl_dt = datetime.fromisoformat(tgl_bayar.replace('Z', '+00:00'))
            tgl_str = tgl_dt.strftime('%d-%m-%Y %H:%M:%S')
        except:
            tgl_str = tgl_bayar
    else:
        tgl_str = tgl_bayar.strftime('%d-%m-%Y %H:%M:%S')

    info_data = [
        [p("No Transaksi", label_style), p(":", label_style), p(payment['id'][:12].upper(), value_style), 
         p("", label_style), # gap
         p("Tanggal", label_style), p(":", label_style), p(tgl_str, value_style)],
        
        [p("No Induk", label_style), p(":", label_style), p(student['nis'], value_style), 
         p("", label_style), # gap
         p("Kelas", label_style), p(":", label_style), p(student['kelas'], value_style)],
        
        [p("Nama", label_style), p(":", label_style), p(student['nama'], value_style), 
         p("", label_style), p("", label_style), p("", label_style), p("", label_style)],
    ]
    
    info_table = Table(info_data, colWidths=[1.1*inch, 0.1*inch, 2.5*inch, 0.5*inch, 0.8*inch, 0.1*inch, 2.5*inch])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(info_table)
    elements.append(p(line_str, addr_style)) # Line after info
    
    # --- 4. Items Table ---
    # Reduced spacing to ensure one page
    item_data = [
        [p("No", table_header), p("Nama Pembayaran", table_header), p("Nominal", table_header)],
        [p("1", table_cell), p(f"BIAYA SPP {bill['tahun']} Bulan {bill['bulan']}", table_cell), p(f"{bill['jumlah']:,.0f}", table_right)],
    ]
    
    item_table = Table(item_data, colWidths=[0.5*inch, 5.5*inch, 1.6*inch])
    item_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('LINEBELOW', (0,0), (-1,0), 0.5, colors.black),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
    ]))
    elements.append(item_table)
    elements.append(p(line_str, addr_style))
    
    # --- 5. Totals Section ---
    total_data = [
        [p("", table_cell), p("Total   :", table_bold_right), p(f"{bill['jumlah']:,.0f}", table_bold_right)],
        [p("", table_cell), p("Tunai   :", table_cell), p(f"{bill['jumlah']:,.0f}", table_right)],
        [p("", table_cell), p("Kembali :", table_cell), p("0", table_right)],
    ]
    total_table = Table(total_data, colWidths=[5.0*inch, 1.0*inch, 1.6*inch])
    total_table.setStyle(TableStyle([
        ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
        ('LEFTPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(total_table)
    elements.append(p(line_str, addr_style))
    
    # --- 6. Signature Section ---
    # Signature moved up and made more compact
    elements.append(Spacer(1, 0.1*inch))
    
    tgl_now = datetime.now().strftime('%d-%m-%Y')
    sig_data = [
        ["", p(f"Indonesia, {tgl_now}", footer_style)],
        ["", p("Petugas", footer_style)],
        ["", Spacer(1, 0.2*inch)], # reduced from 0.3
        ["", p("Admin", footer_style)],
    ]
    
    sig_table = Table(sig_data, colWidths=[5.5*inch, 1.8*inch])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (1,0), (1,-1), 'CENTER'),
    ]))
    elements.append(sig_table)
    
    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=kuitansi_{student['nis']}_{bill['bulan']}_{bill['tahun']}.pdf"})

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

    # Check if master exists
    master_exists = await db.users.find_one({"role": "master"})
    if not master_exists:
        master_user = User(
            username="master",
            password=hash_password("master123"),
            nama="Master Administrator",
            role="master"
        )
        doc = master_user.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        await db.users.insert_one(doc)

    # Check if school profile exists
    profile_exists = await db.school_profile.find_one({"id": "main_profile"})
    if not profile_exists:
        profile = SchoolProfile()
        doc = profile.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.school_profile.insert_one(doc)

# Routes
@api_router.get("/")
async def root():
    return {"message": "SPP System API"}

# Auth Routes
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest, fastapi_request: Request):
    ip_address = fastapi_request.client.host
    user_agent = fastapi_request.headers.get("user-agent", "unknown")
    
    # Check for suspicious activity (e.g., 5 failed attempts from same IP in last 5 mins)
    five_mins_ago = (datetime.now(timezone.utc) - timedelta(minutes=5)).isoformat()
    recent_failures = await db.login_logs.count_documents({
        "ip_address": ip_address,
        "status": "failed",
        "timestamp": {"$gte": five_mins_ago}
    })
    
    is_suspicious = recent_failures >= 5
    should_auto_ban = recent_failures >= 10

    def log_attempt(status, role=None, user_id=None):
        log = LoginLog(
            username=request.username,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
            role=role,
            is_suspicious=is_suspicious
        )
        doc = log.model_dump()
        doc['timestamp'] = doc['timestamp'].isoformat()
        return db.login_logs.insert_one(doc)

    async def log_and_raise_banned(u_role, u_id):
        await log_attempt("failed (banned)", u_role, u_id)
        await log_activity(request.username, u_role, "security", "Percobaan login pada akun yang dibanned", ip_address, u_id)
        raise HTTPException(status_code=403, detail="Akun Anda telah dinonaktifkan (Banned)")

    # Try to find in users collection (admin/kepsek/master)
    user = await db.users.find_one({"username": request.username}, {"_id": 0})
    if user:
        if should_auto_ban and user.get("is_active", True):
            await db.users.update_one({"id": user['id']}, {"$set": {"is_active": False}})
            await log_activity(request.username, user['role'], "security", f"AKUN DIBANNED OTOMATIS (Terdeteksi serangan spam login dari IP {ip_address})", ip_address, user['id'])
            user['is_active'] = False

        if not user.get("is_active", True):
            await log_and_raise_banned(user['role'], user['id'])
            
        if verify_password(request.password, user['password']):
            await log_attempt("success", user['role'], user['id'])
            await log_activity(user['username'], user['role'], "security", f"Berhasil login ke sistem", ip_address, user['id'])
            token = create_token({"user_id": user['id'], "role": user['role'], "username": user['username']})
            user_data = {"id": user['id'], "username": user['username'], "nama": user['nama'], "role": user['role']}
            return {"token": token, "user": user_data}
        else:
            await log_attempt("failed", user['role'], user['id'])
            await log_activity(request.username, user['role'], "security", f"Gagal login (password salah)", ip_address, user['id'])
    
    # Try to find in students collection
    student = await db.students.find_one({"username": request.username}, {"_id": 0})
    if student:
        if should_auto_ban and student.get("is_active", True):
            await db.students.update_one({"id": student['id']}, {"$set": {"is_active": False}})
            await log_activity(request.username, "siswa", "security", f"AKUN SISWA DIBANNED OTOMATIS (Terdeteksi serangan spam login dari IP {ip_address})", ip_address, student['id'])
            student['is_active'] = False

        if not student.get("is_active", True):
            await log_and_raise_banned("siswa", student['id'])

        if verify_password(request.password, student['password']):
            await log_attempt("success", "siswa", student['id'])
            await log_activity(student['username'], "siswa", "security", f"Berhasil login ke sistem", ip_address, student['id'])
            token = create_token({"user_id": student['id'], "role": "siswa", "username": student['username']})
            user_data = {"id": student['id'], "username": student['username'], "nama": student['nama'], "role": "siswa", "nis": student['nis']}
            return {"token": token, "user": user_data}
        else:
            await log_attempt("failed", "siswa", student['id'])
            await log_activity(request.username, "siswa", "security", f"Gagal login (password salah)", ip_address, student['id'])
    
    if not user and not student:
        await log_attempt("failed (unknown user)")

    raise HTTPException(status_code=401, detail="Username atau password salah")

@app.websocket("/api/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    await manager.connect(user_id, websocket)
    try:
        while True:
            # Keep the connection open
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)

@api_router.get("/auth/online-users")
async def get_online_users(current_user: Annotated[dict, Depends(get_current_user)]):
    # Only admin/master can see full online list if needed, or everyone can see for status badges
    return manager.get_online_users()

@api_router.get("/auth/me")
async def get_me(user_data: Annotated[dict, Depends(get_current_user)]):
    return user_data

# Admin Master (Super Admin) - Staff Management
@api_router.get("/master/staff")
async def get_staff(current_user: Annotated[dict, Depends(get_current_user)]):
    if current_user.get("role") != "master":
        raise HTTPException(status_code=403, detail="Not authorized")
    staff = await db.users.find({"role": {"$in": ["admin", "kepsek"]}}, {"_id": 0}).to_list(100)
    return staff

@api_router.post("/master/staff")
async def create_staff(staff: StaffCreate, current_user: Annotated[dict, Depends(get_current_user)]):
    if current_user.get("role") != "master":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    exists = await db.users.find_one({"username": staff.username})
    if exists:
        raise HTTPException(status_code=400, detail="Username sudah digunakan")
    
    new_staff = User(
        username=staff.username,
        password=hash_password(staff.password),
        nama=staff.nama,
        role=staff.role
    )
    doc = new_staff.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    return {"message": "Akun staf berhasil dibuat", "id": new_staff.id}

@api_router.put("/master/staff/{staff_id}")
async def update_staff(staff_id: str, staff: StaffCreate, current_user: Annotated[dict, Depends(get_current_user)]):
    if current_user.get("role") != "master":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    update_data = {
        "nama": staff.nama,
        "role": staff.role
    }
    if staff.password:
        update_data["password"] = hash_password(staff.password)
    
    result = await db.users.update_one({"id": staff_id}, {"$set": update_data})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Staf tidak ditemukan")
    return {"message": "Akun staf berhasil diupdate"}

@api_router.delete("/master/staff/{staff_id}")
async def delete_staff(staff_id: str, current_user: Annotated[dict, Depends(get_current_user)]):
    if current_user.get("role") != "master":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    result = await db.users.delete_one({"id": staff_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Staf tidak ditemukan")
    return {"message": "Akun staf berhasil dihapus"}

# Master Security Features
@api_router.get("/master/login-logs")
async def get_login_logs(current_user: Annotated[dict, Depends(get_current_user)]):
    if current_user.get("role") != "master":
        raise HTTPException(status_code=403, detail="Not authorized")
    logs = await db.login_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(500).to_list(500)
    
    # Enrich with current active status
    for log in logs:
        if log.get("user_id"):
            u = await db.users.find_one({"id": log["user_id"]}, {"is_active": 1})
            if not u:
                u = await db.students.find_one({"id": log["user_id"]}, {"is_active": 1})
            log["is_user_active"] = u.get("is_active", True) if u else True
            
    return logs

@api_router.get("/master/activity-logs")
async def get_activity_logs(current_user: Annotated[dict, Depends(get_current_user)]):
    if current_user.get("role") != "master":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get last 100 activities
    logs = await db.activity_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(100).to_list(100)
    
    # Enrich with current active status
    for log in logs:
        if log.get("user_id"):
            u = await db.users.find_one({"id": log["user_id"]}, {"is_active": 1})
            if not u:
                u = await db.students.find_one({"id": log["user_id"]}, {"is_active": 1})
            log["is_user_active"] = u.get("is_active", True) if u else True
            
    return logs

@api_router.post("/master/users/{user_id}/ban")
async def ban_user(user_id: str, current_user: Annotated[dict, Depends(get_current_user)]):
    if current_user.get("role") != "master":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Search in users
    result = await db.users.update_one({"id": user_id}, {"$set": {"is_active": False}})
    if result.matched_count == 0:
        # Search in students
        result = await db.students.update_one({"id": user_id}, {"$set": {"is_active": False}})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User tidak ditemukan")
            
    return {"message": "User berhasil dibanned"}

@api_router.post("/master/users/{user_id}/unban")
async def unban_user(user_id: str, current_user: Annotated[dict, Depends(get_current_user)]):
    if current_user.get("role") != "master":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Search in users
    result = await db.users.update_one({"id": user_id}, {"$set": {"is_active": True}})
    if result.matched_count == 0:
        # Search in students
        result = await db.students.update_one({"id": user_id}, {"$set": {"is_active": True}})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="User tidak ditemukan")
            
    return {"message": "User berhasil diaktifkan kembali"}

@api_router.delete("/master/login-logs")
async def clear_login_logs(current_user: Annotated[dict, Depends(get_current_user)]):
    if current_user.get("role") != "master":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.login_logs.delete_many({})
    username = current_user.get("username", "master")
    await log_activity(username, "master", "security", "Membersihkan seluruh histori login", user_id=current_user.get("user_id"))
    return {"message": "Histori login berhasil dibersihkan"}

@api_router.delete("/master/activity-logs")
async def clear_activity_logs(current_user: Annotated[dict, Depends(get_current_user)]):
    if current_user.get("role") != "master":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.activity_logs.delete_many({})
    username = current_user.get("username", "master")
    await log_activity(username, "master", "security", "Membersihkan seluruh log aktivitas", user_id=current_user.get("user_id"))
    return {"message": "Log aktivitas berhasil dibersihkan"}

# Admin Master - School Profile
@api_router.get("/school-profile")
async def get_school_profile():
    profile = await db.school_profile.find_one({"id": "main_profile"}, {"_id": 0})
    return profile

@api_router.put("/admin/school-profile")
async def update_school_profile(profile_data: SchoolProfileUpdate, current_user: Annotated[dict, Depends(get_current_user)]):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")
    
    doc = profile_data.model_dump()
    doc['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.school_profile.update_one({"id": "main_profile"}, {"$set": doc})
    return {"message": "Profil sekolah berhasil diupdate"}

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
        angkatan=student.angkatan,
        no_wa=student.no_wa,
        username=student.username,
        password=hash_password(student.password)
    )
    doc = new_student.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.students.insert_one(doc)
    await log_activity("system", "admin", "student_mgmt", f"Menambahkan siswa baru: {student.nama} ({student.nis})")
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
        "angkatan": student.angkatan,
        "no_wa": student.no_wa,
        "username": student.username
    }
    
    if student.password:
        updated_data["password"] = hash_password(student.password)
    
    await db.students.update_one({"id": student_id}, {"$set": updated_data})
    await log_activity("system", "admin", "student_mgmt", f"Mengupdate data siswa: {exists['nama']}")
    return {"message": "Siswa berhasil diupdate"}

@api_router.delete("/students/{student_id}")
async def delete_student(student_id: str):
    exists = await db.students.find_one({"id": student_id})
    result = await db.students.delete_one({"id": student_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")
    await log_activity("system", "admin", "student_mgmt", f"Menghapus siswa: {exists['nama'] if exists else student_id}")
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
    
    # Log activity
    status_text = "mengonfirmasi (Lunas)" if confirm.status == "lunas" else f"mengubah status ke {confirm.status}"
    student = await db.students.find_one({"id": bill['id_siswa']})
    await log_activity("system", "admin", "payment", f"Admin {status_text} tagihan siswa: {student['nama'] if student else 'Unknown'}")

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
    
    student = await db.students.find_one({"id": payment.id_siswa})
    await log_activity(student['username'] if student else "unknown", "siswa", "payment", f"Melakukan pembayaran SPP sebesar Rp {payment.jumlah:,.0f}")
    
    # Update bill status menjadi "menunggu_konfirmasi"
    await db.bills.update_one(
        {"id": payment_data.id_tagihan},
        {"$set": {"status": "menunggu_konfirmasi"}} # Status diubah
    )
    
    # JANGAN kirim WA dulu di sini
    # ---------------------------
    
    return {"message": "Pembayaran berhasil dikirim, menunggu konfirmasi admin", "id": payment.id}


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
    
    student = await db.students.find_one({"id": payment['id_siswa']})
    await log_activity(student['username'] if student else "unknown", "siswa", "payment", f"Mengunggah bukti pembayaran untuk tagihan {payment['id_tagihan']}")

    return {"message": "Receipt uploaded"}


# Serve receipt file for a payment (admin or student)
@api_router.get("/payments/{payment_id}/receipt/file")
async def get_uploaded_receipt(payment_id: str, user_payload: Annotated[dict, Depends(get_current_user)]):

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
async def get_dashboard_stats(current_user: Annotated[dict, Depends(get_current_user)]):
    if current_user.get("role") not in ["admin", "kepsek", "master"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    # Total students
    total_students = await db.students.count_documents({})
    
    # Total payment this month
    now = datetime.now(timezone.utc)
    current_month_str = now.strftime("%Y-%m")
    
    monthly_payments = await db.payments.find({"status": "diterima"}, {"_id": 0}).to_list(1000)
    total_bulan_ini = sum(p["jumlah"] for p in monthly_payments if isinstance(p["tanggal_bayar"], str) and p["tanggal_bayar"].startswith(current_month_str))
    
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

@api_router.get("/dashboard/arrears-detail")
async def get_arrears_detail(current_user: Annotated[dict, Depends(get_current_user)]):
    if current_user.get("role") not in ["admin", "kepsek", "master"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Fetch all unpaid bills
    unpaid_bills = await db.bills.find({"status": "belum"}, {"_id": 0}).to_list(5000)
    
    # Group by student
    student_arrears = {}
    for bill in unpaid_bills:
        id_siswa = bill["id_siswa"]
        if id_siswa not in student_arrears:
            student_arrears[id_siswa] = {
                "total_tunggakan": 0,
                "count": 0,
                "detail_bulan": []
            }
        student_arrears[id_siswa]["total_tunggakan"] += bill["jumlah"]
        student_arrears[id_siswa]["count"] += 1
        student_arrears[id_siswa]["detail_bulan"].append(f"{bill['bulan']} {bill['tahun']}")
    
    # Enrich with student data
    result = []
    for id_siswa, data in student_arrears.items():
        student = await db.students.find_one({"id": id_siswa}, {"_id": 0})
        if student:
            result.append({
                "id": id_siswa,
                "nis": student["nis"],
                "nama": student["nama"],
                "kelas": student["kelas"],
                "total_tunggakan": data["total_tunggakan"],
                "bulan_count": data["count"],
                "detail_bulan": data["detail_bulan"]
            })
            
    # Sort by total_tunggakan descending
    result.sort(key=lambda x: x["total_tunggakan"], reverse=True)
    
    return result
    
@api_router.get("/reports/annual")
async def get_annual_report(current_user: Annotated[dict, Depends(get_current_user)]):
    if current_user.get("role") not in ["admin", "kepsek", "master"]:
        raise HTTPException(status_code=403, detail="Not authorized")
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
async def get_daily_report(current_user: Annotated[dict, Depends(get_current_user)]):
    if current_user.get("role") not in ["admin", "kepsek", "master"]:
        raise HTTPException(status_code=403, detail="Not authorized")
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
async def get_monthly_report(bulan: str, tahun: int, status: Optional[str] = None, current_user: Annotated[dict, Depends(get_current_user)] = None):
    if current_user.get("role") not in ["admin", "kepsek", "master"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Filter bills for the summary
    bills_query = {"bulan": bulan, "tahun": tahun}
    bills = await db.bills.find(bills_query, {"_id": 0}).to_list(1000)
    
    # Filter payments for this month/year context
    # Get payments that were accepted and belong to bills of this month/year OR paid in this month/year?
    # Usually, "Monthly Report" for a school means payments made FOR bills of month X.
    
    bill_ids = [b["id"] for b in bills]
    payments_query = {"id_tagihan": {"$in": bill_ids}, "status": "diterima"}
    
    if status == "lunas":
        # Only lunas bills
        bills = [b for b in bills if b["status"] == "lunas"]
    elif status == "belum":
        # Only belum lunas bills
        bills = [b for b in bills if b["status"] != "lunas"]

    payments = await db.payments.find(payments_query, {"_id": 0}).to_list(1000)
    
    # Enrich payments with student data
    enriched_payments = []
    for p in payments:
        student = await db.students.find_one({"id": p["id_siswa"]}, {"_id": 0})
        bill = await db.bills.find_one({"id": p["id_tagihan"]}, {"_id": 0})
        if student and bill:
            p["siswa"] = {"nama": student["nama"], "nis": student["nis"], "kelas": student["kelas"]}
            p["tagihan"] = {"bulan": bill["bulan"], "tahun": bill["tahun"]}
            enriched_payments.append(p)
    
    total_pemasukan = sum(p["jumlah"] for p in payments)
    total_tagihan = len(bills)
    total_lunas = len([b for b in bills if b["status"] == "lunas"])
    total_belum_lunas = len([b for b in bills if b["status"] != "lunas"])
    
    return {
        "bulan": bulan,
        "tahun": tahun,
        "total_pemasukan": total_pemasukan,
        "total_tagihan": total_tagihan,
        "total_lunas": total_lunas,
        "total_belum_lunas": total_belum_lunas,
        "payments": enriched_payments
    }

@api_router.get("/reports/student/{student_id}")
async def get_student_report(student_id: str, status: Optional[str] = None, current_user: Annotated[dict, Depends(get_current_user)] = None):
    role = current_user.get("role")
    user_id = current_user.get("user_id")
    
    # Check if authorized: Admin/Kepsek/Master can see all, Siswa only self
    is_staff = role in ["admin", "kepsek", "master"]
    is_owner = role == "siswa" and user_id == student_id
    
    if not (is_staff or is_owner):
        logging.warning(f"Unauthorized report access: {user_id} ({role}) tried to access student {student_id}")
        raise HTTPException(status_code=403, detail="Not authorized")
    
    student = await db.students.find_one({"id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(status_code=404, detail="Siswa tidak ditemukan")
    
    # Get bills for this student
    bills_query = {"id_siswa": student_id}
    if status == "lunas":
        bills_query["status"] = "lunas"
    elif status == "belum":
        bills_query["status"] = "belum"
        
    bills = await db.bills.find(bills_query, {"_id": 0}).to_list(1000)
    
    # Get all payments for this student
    payments = await db.payments.find({"id_siswa": student_id, "status": "diterima"}, {"_id": 0}).to_list(1000)
    
    total_tagihan = sum(b["jumlah"] for b in bills)
    total_dibayar = sum(p["jumlah"] for p in payments)
    
    return {
        "student": student,
        "bills": bills,
        "payments": payments,
        "summary": {
            "total_tagihan": total_tagihan,
            "total_dibayar": total_dibayar,
            "sisa_tagihan": total_tagihan - total_dibayar
        }
    }

@api_router.get("/reports/arrears")
async def get_arrears_report(current_user: Annotated[dict, Depends(get_current_user)] = None):
    if current_user.get("role") not in ["admin", "kepsek", "master"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Condition: status: "belum"
    bills = await db.bills.find({"status": "belum"}, {"_id": 0}).to_list(5000)
    
    enriched_bills = []
    for b in bills:
        student = await db.students.find_one({"id": b["id_siswa"]}, {"_id": 0})
        if student:
            b["siswa"] = {"nama": student["nama"], "nis": student["nis"], "kelas": student["kelas"]}
            enriched_bills.append(b)
            
    return enriched_bills

@api_router.get("/reports/class-recap")
async def get_class_recap_report(current_user: Annotated[dict, Depends(get_current_user)] = None):
    if current_user.get("role") not in ["admin", "kepsek", "master"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    classes = await db.classes.find({}, {"_id": 0}).to_list(100)
    recap = []
    
    for cls in classes:
        class_name = cls["nama_kelas"]
        students = await db.students.find({"kelas": class_name}, {"_id": 0}).to_list(1000)
        student_ids = [s["id"] for s in students]
        
        bills = await db.bills.find({"id_siswa": {"$in": student_ids}}, {"_id": 0}).to_list(5000)
        
        total_tagihan = sum(b["jumlah"] for b in bills)
        pembayaran_lunas = sum(b["jumlah"] for b in bills if b["status"] == "lunas")
        total_tunggakan = total_tagihan - pembayaran_lunas
        
        recap.append({
            "nama_kelas": class_name,
            "jumlah_siswa": len(students),
            "total_tagihan": total_tagihan,
            "pembayaran_lunas": pembayaran_lunas,
            "total_tunggakan": total_tunggakan
        })
        
    return recap

@api_router.get("/reports/batch/{batch}")
async def get_batch_report(batch: str, current_user: Annotated[dict, Depends(get_current_user)] = None):
    if current_user.get("role") not in ["admin", "kepsek", "master"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    # Get all students in this batch (angkatan)
    students = await db.students.find({"angkatan": batch}, {"_id": 0}).to_list(1000)
    student_ids = [s["id"] for s in students]
    
    # Get all bills for these students
    bills = await db.bills.find({"id_siswa": {"$in": student_ids}}, {"_id": 0}).to_list(10000)
    
    # Get all payments for these students
    payments = await db.payments.find({"id_siswa": {"$in": student_ids}, "status": "diterima"}, {"_id": 0}).to_list(10000)
    
    total_estimasi = sum(b["jumlah"] for b in bills)
    total_masuk = sum(p["jumlah"] for p in payments)
    
    # Per class breakdown within batch
    classes = sorted(list(set(s.get("kelas", "-") for s in students)))
    class_breakdown = []
    
    for cls in classes:
        cls_students = [s for s in students if s.get("kelas", "-") == cls]
        cls_student_ids = [s["id"] for s in cls_students]
        
        cls_bills = [b for b in bills if b["id_siswa"] in cls_student_ids]
        cls_payments = [p for p in payments if p["id_siswa"] in cls_student_ids]
        
        c_total = sum(b["jumlah"] for b in cls_bills)
        c_paid = sum(p["jumlah"] for p in cls_payments)
        
        class_breakdown.append({
            "kelas": cls,
            "student_count": len(cls_students),
            "total_tagihan": c_total,
            "total_dibayar": c_paid,
            "total_tunggakan": c_total - c_paid
        })
    
    return {
        "batch": batch,
        "total_estimasi": total_estimasi,
        "total_masuk": total_masuk,
        "total_tunggakan": total_estimasi - total_masuk,
        "student_count": len(students),
        "class_breakdown": class_breakdown
    }

import calendar

@api_router.get("/reports/export-pdf")
async def export_pdf(bulan: str, tahun: int, status: Optional[str] = None, current_user: Annotated[dict, Depends(get_current_user)] = None):
    if current_user.get("role") not in ["admin", "kepsek", "master"]:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get filtered data
    report_data = await get_monthly_report(bulan, tahun, status, current_user)
    payments = report_data["payments"]
    
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
    
    # --- Header with Logo ---
    school = await db.school_profile.find_one({"id": "main_profile"}, {"_id": 0})
    if not school:
        school = {"nama_sekolah": "SMK MEKAR MURNI", "alamat": "Jl. Pendidikan No. 123", "no_telp": "-"}

    h_style = ParagraphStyle('RepHeader', fontSize=14, fontName='Helvetica-Bold', alignment=TA_CENTER)
    a_style = ParagraphStyle('RepAddr', fontSize=10, fontName='Helvetica', alignment=TA_CENTER)
    
    logo_path = uploads_dir / "logo.png"
    if logo_path.exists():
        logo_img = Image(str(logo_path), width=0.8*inch, height=0.8*inch)
        school_info = [
            [Paragraph(school['nama_sekolah'].upper(), h_style)],
            [Paragraph(school['alamat'], a_style)],
            [Paragraph(f"Telp: {school['no_telp']}", a_style)]
        ]
        info_table = Table(school_info, colWidths=[5*inch])
        header_table = Table([[logo_img, info_table]], colWidths=[1*inch, 5.5*inch])
        header_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'MIDDLE')]))
        elements.append(header_table)
    else:
        elements.append(Paragraph(school['nama_sekolah'].upper(), h_style))
        elements.append(Paragraph(school['alamat'], a_style))
    
    elements.append(Spacer(1, 0.1*inch))
    elements.append(Paragraph("-" * 95, a_style))
    elements.append(Spacer(1, 0.2*inch))
    
    # Title
    filter_text = f" ({status.upper()})" if status and status != 'all' else ""
    title = Paragraph(f"LAPORAN PEMBAYARAN SPP BULANAN{filter_text}<br/>{bulan} {tahun}", title_style)
    elements.append(title)
    elements.append(Spacer(1, 0.2*inch))
    
    # Table data
    data = [['No', 'NIS', 'Nama', 'Kelas', 'Tgl Bayar', 'Jumlah', 'Status']]
    
    total_jumlah = 0
    for idx, p in enumerate(payments, 1):
        # Format date from ISO to DD/MM/YYYY
        tgl_bayar = "-"
        if 'tanggal_bayar' in p:
            try:
                dt = datetime.fromisoformat(p['tanggal_bayar'].replace('Z', '+00:00'))
                tgl_bayar = dt.strftime("%d/%m/%Y")
            except:
                tgl_bayar = p['tanggal_bayar'].split('T')[0]

        data.append([
            str(idx),
            p['siswa']['nis'],
            p['siswa']['nama'],
            p['siswa']['kelas'],
            tgl_bayar,
            f"Rp {p['jumlah']:,.0f}",
            p['status'].upper()
        ])
        total_jumlah += p['jumlah']
    
    # Add total row
    data.append(['', '', '', '', 'Total:', f"Rp {total_jumlah:,.0f}", ''])
    
    # Create table
    table = Table(data, colWidths=[0.4*inch, 0.8*inch, 1.8*inch, 0.8*inch, 1*inch, 1.2*inch, 1*inch])
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#fbbf24')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
    ]))
    
    elements.append(table)
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    status_suffix = f"_{status}" if status else ""
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=laporan_{bulan}_{tahun}{status_suffix}.pdf"})

@api_router.get("/reports/export-xlsx")
async def export_xlsx(bulan: str, tahun: int, status: Optional[str] = None, current_user: Annotated[dict, Depends(get_current_user)] = None):
    if current_user.get("role") not in ["admin", "kepsek", "master"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    report_data = await get_monthly_report(bulan, tahun, status, current_user)
    payments = report_data["payments"]
    
    # Prepare data
    data_list = []
    for p in payments:
        tgl_bayar = p.get('tanggal_bayar', '-').split('T')[0] if 'tanggal_bayar' in p else '-'
        data_list.append({
            'NIS': p['siswa']['nis'],
            'Nama': p['siswa']['nama'],
            'Kelas': p['siswa']['kelas'],
            'Bulan Tagihan': p['tagihan']['bulan'],
            'Tahun Tagihan': p['tagihan']['tahun'],
            'Tanggal Bayar': tgl_bayar,
            'Jumlah': p['jumlah'],
            'Status': p['status'].upper()
        })
    
    # Create Excel
    df = pd.DataFrame(data_list)
    buffer = BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Laporan SPP')
    buffer.seek(0)
    
    status_suffix = f"_{status}" if status else ""
    return StreamingResponse(buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename=laporan_{bulan}_{tahun}{status_suffix}.xlsx"})

@api_router.get("/reports/student/{student_id}/export-pdf")
async def export_student_pdf(student_id: str, status: Optional[str] = None, current_user: Annotated[dict, Depends(get_current_user)] = None):
    # Log for debugging
    logging.info(f"Export student PDF request: student={student_id}, user={current_user.get('user_id')}, status={status}")
    report = await get_student_report(student_id, status, current_user)
    student = report['student']
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=16, alignment=TA_CENTER, spaceAfter=20)
    
    # --- Header with Logo ---
    school = await db.school_profile.find_one({"id": "main_profile"}, {"_id": 0})
    if not school:
        school = {"nama_sekolah": "SMK MEKAR MURNI", "alamat": "Jl. Pendidikan No. 123", "no_telp": "-"}

    h_style = ParagraphStyle('RepHeader', fontSize=14, fontName='Helvetica-Bold', alignment=TA_CENTER)
    a_style = ParagraphStyle('RepAddr', fontSize=10, fontName='Helvetica', alignment=TA_CENTER)
    
    logo_path = uploads_dir / "logo.png"
    if logo_path.exists():
        logo_img = Image(str(logo_path), width=0.8*inch, height=0.8*inch)
        school_info = [
            [Paragraph(school['nama_sekolah'].upper(), h_style)],
            [Paragraph(school['alamat'], a_style)],
            [Paragraph(f"Telp: {school['no_telp']}", a_style)]
        ]
        info_table = Table(school_info, colWidths=[5*inch])
        header_table = Table([[logo_img, info_table]], colWidths=[1*inch, 5.5*inch])
        header_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'MIDDLE')]))
        elements.append(header_table)
    else:
        elements.append(Paragraph(school['nama_sekolah'].upper(), h_style))
        elements.append(Paragraph(school['alamat'], a_style))
    
    elements.append(Spacer(1, 0.1*inch))
    elements.append(Paragraph("-" * 95, a_style))
    elements.append(Spacer(1, 0.2*inch))
    
    status_text = f" ({status.upper()})" if status else ""
    elements.append(Paragraph(f"LAPORAN PEMBAYARAN SISWA{status_text}", title_style))
    
    info_data = [
        [Paragraph(f"Nama: <b>{student.get('nama', '-')}</b>", styles['Normal']), Paragraph(f"NIS: <b>{student.get('nis', '-')}</b>", styles['Normal'])],
        [Paragraph(f"Kelas: <b>{student.get('kelas', '-')}</b>", styles['Normal']), Paragraph(f"Angkatan: <b>{student.get('angkatan', '-')}</b>", styles['Normal'])]
    ]
    elements.append(Table(info_data, colWidths=[3*inch, 3*inch]))
    elements.append(Spacer(1, 0.2*inch))
    
    data = [['No', 'Bulan/Tahun', 'Jumlah', 'Status']]
    for idx, b in enumerate(report['bills'], 1):
        data.append([str(idx), f"{b['bulan']} {b['tahun']}", f"Rp {b['jumlah']:,.0f}", b['status'].upper()])
    
    summary = report['summary']
    data.append(['', 'Total Tagihan', f"Rp {summary['total_tagihan']:,.0f}", ''])
    data.append(['', 'Total Dibayar', f"Rp {summary['total_dibayar']:,.0f}", ''])
    data.append(['', 'Sisa Tagihan', f"Rp {summary['sisa_tagihan']:,.0f}", ''])
    
    t = Table(data, colWidths=[0.5*inch, 2.5*inch, 1.5*inch, 1.5*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -4), 1, colors.black),
        ('FONTNAME', (0, -3), (-1, -1), 'Helvetica-Bold')
    ]))
    elements.append(t)
    
    doc.build(elements)
    buffer.seek(0)
    nis_val = str(student.get('nis', 'data'))
    status_suffix = f"_{status}" if status else ""
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=laporan_siswa_{nis_val}{status_suffix}.pdf"})

@api_router.get("/reports/class/{class_name}/export-pdf")
async def export_class_pdf(class_name: str, current_user: Annotated[dict, Depends(get_current_user)]):
    report = await get_class_report(class_name, current_user)
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=16, alignment=TA_CENTER, spaceAfter=20)
    
    # --- Header with Logo ---
    school = await db.school_profile.find_one({"id": "main_profile"}, {"_id": 0})
    if not school:
        school = {"nama_sekolah": "SMK MEKAR MURNI", "alamat": "Jl. Pendidikan No. 123", "no_telp": "-"}

    h_style = ParagraphStyle('RepHeader', fontSize=14, fontName='Helvetica-Bold', alignment=TA_CENTER)
    a_style = ParagraphStyle('RepAddr', fontSize=10, fontName='Helvetica', alignment=TA_CENTER)
    
    logo_path = uploads_dir / "logo.png"
    if logo_path.exists():
        logo_img = Image(str(logo_path), width=0.8*inch, height=0.8*inch)
        school_info = [
            [Paragraph(school['nama_sekolah'].upper(), h_style)],
            [Paragraph(school['alamat'], a_style)],
            [Paragraph(f"Telp: {school['no_telp']}", a_style)]
        ]
        info_table = Table(school_info, colWidths=[5*inch])
        header_table = Table([[logo_img, info_table]], colWidths=[1*inch, 5.5*inch])
        header_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'MIDDLE')]))
        elements.append(header_table)
    else:
        elements.append(Paragraph(school['nama_sekolah'].upper(), h_style))
        elements.append(Paragraph(school['alamat'], a_style))
    
    elements.append(Spacer(1, 0.1*inch))
    elements.append(Paragraph("-" * 95, a_style))
    elements.append(Spacer(1, 0.2*inch))
    
    elements.append(Paragraph(f"LAPORAN PEMBAYARAN KELAS {class_name}", title_style))
    
    summary_data = [
        ["Total Estimasi", f"Rp {report['total_estimasi']:,.0f}"],
        ["Total Masuk", f"Rp {report['total_masuk']:,.0f}"],
        ["Total Tunggakan", f"Rp {report['total_tunggakan']:,.0f}"],
        ["Jumlah Siswa", str(report['student_count'])]
    ]
    elements.append(Table(summary_data, colWidths=[2*inch, 2*inch]))
    elements.append(Spacer(1, 0.2*inch))
    
    data = [['NIS', 'Nama', 'Tagihan', 'Dibayar', 'Status']]
    for s in report['breakdown']:
        data.append([s['nis'], s['nama'], f"Rp {s['total_tagihan']:,.0f}", f"Rp {s['total_dibayar']:,.0f}", s['status']])
    
    t = Table(data, colWidths=[1*inch, 2.5*inch, 1.2*inch, 1.2*inch, 1*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
    ]))
    elements.append(t)
    
    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=laporan_kelas_{class_name}.pdf"})

@api_router.get("/reports/batch/{batch}/export-pdf")
async def export_batch_pdf(batch: str, current_user: Annotated[dict, Depends(get_current_user)]):
    report = await get_batch_report(batch, current_user)
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=16, alignment=TA_CENTER, spaceAfter=20)
    
    # --- Header with Logo ---
    school = await db.school_profile.find_one({"id": "main_profile"}, {"_id": 0})
    if not school:
        school = {"nama_sekolah": "SMK MEKAR MURNI", "alamat": "Jl. Pendidikan No. 123", "no_telp": "-"}

    h_style = ParagraphStyle('RepHeader', fontSize=14, fontName='Helvetica-Bold', alignment=TA_CENTER)
    a_style = ParagraphStyle('RepAddr', fontSize=10, fontName='Helvetica', alignment=TA_CENTER)
    
    logo_path = uploads_dir / "logo.png"
    if logo_path.exists():
        logo_img = Image(str(logo_path), width=0.8*inch, height=0.8*inch)
        school_info = [
            [Paragraph(school['nama_sekolah'].upper(), h_style)],
            [Paragraph(school['alamat'], a_style)],
            [Paragraph(f"Telp: {school['no_telp']}", a_style)]
        ]
        info_table = Table(school_info, colWidths=[5*inch])
        header_table = Table([[logo_img, info_table]], colWidths=[1*inch, 5.5*inch])
        header_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'MIDDLE')]))
        elements.append(header_table)
    else:
        elements.append(Paragraph(school['nama_sekolah'].upper(), h_style))
        elements.append(Paragraph(school['alamat'], a_style))
    
    elements.append(Spacer(1, 0.1*inch))
    elements.append(Paragraph("-" * 95, a_style))
    elements.append(Spacer(1, 0.2*inch))
    
    elements.append(Paragraph(f"LAPORAN PEMBAYARAN ANGKATAN {batch}", title_style))
    
    data = [['Kelas', 'Siswa', 'Tagihan', 'Dibayar', 'Tunggakan']]
    for c in report['class_breakdown']:
        data.append([c['kelas'], str(c['student_count']), f"Rp {c['total_tagihan']:,.0f}", f"Rp {c['total_dibayar']:,.0f}", f"Rp {c['total_tunggakan']:,.0f}"])
    
    data.append(['TOTAL', str(report['student_count']), f"Rp {report['total_estimasi']:,.0f}", f"Rp {report['total_masuk']:,.0f}", f"Rp {report['total_tunggakan']:,.0f}"])
    
    t = Table(data, colWidths=[1.5*inch, 0.8*inch, 1.5*inch, 1.5*inch, 1.5*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold')
    ]))
    elements.append(t)
    
    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": f"attachment; filename=laporan_angkatan_{batch}.pdf"})

@api_router.get("/reports/student/{student_id}/export-xlsx")
async def export_student_xlsx(student_id: str, status: Optional[str] = None, current_user: Annotated[dict, Depends(get_current_user)] = None):
    report = await get_student_report(student_id, status, current_user)
    student = report['student']
    
    data_list = []
    for b in report['bills']:
        data_list.append({
            'Bulan': b['bulan'],
            'Tahun': b['tahun'],
            'Jumlah': b['jumlah'],
            'Status': b['status'].upper()
        })
    
    df = pd.DataFrame(data_list)
    buffer = BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Laporan Siswa')
    buffer.seek(0)
    
    nis_val = str(student.get('nis', 'data'))
    status_suffix = f"_{status}" if status else ""
    return StreamingResponse(buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename=laporan_siswa_{nis_val}{status_suffix}.xlsx"})

@api_router.get("/reports/class/{class_name}/export-xlsx")
async def export_class_xlsx(class_name: str, current_user: Annotated[dict, Depends(get_current_user)]):
    report = await get_class_report(class_name, current_user)
    
    data_list = []
    for s in report['breakdown']:
        data_list.append({
            'NIS': s['nis'],
            'Nama': s['nama'],
            'Total Tagihan': s['total_tagihan'],
            'Total Dibayar': s['total_dibayar'],
            'Tunggakan': s['total_tagihan'] - s['total_dibayar'],
            'Status': s['status']
        })
    
    df = pd.DataFrame(data_list)
    buffer = BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name=f'Kelas {class_name}')
    buffer.seek(0)
    
    return StreamingResponse(buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename=laporan_kelas_{class_name}.xlsx"})

@api_router.get("/reports/batch/{batch}/export-xlsx")
async def export_batch_xlsx(batch: str, current_user: Annotated[dict, Depends(get_current_user)]):
    report = await get_batch_report(batch, current_user)
    
    data_list = []
    for c in report['class_breakdown']:
        data_list.append({
            'Kelas': c['kelas'],
            'Jumlah Siswa': c['student_count'],
            'Total Tagihan': c['total_tagihan'],
            'Total Dibayar': c['total_dibayar'],
            'Tunggakan': c['total_tunggakan']
        })
    
    df = pd.DataFrame(data_list)
    buffer = BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name=f'Angkatan {batch}')
    buffer.seek(0)
    
    return StreamingResponse(buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": f"attachment; filename=laporan_angkatan_{batch}.xlsx"})
@api_router.get("/reports/arrears/export-pdf")
async def export_arrears_pdf(current_user: Annotated[dict, Depends(get_current_user)] = None):
    if current_user.get("role") not in ["admin", "kepsek", "master"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    bills = await get_arrears_report(current_user)
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=16, alignment=TA_CENTER, spaceAfter=20)
    
    # --- Header ---
    school = await db.school_profile.find_one({"id": "main_profile"}, {"_id": 0})
    if not school: school = {"nama_sekolah": "SMK MEKAR MURNI", "alamat": "Jl. Pendidikan No. 123", "no_telp": "-"}
    h_style = ParagraphStyle('RepHeader', fontSize=14, fontName='Helvetica-Bold', alignment=TA_CENTER)
    a_style = ParagraphStyle('RepAddr', fontSize=10, fontName='Helvetica', alignment=TA_CENTER)
    
    elements.append(Paragraph(school['nama_sekolah'].upper(), h_style))
    elements.append(Paragraph(school['alamat'], a_style))
    elements.append(Spacer(1, 0.1*inch))
    elements.append(Paragraph("-" * 95, a_style))
    elements.append(Spacer(1, 0.2*inch))
    
    elements.append(Paragraph(f"LAPORAN TUNGGAKAN SISWA", title_style))
    
    data = [['No', 'NIS', 'Nama', 'Kelas', 'Bulan/Tahun', 'Jumlah']]
    total_tunggakan = 0
    for idx, b in enumerate(bills, 1):
        data.append([
            str(idx),
            b['siswa']['nis'],
            b['siswa']['nama'],
            b['siswa']['kelas'],
            f"{b['bulan']} {b['tahun']}",
            f"Rp {b['jumlah']:,.0f}"
        ])
        total_tunggakan += b['jumlah']
    
    data.append(['', '', '', '', 'Total:', f"Rp {total_tunggakan:,.0f}"])
    
    t = Table(data, colWidths=[0.5*inch, 1*inch, 2*inch, 1*inch, 1*inch, 1.2*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -2), 1, colors.black),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold')
    ]))
    elements.append(t)
    
    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=laporan_tunggakan.pdf"})

@api_router.get("/reports/arrears/export-xlsx")
async def export_arrears_xlsx(current_user: Annotated[dict, Depends(get_current_user)] = None):
    if current_user.get("role") not in ["admin", "kepsek", "master"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    bills = await get_arrears_report(current_user)
    
    data_list = []
    for b in bills:
        data_list.append({
            'NIS': b['siswa']['nis'],
            'Nama': b['siswa']['nama'],
            'Kelas': b['siswa']['kelas'],
            'Bulan': b['bulan'],
            'Tahun': b['tahun'],
            'Jumlah': b['jumlah']
        })
    
    df = pd.DataFrame(data_list)
    buffer = BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Tunggakan')
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=laporan_tunggakan.xlsx"})

@api_router.get("/reports/class-recap/export-pdf")
async def export_class_recap_pdf(current_user: Annotated[dict, Depends(get_current_user)] = None):
    if current_user.get("role") not in ["admin", "kepsek", "master"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    recap = await get_class_recap_report(current_user)
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=16, alignment=TA_CENTER, spaceAfter=20)
    
    # --- Header ---
    school = await db.school_profile.find_one({"id": "main_profile"}, {"_id": 0})
    if not school: school = {"nama_sekolah": "SMK MEKAR MURNI", "alamat": "Jl. Pendidikan No. 123", "no_telp": "-"}
    h_style = ParagraphStyle('RepHeader', fontSize=14, fontName='Helvetica-Bold', alignment=TA_CENTER)
    a_style = ParagraphStyle('RepAddr', fontSize=10, fontName='Helvetica', alignment=TA_CENTER)
    
    elements.append(Paragraph(school['nama_sekolah'].upper(), h_style))
    elements.append(Paragraph(school['alamat'], a_style))
    elements.append(Spacer(1, 0.1*inch))
    elements.append(Paragraph("-" * 95, a_style))
    elements.append(Spacer(1, 0.2*inch))
    
    elements.append(Paragraph(f"REKAP PEMBAYARAN PER KELAS", title_style))
    
    data = [['Kelas', 'Siswa', 'Total Tagihan', 'Lunas', 'Tunggakan']]
    for c in recap:
        data.append([
            c['nama_kelas'],
            str(c['jumlah_siswa']),
            f"Rp {c['total_tagihan']:,.0f}",
            f"Rp {c['pembayaran_lunas']:,.0f}",
            f"Rp {c['total_tunggakan']:,.0f}"
        ])
    
    t = Table(data, colWidths=[1.5*inch, 0.8*inch, 1.5*inch, 1.2*inch, 1.5*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1e3a8a')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(t)
    
    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf", headers={"Content-Disposition": "attachment; filename=recap_per_kelas.pdf"})

@api_router.get("/reports/class-recap/export-xlsx")
async def export_class_recap_xlsx(current_user: Annotated[dict, Depends(get_current_user)] = None):
    if current_user.get("role") not in ["admin", "kepsek", "master"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    recap = await get_class_recap_report(current_user)
    
    data_list = []
    for c in recap:
        data_list.append({
            'Nama Kelas': c['nama_kelas'],
            'Jumlah Siswa': c['jumlah_siswa'],
            'Total Tagihan': c['total_tagihan'],
            'Lunas': c['pembayaran_lunas'],
            'Tunggakan': c['total_tunggakan']
        })
    
    df = pd.DataFrame(data_list)
    buffer = BytesIO()
    with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Rekap Kelas')
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", headers={"Content-Disposition": "attachment; filename=recap_per_kelas.xlsx"})

# Student Portal Routes

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
    await log_activity(student['username'], "siswa", "profile", "Mengubah password")
    
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

# Mount static files for uploads
uploads_dir = ROOT_DIR / 'uploads'
profiles_dir = uploads_dir / 'profiles'
profiles_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")

@api_router.get("/profile/me")
async def get_my_profile(current_user: Annotated[dict, Depends(get_current_user)]):
    role = current_user.get("role")
    user_id = current_user.get("user_id")
    
    if role == "siswa":
        profile = await db.students.find_one({"id": user_id}, {"_id": 0, "password": 0})
    else:
        profile = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@api_router.post("/profile/upload-photo")
async def upload_profile_photo(file: UploadFile = File(...), current_user: Annotated[dict, Depends(get_current_user)] = None):
    if not current_user:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    allowed_types = ["image/jpeg", "image/png", "image/jpg"]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only JPG and PNG are allowed")
        
    ext = mimetypes.guess_extension(file.content_type) or ".jpg"
    filename = f"profile_{current_user['user_id']}{ext}"
    file_path = profiles_dir / filename
    
    # Save the file
    with open(file_path, 'wb') as f:
        content = await file.read()
        f.write(content)
        
    photo_url = f"/uploads/profiles/{filename}"
    
    # Update DB
    if current_user['role'] == "siswa":
        await db.students.update_one({"id": current_user['user_id']}, {"$set": {"profile_pic": photo_url}})
    else:
        await db.users.update_one({"id": current_user['user_id']}, {"$set": {"profile_pic": photo_url}})
    
    await log_activity(current_user['username'], current_user['role'], "profile", "Mengunggah foto profil")
        
    return {"message": "Photo updated", "url": photo_url}

@api_router.put("/profile/change-password")
async def change_my_password(request: ChangePasswordRequest, current_user: Annotated[dict, Depends(get_current_user)]):
    role = current_user.get("role")
    user_id = current_user.get("user_id")
    
    if role == "siswa":
        user = await db.students.find_one({"id": user_id})
        collection = db.students
    else:
        user = await db.users.find_one({"id": user_id})
        collection = db.users
        
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not verify_password(request.old_password, user['password']):
        raise HTTPException(status_code=400, detail="Password lama salah")
        
    hashed_password = hash_password(request.new_password)
    await collection.update_one({"id": user_id}, {"$set": {"password": hashed_password}})
    
    await log_activity(current_user['username'], current_user['role'], "profile", "Mengubah password")
    
    return {"message": "Password berhasil diubah"}

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
