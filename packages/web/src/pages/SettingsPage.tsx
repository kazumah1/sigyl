import React, { useState, useEffect } from 'react';
import { User as UserIcon, Settings as SettingsIcon, Loader2, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { profilesService, Profile } from '@/services/profilesService';
import { useTheme } from '@/contexts/ThemeContext';
import PageHeader from '@/components/PageHeader';

const sidebarItems = [
  { label: 'Profile', icon: UserIcon, key: 'profile' },
  { label: 'Settings', icon: SettingsIcon, key: 'settings' },
];

const SettingsPage: React.FC = () => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const navigate = useNavigate();
  const { user, refreshUser, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const { theme } = useTheme();
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (location.state && location.state.tab === 'profile') {
      setActiveTab('profile');
    } else if (location.state && location.state.tab === 'settings') {
      setActiveTab('settings');
    }
  }, [location.state]);

  // Fetch profile
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError(null);
      if (!user?.id) {
        setLoading(false);
        setError('User not found.');
        return;
      }
      try {
        const profileData = await profilesService.getCurrentProfile();
        if (profileData) {
          setProfile(profileData);
          setDisplayName(profileData.full_name || '');
        } else {
          setError('Failed to load profile.');
        }
      } catch (err) {
        setError('Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  // Save profile
  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updatedProfile = await profilesService.updateCurrentProfile({ 
        full_name: displayName 
      });
      if (updatedProfile) {
        setSuccess('Profile updated!');
        setProfile(updatedProfile);
        refreshUser && refreshUser();
      } else {
        setError('Failed to update profile.');
      }
    } catch (err) {
      setError('Failed to update profile.');
    } finally {
      setSaving(false);
      setTimeout(() => setSuccess(null), 2000);
    }
  };

  // Account deletion logic
  const handleDeleteAccount = () => {
    setDeleteConfirm(true);
  };

  const confirmDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      // Delete profile through API
      await profilesService.deleteCurrentProfile();
      
      // Sign out user
      await signOut();
      
      // Redirect to login
      window.location.href = '/login';
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <PageHeader />
      <div className="flex pt-20">
        {/* Sidebar */}
        <aside className="w-56 bg-black/60 border-r border-white/10 flex flex-col py-8 px-2">
          <div className="mb-8 px-4">
            <span className="text-xl font-bold text-white cursor-pointer" onClick={() => navigate('/')}>SIGYL</span>
          </div>
          <nav className="flex flex-col gap-2">
            {sidebarItems.map(item => (
              <button
                key={item.key}
                className={`flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === item.key ? 'bg-white/10 text-white' : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'}`}
                onClick={() => setActiveTab(item.key as 'profile' | 'settings')}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>
        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center p-8">
          {activeTab === 'profile' && (
            <Card className="max-w-xl w-full bg-black/80 border border-white/10 shadow-xl backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-white" />
                  Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center gap-2 text-gray-300"><Loader2 className="animate-spin" /> Loading...</div>
                ) : error ? (
                  <div className="flex items-center gap-2 text-red-400"><XCircle /> {error}</div>
                ) : (
                  <form onSubmit={e => { e.preventDefault(); handleSaveProfile(); }} className="space-y-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || profile?.email} />
                        <AvatarFallback className="bg-indigo-600 text-white font-bold text-2xl">
                          {profile?.full_name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-lg font-semibold text-white">{profile?.full_name || 'No Name'}</div>
                        <div className="text-gray-400 text-sm">{profile?.email}</div>
                        {profile?.github_username && (
                          <div className="text-gray-400 text-xs mt-1">GitHub: <span className="font-mono">{profile.github_username}</span></div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-gray-300 mb-1">Display Name</label>
                      <Input
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        className="bg-gray-900 border-gray-700 text-white"
                        maxLength={64}
                      />
                    </div>
                    <div className="flex gap-3 items-center">
                      <Button type="submit" disabled={saving || displayName === profile?.full_name} className="btn-modern">
                        {saving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}Save
                      </Button>
                      {success && <span className="text-green-400 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> {success}</span>}
                      {error && <span className="text-red-400 flex items-center gap-1"><XCircle className="w-4 h-4" /> {error}</span>}
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          )}
          {activeTab === 'settings' && (
            <Card className="max-w-xl w-full bg-black/80 border border-white/10 shadow-xl backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <SettingsIcon className="w-5 h-5 text-white" />
                  Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-6">
                  <label className="block text-gray-300 mb-2">Theme</label>
                  <div className="flex gap-3">
                    <Button className="btn-modern" variant={theme === 'dark' ? 'default' : 'outline'}>Dark</Button>
                    {/* Only dark theme is supported */}
                  </div>
                  <div className="text-gray-400 text-xs mt-2">Only dark theme is currently supported.</div>
                </div>
                <div className="mt-8">
                  <label className="block text-gray-300 mb-2">Danger Zone</label>
                  <Button variant="destructive" onClick={handleDeleteAccount} className="flex items-center gap-2" disabled={deleting}>
                    <Trash2 className="w-4 h-4" /> {deleting ? 'Deleting...' : 'Delete Account'}
                  </Button>
                  {deleteConfirm && (
                    <div className="mt-4 bg-gray-900 border border-red-400 p-4 rounded">
                      <div className="text-red-400 font-bold mb-2">Are you sure you want to delete your account?</div>
                      <div className="text-gray-300 mb-4">This action is <b>irreversible</b> and will delete all your data.</div>
                      <div className="flex gap-3">
                        <Button variant="destructive" onClick={confirmDeleteAccount} disabled={deleting}>
                          {deleting ? 'Deleting...' : 'Yes, Delete My Account'}
                        </Button>
                        <Button variant="outline" onClick={() => setDeleteConfirm(false)} disabled={deleting}>Cancel</Button>
                      </div>
                      {deleteError && <div className="text-red-400 mt-2">{deleteError}</div>}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
};

export default SettingsPage; 