import React from 'react';
import { Button } from '@/components/ui/button';
import { Bell, Search, Plus, LogOut } from 'lucide-react';
import { UserProfile } from '@/components/UserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface DashboardHeaderProps {
  workspaceName: string;
  userName: string;
}

const DashboardHeader: React.FC<DashboardHeaderProps> = ({ workspaceName, userName }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <img src="/favicon.png" alt="SIGYL Logo" className="w-10 h-10 rounded-full object-cover shadow-sm cursor-pointer" style={{background:'#18181b'}} onClick={() => navigate('/')} />
            <div 
              className="text-2xl font-bold tracking-tight text-white cursor-pointer hover:text-gray-300 transition-colors"
              style={{fontFamily:'Space Grotesk, Inter, system-ui, sans-serif'}}
              onClick={() => navigate('/')}
            >
              SIGYL
            </div>
            <div className="text-sm text-gray-400">
              / {workspaceName}
            </div>
          </div>
          
          <nav className="flex items-center space-x-8">
            <button 
              onClick={() => navigate('/registry')}
              className="text-gray-300 hover:text-white font-medium transition-colors"
            >
              Registry
            </button>
            <button 
              onClick={() => navigate('/docs')}
              className="text-gray-300 hover:text-white font-medium transition-colors"
            >
              Docs
            </button>
            <button 
              onClick={() => navigate('/pricing')}
              className="text-gray-300 hover:text-white font-medium transition-colors"
            >
              Pricing
            </button>
            <button 
              onClick={() => navigate('/blog')}
              className="text-gray-300 hover:text-white font-medium transition-colors"
            >
              Blog
            </button>
            <Button 
              size="sm" 
              className="btn-modern"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Server
            </Button>
            <UserProfile />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
