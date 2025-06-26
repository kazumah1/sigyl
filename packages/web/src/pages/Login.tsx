import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Github, Key, Loader2, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PageHeader from '@/components/PageHeader';

const Login = () => {
  const navigate = useNavigate();
  const { signInWithGitHubApp } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState({ username: '', password: '' });

  const handleGitHubAppLogin = async () => {
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
            <Tabs defaultValue="github" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                <TabsTrigger value="github" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-700">
                  GitHub App
                </TabsTrigger>
                <TabsTrigger value="admin" className="text-gray-300 data-[state=active]:text-white data-[state=active]:bg-gray-700">
                  Admin
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="github" className="space-y-4">
                <div className="text-center space-y-4">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-400 mb-4">
                    <Shield className="w-4 h-4" />
                    <span>Secure repository access with GitHub App</span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Sign in with your GitHub account and grant access to your repositories for MCP server deployment.
                  </p>
                  <Button 
                    onClick={handleGitHubAppLogin}
                    className="w-full bg-white hover:bg-gray-100 text-black font-bold tracking-tight"
                    size="lg"
                  >
                    <Github className="w-5 h-5 mr-2" />
                    Sign in with GitHub App
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="admin" className="space-y-4">
                <form onSubmit={handleAdminLogin} className="space-y-4">
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
                    size="lg"
                  >
                    {adminLoading ? (
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    ) : (
                      <Key className="w-5 h-5 mr-2" />
                    )}
                    Sign in as Admin
                  </Button>
                </form>
                <p className="text-xs text-gray-500 text-center">
                  Demo access only. Use credentials: admin / DanielHasABigPP
                </p>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
