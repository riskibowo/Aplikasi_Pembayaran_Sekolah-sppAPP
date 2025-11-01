import React, { useEffect, useState, useContext } from 'react';
import Layout from '../../components/Layout';
import { API, AuthContext } from '../../App';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Phone, GraduationCap, IdCard } from 'lucide-react';

const StudentProfile = () => {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
        <div>
          <h1 className="text-4xl font-bold text-blue-900 mb-2" style={{fontFamily: 'Space Grotesk, sans-serif'}}>Profil Saya</h1>
          <p className="text-gray-600">Informasi data pribadi</p>
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
      </div>
    </Layout>
  );
};

export default StudentProfile;
