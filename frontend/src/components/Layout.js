import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { Button } from '@/components/ui/button';
import { School, LayoutDashboard, Users, FileText, LogOut, User, CreditCard, History, GraduationCap } from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const getMenuItems = () => {
    if (user.role === 'admin') {
      return [
        { path: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/admin/students', label: 'Data Siswa', icon: Users },
        { path: '/admin/bills', label: 'Kelola Tagihan', icon: CreditCard },
        { path: '/admin/reports', label: 'Laporan', icon: FileText },
        { path: '/admin/classes', label: 'Data Kelas', icon: GraduationCap },
        { path: '/admin/bills', label: 'Kelola Tagihan', icon: CreditCard },
        { path: '/admin/reports', label: 'Laporan', icon: FileText },
      ];
    } else if (user.role === 'kepsek') {
      return [
        { path: '/kepsek/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/kepsek/reports', label: 'Laporan', icon: FileText },
      ];
    } else {
      return [
        { path: '/siswa/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { path: '/siswa/profile', label: 'Profil', icon: User },
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-gradient-to-b from-blue-900 to-indigo-900 text-white shadow-2xl z-50">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <School className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{fontFamily: 'Space Grotesk, sans-serif'}}>SPP System</h1>
              <p className="text-xs text-blue-200">SMK MEKAR MURNI</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="mb-6 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
            <p className="text-xs text-blue-200 mb-1">Logged in as</p>
            <p className="font-semibold text-sm">{user.nama}</p>
            <p className="text-xs text-blue-300 mt-1 capitalize">{user.role}</p>
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
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
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
