import React, { useEffect, useState, useContext } from 'react';
import Layout from '../../components/Layout';
import { API, AuthContext } from '../../App';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, CheckCircle, Download } from 'lucide-react'; // Ditambahkan: Download
import { Button } from '@/components/ui/button'; // Ditambahkan: Button
import { toast } from 'sonner'; // Ditambahkan: toast

const StudentPayments = () => {
  const { user } = useContext(AuthContext);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Ini adalah fungsi untuk mengambil data, sudah ada di file asli Anda
  useEffect(() => {
    if (user?.id) {
      fetchPayments();
    }
  }, [user]);

  const fetchPayments = async () => {
    try {
      const response = await axios.get(`${API}/student/payments/${user.id}`);
      setPayments(response.data);
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Gagal memuat riwayat pembayaran'); // Ditambahkan: toast error
    } finally {
      setLoading(false);
    }
  };

  // Ini adalah fungsi baru untuk mengunduh kuitansi (versi sudah diperbaiki)
  const handleDownloadReceipt = async (payment) => {
    // 1. Pengecekan status
    if (payment.status !== 'diterima') {
      toast.error("Kuitansi hanya dapat dicetak untuk pembayaran yang telah diterima.");
      return;
    }
    
    const billId = payment.id_tagihan;
    
    // 2. Pengecekan billId (ini perbaikan dari error sebelumnya)
    if (!billId) {
      toast.error("ID Tagihan tidak ditemukan untuk pembayaran ini.");
      return;
    }

    const toastId = toast.loading("Membuat kuitansi...");
    try {
      const response = await axios.get(`${API}/receipt/bill/${billId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      // Gunakan data dari bill dan siswa untuk nama file
      link.setAttribute('download', `kuitansi_${user.nis}_${payment.tagihan?.bulan}_${payment.tagihan?.tahun}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Kuitansi berhasil diunduh', { id: toastId });
    } catch (error) {
      toast.error('Gagal mengunduh kuitansi. Pembayaran mungkin belum dikonfirmasi.', { id: toastId });
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

  // Ini fungsi formatDate dari file asli Anda
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout>
      <div data-testid="student-payments-page" className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Riwayat Pembayaran</h1>
          <p className="text-gray-600">Daftar pembayaran SPP yang telah dilakukan</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <History className="w-5 h-5 text-blue-600" />
              <span>Riwayat Pembayaran SPP</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Belum ada riwayat pembayaran</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal Pembayaran</TableHead>
                      <TableHead>Bulan</TableHead>
                      <TableHead>Tahun</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Status</TableHead>
                      {/* Ditambahkan: Kolom "Aksi" */}
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id} data-testid={`payment-row-${payment.id}`}>
                        <TableCell className="font-medium">{formatDate(payment.tanggal_bayar)}</TableCell>
                        <TableCell>{payment.tagihan?.bulan}</TableCell>
                        <TableCell>{payment.tagihan?.tahun}</TableCell>
                        <TableCell className="font-semibold text-green-700">Rp {payment.jumlah.toLocaleString('id-ID')}</TableCell>
                        <TableCell>
                          {/* Diperbarui: Logika untuk Status */}
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              payment.status === 'diterima'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}
                          >
                            {payment.status === 'diterima' ? 'DITERIMA' : 'PENDING'}
                          </span>
                        </TableCell>
                        {/* Ditambahkan: Tombol "Cetak Bukti" */}
                        <TableCell className="text-right">
                          <Button
                            data-testid={`print-receipt-${payment.id}`}
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadReceipt(payment)}
                            // Ditambahkan: Logika disabled
                            disabled={payment.status !== 'diterima'}
                            className="flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            Cetak
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {payments.length > 0 && (
              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 font-medium">Total Pembayaran:</span>
                  <span className="text-2xl font-bold text-blue-900">
                    Rp {payments.reduce((sum, p) => sum + p.jumlah, 0).toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default StudentPayments;