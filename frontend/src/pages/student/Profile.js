import React, { useEffect, useState, useContext } from 'react';
import Layout from '../../components/Layout';
import { API, AuthContext } from '../../App';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Phone, GraduationCap, IdCard, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

const StudentProfile = () => {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State untuk fitur ganti password
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/student/profile/${user.id}`);
      setProfile(response.data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
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
      await axios.put(`${API}/student/change-password/${user.id}`, {
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

  return (
    <Layout>
      <div data-testid="student-profile-page" className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Profil Saya</h1>
            <p className="text-gray-600">Informasi data pribadi</p>
          </div>
          <Button 
            onClick={() => setShowPasswordDialog(true)}
            className="bg-blue-900 hover:bg-blue-800"
          >
            <Lock className="w-4 h-4 mr-2" />
            Ganti Password
          </Button>
        </div>

        <div className="max-w-2xl">
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-900 to-indigo-700 text-white">
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <User className="w-10 h-10" />
                </div>
                <div>
                  <CardTitle className="text-2xl">{profile?.nama}</CardTitle>
                  <p className="text-blue-100">Siswa SMK MEKAR MURNI</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <IdCard className="w-6 h-6 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">NIS</p>
                    <p className="text-lg font-semibold text-gray-900">{profile?.nis}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <GraduationCap className="w-6 h-6 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Kelas</p>
                    <p className="text-lg font-semibold text-gray-900">{profile?.kelas}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Phone className="w-6 h-6 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">No. WhatsApp</p>
                    <p className="text-lg font-semibold text-gray-900">{profile?.no_wa}</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <User className="w-6 h-6 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Username</p>
                    <p className="text-lg font-semibold text-gray-900">{profile?.username}</p>
                  </div>
                </div>
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
                            onChange={(e) => setPasswordData({...passwordData, old_password: e.target.value})}
                            required 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new_pass">Password Baru</Label>
                        <Input 
                            id="new_pass" 
                            type="password" 
                            value={passwordData.new_password}
                            onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                            required 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="conf_pass">Konfirmasi Password Baru</Label>
                        <Input 
                            id="conf_pass" 
                            type="password" 
                            value={passwordData.confirm_password}
                            onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
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

export default StudentProfile;