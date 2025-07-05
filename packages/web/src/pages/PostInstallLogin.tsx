import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Github } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

const PostInstallLogin = () => {
  const navigate = useNavigate();
  const { signInWithGitHubApp, session } = useAuth();
  const { toast } = useToast();

  const handleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin + '/auth/callback',
          scopes: 'read:user user:email',
        },
      });
      // The redirect will happen automatically
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start GitHub login',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 pt-20">
      <Card className="w-full max-w-md bg-gray-900/50 border-gray-800 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-white">One More Step!</CardTitle>
          <CardDescription className="text-gray-400 mt-2">
            Please sign in with GitHub again to complete your account setup after installing the GitHub App.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 items-center">
          <Button onClick={handleSignIn} className="w-full flex gap-2 items-center justify-center btn-modern-inverted hover:bg-neutral-900 hover:text-white" size="lg">
            <Github className="w-5 h-5" />
            Sign in with GitHub
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PostInstallLogin; 