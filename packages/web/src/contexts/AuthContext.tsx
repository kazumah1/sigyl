import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { checkForGitHubAppCallback, handleGitHubAppCallback } from '@/lib/githubApp'

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGitHubApp: () => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  githubInstallationId: number | null
  setGitHubInstallationId: (id: number | null) => void
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

  // Global GitHub App callback handler
  useEffect(() => {
    const handleGitHubAppCallback = async () => {
      const { installationId, code, user: urlUser, access_token: urlToken } = checkForGitHubAppCallback()
      
      if (installationId && code) {
        try {
          console.log('Handling GitHub App callback...')
          
          let result;
          let user;
          let accessToken;
          
          // Check if we have user data from URL parameters (redirected callback)
          if (urlUser && urlToken) {
            console.log('Using redirected callback data')
            result = {
              installationId: parseInt(installationId),
              user: urlUser,
              repos: [],
              access_token: urlToken
            };
            user = urlUser;
            accessToken = urlToken;
          } else {
            // Fall back to API call for direct callback
            console.log('Making API call for callback data')
            result = await handleGitHubAppCallback(installationId, code);
            user = result.user;
            accessToken = result.access_token;
          }
          
          // Set the installation ID in the auth context
          setGitHubInstallationId(result.installationId)
          
          // Store the GitHub user information in localStorage for session management
          if (user) {
            localStorage.setItem('github_app_user', JSON.stringify(user))
            localStorage.setItem('github_app_access_token', accessToken)
            
            // Create a custom user session
            const customUser = {
              id: `github_${user.id}`,
              email: user.email || `${user.login}@github.com`,
              user_metadata: {
                user_name: user.login,
                full_name: user.name,
                avatar_url: user.avatar_url,
                sub: user.id.toString(),
                provider: 'github'
              },
              app_metadata: {
                provider: 'github',
                providers: ['github']
              }
            }
            
            // Set the user in our state
            setUser(customUser)
            
            // Create a session object
            const session = {
              access_token: accessToken,
              refresh_token: null,
              expires_in: 3600,
              token_type: 'bearer',
              user: customUser
            }
            setSession(session)
          }
          
          // Clear URL parameters
          const url = new URL(window.location.href)
          url.searchParams.delete('installation_id')
          url.searchParams.delete('code')
          url.searchParams.delete('user')
          url.searchParams.delete('access_token')
          window.history.replaceState({}, '', url.toString())
          
          // Clear installation state
          localStorage.removeItem('github_app_installing')
          localStorage.removeItem('github_app_install_time')
          
          console.log('GitHub App installation completed:', result.installationId)
          
          // Redirect to deploy page or dashboard
          const intendedPage = localStorage.getItem('intended_page') || '/deploy'
          localStorage.removeItem('intended_page')
          window.location.href = intendedPage
          
        } catch (error) {
          console.error('Error handling GitHub App callback:', error)
        }
      }
    }

    // Check for callback on mount
    handleGitHubAppCallback()
  }, [])

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      // Check for GitHub App user session first
      const githubAppUser = localStorage.getItem('github_app_user')
      const githubAppToken = localStorage.getItem('github_app_access_token')
      
      if (githubAppUser && githubAppToken) {
        try {
          const userData = JSON.parse(githubAppUser)
          const customUser = {
            id: `github_${userData.id}`,
            email: userData.email || `${userData.login}@github.com`,
            user_metadata: {
              user_name: userData.login,
              full_name: userData.name,
              avatar_url: userData.avatar_url,
              sub: userData.id.toString(),
              provider: 'github'
            },
            app_metadata: {
              provider: 'github',
              providers: ['github']
            }
          }
          
          const session = {
            access_token: githubAppToken,
            refresh_token: null,
            expires_in: 3600,
            token_type: 'bearer',
            user: customUser
          }
          
          setUser(customUser)
          setSession(session)
          setLoading(false)
          return
        } catch (error) {
          console.error('Error restoring GitHub App session:', error)
          // Clear invalid session data
          localStorage.removeItem('github_app_user')
          localStorage.removeItem('github_app_access_token')
        }
      }
      
      // Fall back to Supabase session
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // If user signs in, ensure we have their profile in our users table
        if (event === 'SIGNED_IN' && session?.user) {
          await ensureUserProfile(session.user)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const ensureUserProfile = async (user: User) => {
    try {
      // Check if user profile exists
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!existingUser) {
        // Create user profile
        const { error } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email!,
            github_username: user.user_metadata?.user_name || null,
            github_id: user.user_metadata?.sub || null,
            avatar_url: user.user_metadata?.avatar_url || null,
          })

        if (error) {
          console.error('Error creating user profile:', error)
        }
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error)
    }
  }

  const signInWithGitHubApp = async () => {
    try {
      // Redirect to GitHub App installation with OAuth on install
      const appName = import.meta.env.VITE_GITHUB_APP_NAME || 'sigyl-dev'
      const redirectUrl = `${window.location.origin}/auth/callback`
      const installUrl = `https://github.com/apps/${appName}/installations/new?request_oauth_on_install=true&state=${encodeURIComponent(redirectUrl)}`
      
      // Store installation state in localStorage for when user returns
      localStorage.setItem('github_app_installing', 'true')
      localStorage.setItem('github_app_install_time', Date.now().toString())
      
      window.location.href = installUrl
    } catch (error) {
      console.error('Error signing in with GitHub App:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      // Clear GitHub App installation data
      setGitHubInstallationId(null)
      localStorage.removeItem('github_app_installing')
      localStorage.removeItem('github_app_install_time')
      
      // Clear GitHub App session data
      localStorage.removeItem('github_app_user')
      localStorage.removeItem('github_app_access_token')
      
      // Clear admin session if it exists
      localStorage.removeItem('admin_session')
      
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
      
      // Force clear the state
      setUser(null)
      setSession(null)
    } catch (error) {
      console.error('Error signing out:', error)
      throw error
    }
  }

  const refreshUser = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) {
        throw error
      }
      setUser(user)
    } catch (error) {
      console.error('Error refreshing user:', error)
      throw error
    }
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
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
