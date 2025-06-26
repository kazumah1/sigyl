import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { ChevronDown, Plus, User } from 'lucide-react';

interface GitHubAccountSelectorProps {
  onAccountChange?: (account: any) => void;
  className?: string;
}

const GitHubAccountSelector: React.FC<GitHubAccountSelectorProps> = ({ 
  onAccountChange, 
  className = '' 
}) => {
  const { githubAccounts, activeGitHubAccount, setActiveGitHubAccount, linkAdditionalGitHubAccount } = useAuth();
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isLinking, setIsLinking] = useState(false);

  const handleAccountSelect = (account: any) => {
    setActiveGitHubAccount(account);
    setIsOpen(false);
    onAccountChange?.(account);
  };

  const handleLinkAccount = async () => {
    setIsLinking(true);
    try {
      const installUrl = await linkAdditionalGitHubAccount();
      window.location.href = installUrl;
    } catch (error) {
      console.error('Error linking account:', error);
      setIsLinking(false);
    }
  };

  if (githubAccounts.length === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-4 py-2 text-sm font-medium rounded-lg border transition-colors duration-200 ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700'
            : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center space-x-3">
          {activeGitHubAccount?.avatarUrl ? (
            <img
              src={activeGitHubAccount.avatarUrl}
              alt={activeGitHubAccount.accountLogin}
              className="w-6 h-6 rounded-full"
            />
          ) : (
            <User className="w-6 h-6" />
          )}
          <span className="truncate">
            {activeGitHubAccount?.accountLogin || activeGitHubAccount?.username || 'Select Account'}
            {activeGitHubAccount && (
              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                {activeGitHubAccount.accountType === 'Organization' ? 'Org' : 'User'}
              </span>
            )}
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 right-0 mt-1 z-50 rounded-lg border shadow-lg ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-600'
            : 'bg-white border-gray-300'
        }`}>
          <div className="py-1">
            {githubAccounts.map((account) => (
              <button
                key={account.installationId}
                onClick={() => handleAccountSelect(account)}
                className={`flex items-center space-x-3 w-full px-4 py-2 text-sm hover:bg-opacity-50 transition-colors duration-200 ${
                  theme === 'dark'
                    ? 'hover:bg-gray-700 text-white'
                    : 'hover:bg-gray-100 text-gray-900'
                } ${
                  activeGitHubAccount?.installationId === account.installationId
                    ? theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'
                    : ''
                }`}
              >
                {account.avatarUrl ? (
                  <img
                    src={account.avatarUrl}
                    alt={account.accountLogin}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <User className="w-6 h-6" />
                )}
                <div className="flex-1 text-left">
                  <div className="font-medium flex items-center gap-2">
                    {account.accountLogin}
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${theme === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}>
                      {account.accountType === 'Organization' ? 'Org' : 'User'}
                    </span>
                  </div>
                  {account.accountType === 'Organization' && account.accountLogin !== account.username && (
                    <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>{account.username}</div>
                  )}
                </div>
                {activeGitHubAccount?.installationId === account.installationId && (
                  <div className={`w-2 h-2 rounded-full ${theme === 'dark' ? 'bg-blue-400' : 'bg-blue-600'}`} />
                )}
              </button>
            ))}
            
            <div className={`border-t ${theme === 'dark' ? 'border-gray-600' : 'border-gray-200'}`}>
              <button
                onClick={handleLinkAccount}
                disabled={isLinking}
                className={`flex items-center space-x-3 w-full px-4 py-2 text-sm transition-colors duration-200 ${
                  theme === 'dark'
                    ? 'hover:bg-gray-700 text-blue-400 hover:text-blue-300'
                    : 'hover:bg-gray-100 text-blue-600 hover:text-blue-700'
                } ${isLinking ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Plus className="w-5 h-5" />
                <span>{isLinking ? 'Linking...' : 'Add Another Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GitHubAccountSelector; 