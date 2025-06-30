import React, { useState, useEffect, useRef } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Github, CheckCircle, AlertCircle, ExternalLink, Shield, Lock } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { 
  fetchRepositoriesWithApp,
  GitHubAppRepository,
  GitHubAppInstallation,
  checkForGitHubAppCallback
} from "@/lib/githubApp"
import { useNavigate } from 'react-router-dom'
import { supabase } from "@/lib/supabase"

interface GitHubAppInstallProps {
  onInstallationComplete?: (installationId: number) => void
  onRepositoriesLoaded?: (repositories: GitHubAppRepository[]) => void
}

const GitHubAppInstall: React.FC<GitHubAppInstallProps> = ({ 
  onInstallationComplete,
  onRepositoriesLoaded 
}) => {
  const { user, signInWithGitHubApp, setGitHubInstallationId, githubInstallationId, session } = useAuth()
  const navigate = useNavigate()
  const [installationInfo, setInstallationInfo] = useState<GitHubAppInstallation | null>(null)
  const [repositories, setRepositories] = useState<GitHubAppRepository[]>([])
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasAssociated = useRef(false);

  // Load repositories when installation ID is available
  useEffect(() => {
    if (githubInstallationId) {
      loadRepositories(githubInstallationId)
      onInstallationComplete?.(githubInstallationId)
    }
  }, [githubInstallationId])

  // In the effect that handles the callback after GitHub App install
  useEffect(() => {
    const handleCallback = async () => {
      const { installationId, code } = checkForGitHubAppCallback();
      if (!user) {
        // Not authenticated, redirect to login
        window.location.href = '/login';
        return;
      }
      // Only call exchangeCodeForSession if code is a valid Supabase OAuth code
      if (installationId && code && code.length > 20) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error('Error exchanging code for session:', error);
        } else if (data?.session?.user) {
          // ... existing logic ...
        }
      } else if (installationId && !hasAssociated.current) {
        hasAssociated.current = true; // Prevent duplicate POSTs
        try {
          await fetch(`${import.meta.env.VITE_REGISTRY_API_URL || 'http://localhost:3000'}/github/associate-installation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({ installationId })
          });
        } catch (err) {
          console.error('Error associating installation:', err);
        }
      }
    };
    handleCallback();
  }, [user, session]);

  const loadRepositories = async (installId: number) => {
    setLoading(true)
    try {
      const repos = await fetchRepositoriesWithApp(installId)
      setRepositories(repos)
      onRepositoriesLoaded?.(repos)
    } catch (err) {
      console.error('Error loading repositories:', err)
      setError('Failed to load repositories')
    } finally {
      setLoading(false)
    }
  }

  const handleInstallApp = async () => {
    setInstalling(true)
    setError(null)

    try {
      // Use the signInWithGitHubApp method from AuthContext
      await signInWithGitHubApp()
    } catch (err) {
      console.error('Error starting installation:', err)
      setError('Failed to start GitHub App installation')
      setInstalling(false)
    }
  }

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
            <p className="text-gray-400">Loading repositories...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (githubInstallationId && repositories.length > 0) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            GitHub App Installed
          </CardTitle>
          <CardDescription>
            You have access to {repositories.length} repositories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {repositories.slice(0, 5).map((repo) => (
              <div key={repo.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Github className="w-5 h-5" />
                <div className="flex-1">
                  <h4 className="font-medium">{repo.full_name}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {repo.description || 'No description'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {repo.private && (
                    <Badge variant="outline" className="text-xs">
                      <Lock className="w-3 h-3 mr-1" />
                      Private
                    </Badge>
                  )}
                  {repo.has_mcp && (
                    <Badge className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      MCP Ready
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {repositories.length > 5 && (
            <div className="text-center text-sm text-gray-500">
              And {repositories.length - 5} more repositories...
            </div>
          )}
          
          <div className="flex gap-3">
            <Button 
              onClick={() => window.location.reload()}
              className="flex-1"
            >
              Continue to Deploy
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/marketplace')}
            >
              Browse Marketplace
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto bg-black/80 border border-white/10 shadow-2xl rounded-2xl backdrop-blur-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
          <Github className="w-5 h-5 text-white" />
          GitHub App Installation
        </CardTitle>
        <CardDescription className="text-gray-300">
          You will be redirected to GitHub to sign in and install the SYGIL GitHub App in one step.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-black/60 border border-white/10 rounded-xl">
            <Shield className="w-5 h-5 text-green-400" />
            <div>
              <h4 className="font-medium text-white">Secure Repository Access</h4>
              <p className="text-sm text-gray-400">
                The GitHub App provides granular access to your repositories with minimal permissions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-black/60 border border-white/10 rounded-xl">
            <CheckCircle className="w-5 h-5 text-blue-400" />
            <div>
              <h4 className="font-medium text-white">One-Step Authentication</h4>
              <p className="text-sm text-gray-400">
                Sign in and grant repository access in a single step.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <Button
            onClick={() => {
              const url = signInWithGitHubApp();
              console.log('Opening GitHub App install URL:', url);
              window.open(url, '_blank');
            }}
            className="flex-1 h-14 rounded-xl font-semibold border-2 border-white/20 bg-black text-white hover:bg-neutral-900 hover:text-white shadow-lg flex items-center justify-center transition-all duration-150"
            style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif', fontWeight: 600 }}
          >
            <Github className="w-5 h-5 mr-2" />
            Install GitHub App
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-14 rounded-xl font-semibold border-2 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white flex items-center justify-center transition-all duration-150"
            style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif', fontWeight: 600 }}
          >
            Test Open GitHub
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/marketplace')}
            className="flex-1 h-14 rounded-xl font-semibold border-2 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white flex items-center justify-center transition-all duration-150"
            style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif', fontWeight: 600 }}
          >
            Browse Marketplace
          </Button>
        </div>

        <div className="text-gray-400 text-sm text-center mt-4">
          By installing the GitHub App, you agree to grant access to your repositories for MCP server deployment.
        </div>
      </CardContent>
    </Card>
  )
}

export default GitHubAppInstall 