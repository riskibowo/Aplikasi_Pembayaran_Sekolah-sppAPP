import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { API } from '../../App';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, AlertCircle, TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

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
  ];

  return (
    <Layout>
      <div data-testid="admin-dashboard" className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Dashboard</h1>
          <p className="text-gray-600">Selamat datang di sistem pembayaran SPP</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                  <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

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
              <LineChart data={stats?.chart_data || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="bulan" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
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
