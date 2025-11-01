import React, { useState } from 'react';
import Layout from '../../components/Layout';
import { API } from '../../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { FileText, Download, Calendar } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const AdminReports = () => {
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState('Januari');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [reportData, setReportData] = useState(null);

  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/reports/monthly`, {
        params: { bulan: selectedMonth, tahun: selectedYear }
      });
      setReportData(response.data);
      toast.success('Laporan berhasil dimuat');
    } catch (error) {
      toast.error('Gagal memuat laporan');
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = async () => {
    try {
      const response = await axios.get(`${API}/reports/export-pdf`, {
        params: { bulan: selectedMonth, tahun: selectedYear },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `laporan_${selectedMonth}_${selectedYear}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('PDF berhasil diunduh');
    } catch (error) {
      toast.error('Gagal export PDF');
    }
  };

  const exportExcel = async () => {
    try {
      const response = await axios.get(`${API}/reports/export-excel`, {
        params: { bulan: selectedMonth, tahun: selectedYear },
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `laporan_${selectedMonth}_${selectedYear}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('Excel berhasil diunduh');
    } catch (error) {
      toast.error('Gagal export Excel');
    }
  };

  return (
    <Layout>
      <div data-testid="admin-reports-page" className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Laporan Keuangan</h1>
          <p className="text-gray-600">Laporan pembayaran SPP dan export data</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span>Pilih Periode Laporan</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Bulan</Label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger data-testid="select-month">
                    <SelectValue placeholder="Pilih Bulan" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month} value={month}>
                        {month}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Tahun</Label>
                <Select value={selectedYear.toString()} onValueChange={(val) => setSelectedYear(parseInt(val))}>
                  <SelectTrigger data-testid="select-year">
                    <SelectValue placeholder="Pilih Tahun" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>&nbsp;</Label>
                <Button
                  data-testid="view-report-button"
                  onClick={fetchReport}
                  className="w-full bg-blue-900 hover:bg-blue-800"
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Lihat Laporan'}
                </Button>
              </div>
            </div>

            {reportData && (
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card className="border-2 border-blue-200">
                    <CardContent className="pt-6">
                      <p className="text-sm text-gray-600 mb-1">Total Pemasukan</p>
                      <p className="text-2xl font-bold text-green-700">Rp {reportData.total_pemasukan.toLocaleString('id-ID')}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-blue-200">
                    <CardContent className="pt-6">
                      <p className="text-sm text-gray-600 mb-1">Total Tagihan</p>
                      <p className="text-2xl font-bold text-blue-900">{reportData.total_tagihan}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-green-200">
                    <CardContent className="pt-6">
                      <p className="text-sm text-gray-600 mb-1">Lunas</p>
                      <p className="text-2xl font-bold text-green-600">{reportData.total_lunas}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-yellow-200">
                    <CardContent className="pt-6">
                      <p className="text-sm text-gray-600 mb-1">Belum Lunas</p>
                      <p className="text-2xl font-bold text-yellow-600">{reportData.total_belum_lunas}</p>
                    </CardContent>
                  </Card>
                </div>

                <div className="flex space-x-4">
                  <Button
                    data-testid="export-pdf-button"
                    onClick={exportPDF}
                    className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button
                    data-testid="export-excel-button"
                    onClick={exportExcel}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Excel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default AdminReports;
