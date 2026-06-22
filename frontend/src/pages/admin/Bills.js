import React, { useEffect, useState, useContext } from 'react';
import Layout from '../../components/Layout';
import { API, AuthContext } from '../../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, CheckCircle, Filter, Download, Search, FileText, 
  Clock, AlertCircle, RefreshCw, Printer, Eye 
} from 'lucide-react';

const AdminBills = () => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(''); // State untuk menyimpan tipe file (gambar/pdf)
  const { token } = useContext(AuthContext);
  const [showGenerate, setShowGenerate] = useState(false);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterClass, setFilterClass] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [filterYear, setFilterYear] = useState('all');

  const [generateData, setGenerateData] = useState({
    bulan: 'Januari',
    tahun: new Date().getFullYear()
  });

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  useEffect(() => {
    // Fetch data secara paralel
    setLoading(true);
    Promise.all([fetchBills(), fetchPayments(), fetchClasses()]);
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

  const fetchPayments = async () => {
    try {
      const resp = await axios.get(`${API}/payments`);
      setPayments(resp.data);
    } catch (err) {
      console.error('Error fetching payments', err);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${API}/classes`);
      setClasses(response.data);
    } catch (error) {
      console.error('Error fetching classes:', error);
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
      // Refresh both bills and payments to ensure sender info is up-to-date
      Promise.all([fetchBills(), fetchPayments()]);
    } catch (error) {
      toast.error('Gagal update status');
    }
  };

  const handleDownloadReceipt = async (billId, studentNis, bulan, tahun) => {
    try {
      const toastId = toast.loading('Mengunduh kuitansi...');
      const resp = await axios.get(`${API}/receipt/bill/${billId}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([resp.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = `kuitansi_${studentNis}_${bulan}_${tahun}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.dismiss(toastId);
      toast.success('Kuitansi berhasil diunduh');
    } catch (err) {
      toast.error('Gagal mengunduh kuitansi');
      console.error(err);
    }
  };

  // Filter Logic
  const filteredBills = bills.filter((bill) => {
    const namaSiswa = bill.siswa?.nama || '';
    const nisSiswa = bill.siswa?.nis || '';
    const matchesSearch = 
      namaSiswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
      nisSiswa.includes(searchTerm);

    const matchesStatus = filterStatus === 'all' || bill.status === filterStatus;
    const matchesClass = filterClass === 'all' || bill.siswa?.kelas === filterClass;
    const matchesMonth = filterMonth === 'all' || bill.bulan === filterMonth;
    const matchesYear = filterYear === 'all' || bill.tahun.toString() === filterYear;

    return matchesSearch && matchesStatus && matchesClass && matchesMonth && matchesYear;
  });

  // Calculate Metrics from all bills
  const totalBillsCount = bills.length;
  const totalBillsAmount = bills.reduce((sum, b) => sum + b.jumlah, 0);

  const lunasBills = bills.filter(b => b.status === 'lunas');
  const lunasCount = lunasBills.length;
  const lunasAmount = lunasBills.reduce((sum, b) => sum + b.jumlah, 0);

  const pendingBills = bills.filter(b => b.status === 'menunggu_konfirmasi');
  const pendingCount = pendingBills.length;
  const pendingAmount = pendingBills.reduce((sum, b) => sum + b.jumlah, 0);

  const unpaidBills = bills.filter(b => b.status === 'belum');
  const unpaidCount = unpaidBills.length;
  const unpaidAmount = unpaidBills.reduce((sum, b) => sum + b.jumlah, 0);

  // Dynamic Year Filter Options
  const uniqueYears = Array.from(new Set(bills.map(b => b.tahun))).sort((a, b) => b - a);
  const yearsToSelect = uniqueYears.length > 0 ? uniqueYears : [new Date().getFullYear()];

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
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Kelola Tagihan</h1>
            <p className="text-gray-600">Generate, saring, dan konfirmasi pembayaran SPP siswa</p>
          </div>
          <Button
            data-testid="generate-bills-button"
            onClick={() => setShowGenerate(true)}
            className="bg-gradient-to-r from-blue-900 to-indigo-700 hover:from-blue-800 hover:to-indigo-600 shadow-md transition-all duration-200 self-start md:self-auto"
          >
            <Plus className="w-5 h-5 mr-2" />
            Generate Tagihan
          </Button>
        </div>

        {/* Metrics Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total */}
          <Card className="border-0 border-l-4 border-indigo-600 shadow-sm bg-white hover:scale-[1.02] transition-transform duration-200">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Tagihan</p>
                <h3 className="text-2xl font-bold text-gray-800 mt-1">Rp {totalBillsAmount.toLocaleString('id-ID')}</h3>
                <p className="text-xs text-gray-500 mt-1">{totalBillsCount} total tagihan</p>
              </div>
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                <FileText className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Lunas */}
          <Card className="border-0 border-l-4 border-emerald-500 shadow-sm bg-white hover:scale-[1.02] transition-transform duration-200">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Lunas</p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-1">Rp {lunasAmount.toLocaleString('id-ID')}</h3>
                <p className="text-xs text-gray-500 mt-1">{lunasCount} tagihan dibayar</p>
              </div>
              <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl">
                <CheckCircle className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Pending */}
          <Card className="border-0 border-l-4 border-violet-500 shadow-sm bg-white hover:scale-[1.02] transition-transform duration-200">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Menunggu Konfirmasi</p>
                <h3 className="text-2xl font-bold text-violet-600 mt-1">Rp {pendingAmount.toLocaleString('id-ID')}</h3>
                <p className="text-xs text-gray-500 mt-1">{pendingCount} perlu dicek</p>
              </div>
              <div className="p-3 bg-violet-50 text-violet-500 rounded-xl">
                <Clock className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Belum Lunas */}
          <Card className="border-0 border-l-4 border-amber-500 shadow-sm bg-white hover:scale-[1.02] transition-transform duration-200">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Belum Lunas</p>
                <h3 className="text-2xl font-bold text-amber-600 mt-1">Rp {unpaidAmount.toLocaleString('id-ID')}</h3>
                <p className="text-xs text-gray-500 mt-1">{unpaidCount} belum dibayar</p>
              </div>
              <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
                <AlertCircle className="w-6 h-6" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Section */}
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-indigo-600" />
              <h3 className="font-semibold text-gray-800">Saring & Pencarian</h3>
            </div>
            {(searchTerm !== '' || filterStatus !== 'all' || filterClass !== 'all' || filterMonth !== 'all' || filterYear !== 'all') && (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setFilterClass('all');
                  setFilterMonth('all');
                  setFilterYear('all');
                }}
                className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin-hover" />
                Reset Filter
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Search Bar */}
              <div className="space-y-1.5 col-span-1 sm:col-span-2">
                <Label htmlFor="search" className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama / NIS</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Cari nama atau NIS..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10 border-gray-200 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger data-testid="filter-status" className="h-10 border-gray-200">
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="belum">Belum Lunas</SelectItem>
                    <SelectItem value="menunggu_konfirmasi">Menunggu Konfirmasi</SelectItem>
                    <SelectItem value="lunas">Lunas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Class Filter */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kelas</Label>
                <Select value={filterClass} onValueChange={setFilterClass}>
                  <SelectTrigger className="h-10 border-gray-200">
                    <SelectValue placeholder="Semua Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Kelas</SelectItem>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.nama_kelas}>
                        {cls.nama_kelas}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Month Filter */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Bulan</Label>
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="h-10 border-gray-200">
                    <SelectValue placeholder="Semua Bulan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Bulan</SelectItem>
                    {months.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Year Filter */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tahun</Label>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="h-10 border-gray-200">
                    <SelectValue placeholder="Semua Tahun" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tahun</SelectItem>
                    {yearsToSelect.map((year) => (
                      <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Table Content */}
        <Card className="border-0 shadow-sm overflow-hidden bg-white">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-slate-50 border-b border-gray-100">
                  <TableRow>
                    <TableHead className="font-semibold text-gray-600">NIS</TableHead>
                    <TableHead className="font-semibold text-gray-600">Nama Siswa</TableHead>
                    <TableHead className="font-semibold text-gray-600">Kelas</TableHead>
                    <TableHead className="font-semibold text-gray-600">Periode</TableHead>
                    <TableHead className="font-semibold text-gray-600">Jumlah</TableHead>
                    <TableHead className="font-semibold text-gray-600">Status</TableHead>
                    <TableHead className="font-semibold text-gray-600">Info Pembayaran</TableHead>
                    <TableHead className="font-semibold text-gray-600 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-gray-400">
                        Tidak ada data tagihan yang cocok dengan filter
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBills.map((bill) => (
                      <TableRow key={bill.id} data-testid={`bill-row-${bill.id}`} className="hover:bg-slate-50/50 transition-colors">
                        <TableCell className="font-mono text-sm text-gray-700">{bill.siswa?.nis}</TableCell>
                        <TableCell className="font-semibold text-gray-800">{bill.siswa?.nama}</TableCell>
                        <TableCell>
                          <span className="px-2.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-md text-xs font-semibold">
                            {bill.siswa?.kelas}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm font-medium">{bill.bulan} {bill.tahun}</TableCell>
                        <TableCell className="font-bold text-gray-900">Rp {bill.jumlah.toLocaleString('id-ID')}</TableCell>
                        <TableCell>
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 ${
                            bill.status === 'lunas'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : bill.status === 'menunggu_konfirmasi'
                                ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              bill.status === 'lunas' 
                                ? 'bg-emerald-500' 
                                : bill.status === 'menunggu_konfirmasi' 
                                  ? 'bg-purple-500' 
                                  : 'bg-amber-500'
                            }`} />
                            {bill.status === 'menunggu_konfirmasi' 
                              ? 'Menunggu Konfirmasi' 
                              : bill.status === 'lunas' 
                                ? 'Lunas' 
                                : 'Belum Lunas'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const payment = payments.find(p => p.id_tagihan === bill.id);
                            if (payment && (payment.nama_pengirim || payment.bank_asal)) {
                              return (
                                <div className="text-xs bg-slate-50/80 px-2.5 py-1.5 rounded-lg border border-slate-100 max-w-[200px] space-y-0.5">
                                  <p className="font-semibold text-gray-700 truncate">{payment.nama_pengirim || '-'}</p>
                                  <p className="text-gray-500 text-[10px] truncate">{payment.bank_asal || '-'}</p>
                                </div>
                              );
                            }
                            return <span className="text-gray-400 text-xs">-</span>;
                          })()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* JIKA STATUS BELUM LUNAS */}
                            {bill.status === 'belum' && (
                              <Button
                                data-testid={`confirm-bill-${bill.id}`}
                                size="sm"
                                onClick={() => handleConfirm(bill.id, 'lunas')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all duration-200"
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Bayar Manual
                              </Button>
                            )}

                            {/* JIKA STATUS MENUNGGU KONFIRMASI */}
                            {bill.status === 'menunggu_konfirmasi' && (
                              <>
                                {/* Tombol Lihat Bukti */}
                                {(() => {
                                  const payment = payments.find(p => p.id_tagihan === bill.id);
                                  if (!payment || !payment.receipt_path) {
                                    return (
                                      <Button size="sm" disabled className="bg-gray-100 text-gray-400">
                                        Tanpa Bukti
                                      </Button>
                                    );
                                  }
                                  return (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={async () => {
                                        try {
                                          const resp = await axios.get(`${API}/payments/${payment.id}/receipt/file`, {
                                            params: { token },
                                            responseType: 'blob'
                                          });
                                          const contentType = resp.headers['content-type'];
                                          const url = window.URL.createObjectURL(new Blob([resp.data], { type: contentType }));

                                          setPreviewUrl(url);
                                          setPreviewType(contentType);
                                          setShowPreview(true);
                                        } catch (err) {
                                          toast.error('Gagal membuka bukti pembayaran');
                                          console.error(err);
                                        }
                                      }}
                                      className="border-gray-200 bg-white hover:bg-gray-50 text-gray-700"
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      Bukti
                                    </Button>
                                  );
                                })()}

                                <Button
                                  data-testid={`confirm-bill-online-${bill.id}`}
                                  size="sm"
                                  onClick={() => handleConfirm(bill.id, 'lunas')}
                                  className="bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition-all duration-200"
                                >
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Setujui
                                </Button>
                              </>
                            )}

                            {/* JIKA STATUS LUNAS */}
                            {bill.status === 'lunas' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDownloadReceipt(bill.id, bill.siswa?.nis, bill.bulan, bill.tahun)}
                                className="border-blue-200 text-blue-700 hover:bg-blue-50 transition-colors"
                              >
                                <Printer className="w-4 h-4 mr-1" />
                                Kuitansi
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={() => { setShowPreview(false); if (previewUrl) { window.URL.revokeObjectURL(previewUrl); setPreviewUrl(null); } }}>
          <DialogContent className="sm:max-w-3xl w-full h-[80vh]">
            <DialogHeader>
              <DialogTitle>Bukti Pembayaran</DialogTitle>
            </DialogHeader>
            <div className="h-[70vh] flex items-center justify-center bg-gray-100 rounded-md overflow-hidden">
              {previewUrl ? (
                previewType && previewType.startsWith('image/') ? (
                  <img
                    src={previewUrl}
                    alt="Bukti Pembayaran"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <iframe src={previewUrl} title="Bukti Pembayaran" className="w-full h-full" />
                )
              ) : (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowPreview(false); if (previewUrl) { window.URL.revokeObjectURL(previewUrl); setPreviewUrl(null); } }}>Tutup</Button>
              <Button onClick={() => {
                if (previewUrl) {
                  const link = document.createElement('a');
                  link.href = previewUrl;
                  const ext = previewType === 'application/pdf' ? '.pdf' : '.jpg';
                  link.download = `bukti_pembayaran${ext}`;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                }
              }} className="bg-indigo-900 hover:bg-indigo-800">Unduh</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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