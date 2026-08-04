import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext, API } from '../App';
import { Button } from '@/components/ui/button';
import { 
  School, LayoutDashboard, Users, FileText, LogOut, User, 
  CreditCard, History, GraduationCap, Settings, ShieldCheck, 
  Activity, Menu, X, Database 
} from 'lucide-react';
import axios from 'axios';
import UserAvatar from './UserAvatar';

import NgrokImage from './NgrokImage';

const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
        { path: '/master/backup', label: 'Backup Sistem', icon: Database },
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
        { path: '/siswa/bills', label: 'Tagihan', icon: CreditCard },
        { path: '/siswa/payments', label: 'Riwayat', icon: History },
        { path: '/siswa/profile', label: 'Profil', icon: User },
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

  // Close sidebar when clicking a link on mobile
  const navigateAndClose = (path) => {
    navigate(path);
    setIsSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col">
      
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-[60] px-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 text-blue-900 lg:hidden"
          >
            {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
          <div className="flex items-center space-x-2">
              <div className="flex-shrink-0 flex items-center justify-center p-4">
                <NgrokImage src={logoUrl} alt="Logo" className="w-full h-full object-contain filter invert brightness-0 invert-100" />
              </div>
              <h1 className="text-lg font-bold text-blue-900 truncate max-w-[150px]" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
                SPP System
              </h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <UserAvatar
            src={profileImageUrl}
            name={profile?.nama || user?.nama}
            className="w-9 h-9 rounded-full border-2 border-blue-200 cursor-pointer"
            textClassName="text-xs text-white"
            onClick={() => navigate('/siswa/profile')}
          />
        </div>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-[70] backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-blue-900 to-indigo-900 text-white shadow-2xl z-[80] transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 flex items-center justify-center p-4 border-b border-gray-100/50 h-20">
              <NgrokImage src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>SPP System</h1>
              <p className="text-xs text-blue-200 uppercase tracking-tighter">SMK MEKAR MURNI</p>
            </div>
          </div>
          <button className="lg:hidden p-2 hover:bg-white/10 rounded-lg" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-4 flex flex-col h-[calc(100%-88px)]">
          <div className="mb-6 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 flex items-center gap-3">
            <UserAvatar
              src={profileImageUrl}
              name={profile?.nama || user?.nama}
              className="w-10 h-10 rounded-full border border-white/20 flex-shrink-0"
              textClassName="text-xs text-white"
            />
            <div className="overflow-hidden">
              <p className="font-semibold text-sm truncate">{user.nama}</p>
              <p className="text-[10px] text-blue-300 uppercase tracking-wider">{user.role}</p>
            </div>
          </div>

          <nav className="space-y-1 flex-1 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigateAndClose(item.path)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                    ? 'bg-white text-blue-900 shadow-lg'
                    : 'text-white hover:bg-white/10'
                    }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-blue-900' : 'text-blue-200 group-hover:text-white'}`} />
                  <span className="font-medium text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto pt-4">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full flex items-center justify-center space-x-2 text-white hover:bg-red-500/20 hover:text-red-100 py-6 rounded-xl border border-white/5 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-semibold">Logout</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-300 mt-16 lg:mt-0 lg:ml-64 p-4 md:p-8 pb-24 lg:pb-8`}>
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className={`lg:ml-64 py-6 text-center text-xs text-gray-500 border-t border-gray-100 bg-white/50 backdrop-blur-sm hidden md:block`}>
        <p>Copyright &copy; 2024 <strong>Riski Probo Sadewo</strong>. All Rights Reserved.</p>
      </footer>

      {/* Mobile Bottom Navigation (Only for Students) */}
      {user.role === 'siswa' && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-200 px-2 py-2 z-[60] flex justify-around items-center">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 ${isActive
                  ? 'text-blue-700 font-bold'
                  : 'text-gray-400'
                  }`}
              >
                <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-blue-50' : ''}`}>
                  <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                </div>
                <span className="text-[10px] mt-1 uppercase tracking-tight">{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}} />
    </div>
  );
};

export default Layout;

