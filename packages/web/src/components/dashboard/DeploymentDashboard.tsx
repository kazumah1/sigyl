import React, { useEffect, useState } from 'react';
import { profilesService, Profile } from '@/services/profilesService';
import { useAuth } from '@/contexts/AuthContext';

const DeploymentDashboard: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      try {
        const profileData = await profilesService.getCurrentProfile();
        if (profileData) {
          setProfile(profileData);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      }
    };
    loadProfile();
  }, [user]);

  return (
    <div>
      {/* Render your component content here */}
    </div>
  );
};

export default DeploymentDashboard; 