import React, { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { API } from '../../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FileText, Download, Calendar, User, Users, Layers, TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const AdminReports = () => {
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('monthly');

  // Selection states
  const [selectedMonth, setSelectedMonth] = useState('Januari');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');

  // Data states
  const [reportData, setReportData] = useState(null);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [batches, setBatches] = useState([]);

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [sRes, cRes] = await Promise.all([
        axios.get(`${API}/students`),
        axios.get(`${API}/classes`)
      ]);
      setStudents(sRes.data);
      setClasses(cRes.data);

      // Extract unique batches
      const uniqueBatches = [...new Set(sRes.data.map(s => s.angkatan).filter(Boolean))].sort();
      setBatches(uniqueBatches);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchReport = async () => {
    setLoading(true);
    setReportData(null);
    try {
      let url = '';
      let params = {};

      if (reportType === 'monthly') {
        url = `${API}/reports/monthly`;
        params = { bulan: selectedMonth, tahun: selectedYear, status: selectedStatus !== 'all' ? selectedStatus : undefined };
      } else if (reportType === 'student') {
        if (!selectedStudent) throw new Error('Pilih siswa terlebih dahulu');
        url = `${API}/reports/student/${selectedStudent}`;
        params = { status: selectedStatus !== 'all' ? selectedStatus : undefined };
      } else if (reportType === 'arrears') {
        url = `${API}/reports/arrears`;
      } else if (reportType === 'class-recap') {
        url = `${API}/reports/class-recap`;
      } else if (reportType === 'class') {
        if (!selectedClass) throw new Error('Pilih kelas terlebih dahulu');
        url = `${API}/reports/class/${selectedClass}`;
      } else if (reportType === 'batch') {
        if (!selectedBatch) throw new Error('Pilih angkatan terlebih dahulu');
        url = `${API}/reports/batch/${selectedBatch}`;
      }

      const response = await axios.get(url, { params });
      setReportData(response.data);
      toast.success('Laporan berhasil dimuat');
    } catch (error) {
      toast.error(error.message || 'Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  };

  // Helper to format currency
  const fmt = (val) => `Rp ${Number(val).toLocaleString('id-ID')}`;

  const exportReport = async (format) => {
    try {
      let url = '';
      let params = {};
      let filename = `laporan_${reportType}_${format}`;

      if (reportType === 'monthly') {
        url = `${API}/reports/export-${format}`;
        params = { bulan: selectedMonth, tahun: selectedYear, status: selectedStatus !== 'all' ? selectedStatus : undefined };
        filename = `laporan_bulanan_${selectedMonth}_${selectedYear}${selectedStatus !== 'all' ? '_' + selectedStatus : ''}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      } else if (reportType === 'student') {
        url = `${API}/reports/student/${selectedStudent}/export-${format}`;
        params = { status: selectedStatus !== 'all' ? selectedStatus : undefined };
        filename = `laporan_siswa_${selectedStudent}${selectedStatus !== 'all' ? '_' + selectedStatus : ''}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      } else if (reportType === 'arrears') {
        url = `${API}/reports/arrears/export-${format}`;
        filename = `laporan_tunggakan.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      } else if (reportType === 'class-recap') {
        url = `${API}/reports/class-recap/export-${format}`;
        filename = `recap_pembayaran_kelas.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      } else if (reportType === 'class') {
        url = `${API}/reports/class/${selectedClass}/export-${format}`;
        filename = `laporan_kelas_${selectedClass}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      } else if (reportType === 'batch') {
        url = `${API}/reports/batch/${selectedBatch}/export-${format}`;
        filename = `laporan_angkatan_${selectedBatch}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      }

      const response = await axios.get(url, {
        params,
        responseType: 'blob'
      });

      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success(`${format.toUpperCase()} berhasil diunduh`);
    } catch (error) {
      toast.error(`Gagal export ${format.toUpperCase()}`);
    }
  };

  return (
    <Layout>
      <div data-testid="admin-reports-page" className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Laporan Keuangan</h1>
          <p className="text-gray-600">Analisis pembayaran SPP dan tunggakan</p>
        </div>

        <Tabs value={reportType} onValueChange={(val) => { setReportType(val); setReportData(null); }} className="w-full">
          <TabsList className="grid w-full grid-cols-5 bg-blue-50">
            <TabsTrigger value="monthly" className="data-[state=active]:bg-blue-900 data-[state=active]:text-white">
              <Calendar className="w-4 h-4 mr-2" /> Bulanan
            </TabsTrigger>
            <TabsTrigger value="arrears" className="data-[state=active]:bg-blue-900 data-[state=active]:text-white">
              <TrendingUp className="w-4 h-4 mr-2" /> Tunggakan
            </TabsTrigger>
            <TabsTrigger value="class-recap" className="data-[state=active]:bg-blue-900 data-[state=active]:text-white">
              <Users className="w-4 h-4 mr-2" /> Rekap Kelas
            </TabsTrigger>
            <TabsTrigger value="student" className="data-[state=active]:bg-blue-900 data-[state=active]:text-white">
              <User className="w-4 h-4 mr-2" /> Per Siswa
            </TabsTrigger>
            <TabsTrigger value="batch" className="data-[state=active]:bg-blue-900 data-[state=active]:text-white">
              <Layers className="w-4 h-4 mr-2" /> Angkatan
            </TabsTrigger>
          </TabsList>

          <Card className="mt-6 border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-blue-900">
                Filter Laporan {reportType === 'monthly' ? 'Bulanan' : reportType === 'student' ? 'Siswa' : reportType === 'arrears' ? 'Tunggakan' : reportType === 'class-recap' ? 'Rekap Kelas' : 'Angkatan'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                {reportType === 'monthly' && (
                  <>
                    <div className="space-y-2">
                      <Label>Bulan</Label>
                      <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger><SelectValue placeholder="Pilih Bulan" /></SelectTrigger>
                        <SelectContent>{months.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Tahun</Label>
                      <Select value={selectedYear.toString()} onValueChange={v => setSelectedYear(parseInt(v))}>
                        <SelectTrigger><SelectValue placeholder="Pilih Tahun" /></SelectTrigger>
                        <SelectContent>{years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status Pembayaran</Label>
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua</SelectItem>
                          <SelectItem value="lunas">Lunas</SelectItem>
                          <SelectItem value="belum">Belum Lunas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {reportType === 'student' && (
                  <div className="space-y-2 md:col-span-2 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Pilih Siswa</Label>
                      <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                        <SelectTrigger><SelectValue placeholder="Cari Siswa..." /></SelectTrigger>
                        <SelectContent>
                          {students.map(s => <SelectItem key={s.id} value={s.id}>{s.nis} - {s.nama} ({s.kelas})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua</SelectItem>
                          <SelectItem value="lunas">Lunas</SelectItem>
                          <SelectItem value="belum">Belum Lunas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {reportType === 'class' && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Pilih Kelas</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger><SelectValue placeholder="Pilih Kelas" /></SelectTrigger>
                      <SelectContent>
                        {classes.map(c => <SelectItem key={c.id} value={c.nama_kelas}>{c.nama_kelas}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {reportType === 'batch' && (
                  <div className="space-y-2 md:col-span-2">
                    <Label>Pilih Angkatan</Label>
                    <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                      <SelectTrigger><SelectValue placeholder="Pilih Angkatan" /></SelectTrigger>
                      <SelectContent>
                        {batches.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button onClick={fetchReport} disabled={loading} className="bg-blue-900 hover:bg-blue-800">
                  {loading ? 'Memuat...' : 'Lihat Laporan'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </Tabs>

        {reportData && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {reportType === 'monthly' ? (
                <>
                  <SummaryCard title="Total Pemasukan" value={fmt(reportData.total_pemasukan)} color="green" />
                  <SummaryCard title="Total Tagihan" value={reportData.total_tagihan} color="blue" />
                  <SummaryCard title="Lunas" value={reportData.total_lunas} color="emerald" />
                  <SummaryCard title="Belum Lunas" value={reportData.total_belum_lunas} color="yellow" />
                </>
              ) : reportType === 'student' ? (
                <>
                  <SummaryCard title="Total Tagihan" value={fmt(reportData.summary.total_tagihan)} color="blue" />
                  <SummaryCard title="Total Dibayar" value={fmt(reportData.summary.total_dibayar)} color="green" />
                  <SummaryCard title="Sisa Tagihan" value={fmt(reportData.summary.sisa_tagihan)} color="red" />
                  <SummaryCard title="Status" value={reportData.summary.sisa_tagihan === 0 ? "LUNAS" : "MENUNGGAK"} color={reportData.summary.sisa_tagihan === 0 ? "emerald" : "red"} />
                </>
              ) : reportType === 'arrears' ? (
                <>
                  <SummaryCard title="Total Tunggakan" value={fmt(reportData.reduce((acc, b) => acc + b.jumlah, 0))} color="red" />
                  <SummaryCard title="Jumlah Item" value={reportData.length} color="indigo" />
                </>
              ) : reportType === 'class-recap' ? (
                <>
                  <SummaryCard title="Total Tagihan" value={fmt(reportData.reduce((acc, c) => acc + c.total_tagihan, 0))} color="blue" />
                  <SummaryCard title="Total Lunas" value={fmt(reportData.reduce((acc, c) => acc + c.pembayaran_lunas, 0))} color="green" />
                  <SummaryCard title="Total Tunggakan" value={fmt(reportData.reduce((acc, c) => acc + c.total_tunggakan, 0))} color="red" />
                  <SummaryCard title="Siswa" value={reportData.reduce((acc, c) => acc + c.jumlah_siswa, 0)} color="indigo" />
                </>
              ) : (
                <>
                  <SummaryCard title="Estimasi Total" value={fmt(reportData.total_estimasi)} color="blue" />
                  <SummaryCard title="Total Masuk" value={fmt(reportData.total_masuk)} color="green" />
                  <SummaryCard title="Total Tunggakan" value={fmt(reportData.total_tunggakan)} color="red" />
                  <SummaryCard title="Siswa" value={reportData.student_count} color="indigo" />
                </>
              )}
            </div>

            {/* Detailed Table */}
            <div className="flex justify-end space-x-3 mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportReport('pdf')}
                className="border-red-600 text-red-600 hover:bg-red-50"
              >
                <Download className="w-4 h-4 mr-2" /> PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportReport('xlsx')}
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                <Download className="w-4 h-4 mr-2" /> Excel
              </Button>
            </div>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">Detail Laporan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {reportType === 'student' && (
                        <TableRow>
                          <TableHead>Bulan / Tahun</TableHead>
                          <TableHead>Jumlah Tagihan</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      )}
                      {(reportType === 'class' || reportType === 'batch') && (
                        <TableRow>
                          <TableHead>{reportType === 'class' ? 'Nama Siswa' : 'Kelas'}</TableHead>
                          <TableHead>{reportType === 'class' ? 'NIS' : 'Jml Siswa'}</TableHead>
                          <TableHead>Total Tagihan</TableHead>
                          <TableHead>Total Dibayar</TableHead>
                          <TableHead>Tunggakan</TableHead>
                          {reportType === 'class' && <TableHead>Status</TableHead>}
                        </TableRow>
                      )}
                      {reportType === 'arrears' && (
                        <TableRow>
                          <TableHead>Siswa</TableHead>
                          <TableHead>Kelas</TableHead>
                          <TableHead>Bulan/Tahun</TableHead>
                          <TableHead>Nominal</TableHead>
                        </TableRow>
                      )}
                      {reportType === 'class-recap' && (
                        <TableRow>
                          <TableHead>Nama Kelas</TableHead>
                          <TableHead>Jumlah Siswa</TableHead>
                          <TableHead>Total Tagihan</TableHead>
                          <TableHead>Pembayaran Lunas</TableHead>
                          <TableHead>Total Tunggakan</TableHead>
                        </TableRow>
                      )}
                      {reportType === 'monthly' && (
                        <TableRow>
                          <TableHead>Siswa</TableHead>
                          <TableHead>Kelas</TableHead>
                          <TableHead>Bulan/Tahun</TableHead>
                          <TableHead>Tgl Bayar</TableHead>
                          <TableHead>Metode</TableHead>
                          <TableHead>Jumlah</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      )}
                    </TableHeader>
                    <TableBody>
                      {reportType === 'student' && reportData.bills.map((b, i) => (
                        <TableRow key={i}>
                          <TableCell>{b.bulan} {b.tahun}</TableCell>
                          <TableCell>{fmt(b.jumlah)}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${b.status === 'lunas' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {b.status.toUpperCase()}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {reportType === 'class' && reportData.breakdown.map((s, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{s.nama}</TableCell>
                          <TableCell>{s.nis}</TableCell>
                          <TableCell>{fmt(s.total_tagihan)}</TableCell>
                          <TableCell className="text-green-600">{fmt(s.total_dibayar)}</TableCell>
                          <TableCell className="text-red-600">{fmt(s.total_tagihan - s.total_dibayar)}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${s.status === 'Lunas' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {s.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                      {reportType === 'batch' && reportData.class_breakdown.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{c.kelas}</TableCell>
                          <TableCell>{c.student_count}</TableCell>
                          <TableCell>{fmt(c.total_tagihan)}</TableCell>
                          <TableCell className="text-green-600">{fmt(c.total_dibayar)}</TableCell>
                          <TableCell className="text-red-600">{fmt(c.total_tunggakan)}</TableCell>
                        </TableRow>
                      ))}
                      {reportType === 'arrears' && reportData.map((b, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{b.siswa?.nama}</TableCell>
                          <TableCell>{b.siswa?.kelas}</TableCell>
                          <TableCell>{b.bulan} {b.tahun}</TableCell>
                          <TableCell className="text-red-600 font-semibold">{fmt(b.jumlah)}</TableCell>
                        </TableRow>
                      ))}
                      {reportType === 'class-recap' && reportData.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{c.nama_kelas}</TableCell>
                          <TableCell>{c.jumlah_siswa}</TableCell>
                          <TableCell>{fmt(c.total_tagihan)}</TableCell>
                          <TableCell className="text-green-600 font-semibold">{fmt(c.pembayaran_lunas)}</TableCell>
                          <TableCell className="text-red-600 font-semibold">{fmt(c.total_tunggakan)}</TableCell>
                        </TableRow>
                      ))}
                      {reportType === 'monthly' && reportData.payments.map((p, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{p.siswa?.nama}</TableCell>
                          <TableCell>{p.siswa?.kelas}</TableCell>
                          <TableCell>{p.tagihan?.bulan} {p.tagihan?.tahun}</TableCell>
                          <TableCell>{p.tanggal_bayar ? new Date(p.tanggal_bayar).toLocaleDateString('id-ID') : '-'}</TableCell>
                          <TableCell>{p.metode}</TableCell>
                          <TableCell className="font-semibold">{fmt(p.jumlah)}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold uppercase">
                              {p.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
};

const SummaryCard = ({ title, value, color }) => {
  const colors = {
    blue: 'border-blue-200 text-blue-900',
    green: 'border-green-200 text-green-700',
    red: 'border-red-200 text-red-600',
    yellow: 'border-yellow-200 text-yellow-600',
    emerald: 'border-emerald-200 text-emerald-600',
    indigo: 'border-indigo-200 text-indigo-600',
  };

  return (
    <Card className={`border-2 ${colors[color] || 'border-gray-200 shadow-sm'}`}>
      <CardContent className="pt-6">
        <p className="text-sm text-gray-500 mb-1 font-medium">{title}</p>
        <p className="text-2xl font-bold truncate">{value}</p>
      </CardContent>
    </Card>
  );
};

export default AdminReports;
