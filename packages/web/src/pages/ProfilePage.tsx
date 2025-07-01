import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/settings', { state: { tab: 'profile' } });
  }, [navigate]);
  return null;
};

export default ProfilePage; 