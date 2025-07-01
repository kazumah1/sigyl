import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { checkForGitHubAppCallback } from '@/lib/githubApp'

const REGISTRY_API_BASE = import.meta.env.VITE_REGISTRY_API_URL || 'http://localhost:3000/api/v1'

// Types for multi-account support
interface GitHubAccount {
  installationId: number
  username: string
  fullName?: string
  avatarUrl?: string
  email?: string
  isActive: boolean
  accountLogin: string
  accountType: string
}

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGitHubApp: () => Promise<string>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  githubInstallationId: number | null
  setGitHubInstallationId: (id: number | null) => void
  githubAccounts: GitHubAccount[]
  activeGitHubAccount: GitHubAccount | null
  setActiveGitHubAccount: (account: GitHubAccount | null) => void
  installationId: number | null
  hasInstallation: boolean
  installationCheckError: string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [githubInstallationId, setGitHubInstallationId] = useState<number | null>(null)
  const [githubAccounts, setGitHubAccounts] = useState<GitHubAccount[]>([])
  const [activeGitHubAccount, setActiveGitHubAccount] = useState<GitHubAccount | null>(null)
  const [installationId, setInstallationId] = useState<number | null>(null)
  const [hasInstallation, setHasInstallation] = useState<boolean>(false)
  const [installationCheckError, setInstallationCheckError] = useState<string | null>(null)

  // Handle GitHub App callback (just refresh session, let backend handle DB)
  useEffect(() => {
    const processGitHubAppCallback = async () => {
      const { installationId, code } = checkForGitHubAppCallback();
      if (installationId || code) {
        // After callback, just refresh session
        await refreshUser();
      }
    }
    processGitHubAppCallback();
  }, [])

  // Session initialization
  useEffect(() => {
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }
    getInitialSession()
  }, [])

  // Centralized GitHub App installation check with sessionStorage caching
  useEffect(() => {
    const checkInstallation = async () => {
      if (!user) return
      setInstallationCheckError(null)
      const githubUsername = user.user_metadata?.user_name
      if (!githubUsername) {
        setInstallationId(null)
        setHasInstallation(false)
        return
      }
      const cacheKey = `sigyl_installation_${githubUsername}`
      const cacheRaw = sessionStorage.getItem(cacheKey)
      const now = Date.now()
      if (cacheRaw) {
        try {
          const cache = JSON.parse(cacheRaw)
          if (now - cache.timestamp < 60000) { // 60 seconds
            setInstallationId(cache.installationId)
            setHasInstallation(!!cache.installationId)
            return
          }
        } catch {}
      }
      try {
        const res = await fetch(`${REGISTRY_API_BASE}/github/check-installation/${githubUsername}`)
        if (!res.ok) {
          throw new Error(`Failed to check installation: ${res.status} ${res.statusText}`)
        }
        const data = await res.json()
        if (data.hasInstallation && data.installationId) {
          setInstallationId(data.installationId)
          setHasInstallation(true)
          sessionStorage.setItem(cacheKey, JSON.stringify({ installationId: data.installationId, timestamp: now }))
        } else {
          setInstallationId(null)
          setHasInstallation(false)
          sessionStorage.setItem(cacheKey, JSON.stringify({ installationId: null, timestamp: now }))
        }
      } catch (err) {
        setInstallationId(null)
        setHasInstallation(false)
        setInstallationCheckError(err instanceof Error ? err.message : 'Failed to check installation')
      }
    }
    checkInstallation()
  }, [user])

  const signInWithGitHubApp = async () => {
    // Build the GitHub App install URL with backend callback as redirect_uri
    const appName = import.meta.env.VITE_GITHUB_APP_NAME || 'sigyl-dev'
    const state = Math.random().toString(36).substring(2, 15)
    const backendCallback = `${REGISTRY_API_BASE}/github/callback`
    const installUrl = `https://github.com/apps/${appName}/installations/new?state=${state}&request_oauth_on_install=true&redirect_uri=${encodeURIComponent(backendCallback)}`
    return installUrl
  }

  const signOut = async () => {
    setUser(null)
    setSession(null)
    setGitHubInstallationId(null)
    setGitHubAccounts([])
    setActiveGitHubAccount(null)
    setLoading(false)
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  const refreshUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setUser(user)
  }

  const value = {
    user,
    session,
    loading,
    signInWithGitHubApp,
    signOut,
    refreshUser,
    githubInstallationId,
    setGitHubInstallationId,
    githubAccounts,
    activeGitHubAccount,
    setActiveGitHubAccount,
    installationId,
    hasInstallation,
    installationCheckError,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
