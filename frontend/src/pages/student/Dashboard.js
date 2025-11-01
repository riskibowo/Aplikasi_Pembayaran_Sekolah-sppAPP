import React, { useEffect, useState, useContext } from 'react';
import Layout from '../../components/Layout';
import { API, AuthContext } from '../../App';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, FileText, CheckCircle, AlertCircle } from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);
  const [bills, setBills] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [billsRes, paymentsRes] = await Promise.all([
        axios.get(`${API}/student/bills/${user.id}`),
        axios.get(`${API}/student/payments/${user.id}`)
      ]);
      setBills(billsRes.data);
      setPayments(paymentsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
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

  const unpaidBills = bills.filter((b) => b.status === 'belum');
  const paidBills = bills.filter((b) => b.status === 'lunas');
  const totalUnpaid = unpaidBills.reduce((sum, b) => sum + b.jumlah, 0);
  const totalPaid = payments.reduce((sum, p) => sum + p.jumlah, 0);

  const statCards = [
    {
      title: 'Total Tunggakan',
      value: `Rp ${totalUnpaid.toLocaleString('id-ID')}`,
      icon: AlertCircle,
      color: 'from-red-500 to-red-600',
      testid: 'total-unpaid'
    },
    {
      title: 'Total Sudah Dibayar',
      value: `Rp ${totalPaid.toLocaleString('id-ID')}`,
      icon: CheckCircle,
      color: 'from-green-500 to-green-600',
      testid: 'total-paid'
    },
    {
      title: 'Tagihan Belum Lunas',
      value: unpaidBills.length,
      icon: FileText,
      color: 'from-yellow-500 to-yellow-600',
      testid: 'unpaid-bills-count'
    },
    {
      title: 'Tagihan Lunas',
      value: paidBills.length,
      icon: DollarSign,
      color: 'from-blue-500 to-blue-600',
      testid: 'paid-bills-count'
    },
  ];

  return (
    <Layout>
      <div data-testid="student-dashboard" className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Dashboard Siswa</h1>
          <p className="text-gray-600">Selamat datang, {user.nama}</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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

        {/* Recent Unpaid Bills */}
        {unpaidBills.length > 0 && (
          <Card className="border-0 shadow-lg border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="text-red-700">Tagihan Belum Lunas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {unpaidBills.slice(0, 5).map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
                    <div>
                      <p className="font-semibold text-gray-900">{bill.bulan} {bill.tahun}</p>
                      <p className="text-sm text-gray-600">SPP Bulanan</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-700">Rp {bill.jumlah.toLocaleString('id-ID')}</p>
                      <span className="text-xs text-red-600 font-medium">BELUM LUNAS</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default StudentDashboard;
