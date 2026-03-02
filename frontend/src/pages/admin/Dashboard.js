import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { API } from '../../App';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, AlertCircle, TrendingUp, Info, Search } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [arrearsDetail, setArrearsDetail] = useState([]);
  const [showArrears, setShowArrears] = useState(false);
  const [loadingArrears, setLoadingArrears] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchStats();
    fetchOnlineCount();
    const interval = setInterval(fetchOnlineCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchOnlineCount = async () => {
    try {
      const response = await axios.get(`${API}/auth/online-users`);
      setOnlineCount(response.data.length);
    } catch (error) {
      console.error('Error fetching online count:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArrears = async () => {
    setLoadingArrears(true);
    try {
      const response = await axios.get(`${API}/dashboard/arrears-detail`);
      setArrearsDetail(response.data);
      setShowArrears(true);
    } catch (error) {
      toast.error('Gagal memuat detail tunggakan');
    } finally {
      setLoadingArrears(false);
    }
  };

  const filteredArrears = arrearsDetail.filter(s =>
    s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.nis.includes(searchTerm) ||
    s.kelas.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
        </div>
      </Layout>
    );
  }

  const statCards = [
    {
      title: 'Total Siswa',
      value: stats?.total_siswa || 0,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      testid: 'total-students'
    },
    {
      title: 'Pemasukan Bulan Ini',
      value: `Rp ${(stats?.total_bulan_ini || 0).toLocaleString('id-ID')}`,
      icon: DollarSign,
      color: 'from-green-500 to-green-600',
      testid: 'monthly-income'
    },
    {
      title: 'Siswa Menunggak',
      value: stats?.siswa_menunggak || 0,
      icon: AlertCircle,
      color: 'from-red-500 to-red-600',
      testid: 'students-debt'
    },
    {
      title: 'User Online',
      value: onlineCount,
      icon: TrendingUp,
      color: 'from-purple-500 to-purple-600',
      testid: 'online-users'
    },
  ];

  const gridCols = `grid grid-cols-1 md:grid-cols-${statCards.length} gap-6`;

  return (
    <Layout>
      <div data-testid="admin-dashboard" className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Dashboard</h1>
          <p className="text-gray-600">Selamat datang di sistem pembayaran SPP</p>
        </div>

        {/* Stats Cards */}
        <div className={gridCols}>
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card key={index} data-testid={card.testid} className="border-0 shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${card.color}`}></div>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">{card.title}</CardTitle>
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                    {card.title === 'Siswa Menunggak' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 p-0 h-auto font-medium text-xs flex items-center gap-1"
                        onClick={fetchArrears}
                        disabled={loadingArrears}
                      >
                        {loadingArrears ? '...' : (
                          <>
                            <Info className="w-3.5 h-3.5" />
                            Detail
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Modal Detail Tunggakan */}
        <Dialog open={showArrears} onOpenChange={setShowArrears}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-blue-900">Detail Siswa Menunggak</DialogTitle>
              <DialogDescription>
                Daftar siswa yang masih memiliki tagihan SPP yang belum dibayar.
              </DialogDescription>
            </DialogHeader>

            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Cari nama, NIS, atau kelas..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="mt-4 border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>SISWA</TableHead>
                    <TableHead>KELAS</TableHead>
                    <TableHead>JML BULAN</TableHead>
                    <TableHead className="text-right">TOTAL TUNGGAKAN</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredArrears.length > 0 ? (
                    filteredArrears.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div className="font-medium text-gray-900">{s.nama}</div>
                          <div className="text-xs text-gray-500">NIS: {s.nis}</div>
                        </TableCell>
                        <TableCell>{s.kelas}</TableCell>
                        <TableCell>
                          <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-semibold">
                            {s.bulan_count} Bulan
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          Rp {s.total_tunggakan.toLocaleString('id-ID')}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        Tidak ada data yang ditemukan.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="mt-4 text-xs text-gray-500 italic">
              * Data di atas mencakup seluruh tagihan dengan status 'BELUM DIBAYAR'.
            </div>
          </DialogContent>
        </Dialog>

        {/* Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <CardTitle>Grafik Pemasukan (6 Bulan Terakhir)</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats?.chart_data || []} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="bulan" stroke="#6b7280" />
                <YAxis
                  stroke="#6b7280"
                  tickFormatter={(value) => `Rp ${new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(value)}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value) => `Rp ${value.toLocaleString('id-ID')}`}
                />
                <Legend />
                <Line type="monotone" dataKey="pemasukan" stroke="#1e3a8a" strokeWidth={3} dot={{ fill: '#1e3a8a', r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminDashboard;
