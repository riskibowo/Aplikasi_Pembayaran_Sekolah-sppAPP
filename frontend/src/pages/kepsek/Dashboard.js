import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { API } from '../../App';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

const KepsekDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/reports/annual`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching annual stats:', error);
      toast.error('Gagal memuat data laporan tahunan');
    } finally {
      setLoading(false);
    }
  };

  if (loading || !stats) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div data-testid="kepsek-dashboard" className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Dashboard</h1>
          <p className="text-gray-600">Ringkasan pemasukan keuangan sekolah.</p>
        </div>

        {/* Card Total Pemasukan */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card data-testid="annual-income-card" className="border-0 shadow-lg md:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Pemasukan Tahun Ini</CardTitle>
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                Rp {stats.total_pemasukan_tahun_ini.toLocaleString('id-ID')}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <CardTitle>Grafik Pemasukan Tahunan</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.chart_data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="tahun" stroke="#6b7280" />
                <YAxis 
                  stroke="#6b7280"
                  tickFormatter={(value) => `Rp ${new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(value)}`}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  formatter={(value) => `Rp ${value.toLocaleString('id-ID')}`}
                />
                <Legend />
                <Bar dataKey="pemasukan" fill="#1e3a8a" name="Pemasukan" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default KepsekDashboard;