import { useState } from "react";
import { InteractiveBackground } from "@/components/InteractiveBackground";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import DeployWizardWithGitHubApp from "@/components/DeployWizardWithGitHubApp";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { getGitHubAppInstallUrl } from "@/lib/githubApp";

type GitHubAccount = {
  installationId: number;
  username: string;
  accountType: string;
  orgName?: string | null;
  profileId?: string;
};

const Deploy = () => {
  const { user, activeGitHubAccount, githubAccounts, setActiveGitHubAccount } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const handleDeploy = (deployment: any) => {
    toast.success('Deployment started successfully!');
    
    // Optionally redirect to dashboard to see deployment status
    setTimeout(() => {
      navigate('/dashboard');
    }, 2000);
  };

  const handleAccountChange = (account: any) => {
    console.log('Switched to GitHub account:', account.username);
    toast.success(`Switched to ${account.username}`);
    setActiveGitHubAccount(account);
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
            <div className="flex items-center gap-3">
              <span className="text-gray-400 text-sm whitespace-nowrap">Deploying as:</span>
              <select
                className="bg-black border border-white/20 text-white rounded-lg px-3 py-2 min-w-[180px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={activeGitHubAccount?.installationId || ''}
                onChange={e => {
                  const selected = githubAccounts.find(acc => acc.installationId === Number(e.target.value));
                  if (selected) handleAccountChange(selected);
                }}
              >
                {githubAccounts.length === 0 && <option value="">No accounts found</option>}
                {githubAccounts.map(acc => (
                  <option key={acc.installationId} value={acc.installationId}>
                    {acc.orgName ? acc.orgName : acc.username}
                  </option>
                ))}
              </select>
              <button
                className="btn-modern hover:bg-neutral-900 hover:text-white px-4 py-2 rounded-lg border border-white/20 text-sm"
                onClick={() => window.open(getGitHubAppInstallUrl(), '_blank')}
                type="button"
              >
                Add Account/Org
              </button>
            </div>
            {/* Sleek Deployment Wizard */}
            <DeployWizardWithGitHubApp onDeploy={handleDeploy} activeGitHubAccount={activeGitHubAccount} />
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
