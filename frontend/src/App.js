// 1. Import React sudah ditambahkan di sini
import React, { useEffect, useState } from "react"; 
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";

// 2. INI ADALAH PERBAIKAN PENTING:
//    Impor Toaster dan toast langsung dari 'sonner'
import { Toaster, toast } from "sonner"; 

// Pages
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminStudents from "./pages/admin/Students";
import AdminBills from "./pages/admin/Bills";
import AdminReports from "./pages/admin/Reports";
// 3. Impor halaman baru yang kita buat
import AdminClasses from "./pages/admin/Classes"; 
import KepsekDashboard from "./pages/kepsek/Dashboard";
import KepsekReports from "./pages/kepsek/Reports";
import StudentDashboard from "./pages/student/Dashboard";
import StudentProfile from "./pages/student/Profile";
import StudentBills from "./pages/student/Bills";
import StudentPayments from "./pages/student/Payments";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
export const AuthContext = React.createContext();

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Verify token
      const userData = JSON.parse(localStorage.getItem("user") || "null");
      setUser(userData);
    }
    setLoading(false);
  }, [token]);

  const login = (userData, tokenData) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem("token", tokenData);
    localStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logout berhasil");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      <div className="App">
        <BrowserRouter>
          {/* 4. Toaster hanya diletakkan SATU KALI di sini */}
          <Toaster position="top-right" richColors /> 
          <Routes>
            <Route path="/" element={!user ? <LoginPage /> : <Navigate to={`/${user.role}/dashboard`} />} />
            
            {/* Admin Routes */}
            <Route path="/admin/dashboard" element={user?.role === "admin" ? <AdminDashboard /> : <Navigate to="/" />} />
            <Route path="/admin/students" element={user?.role === "admin" ? <AdminStudents /> : <Navigate to="/" />} />
            <Route path="/admin/bills" element={user?.role === "admin" ? <AdminBills /> : <Navigate to="/" />} />
            <Route path="/admin/reports" element={user?.role === "admin" ? <AdminReports /> : <Navigate to="/" />} />
            {/* 5. Rute baru ditambahkan di sini */}
            <Route path="/admin/classes" element={user?.role === "admin" ? <AdminClasses /> : <Navigate to="/" />} />
            
            {/* Kepala Sekolah Routes */}
            <Route path="/kepsek/dashboard" element={user?.role === "kepsek" ? <KepsekDashboard /> : <Navigate to="/" />} />
            <Route path="/kepsek/reports" element={user?.role === "kepsek" ? <KepsekReports /> : <Navigate to="/" />} />
            
            {/* Student Routes */}
            <Route path="/siswa/dashboard" element={user?.role === "siswa" ? <StudentDashboard /> : <Navigate to="/" />} />
            <Route path="/siswa/profile" element={user?.role === "siswa" ? <StudentProfile /> : <Navigate to="/" />} />
            <Route path="/siswa/bills" element={user?.role === "siswa" ? <StudentBills /> : <Navigate to="/" />} />
            <Route path="/siswa/payments" element={user?.role === "siswa" ? <StudentPayments /> : <Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
        {/* <Toaster> yang duplikat dihapus dari sini */}
      </div>
    </AuthContext.Provider>
  );
}

// 6. Import React di bagian bawah sudah dihapus
export default App;