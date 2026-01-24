import React, { useEffect, useState, useContext } from 'react';
import Layout from '../../components/Layout';
import { API, AuthContext } from '../../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Edit, Trash2, ShieldCheck, UserCog, Ban, CheckCircle } from 'lucide-react';

const StaffManagement = () => {
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showDialog, setShowDialog] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const { token } = useContext(AuthContext);

    const [currentStaff, setCurrentStaff] = useState({
        id: '',
        username: '',
        password: '',
        nama: '',
        role: 'admin'
    });

    useEffect(() => {
        fetchStaff();
    }, []);

    const fetchStaff = async () => {
        try {
            const response = await axios.get(`${API}/master/staff`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStaff(response.data);
        } catch (error) {
            toast.error('Gagal memuat data staf');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = () => {
        setEditMode(false);
        setCurrentStaff({
            id: '',
            username: '',
            password: '',
            nama: '',
            role: 'admin'
        });
        setShowDialog(true);
    };

    const handleEdit = (s) => {
        setEditMode(true);
        setCurrentStaff({ ...s, password: '' });
        setShowDialog(true);
    };

    const handleDelete = async (staffId) => {
        if (!window.confirm('Yakin ingin menghapus akun staf ini?')) return;

        try {
            await axios.delete(`${API}/master/staff/${staffId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Staf berhasil dihapus');
            fetchStaff();
        } catch (error) {
            toast.error('Gagal menghapus staf');
        }
    };

    const handleBan = async (staffId) => {
        if (!window.confirm('Yakin ingin membanned akun staf ini?')) return;

        try {
            await axios.post(`${API}/master/users/${staffId}/ban`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Staf berhasil dibanned');
            fetchStaff();
        } catch (error) {
            toast.error('Gagal membanned staf');
        }
    };

    const handleUnban = async (staffId) => {
        if (!window.confirm('Aktifkan kembali akun staf ini?')) return;

        try {
            await axios.post(`${API}/master/users/${staffId}/unban`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Staf berhasil diaktifkan kembali');
            fetchStaff();
        } catch (error) {
            toast.error('Gagal mengaktifkan staf');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editMode) {
                await axios.put(`${API}/master/staff/${currentStaff.id}`, currentStaff, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Staf berhasil diupdate');
            } else {
                await axios.post(`${API}/master/staff`, currentStaff, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                toast.success('Staf berhasil ditambahkan');
            }
            setShowDialog(false);
            fetchStaff();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Gagal menyimpan data');
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

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Kelola Staf</h1>
                        <p className="text-gray-600">Manajemen akun Admin Keuangan dan Kepala Sekolah</p>
                    </div>
                    <Button
                        onClick={handleAdd}
                        className="bg-gradient-to-r from-blue-900 to-indigo-700 hover:from-blue-800 hover:to-indigo-600 shadow-lg"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Tambah Staf
                    </Button>
                </div>

                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center space-x-2">
                            <ShieldCheck className="w-5 h-5 text-blue-600" />
                            <span>Daftar Akun Petugas</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nama</TableHead>
                                        <TableHead>Username</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {staff.map((s) => (
                                        <TableRow key={s.id}>
                                            <TableCell className="font-medium">{s.nama}</TableCell>
                                            <TableCell>{s.username}</TableCell>
                                            <TableCell>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${s.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                                                    }`}>
                                                    {s.role === 'admin' ? 'ADMIN TU' : 'KEPALA SEKOLAH'}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${s.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {s.is_active !== false ? 'AKTIF' : 'BANNED'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    <Button variant="ghost" size="sm" onClick={() => handleEdit(s)} title="Edit Profil" className="text-blue-600">
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    {s.is_active !== false ? (
                                                        <Button variant="ghost" size="sm" onClick={() => handleBan(s.id)} title="Ban User" className="text-orange-600">
                                                            <Ban className="w-4 h-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button variant="ghost" size="sm" onClick={() => handleUnban(s.id)} title="Unban User" className="text-green-600">
                                                            <CheckCircle className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    <Button variant="ghost" size="sm" onClick={() => handleDelete(s.id)} className="text-red-600">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <UserCog className="w-5 h-5 text-blue-900" />
                            <span>{editMode ? 'Edit Akun Staf' : 'Tambah Akun Staf'}</span>
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="nama">Nama Lengkap</Label>
                            <Input
                                id="nama"
                                value={currentStaff.nama}
                                onChange={(e) => setCurrentStaff({ ...currentStaff, nama: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="username">Username</Label>
                            <Input
                                id="username"
                                value={currentStaff.username}
                                onChange={(e) => setCurrentStaff({ ...currentStaff, username: e.target.value })}
                                required
                                disabled={editMode}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role / Jabatan</Label>
                            <select
                                id="role"
                                value={currentStaff.role}
                                onChange={(e) => setCurrentStaff({ ...currentStaff, role: e.target.value })}
                                className="w-full h-10 px-3 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                            >
                                <option value="admin">Admin Tata Usaha (Keuangan)</option>
                                <option value="kepsek">Kepala Sekolah (Laporan)</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password {editMode && '(kosongkan jika tidak diubah)'}</Label>
                            <Input
                                id="password"
                                type="password"
                                value={currentStaff.password}
                                onChange={(e) => setCurrentStaff({ ...currentStaff, password: e.target.value })}
                                required={!editMode}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                                Batal
                            </Button>
                            <Button type="submit" className="bg-blue-900 hover:bg-blue-800">
                                {editMode ? 'Update' : 'Simpan'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </Layout>
    );
};

export default StaffManagement;
