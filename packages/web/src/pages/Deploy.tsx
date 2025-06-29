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
    <div className="min-h-screen bg-black text-white font-sans relative overflow-hidden">
      <div className="liquid-glass-blob blob-1" />
      <div className="liquid-glass-blob blob-2" />
      <div className="liquid-glass-blob blob-3" />
      <PageHeader />
      <div className="pt-28 pb-20">
        <div className="max-w-5xl mx-auto px-6">
          {/* Hero Section */}
          <div className="mb-12 text-center max-w-2xl mx-auto">
            <h1 className="hero-heading text-4xl sm:text-5xl lg:text-6xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif', letterSpacing: '-0.02em', lineHeight: '1.08' }}>
              Deploy Your MCP Server
            </h1>
            <p className="hero-subheading text-lg sm:text-xl text-gray-300 font-normal mb-8" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif', lineHeight: '1.5' }}>
              Connect your GitHub repository and deploy your MCP server with enterprise-grade reliability. Get started in minutes with our streamlined deployment process.
            </p>
          </div>
          {/* Glassy Card for Account Selector and Wizard */}
          <div className="w-full max-w-2xl bg-white/5 backdrop-blur-lg border border-white/15 rounded-2xl shadow-2xl mx-auto p-8 flex flex-col gap-8" style={{ boxShadow: '0 8px 32px 0 rgba(0,0,0,0.28)' }}>
            {/* GitHub Account Selector */}
            <div className="flex flex-col gap-2">
              {user && (
                <div className="text-gray-400 text-sm mb-1">
                  Deploying as: <span className="font-medium text-white">{user.user_metadata?.user_name || user.email}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-200" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
                  GitHub Account
                </label>
                <GitHubAccountSelector 
                  onAccountChange={handleAccountChange}
                  className="w-full"
                />
              </div>
              {activeGitHubAccount && (
                <div className="text-sm text-gray-400 mt-1">
                  Using repositories from: <span className="font-medium text-white">{activeGitHubAccount.username}</span>
                </div>
              )}
            </div>
            {/* Sleek Deployment Wizard */}
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
