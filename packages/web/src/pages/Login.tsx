import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Github, Key, Loader2, Shield, UserPlus, LogIn } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/PageHeader';
import { APIKeyService } from '@/services/apiKeyService';

const Login = () => {
  const navigate = useNavigate();
  const { signInWithGitHubApp, session } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState({ username: '', password: '' });

  // Regular GitHub OAuth login for returning users
  const handleGitHubLogin = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: 'http://localhost:8080/auth/callback',
          scopes: 'read:user user:email'
        }
      });
      // The redirect will happen automatically
      // But if we are returned to this page with a session, check for app install
      // (This logic is also needed in a useEffect below)
    } catch (error) {
      console.error('Error during GitHub login:', error);
      toast({
        title: "Login Failed",
        description: "Failed to authenticate with GitHub. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // GitHub App installation flow for new users
  const handleGitHubAppSignup = async () => {
    setSignupLoading(true);
    try {
      const url = await signInWithGitHubApp();
      // Open in the same window instead of a new tab to ensure proper redirect handling
      window.location.href = url;
    } catch (error) {
      console.error('Error getting GitHub App URL:', error);
      // Fallback to the old approach
      const appName = import.meta.env.VITE_GITHUB_APP_NAME || 'sigyl-dev'
      const redirectUrl = encodeURIComponent(window.location.origin + `/auth/callback`);
      const state = Math.random().toString(36).substring(2, 15);
      const fallbackUrl = `https://github.com/apps/${appName}/installations/new?state=${state}&request_oauth_on_install=true&redirect_uri=${redirectUrl}`;
      window.location.href = fallbackUrl;
    } finally {
      setSignupLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);

    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', adminCredentials.username)
        .single();

      if (error || !data) {
        throw new Error('Invalid credentials');
      }

      // For demo purposes, we'll create a mock session
      localStorage.setItem('admin_session', JSON.stringify({
        id: data.id,
        username: data.username,
        display_name: data.display_name,
        role: 'admin'
      }));

      toast({
        title: "Admin Login Successful",
        description: `Welcome back, ${data.display_name}!`,
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Admin login error:', error);
      toast({
        title: "Login Failed",
        description: "Invalid username or password.",
        variant: "destructive",
      });
    } finally {
      setAdminLoading(false);
    }
  };

  // Add a useEffect to check for GitHub App installation after login
  useEffect(() => {
    const checkGitHubAppInstall = async () => {
      if (session?.access_token) {
        setLoading(true);
        try {
          const profile = await APIKeyService.getUserProfile(session.access_token);
          if (profile && profile.github_app_installed === false) {
            // Redirect to GitHub App install page
            const appName = import.meta.env.VITE_GITHUB_APP_NAME || 'sigyl-dev';
            const redirectUrl = encodeURIComponent(window.location.origin + `/auth/callback`);
            window.location.href = `https://github.com/apps/${appName}/installations/new?state=login&request_oauth_on_install=true&redirect_uri=${redirectUrl}`;
          }
        } catch (error) {
          console.error('Error checking GitHub App install status:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    checkGitHubAppInstall();
  }, [session]);

  return (
    <div className="min-h-screen bg-black">
      <PageHeader />
      
      <div className="flex items-center justify-center min-h-screen px-4 pt-20">
        <Card className="w-full max-w-md bg-gray-900/50 border-gray-800 backdrop-blur-sm">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-white">
              Welcome to SIGYL
            </CardTitle>
            <CardDescription className="text-gray-400">
              Sign in to access your MCP enterprise dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <p className="text-sm text-gray-400">
                Sign in to access your MCP dashboard. You will be prompted to install the GitHub App if required.
              </p>
              <Button 
                onClick={handleGitHubLogin}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold"
                size="lg"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Github className="w-5 h-5 mr-2" />
                )}
                Sign In with GitHub
              </Button>
            </div>
            {/* Admin login section - hidden by default */}
            <details className="mt-8">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                Admin Access
              </summary>
              <form onSubmit={handleAdminLogin} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-gray-300">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    value={adminCredentials.username}
                    onChange={(e) => setAdminCredentials(prev => ({ ...prev, username: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Enter admin username"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-300">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={adminCredentials.password}
                    onChange={(e) => setAdminCredentials(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-gray-800 border-gray-700 text-white"
                    placeholder="Enter admin password"
                    required
                  />
                </div>
                <Button 
                  type="submit"
                  disabled={adminLoading}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white border border-gray-600"
                  size="sm"
                >
                  {adminLoading ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4 mr-2" />
                  )}
                  Sign in as Admin
                </Button>
                <p className="text-xs text-gray-500 text-center">
                  Demo access only. Use credentials: admin / DanielHasABigPP
                </p>
              </form>
            </details>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
