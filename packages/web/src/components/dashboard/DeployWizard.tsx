import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

const DeployWizard: React.FC = () => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      try {
        let query = supabase.from('profiles').select('*');
        if (/^github_/.test(user.id)) {
          query = query.eq('github_id', user.id.replace('github_', ''));
        } else {
          query = query.eq('id', user.id);
        }
        const { data: profile, error } = await query.single();
        if (error) {
          console.error('Error loading profile:', error);
        } else {
          setProfile(profile);
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

export default DeployWizard; 