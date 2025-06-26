
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
    <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-b border-gray-800">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="text-2xl font-bold tracking-tight text-white">
              SIGYL
            </div>
            <div className="text-sm text-gray-400">
              / {workspaceName}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <Search className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
              <Bell className="w-4 h-4" />
            </Button>
            <Button 
              size="sm" 
              className="bg-white hover:bg-gray-100 text-black font-medium"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Server
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
            <UserProfile />
          </div>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
