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
      <div data-testid="profile-page" className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>Profil Saya</h1>
            <p className="text-gray-600">Informasi data pribadi dan pengaturan akun</p>
          </div>
          <Button
            onClick={() => setShowPasswordDialog(true)}
            className="bg-blue-900 hover:bg-blue-800"
          >
            <Lock className="w-4 h-4 mr-2" />
            Ganti Password
          </Button>
        </div>

        <div className="max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Foto */}
          <Card className="border-0 shadow-lg overflow-hidden h-fit">
            <CardHeader className="bg-gradient-to-r from-blue-900 to-indigo-700 h-24 relative">
            </CardHeader>
            <CardContent className="flex flex-col items-center -mt-12 pb-8">
              <div className="relative group">
                <div className="w-24 h-24 bg-white rounded-full p-1 shadow-xl border-4 border-white overflow-hidden flex items-center justify-center bg-gray-100">
                  {profileImageUrl ? (
                    <img src={profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-12 h-12 text-gray-400" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center cursor-pointer shadow-lg border-2 border-white transition-all transform group-hover:scale-110">
                  <Camera className="w-4 h-4" />
                  <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} disabled={uploading} />
                </label>
              </div>
              <h3 className="mt-4 font-bold text-lg text-gray-900">{profile?.nama}</h3>
              <p className="text-sm text-gray-500 capitalize">{profile?.role || user.role}</p>

              {uploading && (
                <div className="mt-2 text-xs text-blue-600 animate-pulse">Mengunggah...</div>
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

