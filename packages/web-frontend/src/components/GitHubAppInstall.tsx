import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Github, CheckCircle, AlertCircle, ExternalLink, Shield, Lock } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { 
  getGitHubAppInstallUrl, 
  checkGitHubAppInstallation, 
  fetchRepositoriesWithApp,
  GitHubAppRepository,
  GitHubAppInstallation
} from "@/lib/githubApp"

interface GitHubAppInstallProps {
  onInstallationComplete?: (installationId: number) => void
  onRepositoriesLoaded?: (repositories: GitHubAppRepository[]) => void
}

const GitHubAppInstall: React.FC<GitHubAppInstallProps> = ({ 
  onInstallationComplete,
  onRepositoriesLoaded 
}) => {
  const { user } = useAuth()
  const [installationId, setInstallationId] = useState<number | null>(null)
  const [installationInfo, setInstallationInfo] = useState<GitHubAppInstallation | null>(null)
  const [repositories, setRepositories] = useState<GitHubAppRepository[]>([])
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check for existing installation on component mount
  useEffect(() => {
    if (user) {
      checkExistingInstallation()
    }
  }, [user])

  const checkExistingInstallation = async () => {
    if (!user) return

    setLoading(true)
    setError(null)

    try {
      const existingInstallationId = await checkGitHubAppInstallation(user.id)
      
      if (existingInstallationId) {
        setInstallationId(existingInstallationId)
        await loadRepositories(existingInstallationId)
        onInstallationComplete?.(existingInstallationId)
      }
    } catch (err) {
      console.error('Error checking installation:', err)
      setError('Failed to check existing installation')
    } finally {
      setLoading(false)
    }
  }

  const loadRepositories = async (installId: number) => {
    try {
      const repos = await fetchRepositoriesWithApp(installId)
      setRepositories(repos)
      onRepositoriesLoaded?.(repos)
    } catch (err) {
      console.error('Error loading repositories:', err)
      setError('Failed to load repositories')
    }
  }

  const handleInstallApp = async () => {
    setInstalling(true)
    setError(null)

    try {
      // Redirect to GitHub App installation
      const installUrl = getGitHubAppInstallUrl()
      
      // Store installation state in localStorage for when user returns
      localStorage.setItem('github_app_installing', 'true')
      localStorage.setItem('github_app_install_time', Date.now().toString())
      
      window.location.href = installUrl
    } catch (err) {
      console.error('Error starting installation:', err)
      setError('Failed to start GitHub App installation')
      setInstalling(false)
    }
  }

  // Check if user just returned from GitHub App installation
  useEffect(() => {
    const isInstalling = localStorage.getItem('github_app_installing')
    const installTime = localStorage.getItem('github_app_install_time')
    
    if (isInstalling && installTime) {
      const timeDiff = Date.now() - parseInt(installTime)
      
      // If user returned within 5 minutes, assume installation was completed
      if (timeDiff < 5 * 60 * 1000) {
        localStorage.removeItem('github_app_installing')
        localStorage.removeItem('github_app_install_time')
        
        // For demo purposes, we'll use a mock installation ID
        // In a real implementation, you would:
        // 1. Check your backend for new installations
        // 2. Associate the installation with the current user
        // 3. Get the actual installation ID from GitHub
        
        const mockInstallationId = 12345
        setInstallationId(mockInstallationId)
        loadRepositories(mockInstallationId)
        onInstallationComplete?.(mockInstallationId)
      }
    }
  }, [])

  if (loading) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
            <p className="text-gray-400">Checking GitHub App installation...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (installationId && repositories.length > 0) {
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
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Installation ID: {installationId}</Badge>
              <Badge variant="outline" className="text-green-600">
                <Shield className="w-3 h-3 mr-1" />
                Secure Access
              </Badge>
            </div>
            
            <div className="grid gap-2">
              {repositories.slice(0, 5).map((repo) => (
                <div key={repo.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Github className="w-4 h-4" />
                    <div>
                      <p className="font-medium">{repo.name}</p>
                      <p className="text-sm text-gray-500">{repo.full_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {repo.private && <Lock className="w-3 h-3 text-gray-400" />}
                    {repo.has_mcp && (
                      <Badge variant="default" className="text-xs">
                        MCP Ready
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              
              {repositories.length > 5 && (
                <p className="text-sm text-gray-500 text-center">
                  +{repositories.length - 5} more repositories
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Github className="w-5 h-5" />
          GitHub App Installation
        </CardTitle>
        <CardDescription>
          You will be redirected to GitHub to sign in and install the Sigyl GitHub App in one step.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Note:</strong> The sign-in process will handle GitHub App installation automatically. If you see a 404 error, the GitHub App may not exist or the App ID is incorrect.
          </AlertDescription>
        </Alert>
        <div className="text-center">
          <a 
            href="https://github.com/settings/apps" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-gray-400 hover:text-gray-300 flex items-center justify-center gap-1"
          >
            Manage GitHub Apps
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  )
}

export default GitHubAppInstall 