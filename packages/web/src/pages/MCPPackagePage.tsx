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
import { SecretsService } from '@/services/secretsService';
import { deployMCPWithApp, fetchBranchesWithApp } from '@/lib/githubApp';

const MCPPackagePage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, session, activeGitHubAccount, installationId, githubAccounts } = useAuth();
  
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
  const [redeploySubdirectory, setRedeploySubdirectory] = useState('');
  const [showRedeployModal, setShowRedeployModal] = useState(false);
  const [branches, setBranches] = useState<string[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);

  // Check if this is a new deployment (from deploy flow)
  // const isNewDeployment = searchParams.get('new') === 'true';
  // const isDeploying = searchParams.get('deploying') === 'true';

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
  const [redeployError, setRedeployError] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState('main');

  const [logoUploading, setLogoUploading] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadPackageData();
    }
  }, [id, user]);

  useEffect(() => {
    if (pkg && isOwner) {
      console.log('🔍 pkg:', pkg);
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

  // Fetch branches when the redeploy modal opens and pkg is loaded
  useEffect(() => {
    const fetchBranches = async () => {
      if (!showRedeployModal || !pkg) return;
      setLoadingBranches(true);
      try {
        const [owner, repo] = pkg.slug.split('/');
        // Find the correct installation for the package's owner/org
        const matchingAccount = githubAccounts.find(
          acc => acc.accountLogin === owner || acc.profileId === pkg.author_id
        );
        const selectedInstallationId = matchingAccount?.installationId;
        if (!selectedInstallationId) {
          setBranches(['main']);
          setSelectedBranch('main');
          setLoadingBranches(false);
          return;
        }
        const branchList = await fetchBranchesWithApp(selectedInstallationId, owner, repo);
        setBranches(branchList);
        if (branchList.includes('main')) {
          setSelectedBranch('main');
        } else if (branchList.length > 0) {
          setSelectedBranch(branchList[0]);
        }
      } catch (err) {
        setBranches(['main']);
        setSelectedBranch('main');
      } finally {
        setLoadingBranches(false);
      }
    };
    fetchBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRedeployModal, pkg]);

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
  const handleRedeploy = async () => {
    if (!pkg || !user) return;

    // Find the correct installation for the package's owner/org
    const [owner, repo] = pkg.slug.split('/');
    const matchingAccount = githubAccounts.find(
      acc => acc.accountLogin === owner || acc.profileId === pkg.author_id
    );
    const selectedInstallationId = matchingAccount?.installationId;

    if (!selectedInstallationId) {
      toast.error('No GitHub App installation found for this repo owner/org. Please install the GitHub App for this account to enable redeploy.');
      return;
    }

    setIsRedeploying(true);
    setRedeployError(null);

    try {
      // Always use the real GitHub repo URL
      const repoUrl = `https://github.com/${owner}/${repo}`;
      const response = await fetch(
        `https://api.sigyl.dev/api/v1/github/installations/${selectedInstallationId}/redeploy`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token || ''}`
          },
          body: JSON.stringify({
            repoUrl, // <-- correct GitHub repo URL
            owner,
            repo,
            branch: selectedBranch || 'main',
            userId: user.id,
            subdirectory: redeploySubdirectory || undefined,
            // ...other fields as needed
          })
        }
      );
      const result = await response.json();
      if (result.success) {
        toast.success('Redeploy started!');
        // Optionally reload or redirect
        window.location.reload();
      } else {
        setRedeployError(result.error || 'Redeploy failed');
        toast.error(result.error || 'Redeploy failed');
      }
    } catch (err) {
      setRedeployError(err instanceof Error ? err.message : 'Redeploy failed');
      toast.error(err instanceof Error ? err.message : 'Redeploy failed');
      console.error('Redeploy failed:', err);
    } finally {
      setIsRedeploying(false);
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
      // Get Supabase JWT
      let supabaseToken = '';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        supabaseToken = session?.access_token || '';
      } catch (e) {
        supabaseToken = '';
      }

      // Use the same deploymentService as MCPServersList
      const result = await (await import('@/services/deploymentService')).default.deletePackage(pkg.id, pkg.name, supabaseToken);

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
      // Validate common API key fields for packages without predefined secrets
      if (!secretFields.API_KEY && !secretFields.BRAVE_API_KEY && !secretFields.OPENAI_API_KEY && !secretFields.ANTHROPIC_API_KEY) {
        errors.API_KEY = 'At least one API key is required';
      }
    }
    setSecretErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSecretChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSecretFields((prev) => ({ ...prev, [name]: value }));
  };

  const loadExistingSecrets = async () => {
    if (!pkg?.name || !user) return;
    
    try {
      const token = await getAuthToken();
      if (!token) return;

      const existingSecrets = await SecretsService.getPackageSecrets(token, pkg.name);
      
      // Pre-fill the form with existing secrets
      const updatedFields = { ...secretFields };
      existingSecrets.forEach(secret => {
        // Check if this secret matches any of the required secrets for this package
        if (pkg.secrets && Array.isArray(pkg.secrets)) {
          const matchingSecret = pkg.secrets.find(s => s.name === secret.key);
          if (matchingSecret) {
            updatedFields[secret.key] = secret.value;
          }
        } else {
          // For packages without predefined secrets, pre-fill common API key fields
          if (['API_KEY', 'BRAVE_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY'].includes(secret.key)) {
            updatedFields[secret.key] = secret.value;
          }
        }
      });
      
      setSecretFields(updatedFields);
    } catch (error) {
      console.error('Failed to load existing secrets:', error);
      // Don't show error to user, just continue with empty form
    }
  };

  const savePackageSecrets = async () => {
    if (!pkg?.name || !user) return;
    
    try {
      const token = await getAuthToken();
      if (!token) {
        toast.error('Authentication required to save secrets');
        return;
      }

      // DEBUG: Log what we're working with
      console.log('=== SAVE PACKAGE SECRETS DEBUG ===');
      console.log('Package name:', pkg.name);
      console.log('Package secrets:', pkg.secrets);
      console.log('Secret fields:', secretFields);
      console.log('User:', user);

      // Prepare secrets array from the form fields
      const secretsToSave: Array<{ key: string; value: string; description?: string }> = [];
      
      if (pkg.secrets && Array.isArray(pkg.secrets)) {
        // Handle dynamic secrets from package definition
        console.log('Processing dynamic secrets from package definition');
        pkg.secrets.forEach(secret => {
          const value = secretFields[secret.name];
          if (value && value.trim()) {
            secretsToSave.push({
              key: secret.name,
              value: value.trim(),
              description: secret.description || `API key for ${pkg.name}`
            });
          }
        });
      } else {
        // Fallback for old hardcoded fields
        console.log('Processing hardcoded secret fields');
        if (secretFields.WEATHER_API_KEY) {
          secretsToSave.push({
            key: 'WEATHER_API_KEY',
            value: secretFields.WEATHER_API_KEY,
            description: `Weather API key for ${pkg.name}`
          });
        }
        if (secretFields.DEBUG) {
          secretsToSave.push({
            key: 'DEBUG',
            value: secretFields.DEBUG,
            description: `Debug setting for ${pkg.name}`
          });
        }
      }

      // NEW: Also capture any other non-empty fields that might have been entered
      // This handles cases where packages don't have predefined secrets but users enter API keys
      console.log('Processing any other non-empty secret fields');
      Object.entries(secretFields).forEach(([key, value]) => {
        // Skip fields we already processed above
        const alreadyProcessed = pkg.secrets?.some(s => s.name === key) || 
                                ['WEATHER_API_KEY', 'DEBUG'].includes(key);
        
        if (!alreadyProcessed && value && value.trim()) {
          secretsToSave.push({
            key: key,
            value: value.trim(),
            description: `API key for ${pkg.name}`
          });
        }
      });

      console.log('Secrets to save:', secretsToSave);

      if (secretsToSave.length > 0) {
        const result = await SecretsService.savePackageSecrets(token, pkg.name, secretsToSave);
        console.log('Save result:', result);
        toast.success(`Saved ${secretsToSave.length} secret${secretsToSave.length > 1 ? 's' : ''} for ${pkg.name}`);
      } else {
        console.log('No secrets to save - this is the problem!');
        toast.error('No secrets found to save. Please check your input.');
      }
    } catch (error) {
      console.error('Failed to save package secrets:', error);
      toast.error('Failed to save secrets. Please try again.');
    }
  };

  const handleInstallClick = () => {
    setShowInstallModal(true);
    // If the package has no secrets (no required and no optional secrets), skip to installStep 2
    let hasSecrets = false;
    if (pkg && pkg.secrets && Array.isArray(pkg.secrets) && pkg.secrets.length > 0) {
      hasSecrets = pkg.secrets.some(s => s.required) || pkg.secrets.some(s => !s.required);
    }
    if (pkg && pkg.secrets && Array.isArray(pkg.secrets) && pkg.secrets.length > 0 && hasSecrets) {
      setInstallStep(1);
    } else {
      setInstallStep(2);
    }
    // Initialize secret fields
    const initialFields: { [key: string]: string } = {};
    if (pkg && pkg.secrets && Array.isArray(pkg.secrets) && pkg.secrets.length > 0 && hasSecrets) {
      // Initialize fields for predefined secrets
      for (const secret of pkg.secrets) {
        initialFields[secret.name] = '';
      }
      // Load existing secrets for this package
      loadExistingSecrets();
    } else {
      // For packages without predefined secrets, initialize common API key fields
      initialFields['API_KEY'] = '';
      initialFields['BRAVE_API_KEY'] = '';
      initialFields['OPENAI_API_KEY'] = '';
      initialFields['ANTHROPIC_API_KEY'] = '';
      // Load any existing secrets for this package
      loadExistingSecrets();
    }
    setSecretFields(initialFields);
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

  // Cursor install button (CLI proxy only, no deep link)
  const [showCursorInline, setShowCursorInline] = useState(false);
  const [cursorCopied, setCursorCopied] = useState(false);
  const mcpUrl = pkg?.source_api_url ? pkg.source_api_url.replace(/\/$/, '') + '/mcp' : '';
  let cursorApiKey = '';
  if (apiKeys[0] && fullApiKeys[apiKeys[0].id]) {
    cursorApiKey = fullApiKeys[apiKeys[0].id];
  } else {
    cursorApiKey = apiKeys[0]?.key_prefix || '';
  }
  const cursorInstallCommand = `npx -y @sigyl-dev/cli@latest install ${mcpUrl} --client cursor --key ${cursorApiKey}`;
  const cursorButton = showCursorInline ? (
    <div className="flex items-center gap-2 justify-start pl-4 bg-white/10 border-white/20 text-white hover:bg-white/10 hover:text-white transition-all duration-200 rounded-lg" style={cellStyle}>
      <img src="/favicon.png" alt="Cursor" className="w-5 h-5" />
      {cursorCopied ? (
        <span className="text-white text-sm flex-1 truncate text-center">Copied!</span>
      ) : (
        <code
          className="text-white select-all text-sm flex-1 bg-transparent border-0 p-0 m-0"
          style={{ background: 'none', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}
          title={cursorInstallCommand}
        >
          {cursorInstallCommand}
        </code>
      )}
      <button
        className="p-2 rounded hover:bg-gray-700 text-gray-300 hover:text-white"
        onClick={() => {
          copyToClipboard(cursorInstallCommand, 'Command copied!');
          setCursorCopied(true);
          setTimeout(() => {
            setCursorCopied(false);
            setShowCursorInline(false);
          }, 1000);
          incrementDownloadCount();
        }}
        aria-label="Copy command"
        disabled={cursorCopied}
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
        setShowCursorInline(true);
        incrementDownloadCount();
      }}
      disabled={apiKeys.length === 0}
    >
      <img src="/favicon.png" alt="Cursor" className="w-5 h-5" /> Cursor
    </Button>
  );

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

  // Logo upload handler
  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pkg) return;
    setLogoUploading(true);
    setLogoUploadError(null);

    // LOGGING STARTS HERE
    console.log('--- LOGO UPLOAD DEBUG ---');
    console.log('pkg.id:', pkg.id);
    console.log('user.id:', user?.id);
    console.log('pkg.author_id:', pkg.author_id);
    const fileExt = file.name.split('.').pop();
    const filePath = `${pkg.id}/logo.${fileExt}`;
    console.log('filePath:', filePath);
    // LOGGING ENDS HERE

    try {
      // Only allow PNG/JPG
      if (!['image/png', 'image/jpeg'].includes(file.type)) {
        setLogoUploadError('Only PNG or JPG images are allowed.');
        setLogoUploading(false);
        return;
      }
      // Upload to Supabase Storage (bucket: mcp-logos)
      await supabase.storage.from('mcp-logos').remove([`${pkg.id}/logo.png`, `${pkg.id}/logo.jpg`]);
      const { error: uploadError } = await supabase.storage.from('mcp-logos').upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadError) {
        setLogoUploadError('Upload failed: ' + uploadError.message);
        setLogoUploading(false);
        return;
      }
      // Get public URL
      const { data } = supabase.storage.from('mcp-logos').getPublicUrl(filePath);
      if (!data?.publicUrl) {
        setLogoUploadError('Failed to get public URL for logo.');
        setLogoUploading(false);
        return;
      }
      // Add cache-busting query param
      const cacheBustedUrl = data.publicUrl + '?t=' + Date.now();
      setEditFields(prev => ({ ...prev, logo_url: cacheBustedUrl }));

      // Update the logo_url in the database via backend API
      const apiUrl = `https://api.sigyl.dev/api/v1/packages/${pkg.id}/logo`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ logo_url: cacheBustedUrl })
      });
      const result = await response.json();
      if (!result.success) {
        setLogoUploadError('Logo uploaded, but failed to update database: ' + (result.error || 'Unknown error'));
      } else {
        toast.success('Logo uploaded and saved!');
      }
    } catch (err: any) {
      setLogoUploadError(err.message || 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
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
              <div className="text-2xl font-bold text-white">MCP Server not found</div>
              <p className="text-gray-400 max-w-md">
                The package you're looking for doesn't exist or may have been removed.
              </p>
            </div>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/registry')}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Registry
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
        <div className="flex justify-between items-center mb-6">
        {/* Back Navigation */}
        <Button
          variant="outline"
          onClick={() => navigate(effectiveIsOwner ? '/dashboard' : '/registry')}
          className="mb-6 border-white text-white bg-transparent hover:bg-[#23232a] hover:text-white transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to {effectiveIsOwner ? 'Dashboard' : 'Registry'}
        </Button>
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
        </div>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-6 mb-6">
            <div className="p-5 bg-white/10 rounded-xl relative">
              <img
                src={editMode ? (editFields.logo_url || '/favicon.png') : (pkg.logo_url || '/favicon.png')}
                alt={pkg.name}
                className="w-24 h-24 rounded-lg object-contain border border-white/10"
                style={{ background: '#222' }}
              />
              {editMode && effectiveIsOwner && (
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-full flex flex-col items-center">
                  <label className="bg-black/60 text-white px-2 py-1 rounded cursor-pointer border border-white/20 text-xs hover:bg-black/80 transition-all">
                    {logoUploading ? 'Uploading...' : 'Change Logo'}
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleLogoFileChange}
                      disabled={logoUploading}
                      style={{ display: 'none' }}
                    />
                  </label>
                  {logoUploadError && <div className="text-red-400 text-xs mt-1">{logoUploadError}</div>}
                </div>
              )}
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
                {effectiveIsOwner && !editMode && (
                  <Button
                    onClick={() => setShowRedeployModal(true)}
                    className="w-full btn-modern-inverted hover:bg-transparent hover:text-white"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Redeploy MCP Server
                  </Button>
                )}
                {/* Edit Button (Owner Only) */}
                {effectiveIsOwner && !editMode && (
                  <div className="flex justify-end mb-4">
                    <Button
                      onClick={() => setEditMode(true)}
                      className="btn-modern-inverted hover:bg-neutral-900 hover:text-white"
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
                      disabled={saving || isRedeploying}
                    >
                      {saving ? 'Saving...' : 'Apply'}
                    </Button>
                    <Button
                      onClick={() => setEditMode(false)}
                      variant="ghost"
                      className="text-gray-400 hover:text-white hover:bg-[#23232a]"
                      disabled={saving || isRedeploying}
                    >
                      Cancel
                    </Button>
                  </div>
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
                  className="btn-modern-inverted hover:bg-neutral-900 hover:text-white"
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
                {/* {effectiveIsOwner ? (
                  <TabsTrigger value="logs" className="flex-1 h-full flex items-center justify-center px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:font-bold text-gray-400 font-semibold rounded-xl transition-all">
                    <Terminal className="w-5 h-5 mr-2" />
                    Logs
                  </TabsTrigger>
                ) : (
                  <TabsTrigger value="deployment" className="flex-1 h-full flex items-center justify-center px-6 data-[state=active]:bg-white/10 data-[state=active]:text-white data-[state=active]:font-bold text-gray-400 font-semibold rounded-xl transition-all">
                    <Settings className="w-5 h-5 mr-2" />
                    Deployment
                  </TabsTrigger>
                )} */}
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
                          const toolName = (tool as any)?.tool_name || `Tool ${index + 1}`;
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
              {/* {effectiveIsOwner ? (
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
              )} */}
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
                <div className="flex items-center justify-center mb-4">
                  <img
                    src={editMode ? (editFields.logo_url || '/favicon.png') : (pkg.logo_url || '/favicon.png')}
                    alt={pkg.name}
                    className="w-16 h-16 rounded-lg object-contain border border-white/10"
                    style={{ background: '#222' }}
                  />
                </div>
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
                {editMode && effectiveIsOwner && (
                  <div className="text-xs text-gray-400 mb-2">Logo is set by uploading an image above. You cannot edit the URL directly.</div>
                )}
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
        <DialogContent className="max-w-4xl transition-all duration-300 bg-black border-white/10 text-white" style={{ minHeight: 380, maxHeight: '80vh', overflowY: 'auto' }}>
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
                          className="mt-1 bg-white/10 border-white/20 text-white placeholder-white placeholder:text-white/50"
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
                          className={`flex items-center gap-2 px-3 py-1 rounded-md border border-white/20 bg-white/10 text-white text-sm mt-2 hover:bg-white/10 hover:text-white transition focus:outline-none`}
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
                                    className="mt-1 bg-white/10 border-white/20 text-white placeholder-white placeholder:text-white/50"
                                    type={secret.type === 'number' ? 'number' : 'text'}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                <DialogFooter>
                  <Button
                    onClick={async () => {
                      if (validateSecrets()) {
                        // Save the secrets for this package
                        await savePackageSecrets();
                        setInstallStep(2);
                      }
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
                          console.log('Copying HTTP API URL:', httpApiUrl);
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
                          // Use a clean template literal, no backslashes
                          url = `${fullUrl}?apiKey=${encodeURIComponent(apiKey)}`;
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
                        // Use the full MCP endpoint URL for VS Code install
                        const mcpUrl = pkg?.source_api_url ? pkg.source_api_url.replace(/\/$/, '') + '/mcp' : '';
                        let vscodeApiKey = '';
                        if (apiKeys[0] && fullApiKeys[apiKeys[0].id]) {
                          vscodeApiKey = fullApiKeys[apiKeys[0].id];
                        } else {
                          vscodeApiKey = apiKeys[0]?.key_prefix || '';
                        }
                        const vsCodeInstallCommand = `npx -y @sigyl-dev/cli@latest install ${mcpUrl} --client vscode --key ${vscodeApiKey}`;
                        setVSCodeCommand(vsCodeInstallCommand);
                        setShowVSCodeInline(true);
                        incrementDownloadCount();
                      }}
                      disabled={apiKeys.length === 0}
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
                        const mcpUrl = pkg?.source_api_url ? pkg.source_api_url.replace(/\/$/, '') + '/mcp' : '';
                        let claudeApiKey = '';
                        if (apiKeys[0] && fullApiKeys[apiKeys[0].id]) {
                          claudeApiKey = fullApiKeys[apiKeys[0].id];
                        } else {
                          claudeApiKey = apiKeys[0]?.key_prefix || '';
                        }
                        const claudeInstallCommand = `npx -y @sigyl-dev/cli@latest install ${mcpUrl} --client claude --key ${claudeApiKey}`;
                        setClaudeCommand(claudeInstallCommand);
                        setShowClaudeInline(true);
                        incrementDownloadCount();
                      }}
                      disabled={apiKeys.length === 0}
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
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 justify-start pl-4 bg-white/10 border-white/20 text-white hover:bg-white/10 hover:text-white transition-all duration-200"
                    style={cellStyle}
                    onClick={() => {
                      const mcpUrl = pkg?.source_api_url ? pkg.source_api_url.replace(/\/$/, '') + '/mcp' : '';
                      const apiKey = apiKeys[0] && fullApiKeys[apiKeys[0].id] ? fullApiKeys[apiKeys[0].id] : apiKeys[0]?.key_prefix || '';
                      // Extract repo name from URL (second-to-last part of the path)
                      let repoName = mcpUrl;
                      try {
                        const urlObj = new URL(mcpUrl);
                        const pathParts = urlObj.pathname.split('/').filter(Boolean);
                        if (pathParts.length >= 2) {
                          repoName = pathParts[pathParts.length - 2];
                        } else {
                          repoName = pathParts[pathParts.length - 1] || mcpUrl;
                        }
                      } catch { repoName = mcpUrl; }
                      const configObj = {
                        [repoName]: {
                          command: "npx",
                          args: [
                            "-y",
                            "@sigyl-dev/cli@latest",
                            "run",
                            mcpUrl,
                            "--key",
                            apiKey
                          ]
                        }
                      };
                      setJsonConfig(JSON.stringify(configObj, null, 2));
                      setShowJsonConfig(true);
                      incrementDownloadCount();
                    }}
                    disabled={apiKeys.length === 0}
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
        <DialogContent className="max-w-lg transition-all duration-300 bg-black border-white/10 text-white" style={{ minHeight: 200, maxHeight: '80vh', overflowY: 'auto' }}>
          <DialogHeader>
            <DialogTitle className="text-white">Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">Are you sure you want to delete this MCP server? This action cannot be undone.</p>
            <div>
              <Label htmlFor="deleteConfirmName" className="text-white">
                Enter <span className="font-bold text-white">{pkg?.name}</span> to confirm:
              </Label>
              <Input
                id="deleteConfirmName"
                name="deleteConfirmName"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                placeholder="Enter the package name"
                className="mt-1 bg-white/10 border-white/20 text-white placeholder-white placeholder:text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={handleConfirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
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
      {/* Redeploy Modal */}
      <Dialog open={showRedeployModal} onOpenChange={setShowRedeployModal}>
        <DialogContent className="max-w-md transition-all duration-300 bg-black border-white/10 text-white" style={{ minHeight: 200, maxHeight: '80vh', overflowY: 'auto' }}>
          <DialogHeader>
            <DialogTitle className="text-white">Redeploy MCP Server</DialogTitle>
            <DialogDescription className="text-gray-400">
              Select the branch and (optionally) subdirectory to redeploy your MCP server.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 mt-4">
            <label htmlFor="branch-select" className="text-white mb-1">Branch</label>
            {loadingBranches ? (
              <div className="flex items-center gap-2 text-gray-300 mb-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading branches...</span>
              </div>
            ) : (
              <select
                id="branch-select"
                value={selectedBranch}
                onChange={e => setSelectedBranch(e.target.value)}
                className="bg-black border-white/10 text-white rounded px-3 py-2 mb-2"
              >
                {branches.map(branch => (
                  <option key={branch} value={branch}>{branch}</option>
                ))}
              </select>
            )}
            <label htmlFor="subdirectory-input" className="text-white mb-1">Project Subdirectory (optional)</label>
            <input
              id="subdirectory-input"
              type="text"
              value={redeploySubdirectory}
              onChange={e => setRedeploySubdirectory(e.target.value)}
              placeholder="e.g. apps/api or leave blank for root"
              className="bg-black border-white/10 text-white rounded px-3 py-2 mb-2"
            />
            {redeployError && (
              <div className="text-red-400 text-sm mb-2">{redeployError}</div>
            )}
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                await handleRedeploy();
                setShowRedeployModal(false);
              }}
              disabled={isRedeploying}
              className="w-full btn-modern-inverted hover:bg-transparent hover:text-white"
            >
              {isRedeploying ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Redeploying...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Redeploy MCP Server
                </>
              )}
            </Button>
            <Button variant="ghost" onClick={() => setShowRedeployModal(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MCPPackagePage; 