import React, { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import { API } from '../../App';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Settings, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const MasterDashboard = () => {
    const [stats, setStats] = useState({ staff_count: 0, school_name: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [staffRes, profileRes] = await Promise.all([
                axios.get(`${API}/master/staff`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
                }),
                axios.get(`${API}/school-profile`)
            ]);
            setStats({
                staff_count: staffRes.data.length,
                school_name: profileRes.data?.nama_sekolah || 'Belum diatur'
            });
        } catch (error) {
            console.error('Error fetching master stats:', error);
        } finally {
            setLoading(false);
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

    const actions = [
        {
            title: 'Kelola Staf',
            desc: 'Tambah atau atur akun Admin TU dan Kepala Sekolah',
            icon: ShieldCheck,
            path: '/master/staff',
            color: 'bg-blue-600'
        },
        {
            title: 'Pengaturan Sekolah',
            desc: 'Atur nama, alamat, dan rekening pembayaran sekolah',
            icon: Settings,
            path: '/master/settings',
            color: 'bg-indigo-600'
        }
    ];

    return (
        <Layout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Master Dashboard</h1>
                    <p className="text-gray-600">Kontrol penuh sistem SPP {stats.school_name}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-900 to-indigo-900 text-white">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-blue-200 text-sm font-medium">Total Akun Staf</p>
                                    <h3 className="text-4xl font-bold mt-1">{stats.staff_count}</h3>
                                    <p className="text-xs text-blue-300 mt-2">Admin TU & Kepala Sekolah</p>
                                </div>
                                <div className="p-4 bg-white/10 rounded-2xl">
                                    <Users className="w-10 h-10 text-white" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-0 shadow-lg bg-white">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between text-gray-900">
                                <div>
                                    <p className="text-gray-500 text-sm font-medium">Nama Sekolah Aktif</p>
                                    <h3 className="text-2xl font-bold mt-1 truncate max-w-[250px]">{stats.school_name}</h3>
                                    <p className="text-xs text-gray-400 mt-2">Tampil di Kuitansi & Dashboard</p>
                                </div>
                                <div className="p-4 bg-gray-100 rounded-2xl">
                                    <Settings className="w-10 h-10 text-gray-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {actions.map((action, idx) => {
                        const Icon = action.icon;
                        return (
                            <Link key={idx} to={action.path}>
                                <Card className="border-0 shadow-md hover:shadow-xl transition-all group cursor-pointer overflow-hidden">
                                    <CardContent className="p-0">
                                        <div className="flex items-stretch">
                                            <div className={`${action.color} w-2`}></div>
                                            <div className="p-6 flex-1 flex items-center justify-between">
                                                <div className="flex items-start space-x-4">
                                                    <div className={`p-3 rounded-xl ${action.color} text-white`}>
                                                        <Icon className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900">{action.title}</h4>
                                                        <p className="text-sm text-gray-500 mt-1">{action.desc}</p>
                                                    </div>
                                                </div>
                                                <ArrowRight className="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </Layout>
    );
};

export default MasterDashboard;
