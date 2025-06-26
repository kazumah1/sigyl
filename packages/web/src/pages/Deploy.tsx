import { useState } from "react";
import { InteractiveBackground } from "@/components/InteractiveBackground";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import DeployWizardWithGitHubApp from "@/components/DeployWizardWithGitHubApp";
import GitHubAccountSelector from "@/components/GitHubAccountSelector";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const Deploy = () => {
  const { user, activeGitHubAccount } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const handleDeploy = (deployment: any) => {
    console.log('Deployment initiated:', deployment);
    toast.success('Deployment started successfully!');
    
    // Optionally redirect to dashboard to see deployment status
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  };

  const handleAccountChange = (account: any) => {
    console.log('Switched to GitHub account:', account.username);
    toast.success(`Switched to ${account.username}`);
  };

  const DeployContent = () => (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-gray-900' : 'bg-white'} transition-colors duration-300`}>
      <InteractiveBackground theme={theme} onThemeChange={() => {}} />
      
      <PageHeader />

      <div className="pt-24 pb-20">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center mb-12">
            <h1 className={`text-4xl md:text-5xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'} mb-4`}>
              Deploy Your MCP Server
            </h1>
            <p className={`text-lg ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} max-w-2xl mx-auto mb-6`}>
              Connect your GitHub repository and deploy your MCP server with enterprise-grade reliability. 
              Get started in minutes with our streamlined deployment process.
            </p>
            
            {/* GitHub Account Selector */}
            <div className="flex flex-col items-center gap-4 mb-6">
              {user && (
                <div className={`flex items-center justify-center gap-2 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  <span className="text-sm">Deploying as: {user.user_metadata?.user_name || user.email}</span>
                </div>
              )}
              
              <div className="w-full max-w-md">
                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                  GitHub Account
                </label>
                <GitHubAccountSelector 
                  onAccountChange={handleAccountChange}
                  className="w-full"
                />
              </div>
              
              {activeGitHubAccount && (
                <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
                  Using repositories from: <span className="font-medium">{activeGitHubAccount.username}</span>
                </div>
              )}
            </div>
          </div>

          {/* Deployment Wizard */}
          <div className="flex justify-center">
            <DeployWizardWithGitHubApp onDeploy={handleDeploy} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ProtectedRoute>
      <DeployContent />
    </ProtectedRoute>
  );
};

export default Deploy;
