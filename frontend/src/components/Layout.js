import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext, API } from '../App';
import { Button } from '@/components/ui/button';
import { School, LayoutDashboard, Users, FileText, LogOut, User, CreditCard, History, GraduationCap, Settings, ShieldCheck, Activity } from 'lucide-react';
import axios from 'axios';

const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get(`${API}/profile/me`);
        setProfile(res.data);
      } catch (err) {
        console.error("Failed to fetch profile in layout");
      }
    };
    fetchProfile();
  }, []);

  const getMenuItems = () => {
    const baseItems = [];
    if (user.role === 'admin') {
      return [
        { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/admin/profile', label: 'Profil Saya', icon: User },
        { path: '/admin/students', label: 'Data Siswa', icon: Users },
        { path: '/admin/bills', label: 'Kelola Tagihan', icon: CreditCard },
        { path: '/admin/reports', label: 'Laporan', icon: FileText },
        { path: '/admin/classes', label: 'Data Kelas', icon: GraduationCap },
        { path: '/admin/settings', label: 'Pengaturan Sekolah', icon: Settings },
      ];
    } else if (user.role === 'master') {
      return [
        { path: '/master/dashboard', label: 'Dashboard Master', icon: LayoutDashboard },
        { path: '/master/profile', label: 'Profil Saya', icon: User },
        { path: '/master/staff', label: 'Kelola Staf', icon: ShieldCheck },
        { path: '/master/login-traffic', label: 'Monitoring Login', icon: Activity },
      ];
    } else if (user.role === 'kepsek') {
      return [
        { path: '/kepsek/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/kepsek/profile', label: 'Profil Saya', icon: User },
        { path: '/kepsek/reports', label: 'Laporan Seluruh', icon: FileText },
      ];
    } else {
      return [
        { path: '/siswa/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/siswa/profile', label: 'Profil Saya', icon: User },
        { path: '/siswa/bills', label: 'Tagihan SPP', icon: CreditCard },
        { path: '/siswa/payments', label: 'Riwayat Pembayaran', icon: History },
      ];
    }
  };

  const menuItems = getMenuItems();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const profileImageUrl = profile?.profile_pic
    ? (profile.profile_pic.startsWith('http') ? profile.profile_pic : `${process.env.REACT_APP_BACKEND_URL}${profile.profile_pic}`)
    : null;

  const logoUrl = `${process.env.REACT_APP_BACKEND_URL}/uploads/logo.png`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-blue-900 to-indigo-900 text-white shadow-2xl z-50">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden p-1 shadow-inner">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" onError={(e) => {
                e.target.onerror = null;
                e.target.src = 'https://ui-avatars.com/api/?name=SMK&background=fff&color=1e3a8a';
              }} />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>SPP System</h1>
              <p className="text-xs text-blue-200">SMK MEKAR MURNI</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-6 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/20">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt="User" className="w-full h-full object-cover" />
              ) : (
                <User className="w-5 h-5 text-blue-200" />
              )}
            </div>
            <div className="overflow-hidden">
              <p className="font-semibold text-sm truncate">{user.nama}</p>
              <p className="text-[10px] text-blue-300 uppercase tracking-wider">{user.role}</p>
            </div>
          </div>

          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${isActive
                    ? 'bg-white text-blue-900 shadow-lg'
                    : 'text-white hover:bg-white/10'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="absolute bottom-6 left-4 right-4">
          <Button
            data-testid="logout-button"
            onClick={handleLogout}
            variant="ghost"
            className="w-full flex items-center justify-center space-x-2 text-white hover:bg-white/10 hover:text-white py-3 rounded-xl"
          >
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="ml-64 py-4 text-center text-xs text-gray-500 border-t border-gray-200">
        <p>Powered by <strong>Riski Probo Sadewo</strong></p>
      </footer>
    </div>
  );
};

export default Layout;
