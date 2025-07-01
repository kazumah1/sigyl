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

  // Fetch GitHub App installation status and accounts from backend
  useEffect(() => {
    const fetchInstallations = async () => {
      if (!user) return
      const githubUsername = user.user_metadata?.user_name
      if (!githubUsername) return
      try {
        const res = await fetch(`${REGISTRY_API_BASE}/github/check-installation/${githubUsername}`)
        const data = await res.json()
        if (data.hasInstallation && data.installationId) {
          setGitHubInstallationId(data.installationId)
          setGitHubAccounts([{ installationId: data.installationId, username: githubUsername, isActive: true, accountLogin: githubUsername, accountType: 'User' }])
          setActiveGitHubAccount({ installationId: data.installationId, username: githubUsername, isActive: true, accountLogin: githubUsername, accountType: 'User' })
        } else {
          setGitHubInstallationId(null)
          setGitHubAccounts([])
          setActiveGitHubAccount(null)
        }
      } catch {
        setGitHubInstallationId(null)
        setGitHubAccounts([])
        setActiveGitHubAccount(null)
      }
    }
    fetchInstallations()
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
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
