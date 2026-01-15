import React, { useEffect, useState, useContext } from 'react';
import Layout from '../../components/Layout';
import { API, AuthContext } from '../../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save, School, CreditCard } from 'lucide-react';

const SchoolSettings = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const { token } = useContext(AuthContext);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await axios.get(`${API}/school-profile`);
            setProfile(response.data);
        } catch (error) {
            toast.error('Gagal memuat profil sekolah');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            await axios.put(`${API}/master/school-profile`, profile, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Pengaturan sekolah berhasil disimpan');
        } catch (error) {
            toast.error('Gagal menyimpan pengaturan');
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
                <div>
                    <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Pengaturan Sekolah</h1>
                    <p className="text-gray-600">Konfigurasi identitas sekolah dan rekening pembayaran</p>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Identitas Sekolah */}
                        <Card className="border-0 shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center space-x-2">
                                    <School className="w-5 h-5 text-blue-600" />
                                    <span>Identitas Sekolah</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="nama">Nama Sekolah</Label>
                                    <Input
                                        id="nama"
                                        value={profile.nama_sekolah}
                                        onChange={(e) => setProfile({ ...profile, nama_sekolah: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="alamat">Alamat Lengkap</Label>
                                    <Input
                                        id="alamat"
                                        value={profile.alamat}
                                        onChange={(e) => setProfile({ ...profile, alamat: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="telp">No. Telepon / WA Sekolah</Label>
                                    <Input
                                        id="telp"
                                        value={profile.no_telp}
                                        onChange={(e) => setProfile({ ...profile, no_telp: e.target.value })}
                                        required
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Rekening Pembayaran */}
                        <Card className="border-0 shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center space-x-2">
                                    <CreditCard className="w-5 h-5 text-indigo-600" />
                                    <span>Rekening Pembayaran</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="bank">Nama Bank</Label>
                                    <Input
                                        id="bank"
                                        value={profile.bank_nama}
                                        onChange={(e) => setProfile({ ...profile, bank_nama: e.target.value })}
                                        placeholder="Contoh: BANK BRI"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="rek">No. Rekening</Label>
                                    <Input
                                        id="rek"
                                        value={profile.bank_rekening}
                                        onChange={(e) => setProfile({ ...profile, bank_rekening: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="an">Atas Nama</Label>
                                    <Input
                                        id="an"
                                        value={profile.bank_atas_nama}
                                        onChange={(e) => setProfile({ ...profile, bank_atas_nama: e.target.value })}
                                        required
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" size="lg" className="bg-blue-900 hover:bg-blue-800 shadow-xl px-8">
                            <Save className="w-5 h-5 mr-2" />
                            Simpan Semua Perubahan
                        </Button>
                    </div>
                </form>
            </div>
        </Layout>
    );
};

export default SchoolSettings;
