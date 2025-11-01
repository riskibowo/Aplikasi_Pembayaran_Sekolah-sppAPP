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

const AdminStudents = () => {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentStudent, setCurrentStudent] = useState({
    id: '',
    nis: '',
    nama: '',
    kelas: '',
    no_wa: '',
    username: '',
    password: ''
  });

  useEffect(() => {
    fetchStudents();
    fetchClasses();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await axios.get(`${API}/students`);
      setStudents(response.data);
    } catch (error) {
      toast.error('Gagal memuat data siswa');
    } finally {
      setLoading(false);
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

  const handleAdd = () => {
    setEditMode(false);
    setCurrentStudent({
      id: '',
      nis: '',
      nama: '',
      kelas: classes[0]?.nama_kelas || '',
      no_wa: '',
      username: '',
      password: ''
    });
    setShowDialog(true);
  };

  const handleEdit = (student) => {
    setEditMode(true);
    setCurrentStudent({ ...student, password: '' });
    setShowDialog(true);
  };

  const handleDelete = async (studentId) => {
    if (!window.confirm('Yakin ingin menghapus siswa ini?')) return;

    try {
      await axios.delete(`${API}/students/${studentId}`);
      toast.success('Siswa berhasil dihapus');
      fetchStudents();
    } catch (error) {
      toast.error('Gagal menghapus siswa');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editMode) {
        await axios.put(`${API}/students/${currentStudent.id}`, currentStudent);
        toast.success('Siswa berhasil diupdate');
      } else {
        await axios.post(`${API}/students`, currentStudent);
        toast.success('Siswa berhasil ditambahkan');
      }
      setShowDialog(false);
      fetchStudents();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Gagal menyimpan data');
    }
  };

  const filteredStudents = students.filter(
    (s) =>
      s.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.nis.includes(searchTerm) ||
      s.kelas.toLowerCase().includes(searchTerm.toLowerCase())
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
      <div data-testid="admin-students-page" className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Data Siswa</h1>
            <p className="text-gray-600">Kelola data siswa sekolah</p>
          </div>
          <Button
            data-testid="add-student-button"
            onClick={handleAdd}
            className="bg-gradient-to-r from-blue-900 to-indigo-700 hover:from-blue-800 hover:to-indigo-600 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Tambah Siswa
          </Button>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  data-testid="search-input"
                  placeholder="Cari siswa (nama, NIS, kelas)..."
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
                    <TableHead>NIS</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kelas</TableHead>
                    <TableHead>No. WhatsApp</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        Tidak ada data siswa
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student) => (
                      <TableRow key={student.id} data-testid={`student-row-${student.nis}`}>
                        <TableCell className="font-medium">{student.nis}</TableCell>
                        <TableCell>{student.nama}</TableCell>
                        <TableCell>
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                            {student.kelas}
                          </span>
                        </TableCell>
                        <TableCell>{student.no_wa}</TableCell>
                        <TableCell>{student.username}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Button
                              data-testid={`edit-student-${student.nis}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(student)}
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              data-testid={`delete-student-${student.nis}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(student.id)}
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
            <DialogTitle>{editMode ? 'Edit Siswa' : 'Tambah Siswa'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nis">NIS</Label>
              <Input
                id="nis"
                data-testid="nis-input"
                value={currentStudent.nis}
                onChange={(e) => setCurrentStudent({ ...currentStudent, nis: e.target.value })}
                required
                disabled={editMode}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nama">Nama Lengkap</Label>
              <Input
                id="nama"
                data-testid="nama-input"
                value={currentStudent.nama}
                onChange={(e) => setCurrentStudent({ ...currentStudent, nama: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kelas">Kelas</Label>
              <select
                id="kelas"
                data-testid="kelas-select"
                value={currentStudent.kelas}
                onChange={(e) => setCurrentStudent({ ...currentStudent, kelas: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.nama_kelas}>
                    {cls.nama_kelas}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="no_wa">No. WhatsApp</Label>
              <Input
                id="no_wa"
                data-testid="no-wa-input"
                value={currentStudent.no_wa}
                onChange={(e) => setCurrentStudent({ ...currentStudent, no_wa: e.target.value })}
                placeholder="08xxxxxxxxxx"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                data-testid="username-input-dialog"
                value={currentStudent.username}
                onChange={(e) => setCurrentStudent({ ...currentStudent, username: e.target.value })}
                required
                disabled={editMode}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password {editMode && '(kosongkan jika tidak ingin mengubah)'}</Label>
              <Input
                id="password"
                data-testid="password-input-dialog"
                type="password"
                value={currentStudent.password}
                onChange={(e) => setCurrentStudent({ ...currentStudent, password: e.target.value })}
                required={!editMode}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                Batal
              </Button>
              <Button data-testid="submit-student-button" type="submit" className="bg-blue-900 hover:bg-blue-800">
                {editMode ? 'Update' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default AdminStudents;
