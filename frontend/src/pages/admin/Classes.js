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
import { Plus, Edit, Trash2, Search } from 'lucide-react';

const AdminClasses = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentClass, setCurrentClass] = useState({
    id: '',
    nama_kelas: '',
    nominal_spp: 0
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/classes`);
      setClasses(response.data);
    } catch (error) {
      toast.error('Gagal memuat data kelas');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditMode(false);
    setCurrentClass({
      id: '',
      nama_kelas: '',
      nominal_spp: 0
    });
    setShowDialog(true);
  };

  const handleEdit = (cls) => {
    setEditMode(true);
    setCurrentClass(cls);
    setShowDialog(true);
  };

  const handleDelete = async (classId) => {
    if (!window.confirm('Yakin ingin menghapus kelas ini? Ini mungkin gagal jika kelas masih digunakan oleh siswa.')) return;

    try {
      await axios.delete(`${API}/classes/${classId}`);
      toast.success('Kelas berhasil dihapus');
      fetchClasses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menghapus kelas');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const dataToSubmit = {
        nama_kelas: currentClass.nama_kelas,
        nominal_spp: parseFloat(currentClass.nominal_spp)
    };

    try {
      if (editMode) {
        await axios.put(`${API}/classes/${currentClass.id}`, dataToSubmit);
        toast.success('Kelas berhasil diupdate');
      } else {
        await axios.post(`${API}/classes`, dataToSubmit);
        toast.success('Kelas berhasil ditambahkan');
      }
      setShowDialog(false);
      fetchClasses();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menyimpan data');
    }
  };

  const filteredClasses = classes.filter(
    (cls) =>
      cls.nama_kelas.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <div data-testid="admin-classes-page" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Data Kelas</h1>
            <p className="text-gray-600">Kelola data kelas dan nominal SPP</p>
          </div>
          <Button
            data-testid="add-class-button"
            onClick={handleAdd}
            className="bg-gradient-to-r from-blue-900 to-indigo-700 hover:from-blue-800 hover:to-indigo-600 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Tambah Kelas
          </Button>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  data-testid="search-input"
                  placeholder="Cari nama kelas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Kelas</TableHead>
                    <TableHead>Nominal SPP</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClasses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                        Tidak ada data kelas
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClasses.map((cls) => (
                      <TableRow key={cls.id} data-testid={`class-row-${cls.id}`}>
                        <TableCell className="font-medium">{cls.nama_kelas}</TableCell>
                        <TableCell>Rp {cls.nominal_spp.toLocaleString('id-ID')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              data-testid={`edit-class-${cls.id}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(cls)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              data-testid={`delete-class-${cls.id}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(cls.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit Kelas' : 'Tambah Kelas'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nama_kelas">Nama Kelas</Label>
              <Input
                id="nama_kelas"
                data-testid="nama-kelas-input"
                value={currentClass.nama_kelas}
                onChange={(e) => setCurrentClass({ ...currentClass, nama_kelas: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nominal_spp">Nominal SPP</Label>
              <Input
                id="nominal_spp"
                data-testid="nominal-spp-input"
                type="number"
                value={currentClass.nominal_spp}
                onChange={(e) => setCurrentClass({ ...currentClass, nominal_spp: e.target.value })}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Batal
              </Button>
              <Button data-testid="submit-class-button" type="submit" className="bg-blue-900 hover:bg-blue-800">
                {editMode ? 'Update' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminClasses;