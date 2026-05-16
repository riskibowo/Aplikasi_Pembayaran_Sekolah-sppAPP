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
          <h1 className="text-2xl md:text-4xl font-bold text-blue-900 mb-2" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Dashboard Siswa</h1>
          <p className="text-sm md:text-base text-gray-600">Selamat datang, <span className="font-semibold text-blue-800">{user.nama}</span></p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {statCards.map((card, index) => {
            const Icon = card.icon;
            return (
              <Card key={index} data-testid={card.testid} className="border-0 shadow-md hover:shadow-xl transition-shadow overflow-hidden flex flex-col">
                <div className={`h-1.5 bg-gradient-to-r ${card.color}`}></div>
                <CardHeader className="flex flex-row items-center justify-between pb-1 pt-4 px-4 space-y-0">
                  <CardTitle className="text-[10px] md:text-sm font-medium text-gray-500 uppercase tracking-wider">{card.title}</CardTitle>
                  <div className={`w-8 h-8 md:w-10 md:h-10 rounded-lg bg-gradient-to-br ${card.color} flex items-center justify-center shadow-sm shrink-0`}>
                    <Icon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="text-lg md:text-2xl font-bold text-gray-900 truncate">{card.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Unpaid Bills */}
        {unpaidBills.length > 0 && (
          <Card className="border-0 shadow-lg border-l-4 border-l-red-500 overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-700 text-lg flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Tagihan Belum Lunas
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              <div className="space-y-2 md:space-y-3">
                {unpaidBills.slice(0, 5).map((bill) => (
                  <div key={bill.id} className="flex items-center justify-between p-3 md:p-4 bg-red-50/50 hover:bg-red-50 rounded-xl border border-red-100/50 transition-colors">
                    <div className="flex flex-col">
                      <p className="font-bold text-gray-900 text-sm md:text-base">{bill.bulan} {bill.tahun}</p>
                      <p className="text-[10px] md:text-sm text-gray-500 font-medium">SPP Bulanan</p>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-red-700 text-sm md:text-lg">Rp {bill.jumlah.toLocaleString('id-ID')}</p>
                      <span className="text-[9px] md:text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold uppercase tracking-tight">BELUM LUNAS</span>
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
