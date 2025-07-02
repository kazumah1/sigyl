import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading } = useAuth();

  useEffect(() => {
    // This component's job is to wait for the session to be established by the AuthProvider.
    // The AuthProvider handles the auth hash from the URL (#access_token=...).
    if (!loading) {
      if (session) {
        // Once the session is loaded, we can redirect.
        const searchParams = new URLSearchParams(location.search);
        const redirectTo = searchParams.get('redirect_to');
        
        // Navigate to the intended page, or the dashboard as a fallback.
        console.log(`AuthCallback: Redirecting to ${redirectTo || '/dashboard'}`);
        navigate(redirectTo || '/dashboard', { replace: true });
      } else {
        // If there's no session after loading, something went wrong.
        console.error('AuthCallback: No session found after authentication.');
        navigate('/login', { replace: true });
      }
    }
  }, [session, loading, navigate, location.search]);

  return (
    <div className="flex items-center justify-center h-screen bg-black">
      <div className="text-center">
        <Loader2 className="w-12 h-12 mx-auto text-white animate-spin" />
        <p className="mt-4 text-white">Authenticating, please wait...</p>
      </div>
    </div>
  );
};

export default AuthCallback; 