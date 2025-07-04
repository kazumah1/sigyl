import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Star, 
  Download, 
  Calendar, 
  User, 
  Package, 
  ExternalLink, 
  ArrowLeft,
  Github,
  Globe,
  Settings,
  Code,
  BookOpen,
  Shield,
  Tag,
  Users,
  Activity,
  Terminal,
  Copy,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Database,
  Network,
  Cpu,
  HardDrive,
  Rocket,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  MessageCircle,
  Copy as CopyIcon,
  Code2
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { MarketplaceService } from '@/services/marketplaceService';
import { PackageWithDetails } from '@/types/marketplace';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { v4 as uuidv4 } from 'uuid';
import { APIKeyService, APIKey } from '@/services/apiKeyService';

const MCPPackagePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, session, activeGitHubAccount } = useAuth();
  
  const [pkg, setPackage] = useState<PackageWithDetails | null>(null);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [deploymentLogs, setDeploymentLogs] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState<'idle' | 'deploying' | 'success' | 'failed'>('idle');
  const [deploymentProgress, setDeploymentProgress] = useState<{
    step: number;
    stepName: string;
    message: string;
    isComplete: boolean;
  }>({
    step: 0,
    stepName: '',
    message: '',
    isComplete: false
  });
  const [deploymentError, setDeploymentError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editFields, setEditFields] = useState({
    name: '',
    version: '',
    description: '',
    logo_url: '',
    screenshots: '', // comma-separated URLs
  });
  const [saving, setSaving] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [installStep, setInstallStep] = useState(1);
  // Dynamic secrets state
  const [secretFields, setSecretFields] = useState<{ [key: string]: string }>({});
  const [secretErrors, setSecretErrors] = useState<{ [k: string]: string }>({});
  const [showOptionalSecrets, setShowOptionalSecrets] = useState(false);
  const [showClaudeInline, setShowClaudeInline] = useState(false);
  const [claudeCommand, setClaudeCommand] = useState('');
  const [claudeCopied, setClaudeCopied] = useState(false);
  const [showVSCodeInline, setShowVSCodeInline] = useState(false);
  const [vsCodeCommand, setVSCodeCommand] = useState("");
  const [vsCodeCopied, setVSCodeCopied] = useState(false);
  const [installProfile, setInstallProfile] = useState('');
  const [installApiKey, setInstallApiKey] = useState('');
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [apiKeysLoading, setApiKeysLoading] = useState(false);
  const [fullApiKeys, setFullApiKeys] = useState<{ [id: string]: string }>(() => {
    const stored = localStorage.getItem('sigyl_full_api_keys');
    return stored ? JSON.parse(stored) : {};
  });
  const [showHttpApiInline, setShowHttpApiInline] = useState(false);
  const [httpApiCopied, setHttpApiCopied] = useState(false);
  const [httpApiUrl, setHttpApiUrl] = useState('');
  const [showJsonConfig, setShowJsonConfig] = useState(false);
  const [jsonConfigCopied, setJsonConfigCopied] = useState(false);
  const [jsonConfig, setJsonConfig] = useState('');
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Check if this is a new deployment (from deploy flow)
  const isNewDeployment = searchParams.get('new') === 'true';
  const isDeploying = searchParams.get('deploying') === 'true';

  const deploymentSteps = [
    { name: 'Security Scan', description: 'Analyzing repository for security issues' },
    { name: 'Build Setup', description: 'Preparing build environment' },
    { name: 'Container Build', description: 'Building and pushing container image' },
    { name: 'Cloud Deploy', description: 'Deploying to Google Cloud Run' },
    { name: 'Service Ready', description: 'Configuring and starting service' }
  ];

  const [ownerViewMode, setOwnerViewMode] = useState<'owner' | 'public'>('owner');
  // Use ownerViewMode to determine if we are in owner or public view
  const effectiveIsOwner = isOwner && ownerViewMode === 'owner';
  const effectiveIsPublic = isOwner && ownerViewMode === 'public';

  const [isRedeploying, setIsRedeploying] = useState(false);

  useEffect(() => {
    if (id) {
      loadPackageData();
    }
  }, [id, user]);

  useEffect(() => {
    if (pkg && isOwner) {
      setEditFields({
        name: pkg.name,
        version: pkg.version || '',
        description: pkg.description || '',
        logo_url: pkg.logo_url || '',
        screenshots: Array.isArray(pkg.screenshots)
          ? (pkg.screenshots as string[]).join(',')
          : (pkg.screenshots || ''),
      });
    }
  }, [pkg, isOwner]);

  // Copy to clipboard helper function
  const copyToClipboard = async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(successMessage);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  // Get the correct token for API authentication
  // Priority: GitHub App token > Supabase JWT token
  const getAuthToken = async () => {
    console.log('🔍 getAuthToken: Starting authentication check...');
    
    try {
      console.log('🔍 getAuthToken: activeGitHubAccount:', activeGitHubAccount);
      console.log('🔍 getAuthToken: session exists:', !!session);
      
      // First check if we have a valid GitHub App session
      if (activeGitHubAccount) {
        const githubAppToken = localStorage.getItem('github_app_access_token');
        console.log('🔍 getAuthToken: GitHub App token from localStorage:', githubAppToken ? `${githubAppToken.substring(0, 20)}... (length: ${githubAppToken.length})` : 'null');
        
        if (githubAppToken && 
            githubAppToken !== 'restored_token' && 
            githubAppToken !== 'db_restored_token' &&
            githubAppToken.length > 20 && // Ensure it's a real token, not a placeholder
            (githubAppToken.startsWith('gho_') || githubAppToken.startsWith('ghp_') || githubAppToken.startsWith('github_pat_'))) {
          console.log('🔑 Using GitHub App token for authentication');
          return githubAppToken;
        } else {
          console.log('❌ GitHub App token is invalid or placeholder:', {
            isPlaceholder: githubAppToken === 'restored_token' || githubAppToken === 'db_restored_token',
            length: githubAppToken ? githubAppToken.length : 'null',
            hasValidPrefix: githubAppToken ? (githubAppToken.startsWith('gho_') || githubAppToken.startsWith('ghp_') || githubAppToken.startsWith('github_pat_')) : false
          });
        }
      } else {
        console.log('❌ No active GitHub account');
      }
      
      // Fall back to Supabase session token - try session first, then refresh if needed
      let supabaseToken = session?.access_token;
      console.log('🔍 getAuthToken: Supabase token from session:', supabaseToken ? `${supabaseToken.substring(0, 20)}... (length: ${supabaseToken.length})` : 'null');
      
      // If session token is invalid or expired, try to refresh the session
      if (!supabaseToken || supabaseToken === 'db_restored_token' || supabaseToken.split('.').length !== 3) {
        console.log('🔍 getAuthToken: Session token invalid, attempting to refresh session...');
        try {
          const { data: { session: refreshedSession }, error } = await supabase.auth.getSession();
          if (refreshedSession && !error) {
            supabaseToken = refreshedSession.access_token;
            console.log('🔍 getAuthToken: Refreshed Supabase token:', supabaseToken ? `${supabaseToken.substring(0, 20)}... (length: ${supabaseToken.length})` : 'null');
          } else {
            console.log('❌ Failed to refresh session:', error?.message);
          }
        } catch (refreshError) {
          console.log('❌ Session refresh exception:', refreshError);
        }
      }
      
      // If still no valid token, try localStorage as last resort
      if (!supabaseToken || supabaseToken === 'db_restored_token' || supabaseToken.split('.').length !== 3) {
        console.log('🔍 getAuthToken: Session refresh failed, checking localStorage...');
        try {
          const supabaseAuthData = localStorage.getItem('sb-zcudhsyvfrlfgqqhjrqv-auth-token');
          if (supabaseAuthData) {
            const parsedAuth = JSON.parse(supabaseAuthData);
            supabaseToken = parsedAuth.access_token;
            console.log('🔍 getAuthToken: Supabase token from localStorage:', supabaseToken ? `${supabaseToken.substring(0, 20)}... (length: ${supabaseToken.length})` : 'null');
          }
        } catch (error) {
          console.log('❌ Failed to parse Supabase auth from localStorage:', error);
        }
      }
      
      if (supabaseToken && supabaseToken.split('.').length === 3) {
        console.log('🔑 Using Supabase JWT token for authentication');
        return supabaseToken;
      } else if (supabaseToken) {
        console.log('❌ Supabase token is not a valid JWT (wrong number of parts):', supabaseToken.split('.').length);
      }

      console.error('❌ No valid authentication token found');
      return null;
    } catch (error) {
      console.error('❌ Error in getAuthToken:', error);
      return null;
    }
  };

  // Fetch API keys and set profile on install modal open
  useEffect(() => {
    if (showInstallModal && user) {
      setInstallProfile(user.id);
      setApiKeysLoading(true);
      
      // Use proper authentication token instead of user.id
      getAuthToken()
        .then(token => {
          if (token) {
            return APIKeyService.getAPIKeys(token);
          } else {
            throw new Error('No authentication token available');
          }
        })
        .then(keys => {
          setApiKeys(keys);
          setInstallApiKey('');
          // If any full keys are in localStorage, load them
          const stored = localStorage.getItem('sigyl_full_api_keys');
          if (stored) {
            setFullApiKeys(JSON.parse(stored));
          }
        })
        .catch((error) => {
          console.error('Failed to fetch API keys:', error);
          setApiKeys([]);
        })
        .finally(() => setApiKeysLoading(false));
    }
  }, [showInstallModal, user]);

  // Keep fullApiKeys in sync with localStorage if it changes elsewhere
  useEffect(() => {
    const syncFullKeys = () => {
      const stored = localStorage.getItem('sigyl_full_api_keys');
      if (stored) setFullApiKeys(JSON.parse(stored));
    };
    window.addEventListener('storage', syncFullKeys);
    return () => window.removeEventListener('storage', syncFullKeys);
  }, []);

  const loadPackageData = async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const packageData = await MarketplaceService.getPackageById(id);
      
      if (packageData) {
        setPackage(packageData);
        setIsOwner(packageData.author_id === user?.id);
        
        // Set deployment logs if available
        if (packageData.deployments && packageData.deployments.length > 0) {
          const activeDeployment = packageData.deployments.find(d => d.status === 'active');
          if (activeDeployment) {
            setDeploymentLogs([
              '✅ Service is running normally',
              `🌐 Service URL: ${activeDeployment.deployment_url}`,
              '📊 Monitoring deployment health...'
            ]);
          }
        }
      } else {
        // Package not found - this will trigger the "not found" UI
        setPackage(null);
      }
    } catch (error) {
      console.error('Failed to load package data:', error);
      
      // Check if it's a 404 error
      if (error instanceof Error && error.message.includes('404')) {
        // Package not found - this will trigger the "not found" UI
        setPackage(null);
      } else {
        // Other error - show toast and set package to null
        toast.error('Failed to load package data. Please try again.');
        setPackage(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle deployment progress tracking
  useEffect(() => {
    if (isDeploying && isOwner) {
      setDeploymentStatus('deploying');
      
      // Simulate deployment progress
      const simulateDeployment = async () => {
        try {
          // Step 1: Security Scan
          setDeploymentProgress({
            step: 1,
            stepName: deploymentSteps[0].name,
            message: deploymentSteps[0].description,
            isComplete: false
          });
          setDeploymentLogs(prev => [...prev, '🔒 Starting security validation...']);
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Step 2: Build Setup
          setDeploymentProgress({
            step: 2,
            stepName: deploymentSteps[1].name,
            message: deploymentSteps[1].description,
            isComplete: false
          });
          setDeploymentLogs(prev => [...prev, '📦 Preparing build environment...']);
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Step 3: Container Build
          setDeploymentProgress({
            step: 3,
            stepName: deploymentSteps[2].name,
            message: deploymentSteps[2].description,
            isComplete: false
          });
          setDeploymentLogs(prev => [...prev, '🔨 Building and pushing container image...']);
          await new Promise(resolve => setTimeout(resolve, 5000));
          
          // Step 4: Cloud Deploy
          setDeploymentProgress({
            step: 4,
            stepName: deploymentSteps[3].name,
            message: deploymentSteps[3].description,
            isComplete: false
          });
          setDeploymentLogs(prev => [...prev, '☁️ Deploying to Google Cloud Run...']);
          await new Promise(resolve => setTimeout(resolve, 4000));
          
          // Step 5: Complete
          setDeploymentProgress({
            step: 5,
            stepName: deploymentSteps[4].name,
            message: 'Deployment completed successfully!',
            isComplete: true
          });
          setDeploymentLogs(prev => [...prev, '✅ Service deployed successfully!']);
          setDeploymentStatus('success');
          
          // Reload package data to get updated deployment info
          await loadPackageData();
          
        } catch (error) {
          setDeploymentError(error instanceof Error ? error.message : 'Deployment failed');
          setDeploymentStatus('failed');
          setDeploymentLogs(prev => [...prev, '❌ Deployment failed. Please check the logs and try again.']);
        }
      };
      
      simulateDeployment();
    }
  }, [isDeploying, isOwner, deploymentSteps, pkg]);

  const handleDownload = async () => {
    if (!pkg) return;

    setIsDownloading(true);
    try {
      // In real implementation, this would call your API
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`${pkg.name} downloaded successfully!`);
    } catch (error) {
      toast.error('Failed to download package');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyServiceUrl = () => {
    if (pkg?.deployments && pkg.deployments.length > 0) {
      const activeDeployment = pkg.deployments.find(d => d.status === 'active');
      if (activeDeployment) {
        navigator.clipboard.writeText(activeDeployment.deployment_url);
        toast.success('Service URL copied to clipboard!');
      }
    }
  };

  const handleRefreshLogs = () => {
    setIsRefreshing(true);
    // Simulate refreshing logs
    setTimeout(() => {
      setDeploymentLogs(prev => [...prev, `🔄 Logs refreshed at ${new Date().toLocaleTimeString()}`]);
      setIsRefreshing(false);
    }, 1000);
  };

  const handleRetryDeployment = () => {
    setDeploymentStatus('idle');
    setDeploymentError(null);
    setDeploymentProgress({ step: 0, stepName: '', message: '', isComplete: false });
    setDeploymentLogs([]);
    // Navigate back to deploy page to retry
    navigate('/deploy');
  };

  const handleRestartService = () => {
    toast.info('Restarting service...');
    // In real implementation, this would call your API
  };

  const handleStopService = () => {
    toast.info('Stopping service...');
    // In real implementation, this would call your API
  };

  const handleDeleteService = () => {
    setShowDeleteModal(true);
    setDeleteConfirmName('');
  };

  const handleConfirmDelete = async () => {
    if (!pkg || deleteConfirmName !== pkg.name) {
      toast.error('Please enter the exact package name to confirm deletion');
      return;
    }

    setIsDeleting(true);
    try {
      // Import deployment service
      const deploymentService = (await import('@/services/deploymentService')).default;
      
      // Get API key for authentication (try to get from stored keys)
      let apiKey = '';
      if (apiKeys.length > 0 && fullApiKeys[apiKeys[0].id]) {
        apiKey = fullApiKeys[apiKeys[0].id];
      } else if (apiKeys.length > 0) {
        apiKey = apiKeys[0].key_prefix;
      }

      const result = await deploymentService.deletePackage(pkg.id, pkg.name, apiKey);
      
      if (result.success) {
        toast.success(`Successfully deleted ${pkg.name} and all its data`);
        setShowDeleteModal(false);
        // Navigate back to dashboard after successful deletion
        navigate('/dashboard');
      } else {
        toast.error(result.error || 'Failed to delete package');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete package: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEditFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyEdit = async () => {
    if (!pkg) return;
    setSaving(true);
    try {
      const { error: updateError } = await supabase
        .from('mcp_packages')
        .update({
          name: editFields.name,
          version: editFields.version,
          description: editFields.description,
          logo_url: editFields.logo_url,
          screenshots: editFields.screenshots
            ? editFields.screenshots.split(',').map((s) => s.trim())
            : [],
        })
        .eq('id', pkg.id);
      if (updateError) {
        toast.error(updateError.message);
      } else {
        toast.success('Package updated successfully!');
        setEditMode(false);
        // Optionally reload package data
        await loadPackageData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to update package');
    } finally {
      setSaving(false);
    }
  };

  const validateSecrets = () => {
    const errors: { [k: string]: string } = {};
    if (pkg && pkg.secrets && Array.isArray(pkg.secrets)) {
      for (const secret of pkg.secrets) {
        if (secret.required && !secretFields[secret.name]) {
          errors[secret.name] = 'Required';
        }
      }
    } else {
      // fallback for old hardcoded fields
      if (!secretFields.WEATHER_API_KEY) errors.WEATHER_API_KEY = 'Required';
    }
    setSecretErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSecretChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSecretFields((prev) => ({ ...prev, [name]: value }));
  };

  const handleInstallClick = () => {
    setShowInstallModal(true);
    // Check if there are any secrets to configure
    const hasSecrets = pkg && pkg.secrets && Array.isArray(pkg.secrets) && pkg.secrets.length > 0;
    if (hasSecrets) {
      setInstallStep(1);
      // Initialize secret fields for all secrets
      const initialFields: { [key: string]: string } = {};
      for (const secret of pkg.secrets) {
        initialFields[secret.name] = '';
      }
      setSecretFields(initialFields);
    } else {
      setInstallStep(2);
      setSecretFields({});
    }
    setSecretErrors({});
  };

  const cellStyle = { minHeight: 50, height: 50, width: '100%', boxSizing: 'border-box' as const };

  // Increment download count for this package
  const incrementDownloadCount = async () => {
    if (!pkg) return;
    const success = await MarketplaceService.incrementDownloadCount(pkg.id);
    if (success) {
      setPackage(prev => prev ? { ...prev, downloads_count: prev.downloads_count + 1 } : prev);
    }
  };

  // Before the return statement, define the cursorButton variable
  const cursorButton = (() => {
    const name = pkg?.name;
    const sourceApiUrl = pkg?.source_api_url;
    let config = sourceApiUrl ? { url: sourceApiUrl.replace(/\/$/, '') + '/mcp' } : {};
    let configBase64 = '';
    try {
      configBase64 = btoa(JSON.stringify(config));
    } catch {}
    const deepLink = name && sourceApiUrl && configBase64
      ? `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(name)}&config=${encodeURIComponent(configBase64)}`
      : '';
    return (
      <a
        href={deepLink || '#'}
        style={{ display: 'inline-block', width: '100%' }}
        onClick={e => {
          if (!name || !sourceApiUrl) {
            e.preventDefault();
            toast.error('No MCP package name or deployed server URL found for this server.');
          } else {
            incrementDownloadCount();
          }
        }}
      >
        <Button
          variant="outline"
          className="flex items-center gap-2 justify-start pl-4 bg-white/10 border-white/20 text-white hover:bg-white/10 hover:text-white transition-all duration-200"
          style={cellStyle}
          type="button"
        >
          <img src="/favicon.png" alt="Cursor" className="w-5 h-5" /> Cursor
        </Button>
      </a>
    );
  })();

  useEffect(() => {
    const anyModalOpen = showDeleteModal || showInstallModal || showJsonConfig;
    if (anyModalOpen) {
      // Calculate scrollbar width
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.setProperty('--scrollbar-width', `${scrollBarWidth}px`);
      document.body.classList.add('body-modal-open');
    } else {
      document.body.classList.remove('body-modal-open');
      document.body.style.removeProperty('--scrollbar-width');
    }
    // Clean up on unmount
    return () => {
      document.body.classList.remove('body-modal-open');
      document.body.style.removeProperty('--scrollbar-width');
    };
  }, [showDeleteModal, showInstallModal, showJsonConfig]);

  const handleRedeploy = async () => {
    if (!pkg || !pkg.deployments || pkg.deployments.length === 0) {
      toast.error('No deployment found to redeploy');
      return;
    }

    const activeDeployment = pkg.deployments.find(d => d.status === 'active');
    if (!activeDeployment) {
      toast.error('No active deployment found to redeploy');
      return;
    }

    setIsRedeploying(true);
    try {
      const response = await fetch(`https://api.sigyl.dev/api/v1/deployments/${activeDeployment.id}/redeploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Redeployment started successfully');
        // Refresh package data to get updated deployment status
        loadPackageData();
      } else {
        toast.error(data.error || 'Failed to redeploy');
      }
    } catch (error) {
      console.error('Redeploy error:', error);
      toast.error('Failed to redeploy: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsRedeploying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <PageHeader />
        <div className="container mx-auto px-6 py-8 mt-16">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin" />
              <span className="text-xl">Loading MCP package...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white">
        <PageHeader />
        <div className="container mx-auto px-6 py-8 mt-16">
          <div className="flex flex-col items-center justify-center h-64 space-y-6">
            <div className="text-center space-y-4">
              <div className="text-2xl font-bold text-white">MCP Package not found</div>
              <p className="text-gray-400 max-w-md">
                The package you're looking for doesn't exist or may have been removed.
              </p>
            </div>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/marketplace')}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Marketplace
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <PageHeader />
      
      <div className="container mx-auto px-6 py-8 mt-16">
        {/* Owner View Toggle Button */}
        {isOwner && (
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              className="border-white text-white bg-transparent hover:bg-[#23232a] hover:text-white transition-all duration-200"
              onClick={() => setOwnerViewMode(ownerViewMode === 'owner' ? 'public' : 'owner')}
            >
              {ownerViewMode === 'owner' ? 'View Server Page' : 'Edit Server Page'}
            </Button>
          </div>
        )}
        {/* Back Navigation */}
        <Button
          variant="outline"
          onClick={() => navigate(effectiveIsOwner ? '/dashboard' : '/marketplace')}
          className="mb-6 border-white text-white bg-transparent hover:bg-[#23232a] hover:text-white transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {effectiveIsOwner ? 'Dashboard' : 'Marketplace'}
        </Button>
        {/* Edit Button (Owner Only) */}
        {effectiveIsOwner && !editMode && (
          <div className="flex justify-end mb-4">
            <Button
              onClick={() => setEditMode(true)}
              className="btn-modern hover:bg-neutral-900 hover:text-white"
            >
              Edit
            </Button>
          </div>
        )}
        {effectiveIsOwner && editMode && (
          <div className="flex justify-end mb-4 gap-2">
            <Button
              onClick={handleApplyEdit}
              className="btn-modern-inverted hover:bg-neutral-900 hover:text-white"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Apply'}
            </Button>
            <Button
              onClick={() => setEditMode(false)}
              variant="ghost"
              className="text-gray-400 hover:text-white hover:bg-[#23232a]"
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        )}
        {/* New Deployment Success Alert */}
        {isNewDeployment && deploymentStatus === 'success' && (
          <Alert className="mb-6 border-green-500 bg-green-500/10">
            <CheckCircle className="h-4 w-4 text-white" />
            <AlertDescription className="text-white">
              🎉 Your MCP server has been deployed successfully! It's now running and ready to use.
            </AlertDescription>
          </Alert>
        )}
        {/* Deployment Progress Section */}
        {isDeploying && effectiveIsOwner && deploymentStatus === 'deploying' && (
          <Card className="mb-6 bg-gray-900/50 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Rocket className="w-5 h-5 text-blue-500" />
                Deploying Your MCP Server
              </CardTitle>
              <CardDescription className="text-gray-400">
                {pkg?.name} → Google Cloud Run
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress Steps */}
                <div className="space-y-3">
                  {deploymentSteps.map((step, index) => {
                    const stepNumber = index + 1;
                    const isActive = deploymentProgress.step === stepNumber;
                    const isComplete = deploymentProgress.step > stepNumber;
                    
                    return (
                      <div key={step.name} className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                          isComplete 
                            ? 'bg-green-500 text-white' 
                            : isActive 
                              ? 'bg-blue-500 text-white' 
                              : 'bg-gray-700 text-gray-400'
                        }`}>
                          {isComplete ? (
                            <CheckCircle className="w-4 h-4" />
                          ) : isActive ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <span className="text-sm font-semibold">{stepNumber}</span>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className={`font-medium transition-colors ${
                            isActive ? 'text-white' : isComplete ? 'text-white' : 'text-gray-400'
                          }`}>
                            {step.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {isActive ? deploymentProgress.message : step.description}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {/* Progress Bar */}
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-500"
                    style={{ 
                      width: `${(deploymentProgress.step / deploymentSteps.length) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        {/* Deployment Error Alert */}
        {deploymentStatus === 'failed' && deploymentError && (
          <Alert className="mb-6 border-red-500 bg-red-500/10">
            <AlertCircle className="h-4 w-4 text-white" />
            <AlertDescription className="text-white">
              <div className="space-y-2">
                <div className="font-semibold">Deployment Failed</div>
                <div>{deploymentError}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetryDeployment}
                  className="mt-2 border-white text-white hover:bg-[#23232a] hover:text-white"
                >
                  Try Again
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-6 mb-6">
            <div className="p-5 bg-white/10 rounded-xl">
              <img src="/favicon.png" alt={pkg.name} className="w-24 h-24 rounded-lg object-contain border border-white/10" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {editMode ? (
                  <input
                    type="text"
                    name="name"
                    value={editFields.name}
                    onChange={handleEditFieldChange}
                    className="text-4xl font-bold text-white bg-gray-800 border border-gray-700 rounded px-2 py-1 w-full mb-2"
                  />
                ) : (
                  <h1 className="text-4xl font-bold text-white">{pkg.name}</h1>
                )}
                {effectiveIsOwner && (
                  <Badge className="bg-white/10 text-white border-white/20 flex items-center gap-1 hover:bg-neutral-900 hover:text-white">
                    <User className="w-3 h-3" />
                    Owner
                  </Badge>
                )}
                {pkg.deployments && pkg.deployments.length > 0 && (
                  <Badge className="flex items-center gap-1 bg-white/10 text-white border-white/20 hover:bg-white/10 hover:text-white">
                    {pkg.deployments.some(d => d.status === 'active') ? <CheckCircle className="w-3 h-3" /> :
                     pkg.deployments.some(d => d.status === 'failed') ? <AlertCircle className="w-3 h-3" /> :
                     <Pause className="w-3 h-3" />}
                    {pkg.deployments.some(d => d.status === 'active') ? 'Running' :
                     pkg.deployments.some(d => d.status === 'failed') ? 'Failed' : 'Stopped'}
                  </Badge>
                )}
              </div>
              <div>
                @{pkg.slug}
              </div>
            </div>
            {/* Action Buttons */}
          <div className="flex gap-4 flex-wrap">
            {effectiveIsOwner ? (
              <>
                {pkg.deployments && pkg.deployments.some(d => d.status === 'active') && (
                  <>
                    <Button
                      onClick={handleCopyServiceUrl}
                      variant="outline"
                      className="border-white text-white bg-transparent hover:bg-[#23232a] hover:text-white transition-all duration-200"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Service URL
                    </Button>
                    <Button
                      onClick={handleRedeploy}
                      variant="outline"
                      disabled={isRedeploying}
                      className="border-white text-white bg-transparent hover:bg-[#23232a] hover:text-white transition-all duration-200"
                    >
                      <RefreshCw className={`w-4 h-4 mr-2 ${isRedeploying ? 'animate-spin' : ''}`} />
                      {isRedeploying ? 'Redeploying...' : 'Redeploy'}
                    </Button>
                  </>
                )}
                <Button
                  onClick={handleDeleteService}
                  variant="outline"
                  className="btn-modern hover:bg-neutral-900 hover:text-white"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Service
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handleInstallClick}
                  className="bg-white text-black border border-white rounded-md px-6 py-2 font-semibold hover:bg-neutral-900 hover:text-white transition-colors"
                  disabled={loading}
                  variant="secondary"
                  size="lg"
                >
                  Connect
                </Button>
                {/* {pkg.source_api_url && (
                  <Button
                    onClick={() => window.open(pkg.source_api_url, '_blank')}
                    size="lg"
                    className="btn-modern hover:bg-neutral-900 hover:text-white"
                  >
                    <Github className="w-4 h-4 mr-2" />
                    View on GitHub
                  </Button>
                )} */}
              </>
            )}
          </div>
          </div>
          <div className="flex items-center gap-4 text-gray-400 mb-4">
            <span className="flex items-center gap-1">
              <Package className="w-4 h-4" />
              v{editMode ? editFields.version || '1.0.0' : pkg.version || '1.0.0'}
            </span>
              <span className="flex items-center gap-1">
                <Download className="w-4 h-4" />
                {pkg.downloads_count.toLocaleString()} downloads
              </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Updated {new Date(pkg.updated_at).toLocaleDateString()}
            </span>
          </div>
        </div>
        {/* Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Tabs defaultValue={effectiveIsOwner ? "overview" : "overview"} className="w-full">
              <TabsList className="flex w-full bg-black/60 border border-white/10 rounded-xl mb-6 h-12 items-stretch justify-around">
                <TabsTrigger value="overview" className="flex-1 h-full flex items-center justify-center px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:font-bold text-gray-400 font-semibold rounded-xl transition-all">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Overview
                </TabsTrigger>
                <TabsTrigger value="tools" className="flex-1 h-full flex items-center justify-center px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:font-bold text-gray-400 font-semibold rounded-xl transition-all">
                  <Code2 className="w-5 h-5 mr-2" />
                  Tools
                </TabsTrigger>
                {effectiveIsOwner ? (
                  <TabsTrigger value="logs" className="flex-1 h-full flex items-center justify-center px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:font-bold text-gray-400 font-semibold rounded-xl transition-all">
                    <Terminal className="w-5 h-5 mr-2" />
                    Logs
                  </TabsTrigger>
                ) : (
                  <TabsTrigger value="deployment" className="flex-1 h-full flex items-center justify-center px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:font-bold text-gray-400 font-semibold rounded-xl transition-all">
                    <Settings className="w-5 h-5 mr-2" />
                    Deployment
                  </TabsTrigger>
                )}
                {/* <TabsTrigger value="api" className="flex-1 h-full flex items-center justify-center px-6 data-[state=active]:bg-[#23232a] data-[state=active]:text-white data-[state=active]:font-bold text-gray-400 font-semibold rounded-xl transition-all">
                  <Globe className="w-4 h-4" />
                  API
                </TabsTrigger> */}
              </TabsList>
              <TabsContent value="overview" className="mt-6">
                <div className="space-y-6">
                  <Card className="bg-black/60 border border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Description</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {editMode ? (
                        <textarea
                          name="description"
                          value={editFields.description}
                          onChange={handleEditFieldChange}
                          className="w-full px-3 py-2 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none"
                        />
                      ) : (
                        <p className="text-gray-300 leading-relaxed">{pkg.description}</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              <TabsContent value="tools" className="mt-6">
                <Card className="bg-black/60 border border-white/10 ">
                  <CardHeader>
                    <CardTitle className="text-white">Available Tools</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pkg.tools && pkg.tools.length > 0 ? (
                      <div className="space-y-4">
                        {pkg.tools.map((tool, index) => {
                          const toolName = (tool as any)?.name || `Tool ${index + 1}`;
                          const toolDescription = typeof tool === 'string' 
                            ? 'This tool provides additional functionality for the MCP server.'
                            : (tool as any)?.description || 'Tool functionality and usage details would be displayed here.';

                          return (
                            <div key={index} className="p-4 bg-white/10 rounded-lg border border-white/20">
                              <h4 className="font-semibold text-white mb-2 flex items-center gap-2">
                                <Code className="w-4 h-4" />
                                {toolName}
                              </h4>
                              <p className="text-gray-400 text-sm">
                                {toolDescription}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No tools documented yet.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              {effectiveIsOwner ? (
                <TabsContent value="logs" className="mt-6">
                  <Card className="bg-black/60 border border-white/10">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-white">Deployment Logs</CardTitle>
                        <Button
                          onClick={handleRefreshLogs}
                          disabled={isRefreshing}
                          variant="outline"
                          size="sm"
                          className="border-white/20 text-white bg-black hover:bg-white/10 hover:border-white/30 hover:text-white"
                        >
                          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                          Refresh
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-black rounded-lg p-4 border border-white/20 max-h-96 overflow-y-auto">
                        {deploymentLogs.map((log, index) => (
                          <div key={index} className="text-sm font-mono text-gray-300 mb-1">
                            {log}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              ) : (
                <TabsContent value="deployment" className="mt-6">
                  <Card className="bg-black/60 border border-white/10">
                    <CardHeader>
                      <CardTitle className="text-white">Deployment Guide</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div>
                          <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Quick Install
                          </h4>
                          <div className="bg-white/10 p-4 rounded-lg border border-gray-700">
                            <code className="text-white">npm install {pkg.name.toLowerCase().replace(/\s+/g, '-')}</code>
                          </div>
                        </div>
                        <div>
                          <h4 className="font-semibold text-white mb-3 flex items-center gap-2">
                            <Settings className="w-4 h-4" />
                            Configuration
                          </h4>
                          <div className="bg-white/10 p-4 rounded-lg border border-gray-700">
                            <pre className="text-gray-300 text-sm overflow-x-auto">
{`{
  "mcpServers": {
    "${pkg.name.toLowerCase().replace(/\s+/g, '-')}": {
      "command": "node",
      "args": ["./node_modules/${pkg.name.toLowerCase().replace(/\s+/g, '-')}/dist/index.js"],
      "env": {
        // Add your environment variables here
      }
    }
  }
}`}
                            </pre>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
              <TabsContent value="api" className="mt-6">
                <Card className="bg-black/60 border border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white">API Reference</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-white mb-2">MCP Protocol</h4>
                        <p className="text-gray-400 text-sm mb-4">
                          This server implements the Model Context Protocol (MCP) specification.
                        </p>
                      </div>
                      {pkg.source_api_url && (
                        <div>
                          <h4 className="font-semibold text-white mb-2">Source Code</h4>
                          <Button
                            onClick={() => window.open(pkg.source_api_url, '_blank')}
                            variant="outline"
                            className="border-white/20 text-white bg-black hover:bg-white/10 hover:border-white/30 hover:text-white"
                          >
                            <Github className="w-4 h-4 mr-2" />
                            View on GitHub
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
          {/* Sidebar */}
          <div className="space-y-6">
            {/* Package Info */}
            <Card className="bg-black/60 border border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Package Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Version</span>
                  {editMode ? (
                    <input
                      type="text"
                      name="version"
                      value={editFields.version}
                      onChange={handleEditFieldChange}
                      className="w-24 px-2 py-1 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none"
                    />
                  ) : (
                    <span className="text-white">{pkg.version || '1.0.0'}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Last Updated</span>
                  <span className="text-white">{new Date(pkg.updated_at).toLocaleDateString()}</span>
                </div>
                {/* <div className="flex items-center justify-between">
                  <span className="text-gray-400">Logo URL</span>
                  {editMode ? (
                    <input
                      type="text"
                      name="logo_url"
                      value={editFields.logo_url}
                      onChange={handleEditFieldChange}
                      className="w-full px-2 py-1 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none"
                    />
                  ) : (
                    <span className="text-white break-all">{pkg.logo_url || '-'}</span>
                  )}
                </div> */}
                {/* <div className="flex items-center justify-between">
                  <span className="text-gray-400">Screenshots</span>
                  {editMode ? (
                    <input
                      type="text"
                      name="screenshots"
                      value={editFields.screenshots}
                      onChange={handleEditFieldChange}
                      className="w-full px-2 py-1 rounded bg-gray-800 text-white border border-gray-700 focus:outline-none"
                    />
                  ) : (
                    <span className="text-white break-all">{Array.isArray(pkg.screenshots) ? pkg.screenshots.join(', ') : pkg.screenshots || '-'}</span>
                  )}
                </div> */}
                {!isOwner && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Downloads</span>
                    <span className="text-white">{pkg.downloads_count.toLocaleString()}</span>
                  </div>
                )}
              </CardContent>
            </Card>
            {/* MCP Server URL Display */}
            <div className="bg-black/60 rounded-lg p-6 border border-white/10">
              <h3 className="text-lg font-semibold mb-4 text-white">MCP Server URL</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-white/10 border-white/20 text-white hover:bg-white/10 transition-all duration-200 rounded-lg p-3">
                  <code className="text-white font-mono text-sm break-all">
                    {pkg.source_api_url || `https://api.sigyl.dev/mcp/${pkg.name}`}
                  </code>
                  <button
                    onClick={() => {
                      copyToClipboard(pkg.source_api_url || `https://api.sigyl.dev/mcp/${pkg.name}`, 'URL copied!');
                      setHttpApiCopied(true);
                      setTimeout(() => {
                        setHttpApiCopied(false);
                        setShowHttpApiInline(false);
                      }, 1000);
                      incrementDownloadCount();
                    }}
                    className="ml-3 p-2 bg-white/10 border border-white/20 text-white hover:bg-white/10 hover:text-white rounded-lg transition-all duration-200 flex-shrink-0"
                    title="Copy URL"
                  >
                    <CopyIcon className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-gray-400 text-sm">
                  Use this URL to connect to the MCP server from your AI client.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Install Modal */}
      <Dialog open={showInstallModal} onOpenChange={setShowInstallModal}>
        <DialogContent className="max-w-4xl transition-all duration-300 bg-gray-900 border-gray-700 text-white" style={{ minHeight: 380, maxHeight: '80vh', overflowY: 'auto' }}>
          {installStep === 1 && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">Configure Secrets</DialogTitle>
                <DialogDescription className="text-gray-400">
                  Configure the required secrets and environment variables for this MCP server to connect to external services.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {/* Render required secrets */}
                {pkg && pkg.secrets && Array.isArray(pkg.secrets) ? (
                  <>
                    {pkg.secrets.filter(s => s.required).map(secret => (
                      <div key={secret.name}>
                        <Label htmlFor={secret.name}>
                          {secret.name} <span className="text-red-400">*</span>
                          {secret.description && <span className="ml-2 text-xs text-gray-400">{secret.description}</span>}
                        </Label>
                        <Input
                          id={secret.name}
                          name={secret.name}
                          value={secretFields[secret.name] || ''}
                          onChange={handleSecretChange}
                          placeholder={secret.description || secret.name}
                          className="mt-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                          type={secret.type === 'number' ? 'number' : 'text'}
                        />
                        {secretErrors[secret.name] && <div className="text-red-400 text-xs mt-1">{secretErrors[secret.name]}</div>}
                      </div>
                    ))}
                    {/* Optional secrets toggle */}
                    {pkg.secrets.some(s => !s.required) && (
                      <div>
                        <button
                          type="button"
                          className={`flex items-center gap-2 px-3 py-1 rounded-md border border-gray-300 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm mt-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition focus:outline-none`}
                          onClick={() => setShowOptionalSecrets((v) => !v)}
                          aria-expanded={showOptionalSecrets}
                        >
                          {showOptionalSecrets ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          {showOptionalSecrets ? 'Hide optional secrets' : 'Show optional secrets'}
                        </button>
                        <div
                          className={`overflow-hidden transition-all duration-300 ${showOptionalSecrets ? 'mt-4' : 'max-h-0'}`}
                          style={showOptionalSecrets ? {} : { maxHeight: 0 }}
                        >
                          {showOptionalSecrets && (
                            <div className="space-y-4">
                              {pkg.secrets.filter(s => !s.required).map(secret => (
                                <div key={secret.name}>
                                  <Label htmlFor={secret.name}>
                                    {secret.name} (optional)
                                    {secret.description && <span className="ml-2 text-xs text-gray-400">{secret.description}</span>}
                                  </Label>
                                  <Input
                                    id={secret.name}
                                    name={secret.name}
                                    value={secretFields[secret.name] || ''}
                                    onChange={handleSecretChange}
                                    placeholder={secret.description || secret.name}
                                    className="mt-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                                    type={secret.type === 'number' ? 'number' : 'text'}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  // fallback for old hardcoded fields
                  <>
                    <div>
                      <Label htmlFor="WEATHER_API_KEY">WEATHER_API_KEY <span className="text-red-400">*</span></Label>
                      <Input
                        id="WEATHER_API_KEY"
                        name="WEATHER_API_KEY"
                        value={secretFields.WEATHER_API_KEY || ''}
                        onChange={handleSecretChange}
                        placeholder="Enter your weather API key"
                        className="mt-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                      />
                      {secretErrors.WEATHER_API_KEY && <div className="text-red-400 text-xs mt-1">{secretErrors.WEATHER_API_KEY}</div>}
                    </div>
                    <div>
                      <button
                        type="button"
                        className={`flex items-center gap-2 px-3 py-1 rounded-md border border-gray-300 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm mt-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition focus:outline-none`}
                        onClick={() => setShowOptionalSecrets((v) => !v)}
                        aria-expanded={showOptionalSecrets}
                      >
                        {showOptionalSecrets ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        {showOptionalSecrets ? 'Hide optional secrets' : 'Show optional secrets'}
                      </button>
                      <div
                        className={`overflow-hidden transition-all duration-300 ${showOptionalSecrets ? 'mt-4' : 'max-h-0'}`}
                        style={showOptionalSecrets ? {} : { maxHeight: 0 }}
                      >
                        {showOptionalSecrets && (
                          <div>
                            <Label htmlFor="DEBUG">DEBUG (optional)</Label>
                            <Input
                              id="DEBUG"
                              name="DEBUG"
                              value={secretFields.DEBUG || ''}
                              onChange={handleSecretChange}
                              placeholder="true or false"
                              className="mt-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
                <DialogFooter>
                  <Button
                    onClick={() => {
                      if (validateSecrets()) setInstallStep(2);
                    }}
                    className="bg-white text-black hover:bg-gray-200 transition-all duration-200"
                  >
                    Next
                  </Button>
                  <Button variant="ghost" onClick={() => setShowInstallModal(false)}>
                    Cancel
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
          {installStep === 2 && (
            <div className="flex flex-col h-full min-h-[380px] px-2" style={{height: '100%'}}>
              <div className="text-xl font-semibold mb-4 text-center text-white">Choose Installation Method</div>
              <div className="text-gray-400 text-sm mb-6 text-center">
                Click on a method to reveal the installation command, then copy and run it in your terminal.
              </div>
              <div className="flex-1 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-6 w-full max-w-2xl" style={{ gridTemplateColumns: 'repeat(2, minmax(280px, 1fr))' }}>
                  {/* HTTP API Button/Command logic */}
                  {showHttpApiInline ? (
                    <div className="flex items-center gap-2 justify-start pl-4 bg-white/10 border-white/20 text-white hover:bg-white/10 hover:text-white transition-all duration-200 rounded-lg" style={cellStyle}>
                      <Globe className="w-5 h-5" />
                      {httpApiCopied ? (
                        <span className="text-white text-sm flex-1 truncate text-center">Copied!</span>
                      ) : (
                        <code
                          className="text-white select-all text-sm flex-1 bg-transparent border-0 p-0 m-0"
                          style={{ background: 'none', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                          title={httpApiUrl}
                        >
                          {httpApiUrl}
                        </code>
                      )}
                      <button
                        className="p-2 rounded hover:bg-gray-700 text-gray-300 hover:text-white"
                        onClick={() => {
                          copyToClipboard(httpApiUrl, 'URL copied!');
                          setHttpApiCopied(true);
                          setTimeout(() => {
                            setHttpApiCopied(false);
                            setShowHttpApiInline(false);
                          }, 1000);
                          incrementDownloadCount();
                        }}
                        aria-label="Copy HTTP API URL"
                        disabled={httpApiCopied}
                      >
                        <CopyIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 justify-start pl-4 bg-white/10 border-white/20 text-white hover:bg-white/10 hover:text-white transition-all duration-200"
                      style={cellStyle}
                      onClick={() => {
                        // Build the HTTP API URL
                        const baseUrl = pkg?.source_api_url ? pkg.source_api_url.replace(/\/$/, '') + '/mcp' : '';
                        const apiKey = apiKeys[0] && fullApiKeys[apiKeys[0].id] ? fullApiKeys[apiKeys[0].id] : apiKeys[0]?.key_prefix || '';
                        const profileId = user?.id || '';
                        let url = '';
                        if (baseUrl && apiKey && profileId) {
                          // Ensure https://
                          let fullUrl = baseUrl;
                          if (!/^https?:\/\//.test(fullUrl)) {
                            fullUrl = 'https://' + fullUrl.replace(/^\/*/, '');
                          }
                          url = `${fullUrl}?api_key=${encodeURIComponent(apiKey)}&profile=${encodeURIComponent(profileId)}`;
                        }
                        setHttpApiUrl(url);
                        setShowHttpApiInline(true);
                        incrementDownloadCount();
                      }}
                      disabled={!pkg?.source_api_url || !user?.id || apiKeys.length === 0}
                    >
                      <Globe className="w-5 h-5" /> HTTP API
                    </Button>
                  )}
                  {/* End HTTP API logic */}
                  {/* VS Code Button/Command logic */}
                  {showVSCodeInline ? (
                    <div className="flex items-center gap-2 justify-start pl-4 bg-white/10 border-white/20 text-white hover:bg-white/10 hover:text-white transition-all duration-200 rounded-lg" style={cellStyle}>
                      <img src="/vscode.png" alt="VS Code" className="w-5 h-5" />
                      {vsCodeCopied ? (
                        <span className="text-white text-sm flex-1 truncate text-center">Copied!</span>
                      ) : (
                        <code
                          className="text-white select-all text-sm flex-1 bg-transparent border-0 p-0 m-0"
                          style={{ background: 'none', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                          title={vsCodeCommand}
                        >
                          {vsCodeCommand}
                        </code>
                      )}
                      <button
                        className="p-2 rounded hover:bg-gray-700 text-gray-300 hover:text-white"
                        onClick={() => {
                          copyToClipboard(vsCodeCommand, 'Command copied!');
                          setVSCodeCopied(true);
                          setTimeout(() => {
                            setVSCodeCopied(false);
                            setShowVSCodeInline(false);
                          }, 1000);
                          incrementDownloadCount();
                        }}
                        aria-label="Copy command"
                        disabled={vsCodeCopied}
                      >
                        <CopyIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 justify-start pl-4 bg-white/10 border-white/20 text-white hover:bg-white/10 hover:text-white transition-all duration-200"
                      style={cellStyle}
                      onClick={() => {
                        const pkgName = pkg?.slug || pkg?.name || 'my-mcp-server';
                        const profileId = user?.id || '';
                        let vscodeApiKey = '';
                        if (apiKeys[0] && fullApiKeys[apiKeys[0].id]) {
                          vscodeApiKey = fullApiKeys[apiKeys[0].id];
                        } else {
                          vscodeApiKey = apiKeys[0]?.key_prefix || '';
                        }
                        const command = `npx -y @sigyl-dev/cli@latest install ${pkgName} --client vscode --profile ${profileId} --key ${vscodeApiKey}`;
                        setVSCodeCommand(command);
                        setShowVSCodeInline(true);
                        incrementDownloadCount();
                      }}
                      disabled={!user?.id || apiKeys.length === 0}
                    >
                      <img src="/vscode.png" alt="VS Code" className="w-5 h-5" /> VS Code Extension
                    </Button>
                  )}
                  {/* End VS Code logic */}
                  {/* Claude Desktop button/field logic */}
                  {showClaudeInline ? (
                    <div className="flex items-center gap-2 justify-start pl-4 bg-white/10 border-white/20 text-white hover:bg-white/10 hover:text-white transition-all duration-200 rounded-lg" style={cellStyle}>
                      <img src="/claude.png" alt="Claude Desktop" className="w-5 h-5 rounded" />
                      {claudeCopied ? (
                        <span className="text-white text-sm flex-1 truncate text-center">Copied!</span>
                      ) : (
                        <code
                          className="text-white select-all text-sm flex-1 bg-transparent border-0 p-0 m-0"
                          style={{ background: 'none', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
                          title={claudeCommand}
                        >
                          {claudeCommand}
                        </code>
                      )}
                      <button
                        className="p-2 rounded hover:bg-gray-700 text-gray-300 hover:text-white"
                        onClick={() => {
                          copyToClipboard(claudeCommand, 'Command copied!');
                          setClaudeCopied(true);
                          setTimeout(() => {
                            setClaudeCopied(false);
                            setShowClaudeInline(false);
                          }, 1000);
                          incrementDownloadCount();
                        }}
                        aria-label="Copy command"
                        disabled={claudeCopied}
                      >
                        <CopyIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 justify-start pl-4 bg-white/10 border-white/20 text-white hover:bg-white/10 hover:text-white transition-all duration-200"
                      style={cellStyle}
                      onClick={() => {
                        const pkgName = pkg?.slug || pkg?.name || 'my-mcp-server';
                        const profileId = user?.id || '';
                        let claudeApiKey = '';
                        if (apiKeys[0] && fullApiKeys[apiKeys[0].id]) {
                          claudeApiKey = fullApiKeys[apiKeys[0].id];
                        } else {
                          claudeApiKey = apiKeys[0]?.key_prefix || '';
                        }
                        const command = `npx -y @sigyl-dev/cli@latest install ${pkgName} --client claude --profile ${profileId} --key ${claudeApiKey}`;
                        setClaudeCommand(command);
                        setShowClaudeInline(true);
                        incrementDownloadCount();
                      }}
                      disabled={!user?.id || apiKeys.length === 0}
                    >
                      <img src="/claude.png" alt="Claude Desktop" className="w-5 h-5 rounded" /> Claude Desktop
                    </Button>
                  )}
                  {/* If no full API key is available, show a message to the user */}
                  {apiKeys.length === 0 && (
                    <div className="text-red-400 text-xs mb-2">
                      No API key found. Please create an API key in your dashboard to use the install command.
                    </div>
                  )}
                  {cursorButton}
                  {/* JSON/Config Button/Field logic */}
                  <>
                    <Button
                      variant="outline"
                      className="flex items-center gap-2 justify-start pl-4 bg-white/10 border-white/20 text-white hover:bg-white/10 hover:text-white transition-all duration-200"
                      style={cellStyle}
                      onClick={() => {
                        const pkgName = pkg?.slug || pkg?.name || 'my-mcp-server';
                        const apiKey = apiKeys[0] && fullApiKeys[apiKeys[0].id] ? fullApiKeys[apiKeys[0].id] : apiKeys[0]?.key_prefix || '';
                        const profileId = user?.id || '';
                        const configObj = {
                          [pkgName]: {
                            command: "npx",
                            args: [
                              "-y",
                              "@sigyl-dev/cli@latest",
                              "run",
                              pkgName,
                              "--key",
                              apiKey,
                              "--profile",
                              profileId
                            ]
                          }
                        };
                        setJsonConfig(JSON.stringify(configObj, null, 2));
                        setShowJsonConfig(true);
                        incrementDownloadCount();
                      }}
                      disabled={!user?.id || apiKeys.length === 0}
                    >
                      <span className="font-mono text-lg">{'{ }'}</span> JSON/Config
                    </Button>
                    {/* JSON Config Modal/Menu */}
                    {showJsonConfig && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
                        <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-6 max-w-lg w-full relative">
                          <div className="flex items-center justify-between mb-4">
                            <div className="text-lg font-semibold text-white flex items-center gap-2">
                              <span className="font-mono text-lg">{'{ }'}</span> MCP Server JSON Config
                            </div>
                            <button
                              className="text-gray-400 hover:text-white text-xl font-bold focus:outline-none"
                              onClick={() => setShowJsonConfig(false)}
                              aria-label="Close"
                            >
                              ×
                            </button>
                          </div>
                          <pre className="bg-white/10 border-white/20 text-white hover:bg-white/10 transition-all duration-200 rounded p-4 text-sm overflow-x-auto max-h-80 mb-4 select-all">
                            {jsonConfig}
                          </pre>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              className="btn-modern hover:bg-neutral-900 hover:text-white"
                              onClick={() => {
                                copyToClipboard(jsonConfig, 'JSON copied!');
                                incrementDownloadCount();
                              }}
                            >
                              <CopyIcon className="w-4 h-4" />
                              {jsonConfigCopied ? 'Copied!' : 'Copy JSON'}
                            </Button>
                            <Button 
                              variant="ghost" 
                              onClick={() => setShowJsonConfig(false)}
                              className="text-gray-400 hover:text-white hover:bg-gray-800"
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                </div>
              </div>
              <DialogFooter className="mt-8">
                {pkg && pkg.secrets && Array.isArray(pkg.secrets) && pkg.secrets.length > 0 && (
                  <Button variant="ghost" onClick={() => setInstallStep(1)}>
                    Back
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setShowInstallModal(false)}>
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Delete Confirmation Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-lg transition-all duration-300 bg-gray-900 border-gray-700 text-white" style={{ minHeight: 200, maxHeight: '80vh', overflowY: 'auto' }}>
          <DialogHeader>
            <DialogTitle className="text-white">Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">Are you sure you want to delete this MCP server? This action cannot be undone.</p>
            <div>
              <Label htmlFor="deleteConfirmName" className="text-gray-300">Enter the package name to confirm:</Label>
              <Input
                id="deleteConfirmName"
                name="deleteConfirmName"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="Enter the package name"
                className="mt-1 bg-gray-800 border-gray-600 text-white placeholder-gray-400"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleConfirmDelete}
              className="bg-red-600 text-white"
              disabled={!deleteConfirmName || isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
            <Button variant="ghost" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MCPPackagePage; 