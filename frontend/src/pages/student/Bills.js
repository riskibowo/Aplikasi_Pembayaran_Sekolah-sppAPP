import React, { useEffect, useState, useContext } from 'react';
import Layout from '../../components/Layout';
import { API, AuthContext } from '../../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input'; // Import Input ditambahkan
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, DollarSign, History } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

const StudentBills = () => {
  const { user } = useContext(AuthContext);
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPayment, setShowPayment] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);
  
  // State baru untuk data pengirim
  const [senderName, setSenderName] = useState('');
  const [bankName, setBankName] = useState('');

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
    // Reset form saat membuka dialog
    setSenderName('');
    setBankName('');
    setReceiptFile(null);
    setShowPayment(true);
  };

  const confirmPayment = async () => {
    // Validasi input
    if (!senderName || !bankName) {
      toast.error("Mohon lengkapi Nama Pemilik Rekening dan Bank Asal");
      return;
    }

    try {
      // 1) Create payment record dengan data tambahan
      const resp = await axios.post(`${API}/payments`, {
        id_tagihan: selectedBill.id,
        id_siswa: user.id,
        jumlah: selectedBill.jumlah,
        nama_pengirim: senderName, // Kirim ke backend
        bank_asal: bankName        // Kirim ke backend
      });

      const paymentId = resp.data.id;

      // 2) Upload receipt
      if (receiptFile && paymentId) {
        const formData = new FormData();
        formData.append('file', receiptFile, receiptFile.name);
        await axios.post(`${API}/payments/${paymentId}/upload_receipt`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      toast.success('Pembayaran berhasil dikirim. Menunggu verifikasi admin.');
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
          <h1 className="text-2xl md:text-4xl font-bold text-blue-900 mb-2" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Tagihan SPP</h1>
          <p className="text-sm md:text-base text-gray-600">Daftar tagihan pembayaran SPP Anda</p>
        </div>

       {/* Unpaid Bills */}
        {unpaidBills.length > 0 && (
          <Card className="border-0 shadow-lg border-l-4 border-l-red-500 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-red-700 flex items-center space-x-2 text-lg">
                <XCircle className="w-5 h-5" />
                <span>Tagihan Belum Lunas ({unpaidBills.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              {/* Desktop Table */}
              <div className="hidden md:block">
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
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden space-y-3">
                {unpaidBills.map((bill) => (
                  <div key={bill.id} className="p-4 bg-red-50/50 rounded-xl border border-red-100 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-gray-900">{bill.bulan} {bill.tahun}</p>
                        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">SPP Bulanan</p>
                      </div>
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">
                        BELUM LUNAS
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-red-100">
                      <span className="text-sm text-gray-600">Total Tagihan:</span>
                      <span className="text-lg font-extrabold text-red-700">Rp {bill.jumlah.toLocaleString('id-ID')}</span>
                    </div>
                    <Button
                      data-testid={`pay-bill-${bill.id}-mobile`}
                      onClick={() => handlePay(bill)}
                      className="w-full bg-blue-900 hover:bg-blue-800 shadow-md font-bold py-5 rounded-xl"
                    >
                      <DollarSign className="w-4 h-4 mr-2" />
                      Bayar Sekarang
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pending Bills */}
        {pendingBills.length > 0 && (
          <Card className="border-0 shadow-lg border-l-4 border-l-purple-500 overflow-hidden">
            <CardHeader>
              <CardTitle className="text-purple-700 flex items-center space-x-2 text-lg">
                <History className="w-5 h-5" />
                <span>Menunggu Konfirmasi ({pendingBills.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 md:px-6">
              <div className="hidden md:block">
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
                          <Button size="sm" disabled className="bg-gray-300">Menunggu...</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden space-y-3">
                {pendingBills.map((bill) => (
                  <div key={bill.id} className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-gray-900">{bill.bulan} {bill.tahun}</p>
                        <p className="text-xs text-gray-500 font-medium">SPP Bulanan</p>
                      </div>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-[10px] font-bold uppercase">
                        PENDING
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Jumlah:</span>
                      <span className="text-lg font-bold text-purple-700 text-right truncate max-w-[150px]">Rp {bill.jumlah.toLocaleString('id-ID')}</span>
                    </div>
                    <Button disabled className="w-full bg-gray-200 text-gray-500 rounded-xl">
                      Menunggu Verifikasi
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paid Bills */}
        <Card className="border-0 shadow-lg border-l-4 border-l-green-500 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center space-x-2 text-lg">
              <CheckCircle className="w-5 h-5" />
              <span>Tagihan Lunas ({paidBills.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 md:px-6">
            {paidBills.length === 0 ? (
              <p className="text-center py-8 text-gray-500">Belum ada tagihan yang lunas</p>
            ) : (
              <>
                <div className="hidden md:block">
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
                </div>

                {/* Mobile Card List */}
                <div className="md:hidden space-y-3">
                  {paidBills.map((bill) => (
                    <div key={bill.id} className="p-4 bg-green-50/50 rounded-xl border border-green-100 flex justify-between items-center">
                      <div>
                        <p className="font-bold text-gray-900">{bill.bulan} {bill.tahun}</p>
                        <p className="text-lg font-bold text-green-700">Rp {bill.jumlah.toLocaleString('id-ID')}</p>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                        LUNAS
                      </span>
                    </div>
                  ))}
                </div>
              </>
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

              {/* Input Data Pengirim */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="sender">Nama Pemilik Rekening</Label>
                  <Input
                    id="sender"
                    type="text"
                    placeholder="Contoh: Budi Santoso (Ayah)"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bank">Bank Asal</Label>
                  <Input
                    id="bank"
                    type="text"
                    placeholder="Contoh: BRI / Dana / BCA"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="receipt">Upload Bukti Transfer</Label>
                  <Input
                    id="receipt"
                    type="file"
                    accept="image/*,application/pdf" // Izinkan Gambar dan PDF
                    onChange={(e) => setReceiptFile(e.target.files[0])}
                    className="cursor-pointer"
                  />
                  <p className="text-xs text-gray-500">Format: JPG, PNG, atau PDF. Pastikan foto jelas.</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
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