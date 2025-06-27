import React from 'react';
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/components/UserProfile";
import { useNavigate } from "react-router-dom";
import { useAuth } from '@/contexts/AuthContext';

const PageHeader = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div 
            className="text-2xl font-bold tracking-tight text-white cursor-pointer hover:text-gray-300 transition-colors"
            onClick={() => navigate('/')}
          >
            SIGYL
          </div>
          <nav className="flex items-center space-x-8">
            {user && (
              <button 
                onClick={() => navigate('/dashboard')}
                className="text-gray-300 hover:text-white font-medium transition-colors"
              >
                Dashboard
              </button>
            )}
            <button 
              onClick={() => navigate('/marketplace')}
              className="text-gray-300 hover:text-white font-medium transition-colors"
            >
              Marketplace
            </button>
            <button 
              onClick={() => navigate('/docs')}
              className="text-gray-300 hover:text-white font-medium transition-colors"
            >
              Docs
            </button>
            <button 
              onClick={() => navigate('/blog')}
              className="text-gray-300 hover:text-white font-medium transition-colors"
            >
              Blog
            </button>
            <Button 
              onClick={() => navigate('/deploy')}
              className="btn-primary"
            >
              Deploy
            </Button>
            <UserProfile />
          </nav>
        </div>
      </div>
    </header>
  );
};

export default PageHeader;
