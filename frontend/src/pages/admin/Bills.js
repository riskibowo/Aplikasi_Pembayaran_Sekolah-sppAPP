import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { API } from '../../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, CheckCircle, XCircle, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AdminBills = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [generateData, setGenerateData] = useState({
    bulan: 'Januari',
    tahun: new Date().getFullYear()
  });

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      const response = await axios.get(`${API}/bills`);
      setBills(response.data);
    } catch (error) {
      toast.error('Gagal memuat data tagihan');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post(`${API}/bills/generate`, generateData);
      toast.success(response.data.message);
      setShowGenerate(false);
      fetchBills();
    } catch (error) {
      toast.error('Gagal generate tagihan');
    }
  };

  const handleConfirm = async (billId, status) => {
    try {
      await axios.put(`${API}/bills/${billId}/confirm`, { status });
      toast.success('Status tagihan berhasil diupdate');
      fetchBills();
    } catch (error) {
      toast.error('Gagal update status');
    }
  };

  const filteredBills = filterStatus === 'all'
    ? bills
    : bills.filter((b) => b.status === filterStatus);

  if (loading) {
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
      <div data-testid="admin-bills-page" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Kelola Tagihan</h1>
            <p className="text-gray-600">Generate dan konfirmasi pembayaran SPP</p>
          </div>
          <Button
            data-testid="generate-bills-button"
            onClick={() => setShowGenerate(true)}
            className="bg-gradient-to-r from-blue-900 to-indigo-700 hover:from-blue-800 hover:to-indigo-600 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Generate Tagihan
          </Button>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger data-testid="filter-status" className="w-48">
                  <SelectValue placeholder="Filter Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="belum">Belum Lunas</SelectItem>
                  <SelectItem value="menunggu_konfirmasi">Menunggu Konfirmasi</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>NIS</TableHead>
                    <TableHead>Nama Siswa</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>Bulan</TableHead>
                    <TableHead>Tahun</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                        Tidak ada data tagihan
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBills.map((bill) => (
                      <TableRow key={bill.id} data-testid={`bill-row-${bill.id}`}>
                        <TableCell className="font-medium">{bill.siswa?.nis}</TableCell>
                        <TableCell>{bill.siswa?.nama}</TableCell>
                        <TableCell>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            {bill.siswa?.kelas}
                          </span>
                        </TableCell>
                        <TableCell>{bill.bulan}</TableCell>
                        <TableCell>{bill.tahun}</TableCell>
                        <TableCell className="font-semibold text-green-700">Rp {bill.jumlah.toLocaleString('id-ID')}</TableCell>
                        <TableCell>
                          {/* --- LOGIKA TAMPILAN STATUS BARU --- */}
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              bill.status === 'lunas'
                                ? 'bg-green-100 text-green-700'
                                : bill.status === 'menunggu_konfirmasi'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {bill.status.toUpperCase().replace('_', ' ')}
                          </span>
                          {/* ---------------------------------- */}
                        </TableCell>
                        <TableCell className="text-right">
                          {/* --- LOGIKA TOMBOL AKSI BARU --- */}
                          {bill.status === 'belum' && (
                            <Button
                              data-testid={`confirm-bill-${bill.id}`}
                              size="sm"
                              onClick={() => handleConfirm(bill.id, 'lunas')}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Konfirmasi Bayar
                            </Button>
                          )}
                          {bill.status === 'menunggu_konfirmasi' && (
                            <Button
                              data-testid={`confirm-bill-online-${bill.id}`}
                              size="sm"
                              onClick={() => handleConfirm(bill.id, 'lunas')}
                              className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Setujui Pembayaran
                            </Button>
                          )}
                          {bill.status === 'lunas' && (
                            <span className="text-green-600 text-sm font-medium">✓ Lunas</span>
                          )}
                          {/* ------------------------------- */}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Generate Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Tagihan Bulanan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bulan">Bulan</Label>
              <select
                id="bulan"
                data-testid="bulan-select"
                value={generateData.bulan}
                onChange={(e) => setGenerateData({ ...generateData, bulan: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {months.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tahun">Tahun</Label>
              <Input
                id="tahun"
                data-testid="tahun-input"
                type="number"
                value={generateData.tahun}
                onChange={(e) => setGenerateData({ ...generateData, tahun: parseInt(e.target.value) })}
                required
              />
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-sm text-gray-600">
                Tagihan akan digenerate untuk semua siswa yang belum memiliki tagihan di bulan/tahun yang dipilih.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowGenerate(false)}>
                Batal
              </Button>
              <Button data-testid="submit-generate-button" type="submit" className="bg-blue-900 hover:bg-blue-800">
                Generate
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminBills;
