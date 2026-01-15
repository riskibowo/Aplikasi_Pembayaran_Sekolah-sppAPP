import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { API } from '../../App';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Users, AlertCircle, Calendar } from 'lucide-react';
import {
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { toast } from 'sonner';

const KepsekDashboard = () => {
  const [stats, setStats] = useState(null);
  const [monthlyStats, setMonthlyStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setError(null);
      const [annualRes, monthlyRes] = await Promise.all([
        axios.get(`${API}/reports/annual`),
        axios.get(`${API}/dashboard/stats`)
      ]);
      setStats(annualRes.data);
      setMonthlyStats(monthlyRes.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Gagal memuat data dashboard. Silakan coba muat ulang halaman.');
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
        </div>
      </Layout>
    );
  }

  if (error || !stats || !monthlyStats) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <p className="text-red-600 font-medium">{error || 'Data tidak lengkap'}</p>
          <button
            onClick={fetchData}
            className="px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </Layout>
    );
  }

  const quickStats = [
    {
      title: 'Total Siswa',
      value: monthlyStats.total_siswa,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Pemasukan Bulan Ini',
      value: `Rp ${monthlyStats.total_bulan_ini.toLocaleString('id-ID')}`,
      icon: DollarSign,
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'Siswa Menunggak',
      value: monthlyStats.siswa_menunggak,
      icon: AlertCircle,
      color: 'from-red-500 to-red-600',
    },
  ];

  return (
    <Layout>
      <div data-testid="kepsek-dashboard" className="space-y-8 pb-10">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Dashboard</h1>
            <p className="text-gray-600">Ringkasan operasional dan keuangan sekolah.</p>
          </div>
          <div className="hidden md:block">
            <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 border border-blue-100">
              <Calendar className="w-4 h-4" />
              {new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>

        {/* Quick Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickStats.map((stat, idx) => (
            <Card key={idx} className="border-0 shadow-lg hover:shadow-xl transition-shadow overflow-hidden">
              <div className={`h-1.5 bg-gradient-to-r ${stat.color}`}></div>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-inner`}>
                  <stat.icon className="w-5 h-5 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Monthly Trend */}
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                <CardTitle>Tren Pemasukan (6 Bulan Terakhir)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyStats.chart_data} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
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
                  <Line type="monotone" dataKey="pemasukan" stroke="#1e3a8a" strokeWidth={3} dot={{ fill: '#1e3a8a', r: 5 }} name="Pemasukan" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Annual Overview Card */}
          <Card className="border-0 shadow-lg flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                <CardTitle>Tinjauan Tahunan</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-center gap-4">
              <div className="p-6 bg-gradient-to-br from-blue-900 to-indigo-950 rounded-2xl text-white shadow-xl">
                <p className="text-blue-200 text-sm font-medium mb-1">Total Pemasukan Tahun Ini</p>
                <h2 className="text-3xl font-bold">Rp {stats.total_pemasukan_tahun_ini.toLocaleString('id-ID')}</h2>
              </div>

              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.chart_data}>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      formatter={(value) => `Rp ${value.toLocaleString('id-ID')}`}
                    />
                    <Bar dataKey="pemasukan" fill="#fbbf24" radius={[4, 4, 0, 0]} name="Pemasukan Tahunan" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default KepsekDashboard;