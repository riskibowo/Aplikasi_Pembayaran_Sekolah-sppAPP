import React, { useEffect, useState, useContext } from 'react';
import Layout from '../../components/Layout';
import { API, AuthContext } from '../../App';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Phone, GraduationCap, IdCard, Lock, Camera, Shield, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import UserAvatar from '../../components/UserAvatar';

const UserProfile = () => {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // State untuk fitur ganti password
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/profile/me`);
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error("Gagal memuat profil");
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("File harus berupa gambar");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const response = await axios.post(`${API}/profile/upload-photo`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      setProfile({ ...profile, profile_pic: response.data.url });
      toast.success("Foto profil berhasil diperbarui");
      // Optional: window.location.reload() or shared state update if needed for Sidebar
      setTimeout(() => window.location.reload(), 1500);
    } catch (error) {
      toast.error("Gagal mengunggah foto");
    } finally {
      setUploading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error("Konfirmasi password tidak cocok");
      return;
    }

    if (passwordData.new_password.length < 6) {
      toast.error("Password minimal 6 karakter");
      return;
    }

    try {
      await axios.put(`${API}/profile/change-password`, {
        old_password: passwordData.old_password,
        new_password: passwordData.new_password
      });

      toast.success("Password berhasil diubah");
      setShowPasswordDialog(false);
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || "Gagal mengubah password");
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

  const profileImageUrl = profile?.profile_pic
    ? (profile.profile_pic.startsWith('http') ? profile.profile_pic : `${process.env.REACT_APP_BACKEND_URL}${profile.profile_pic}`)
    : null;

  return (
    <Layout>
      <div data-testid="profile-page" className="space-y-6 pb-20 md:pb-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-blue-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Profil Saya</h1>
            <p className="text-sm md:text-base text-gray-600">Informasi data pribadi dan pengaturan akun</p>
          </div>
          <Button
            onClick={() => setShowPasswordDialog(true)}
            className="bg-blue-900 hover:bg-blue-800 w-full md:w-auto py-6 md:py-2 rounded-xl md:rounded-md font-bold shadow-lg md:shadow-none"
          >
            <Lock className="w-4 h-4 mr-2" />
            Ganti Password
          </Button>
        </div>

        <div className="max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Foto / ID Card Digital */}
          <Card className="border-0 shadow-2xl overflow-hidden h-fit bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 text-white relative rounded-2xl">
            {/* Background pattern/glass effect */}
            <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>
            
            <CardContent className="relative z-10 p-6 flex flex-col items-center">
              {/* Header ID Card */}
              <div className="w-full flex justify-between items-start mb-6">
                <div className="flex items-center space-x-2">
                  <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm shadow-inner">
                    {(profile?.role || user?.role) === 'siswa' ? (
                      <GraduationCap className="w-6 h-6 text-white" />
                    ) : (
                      <IdCard className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm tracking-wider uppercase text-white">
                      {(profile?.role || user?.role) === 'siswa' ? 'Kartu Pelajar' : 'Kartu Pegawai'}
                    </h4>
                    <p className="text-[10px] text-blue-200">Sistem Pembayaran Sekolah</p>
                  </div>
                </div>
                {(profile?.role || user?.role) === 'siswa' && (
                  <div className="text-right bg-white/10 px-3 py-1 rounded-lg backdrop-blur-sm border border-white/20">
                    <p className="text-[10px] text-blue-200 uppercase tracking-widest">Angkatan</p>
                    <p className="font-bold text-sm text-white">{profile?.angkatan || '-'}</p>
                  </div>
                )}
              </div>

              {/* Photo */}
              <div className="relative group mb-4">
                <UserAvatar
                  src={profileImageUrl}
                  name={profile?.nama || user?.nama}
                  className="w-32 h-32 bg-white/10 rounded-2xl shadow-2xl border border-white/30 backdrop-blur-sm"
                  textClassName="text-4xl font-bold text-white"
                />
                <label className="absolute -bottom-3 -right-3 w-10 h-10 bg-blue-500 hover:bg-blue-400 text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg border-2 border-white transition-all transform group-hover:scale-110 z-20">
                  <Camera className="w-5 h-5" />
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
                </label>
              </div>

              {/* Student Info */}
              <div className="text-center w-full mb-6">
                <h3 className="font-bold text-xl text-white mb-1 drop-shadow-md">{profile?.nama}</h3>
                <div className="inline-block bg-white/20 px-4 py-1 rounded-full backdrop-blur-sm border border-white/20 shadow-inner">
                  <p className="text-xs text-white uppercase tracking-wider font-medium">{profile?.role || user.role}</p>
                </div>
              </div>

              {/* QR Code and NIS */}
              <div className="w-full flex items-center justify-between bg-white/10 p-4 rounded-xl backdrop-blur-md border border-white/20 shadow-lg mt-2">
                <div>
                  <p className="text-[10px] text-blue-200 uppercase tracking-widest mb-1">
                    {(profile?.role || user?.role) === 'siswa' ? 'Nomor Induk (NIS)' : 'ID Pengguna'}
                  </p>
                  <p className="font-mono text-lg font-bold tracking-widest text-white">{profile?.nis || profile?.id?.substring(0, 8)}</p>
                </div>
                <div className="bg-white p-2 rounded-xl shadow-inner transform transition-transform hover:scale-110">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${profile?.nis || profile?.id?.substring(0, 8)}`} 
                    alt="QR Code" 
                    className="w-12 h-12"
                  />
                </div>
              </div>

              {uploading && (
                <div className="mt-4 text-xs text-white/70 animate-pulse bg-white/10 px-3 py-1 rounded-full">Mengunggah foto...</div>
              )}
            </CardContent>
          </Card>

          {/* Card Info */}
          <Card className="border-0 shadow-lg md:col-span-2">
            <CardHeader>
              <CardTitle className="text-xl text-blue-900 font-bold border-b pb-2">Detail Informasi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6">
                <InfoItem
                  icon={IdCard}
                  label={user.role === 'siswa' ? "NIS" : "ID"}
                  value={profile?.nis || profile?.id?.substring(0, 8)}
                />

                {user.role === 'siswa' && (
                  <InfoItem icon={GraduationCap} label="Kelas" value={profile?.kelas} />
                )}

                {user.role === 'siswa' && (
                  <InfoItem icon={Phone} label="No. WhatsApp" value={profile?.no_wa} />
                )}

                <InfoItem icon={User} label="Username" value={profile?.username} />

                <InfoItem icon={Shield} label="Hak Akses" value={profile?.role || user.role} uppercase />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dialog Ganti Password */}
        <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Ganti Password</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="old_pass">Password Lama</Label>
                <Input
                  id="old_pass"
                  type="password"
                  value={passwordData.old_password}
                  onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_pass">Password Baru</Label>
                <Input
                  id="new_pass"
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="conf_pass">Konfirmasi Password Baru</Label>
                <Input
                  id="conf_pass"
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowPasswordDialog(false)}>Batal</Button>
                <Button type="submit" className="bg-blue-900 hover:bg-blue-800">Simpan Password</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

const InfoItem = ({ icon: Icon, label, value, uppercase }) => (
  <div className="flex items-start space-x-4">
    <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5 text-blue-700" />
    </div>
    <div>
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p className={`text-base font-semibold text-gray-900 ${uppercase ? 'capitalize' : ''}`}>
        {value || '-'}
      </p>
    </div>
  </div>
);

export default UserProfile;

