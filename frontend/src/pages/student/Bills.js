import React, { useEffect, useState, useContext } from 'react';
import Layout from '../../components/Layout';
import { API, AuthContext } from '../../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const StudentBills = () => {
  const { user } = useContext(AuthContext);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);

  useEffect(() => {
    if (user?.id) {
      fetchBills();
    }
  }, [user]);

  const fetchBills = async () => {
    try {
      const response = await axios.get(`${API}/student/bills/${user.id}`);
      setBills(response.data);
    } catch (error) {
      toast.error('Gagal memuat tagihan');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = (bill) => {
    setSelectedBill(bill);
    setShowPayment(true);
  };

  const confirmPayment = async () => {
    try {
      await axios.post(`${API}/payments`, {
        id_tagihan: selectedBill.id,
        id_siswa: user.id,
        jumlah: selectedBill.jumlah
      });
      // --- UBAH PESAN TOAST INI ---
      toast.success('Permintaan pembayaran terkirim. Menunggu konfirmasi admin.');
      // ---------------------------
      setShowPayment(false);
      fetchBills();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal melakukan pembayaran');
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
  const pendingBills = bills.filter((b) => b.status === 'menunggu_konfirmasi');
  const paidBills = bills.filter((b) => b.status === 'lunas');

  return (
    <Layout>
      <div data-testid="student-bills-page" className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Tagihan SPP</h1>
          <p className="text-gray-600">Daftar tagihan pembayaran SPP Anda</p>
        </div>

       {/* Unpaid Bills */}
        {unpaidBills.length > 0 && (
          <Card className="border-0 shadow-lg border-l-4 border-l-red-500">
            <CardHeader>
              <CardTitle className="text-red-700 flex items-center space-x-2">
                <XCircle className="w-5 h-5" />
                <span>Tagihan Belum Lunas ({unpaidBills.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bulan</TableHead>
                    <TableHead>Tahun</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unpaidBills.map((bill) => (
                    <TableRow key={bill.id} data-testid={`unpaid-bill-${bill.id}`}>
                      <TableCell className="font-medium">{bill.bulan}</TableCell>
                      <TableCell>{bill.tahun}</TableCell>
                      <TableCell className="font-semibold text-red-700">Rp {bill.jumlah.toLocaleString('id-ID')}</TableCell>
                      <TableCell>
                        <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                          BELUM LUNAS
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {/* --- Tombol Bayar Sekarang --- */}
                        <Button
                          data-testid={`pay-bill-${bill.id}`}
                          size="sm"
                          onClick={() => handlePay(bill)}
                          className="bg-gradient-to-r from-blue-900 to-indigo-700 hover:from-blue-800 hover:to-indigo-600"
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          Bayar Sekarang
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* --- TAMBAHKAN CARD BARU INI UNTUK "MENUNGGU KONFIRMASI" --- */}
        {pendingBills.length > 0 && (
          <Card className="border-0 shadow-lg border-l-4 border-l-purple-500">
            <CardHeader>
              <CardTitle className="text-purple-700 flex items-center space-x-2">
                <History className="w-5 h-5" /> {/* Menggunakan ikon History */}
                <span>Menunggu Konfirmasi ({pendingBills.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bulan</TableHead>
                    <TableHead>Tahun</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingBills.map((bill) => (
                    <TableRow key={bill.id} data-testid={`pending-bill-${bill.id}`}>
                      <TableCell className="font-medium">{bill.bulan}</TableCell>
                      <TableCell>{bill.tahun}</TableCell>
                      <TableCell className="font-semibold text-gray-700">Rp {bill.jumlah.toLocaleString('id-ID')}</TableCell>
                      <TableCell>
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                          MENUNGGU KONFIRMASI
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          disabled
                          className="bg-gray-300"
                        >
                          Menunggu...
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        {/* ----------------------------------------------------------- */}

        {/* Paid Bills */}
        <Card className="border-0 shadow-lg border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center space-x-2">
              <CheckCircle className="w-5 h-5" />
              <span>Tagihan Lunas ({paidBills.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {paidBills.length === 0 ? (
              <p className="text-center py-8 text-gray-500">Belum ada tagihan yang lunas</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bulan</TableHead>
                    <TableHead>Tahun</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paidBills.map((bill) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-medium">{bill.bulan}</TableCell>
                      <TableCell>{bill.tahun}</TableCell>
                      <TableCell className="font-semibold text-green-700">Rp {bill.jumlah.toLocaleString('id-ID')}</TableCell>
                      <TableCell>
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          LUNAS
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Payment Confirmation Dialog */}
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Konfirmasi Pembayaran</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Bulan:</span>
                    <span className="font-semibold">{selectedBill.bulan} {selectedBill.tahun}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Jumlah:</span>
                    <span className="font-bold text-blue-900 text-xl">Rp {selectedBill.jumlah.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <p className="text-sm text-gray-700">
                  {/* --- UBAH TEKS INI --- */}
                  <strong>Catatan:</strong> Pembayaran Anda akan dicatat dan statusnya berubah menjadi "Menunggu Konfirmasi".
                  Admin akan memverifikasi pembayaran Anda.
                  {/* ------------------- */}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayment(false)}>
              Batal
            </Button>
            <Button
              data-testid="confirm-payment-button"
              onClick={confirmPayment}
              className="bg-blue-900 hover:bg-blue-800"
            >
              Konfirmasi Pembayaran
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default StudentBills;
