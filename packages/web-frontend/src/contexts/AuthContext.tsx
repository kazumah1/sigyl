import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { Database } from '@/lib/supabase'

type AuthContextType = {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
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

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
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

  const signInWithGitHub = async () => {
    // Redirect to GitHub App install+OAuth flow
    const appName = import.meta.env.VITE_GITHUB_APP_NAME || 'sigyl-dev';
    const state = Math.random().toString(36).substring(2, 15); // for CSRF protection if needed
    const installUrl = `https://github.com/apps/${appName}/installations/new?request_oauth_on_install=true&state=${state}`;
    window.location.href = installUrl;
  }

  const signOut = async () => {
    try {
      // Clear local state first
      setUser(null)
      setSession(null)
      
      // Call Supabase sign out
      const { error } = await supabase.auth.signOut()
      if (error) {
        throw error
      }
      
      // Force clear any remaining session data
      await supabase.auth.refreshSession()
      
    } catch (error) {
      console.error('Error signing out:', error)
      // Revert state if sign out failed
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
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
    signInWithGitHub,
    signOut,
    refreshUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 