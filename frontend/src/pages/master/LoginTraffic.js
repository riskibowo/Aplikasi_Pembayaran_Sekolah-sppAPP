import React, { useEffect, useState, useContext, useRef } from 'react';
import Layout from '../../components/Layout';
import { API, AuthContext } from '../../App';
import axios from 'axios';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Activity, ShieldAlert, Monitor, CheckCircle, XCircle, AlertTriangle, UserPlus, CreditCard, Settings, User, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const LoginTraffic = () => {
    const [logs, setLogs] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const { token } = useContext(AuthContext);
    const pollingInterval = useRef(null);

    useEffect(() => {
        fetchAllLogs();

        // Setup Real-time Polling (Every 10 seconds for efficiency)
        pollingInterval.current = setInterval(() => {
            fetchAllLogs(false);
        }, 10000);

        return () => {
            if (pollingInterval.current) clearInterval(pollingInterval.current);
        };
    }, []);

    const fetchAllLogs = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const [loginLogsRes, activityLogsRes] = await Promise.all([
                axios.get(`${API}/master/login-logs`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${API}/master/activity-logs`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setLogs(loginLogsRes.data);
            setActivityLogs(activityLogsRes.data);
        } catch (error) {
            console.error('Error fetching logs:', error);
            if (showLoading) toast.error('Gagal memuat log aktivitas');
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const handleBan = async (userId) => {
        if (!window.confirm('Apakah Anda yakin ingin membanned user ini? User tidak akan bisa login lagi.')) return;
        try {
            await axios.post(`${API}/master/users/${userId}/ban`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('User berhasil dibanned');
            fetchAllLogs(false);
        } catch (error) {
            toast.error('Gagal membanned user');
        }
    };

    const handleUnban = async (userId) => {
        try {
            await axios.post(`${API}/master/users/${userId}/unban`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('User berhasil diaktifkan kembali');
            fetchAllLogs(false);
        } catch (error) {
            toast.error('Gagal mengaktifkan user');
        }
    };

    const handleClearLoginLogs = async () => {
        if (!window.confirm('Apakah Anda yakin ingin MENGHAPUS SEMUA histori login? Data yang dihapus tidak bisa dikembalikan.')) return;
        try {
            await axios.delete(`${API}/master/login-logs`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Histori login berhasil dibersihkan');
            fetchAllLogs(false);
        } catch (error) {
            toast.error('Gagal membersihkan histori login');
        }
    };

    const handleClearActivityLogs = async () => {
        if (!window.confirm('Apakah Anda yakin ingin MENGHAPUS SEMUA log aktivitas? Tindakan ini akan menghapus jejak audit sistem.')) return;
        try {
            await axios.delete(`${API}/master/activity-logs`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            toast.success('Log aktivitas berhasil dibersihkan');
            fetchAllLogs(false);
        } catch (error) {
            toast.error('Gagal membersihkan log aktivitas');
        }
    };

    const formatTimestamp = (isoString) => {
        return new Date(isoString).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getActivityIcon = (type) => {
        switch (type) {
            case 'payment': return <CreditCard className="w-4 h-4 text-emerald-500" />;
            case 'student_mgmt': return <UserPlus className="w-4 h-4 text-blue-500" />;
            case 'class_mgmt': return <Settings className="w-4 h-4 text-purple-500" />;
            case 'security': return <ShieldAlert className="w-4 h-4 text-orange-500" />;
            case 'profile': return <User className="w-4 h-4 text-gray-500" />;
            default: return <Activity className="w-4 h-4 text-gray-400" />;
        }
    };

    const getTrafficStatus = () => {
        const suspiciousCount = logs.filter(l => l.is_suspicious).length;
        const failedBannedCount = logs.filter(l => l.status === 'failed (banned)').length;
        const totalRecent = logs.slice(0, 20);
        const recentFailures = totalRecent.filter(l => l.status.includes('failed')).length;

        if (failedBannedCount > 0 || suspiciousCount > 5 || recentFailures > 10) {
            return {
                label: 'DANGER / ATTACK DETECTED',
                color: 'bg-red-500',
                textColor: 'text-red-700',
                bgColor: 'bg-red-50',
                icon: <ShieldAlert className="w-8 h-8 text-red-600 animate-bounce" />,
                desc: 'Sistem mendeteksi upaya peretasan atau spam login intensif. Auto-ban telah diaktifkan.'
            };
        }
        if (suspiciousCount > 0 || recentFailures > 2) {
            return {
                label: 'WARNING / UNUSUAL TRAFFIC',
                color: 'bg-orange-500',
                textColor: 'text-orange-700',
                bgColor: 'bg-orange-50',
                icon: <AlertTriangle className="w-8 h-8 text-orange-600" />,
                desc: 'Ada beberapa kegagalan login atau aktivitas mencurigakan. Harap pantau feed secara berkala.'
            };
        }
        return {
            label: 'SECURE / NORMAL TRAFFIC',
            color: 'bg-emerald-500',
            textColor: 'text-emerald-700',
            bgColor: 'bg-emerald-50',
            icon: <CheckCircle className="w-8 h-8 text-emerald-600" />,
            desc: 'Sistem dalam keadaan aman. Lalu lintas login berjalan normal dan tidak ada ancaman terdeteksi.'
        };
    };

    const traffic = getTrafficStatus();

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
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Monitoring Aktivitas</h1>
                        <p className="text-gray-600">Pantau seluruh aktivitas sistem secara <span className="text-emerald-600 font-bold animate-pulse">● Real-time</span></p>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                        Auto-refresh Enabled (10s)
                    </Badge>
                </div>

                {/* Traffic Status Indicator */}
                <Card className={`${traffic.bgColor} border-2 border-current ${traffic.textColor} shadow-md overflow-hidden`}>
                    <CardContent className="p-0">
                        <div className="flex flex-col md:flex-row items-center">
                            <div className={`${traffic.color} p-6 flex items-center justify-center w-full md:w-auto`}>
                                {traffic.icon}
                            </div>
                            <div className="p-4 flex-1">
                                <div className="flex items-center space-x-2">
                                    <h2 className="text-xl font-black uppercase tracking-widest">{traffic.label}</h2>
                                    <div className="flex space-x-1">
                                        <div className={`w-3 h-3 rounded-full ${traffic.color === 'bg-red-500' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-gray-300'}`}></div>
                                        <div className={`w-3 h-3 rounded-full ${traffic.color === 'bg-orange-500' ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)]' : 'bg-gray-300'}`}></div>
                                        <div className={`w-3 h-3 rounded-full ${traffic.color === 'bg-emerald-500' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-gray-300'}`}></div>
                                    </div>
                                </div>
                                <p className="text-sm font-medium mt-1 opacity-90">{traffic.desc}</p>
                            </div>
                            <div className="hidden lg:block pr-6 italic text-[10px] opacity-50 uppercase font-mono">
                                Security Protocol v2.4 initialized
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card className="bg-blue-50 border-blue-100">
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-blue-500 rounded-lg text-white">
                                    <Monitor className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-blue-600 font-medium">Login Logs</p>
                                    <p className="text-2xl font-bold text-blue-900">{logs.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-emerald-50 border-emerald-100">
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-emerald-500 rounded-lg text-white">
                                    <Activity className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-emerald-600 font-medium">Total Aktivitas</p>
                                    <p className="text-2xl font-bold text-emerald-900">{activityLogs.length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-orange-50 border-orange-100">
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-orange-500 rounded-lg text-white">
                                    <ShieldAlert className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-orange-600 font-medium">Peringatan</p>
                                    <p className="text-2xl font-bold text-orange-900">
                                        {activityLogs.filter(l => l.activity_type === 'security' && l.description.toLowerCase().includes('gagal')).length}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-red-50 border-red-100">
                        <CardContent className="pt-6">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-red-500 rounded-lg text-white">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm text-red-600 font-medium">Suspicious</p>
                                    <p className="text-2xl font-bold text-red-900">{logs.filter(l => l.is_suspicious).length}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Activity Logs (The New Live Stream) */}
                    <Card className="border-0 shadow-lg border-t-4 border-emerald-500">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg flex items-center space-x-2">
                                <Activity className="w-5 h-5 text-emerald-600" />
                                <span>Live Activity Feed</span>
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 font-bold text-[11px]"
                                onClick={handleClearActivityLogs}
                            >
                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                CLEAR LOG
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                {activityLogs.map((log) => (
                                    <div key={log.id} className="flex space-x-3 items-start p-3 rounded-lg bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-md transition-all">
                                        <div className={`p-2 rounded-full bg-white border shadow-sm`}>
                                            {getActivityIcon(log.activity_type)}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <p className="text-xs font-bold text-blue-900 uppercase">{log.role}</p>
                                                <p className="text-[10px] text-gray-400 font-mono">{formatTimestamp(log.timestamp)}</p>
                                            </div>
                                            <p className="text-sm text-gray-700 mt-1">
                                                <span className="font-semibold text-gray-900">{log.username}</span> {log.description}
                                            </p>

                                            {/* Action for Activity Log */}
                                            {log.user_id && log.role !== 'master' && (
                                                <div className="mt-2 text-right">
                                                    {log.is_user_active ? (
                                                        <button
                                                            onClick={() => handleBan(log.user_id)}
                                                            className="text-[10px] bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors font-bold"
                                                        >
                                                            BAN {log.username.toUpperCase()}
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleUnban(log.user_id)}
                                                            className="text-[10px] bg-emerald-600 text-white px-2 py-1 rounded hover:bg-emerald-700 transition-colors font-bold"
                                                        >
                                                            UNBAN {log.username.toUpperCase()}
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {activityLogs.length === 0 && (
                                    <p className="text-center py-10 text-gray-400 italic">Belum ada aktivitas tercatat.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Login Traffic (The Original Table) */}
                    <Card className="border-0 shadow-lg border-t-4 border-blue-500">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-lg flex items-center space-x-2">
                                <Monitor className="w-5 h-5 text-blue-600" />
                                <span>Login Historical Data</span>
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 font-bold text-[11px]"
                                onClick={handleClearLoginLogs}
                            >
                                <Trash2 className="w-3.5 h-3.5 mr-1" />
                                CLEAR HISTORY
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto max-h-[500px]">
                                <Table>
                                    <TableHeader className="bg-gray-50 sticky top-0 z-10">
                                        <TableRow>
                                            <TableHead className="text-xs">Waktu</TableHead>
                                            <TableHead className="text-xs">User</TableHead>
                                            <TableHead className="text-xs">Status</TableHead>
                                            <TableHead className="text-xs text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {logs.map((log) => (
                                            <TableRow key={log.id} className={log.is_suspicious ? 'bg-red-50' : ''}>
                                                <TableCell className="text-[10px] font-mono whitespace-nowrap">{formatTimestamp(log.timestamp)}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold truncate max-w-[80px]">{log.username}</span>
                                                        <span className="text-[9px] text-gray-400 capitalize">{log.role || 'unknown'}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {log.status === 'success' ? (
                                                        <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0 text-[9px] py-0">Success</Badge>
                                                    ) : (
                                                        <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-0 text-[10px] py-0">Fail</Badge>
                                                    )}
                                                    {log.is_suspicious && <div className="text-[8px] text-red-600 font-bold mt-1">SUSPICIOUS IP</div>}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {log.user_id && log.role !== 'master' && (
                                                        log.is_user_active ? (
                                                            <button
                                                                onClick={() => handleBan(log.user_id)}
                                                                className="p-1.5 bg-red-100 text-red-700 rounded-full hover:bg-red-600 hover:text-white transition-all shadow-sm group"
                                                                title="Ban User"
                                                            >
                                                                <ShieldAlert className="w-3.5 h-3.5" />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleUnban(log.user_id)}
                                                                className="p-1.5 bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                                title="Unban User"
                                                            >
                                                                <CheckCircle className="w-3.5 h-3.5" />
                                                            </button>
                                                        )
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </Layout>
    );
};

export default LoginTraffic;
