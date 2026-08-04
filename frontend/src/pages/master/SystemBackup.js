import React, { useState } from 'react';
import axios from 'axios';
import { Database, Download, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { toast } from 'sonner';
import { API } from '../../App';

const SystemBackup = () => {
  const [isBackingUp, setIsBackingUp] = useState(false);

  const handleBackup = async () => {
    setIsBackingUp(true);
    toast.info("Memulai proses backup data...");

    try {
      const response = await axios({
        url: `${API}/system/backup`,
        method: 'GET',
        responseType: 'blob', // Important for downloading files
      });

      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from header if possible, or use default
      let fileName = `backup_laporan_sppAPP_${new Date().toISOString().split('T')[0]}.pdf`;
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.indexOf('filename=') !== -1) {
        const matches = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/.exec(disposition);
        if (matches != null && matches[1]) { 
          fileName = matches[1].replace(/['"]/g, '');
        }
      }

      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Backup Laporan PDF berhasil diunduh!");
    } catch (error) {
      console.error("Backup failed:", error);
      toast.error("Gagal melakukan backup. Silakan coba lagi.");
    } finally {
      setIsBackingUp(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight flex items-center gap-3">
            <Database className="w-8 h-8 text-indigo-600" />
            Backup Data Sistem (PDF)
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Unduh laporan keseluruhan database sekolah ke perangkat Anda dalam bentuk PDF yang rapi.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 space-y-6">
            
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-4">
              <Info className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">Apa yang ditampilkan dalam laporan ini?</h3>
                <ul className="list-disc list-inside text-blue-800 space-y-1 text-sm">
                  <li>Tabel Data Akun Pengguna</li>
                  <li>Tabel Data Siswa (Hingga 100 data pertama)</li>
                  <li>Tabel Data Kelas Aktif</li>
                  <li>Ringkasan Tagihan & Keuangan</li>
                </ul>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-4">
              <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">Perhatian!</h3>
                <p className="text-amber-800 text-sm">
                  Laporan cetak ini berisi rincian data privasi. Namun, file berformat PDF <strong>tidak dapat di-restore ulang</strong> ke dalam sistem database jika terjadi kerusakan.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={handleBackup}
                disabled={isBackingUp}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl transition-all shadow-sm shadow-indigo-200"
              >
                {isBackingUp ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Men-generate PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download Laporan (.pdf)
                  </>
                )}
              </button>
            </div>
            
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Status Sistem
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-slate-500 text-sm">Koneksi Database</span>
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                  Terhubung
                </span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-slate-500 text-sm">Tipe Laporan</span>
                <span className="text-slate-700 text-sm font-medium">PDF Document</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm">Akses</span>
                <span className="text-slate-700 text-sm font-medium">Superadmin Only</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemBackup;
