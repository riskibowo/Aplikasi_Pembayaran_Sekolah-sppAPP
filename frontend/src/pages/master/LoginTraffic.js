import React, { useEffect, useState, useContext } from 'react';
import Layout from '../../components/Layout';
import { API, AuthContext } from '../../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Activity, ShieldAlert, Monitor, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const LoginTraffic = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token } = useContext(AuthContext);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            const response = await axios.get(`${API}/master/login-logs`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLogs(response.data);
        } catch (error) {
            toast.error('Gagal memuat log login');
        } finally {
            setLoading(false);
        }
    };

    const formatTimestamp = (isoString) => {
        return new Date(isoString).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
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
                    <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Monitoring Login</h1>
                    <p className="text-gray-600">Pantau aktivitas login dan deteksi akses mencurigakan</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-blue-50 border-blue-100">
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-blue-500 rounded-lg text-white">
                                    <Monitor className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-blue-600 font-medium">Total Traffic</p>
                                    <p className="text-2xl font-bold text-blue-900">{logs.length} <span className="text-sm font-normal text-blue-500">(500 terakhir)</span></p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-red-50 border-red-100">
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-red-500 rounded-lg text-white">
                                    <ShieldAlert className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-red-600 font-medium">Mencurigakan</p>
                                    <p className="text-2xl font-bold text-red-900">{logs.filter(l => l.is_suspicious).length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-green-50 border-green-100">
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-green-500 rounded-lg text-white">
                                    <Activity className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-green-600 font-medium">Bulan Ini</p>
                                    <p className="text-2xl font-bold text-green-900">{logs.length > 0 ? 'Active' : 'Offline'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-0 shadow-lg">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center space-x-2">
                            <Activity className="w-5 h-5 text-blue-600" />
                            <span>Log Aktivitas Terbaru</span>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Waktu</TableHead>
                                        <TableHead>Username</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead>IP Address</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Deteksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow key={log.id} className={log.is_suspicious ? 'bg-red-50/50' : ''}>
                                            <TableCell className="text-xs font-mono">{formatTimestamp(log.timestamp)}</TableCell>
                                            <TableCell className="font-medium underline decoration-blue-200 underline-offset-4">{log.username}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`uppercase text-[10px] ${log.role === 'admin' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                                                        log.role === 'master' ? 'border-indigo-200 text-indigo-700 bg-indigo-50' :
                                                            log.role === 'siswa' ? 'border-green-200 text-green-700 bg-green-50' :
                                                                'border-gray-200 text-gray-500'
                                                    }`}>
                                                    {log.role || 'unknown'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs font-mono text-gray-500">{log.ip_address}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center space-x-2">
                                                    {log.status === 'success' ? (
                                                        <><CheckCircle className="w-4 h-4 text-green-500" /> <span className="text-xs text-green-700 font-medium">Success</span></>
                                                    ) : (
                                                        <><XCircle className="w-4 h-4 text-red-500" /> <span className="text-xs text-red-700 font-medium truncate max-w-[100px]">{log.status}</span></>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {log.is_suspicious && (
                                                    <div className="flex items-center space-x-1 text-red-600 animate-pulse">
                                                        <AlertTriangle className="w-4 h-4" />
                                                        <span className="text-[10px] font-bold">SUSPICIOUS</span>
                                                    </div>
                                                )}
                                                {!log.is_suspicious && <span className="text-xs text-gray-400">Normal</span>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {logs.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-10 text-gray-500">
                                                Belum ada data log login.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
};

export default LoginTraffic;
