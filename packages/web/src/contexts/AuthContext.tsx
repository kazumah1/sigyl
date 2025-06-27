import React, { createContext, useContext, useEffect, useState } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { checkForGitHubAppCallback, handleGitHubAppCallback } from '@/lib/githubApp'

// Types for multi-account support
interface GitHubAccount {
  installationId: number
  username: string
  fullName?: string
  avatarUrl?: string
  email?: string
  accessToken: string
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
  isGitHubAppSessionValid: () => boolean
  // Multi-account support
  githubAccounts: GitHubAccount[]
  activeGitHubAccount: GitHubAccount | null
  setActiveGitHubAccount: (account: GitHubAccount | null) => void
  addGitHubAccount: (account: GitHubAccount) => void
  removeGitHubAccount: (installationId: number) => void
  linkAdditionalGitHubAccount: () => Promise<string>
  clearInvalidInstallations: () => void
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

  // Global GitHub App callback handler
  useEffect(() => {
    const processGitHubAppCallback = async () => {
      const { installationId, code, user: urlUser, access_token: urlToken, state } = checkForGitHubAppCallback()
      
      console.log('Checking for GitHub App callback:', { 
        hasInstallationId: !!installationId, 
        hasCode: !!code, 
        hasUser: !!urlUser, 
        hasToken: !!urlToken, 
        hasState: !!state 
      })
      
      // Handle both installation flow (installationId + code) and OAuth flow (just code)
      if (code) {
        try {
          console.log('Handling GitHub App callback...')
          
          // Verify OAuth state for security
          const storedState = localStorage.getItem('github_oauth_state');
          console.log('OAuth state verification:', { state, storedState, matches: state === storedState })
          
          if (state && storedState && state !== storedState) {
            console.error('OAuth state mismatch - possible CSRF attack')
            alert('Authentication failed: Invalid state parameter. Please try again.')
            return
          }
          
          let result;
          let user;
          let accessToken;
          let finalInstallationId;
          
          // Check if we have user data from URL parameters (redirected callback)
          if (urlUser && urlToken) {
            console.log('Using user data from URL parameters')
            finalInstallationId = installationId ? parseInt(installationId) : null;
            result = {
              installationId: finalInstallationId,
              user: urlUser,
              repos: [],
              access_token: urlToken
            };
            user = urlUser;
            accessToken = urlToken;
          } else {
            console.log('Making API call for user data')
            
            // For OAuth flow, we need to get the installation ID from stored state
            if (!installationId) {
              const storedInstallationId = localStorage.getItem('github_app_installation_id');
              if (storedInstallationId) {
                finalInstallationId = parseInt(storedInstallationId);
                console.log('Using stored installation ID for OAuth flow:', finalInstallationId);
              } else {
                console.error('No installation ID found for OAuth flow');
                alert('Authentication failed: No installation ID found. Please try installing the GitHub App again.');
                return;
              }
            } else {
              finalInstallationId = parseInt(installationId);
            }
            
            // Fall back to API call for direct callback
            result = await handleGitHubAppCallback(finalInstallationId.toString(), code);
            if (!result || !result.user) {
              console.error('GitHub App callback did not return user info:', result);
              alert('Authentication failed: No user info returned from GitHub. Please try again.');
              return;
            }
            user = result.user;
            accessToken = result.access_token;
          }
          
          if (!user || !accessToken) {
            console.error('Missing user or access token from GitHub App callback:', result);
            alert('Authentication failed: Missing user or access token. Please try again.');
            return;
          }
          
          console.log('Creating user session for:', user.login)
          
          // Set the installation ID in the auth context
          setGitHubInstallationId(finalInstallationId)
          
          // Create GitHub account object
          const newGitHubAccount: GitHubAccount = {
            installationId: finalInstallationId,
            username: user.login,
            fullName: user.name,
            avatarUrl: user.avatar_url,
            email: user.email,
            accessToken: accessToken,
            isActive: true,
            accountLogin: result?.account_login || user.login,
            accountType: result?.account_type || 'User',
          }
          
          // Store the GitHub user information in localStorage for session management
          localStorage.setItem('github_app_user', JSON.stringify(user))
          localStorage.setItem('github_app_access_token', accessToken)
          localStorage.setItem('github_app_installation_id', finalInstallationId.toString())
          
          // Store multiple accounts
          const existingAccounts = JSON.parse(localStorage.getItem('github_app_accounts') || '[]')
          const updatedAccounts = [...existingAccounts.filter((acc: GitHubAccount) => acc.installationId !== finalInstallationId), newGitHubAccount]
          localStorage.setItem('github_app_accounts', JSON.stringify(updatedAccounts))
          
          // Check if we're linking an additional account
          const isLinking = localStorage.getItem('github_app_linking') === 'true'
          
          if (isLinking) {
            // Just add the new account without replacing the current session
            setGitHubAccounts(updatedAccounts)
            console.log('Additional GitHub account linked:', user.login)
            
            // Clear linking state
            localStorage.removeItem('github_app_linking')
          } else {
            // Update state for new installation
            setGitHubAccounts(updatedAccounts)
            setActiveGitHubAccount(newGitHubAccount)
          }
          
          // Create a custom user session
          const now = new Date().toISOString();
          const customUser = {
            id: `github_${user.id}`,
            aud: 'authenticated',
            role: 'authenticated',
            email: user.email || `${user.login}@github.com`,
            email_confirmed_at: now,
            phone: '',
            phone_confirmed_at: null,
            confirmed_at: now,
            last_sign_in_at: now,
            app_metadata: {
              provider: 'github',
              providers: ['github']
            },
            user_metadata: {
              user_name: user.login,
              full_name: user.name,
              avatar_url: user.avatar_url,
              sub: user.id.toString(),
              provider: 'github'
            },
            identities: [],
            created_at: now,
            updated_at: now,
            is_anonymous: false
          };
          
          console.log('Setting user state:', customUser.user_metadata.user_name)
          
          // Set the user in our state FIRST
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
          
          // Clear URL parameters
          const url = new URL(window.location.href)
          url.searchParams.delete('installation_id')
          url.searchParams.delete('code')
          url.searchParams.delete('user')
          url.searchParams.delete('access_token')
          url.searchParams.delete('state')
          window.history.replaceState({}, '', url.toString())
          
          // Clear installation state
          localStorage.removeItem('github_app_installing')
          localStorage.removeItem('github_app_install_time')
          localStorage.removeItem('github_oauth_state')
          
          // Clear stored username since we're now signed in
          localStorage.removeItem('github_username_for_login')
          
          console.log('GitHub App installation completed:', finalInstallationId)
          
          // Wait a moment for state to be set, then redirect
          setTimeout(() => {
            const intendedPage = localStorage.getItem('intended_page') || '/deploy'
            localStorage.removeItem('intended_page')
            console.log('Redirecting to:', intendedPage)
            window.location.href = intendedPage
          }, 100)
          
        } catch (error) {
          console.error('Error handling GitHub App callback:', error)
          alert('Authentication failed: ' + (error instanceof Error ? error.message : error));
        }
      } else {
        console.log('No GitHub App callback parameters found')
      }
    }

    // Check for callback on mount
    processGitHubAppCallback()
  }, [])

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      console.log('Getting initial session...')
      
      // Check for GitHub App user session first
      const githubAppUser = localStorage.getItem('github_app_user')
      const githubAppToken = localStorage.getItem('github_app_access_token')
      const githubAppInstallationId = localStorage.getItem('github_app_installation_id')
      const githubAppAccounts = localStorage.getItem('github_app_accounts')
      
      console.log('GitHub App session check:', { 
        hasUser: !!githubAppUser, 
        hasToken: !!githubAppToken,
        hasInstallationId: !!githubAppInstallationId,
        hasAccounts: !!githubAppAccounts
      })
      
      if (githubAppUser && githubAppToken) {
        try {
          // Check if the session is still valid
          if (!isGitHubAppSessionValid()) {
            console.log('GitHub App session is invalid, clearing...')
            localStorage.removeItem('github_app_user')
            localStorage.removeItem('github_app_access_token')
            localStorage.removeItem('github_app_installation_id')
            localStorage.removeItem('github_app_accounts')
            localStorage.removeItem('github_app_installing')
            localStorage.removeItem('github_app_install_time')
            localStorage.removeItem('github_oauth_state')
            // Fall through to Supabase session
          } else {
            const userData = JSON.parse(githubAppUser)
            console.log('Restoring GitHub App session for user:', userData.login)
            
            // Restore multiple accounts
            if (githubAppAccounts) {
              const accounts: GitHubAccount[] = JSON.parse(githubAppAccounts)
              setGitHubAccounts(accounts)
              
              // Set active account (first active one or first one)
              const activeAccount = accounts.find(acc => acc.isActive) || accounts[0]
              if (activeAccount) {
                setActiveGitHubAccount(activeAccount)
                setGitHubInstallationId(activeAccount.installationId)
              }
            }
            
            const now = new Date().toISOString();
            const customUser = {
              id: `github_${userData.id}`,
              aud: 'authenticated',
              role: 'authenticated',
              email: userData.email || `${userData.login}@github.com`,
              email_confirmed_at: now,
              phone: '',
              phone_confirmed_at: null,
              confirmed_at: now,
              last_sign_in_at: now,
              app_metadata: {
                provider: 'github',
                providers: ['github']
              },
              user_metadata: {
                user_name: userData.login,
                full_name: userData.name,
                avatar_url: userData.avatar_url,
                sub: userData.id.toString(),
                provider: 'github'
              },
              identities: [],
              created_at: now,
              updated_at: now,
              is_anonymous: false
            };
            
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
            console.log('GitHub App session restored successfully')
            return
          }
        } catch (error) {
          console.error('Error restoring GitHub App session:', error)
          // Clear invalid session data
          localStorage.removeItem('github_app_user')
          localStorage.removeItem('github_app_access_token')
          localStorage.removeItem('github_app_installation_id')
          localStorage.removeItem('github_app_accounts')
        }
      }
      
      console.log('No GitHub App session found, checking Supabase session...')
      
      // Fall back to Supabase session only if no GitHub App session
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)

      // Fetch user profile from profiles table if session exists
      if (session?.user) {
        try {
          console.log('Fetching user profile for session user:', session.user.user_metadata?.user_name)
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          if (profile && !profileError) {
            console.log('Found user profile in database:', profile.github_username)
            // Use profile as the logged-in user
            setUser({
              ...session.user,
              user_metadata: {
                ...session.user.user_metadata,
                full_name: profile.full_name,
                avatar_url: profile.avatar_url,
                github_username: profile.github_username,
                github_id: profile.github_id,
              },
              email: profile.email,
            })
          } else {
            console.log('No profile found in database or error:', profileError)
          }
          
          // ALWAYS check for existing GitHub App installations for this OAuth user
          // regardless of whether we found a profile or not
          console.log('Calling loadExistingGitHubAppAccounts for session user')
          await loadExistingGitHubAppAccounts(session.user)
        } catch (error) {
          console.error('Error fetching user profile:', error)
          // Still try to load GitHub App accounts even if profile fetch failed
          console.log('Profile fetch failed, still calling loadExistingGitHubAppAccounts')
          await loadExistingGitHubAppAccounts(session.user)
        }
      }
      setLoading(false)
      console.log('Session initialization complete:', { 
        hasUser: !!session?.user, 
        hasSession: !!session 
      })
    }

    getInitialSession()

    // Listen for auth changes - but only if we don't have a GitHub App session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only handle Supabase auth changes if we don't have a valid GitHub App session
        const hasValidGitHubAppSession = isGitHubAppSessionValid()
        
        console.log('Auth state change handler:', { 
          event, 
          hasUser: !!session?.user, 
          hasValidGitHubAppSession,
          githubAppUser: !!localStorage.getItem('github_app_user'),
          githubAppToken: !!localStorage.getItem('github_app_access_token')
        })
        
        if (!hasValidGitHubAppSession) {
          console.log('Processing Supabase auth state change:', event, { hasUser: !!session?.user })
          setSession(session)
          setUser(session?.user ?? null)
          setLoading(false)

          // If user signs in, ensure we have their profile in our users table
          if (event === 'SIGNED_IN' && session?.user) {
            console.log('SIGNED_IN event - calling ensureUserProfile and loadExistingGitHubAppAccounts')
            console.log('Current localStorage state:')
            console.log('- github_app_accounts:', localStorage.getItem('github_app_accounts'))
            console.log('- github_app_user:', localStorage.getItem('github_app_user'))
            console.log('- github_app_access_token:', localStorage.getItem('github_app_access_token'))
            console.log('- github_app_installation_id:', localStorage.getItem('github_app_installation_id'))
            
            // First try to restore GitHub App accounts directly - this is the critical fix
            console.log('Auth state change: calling loadExistingGitHubAppAccounts FIRST')
            try {
              await loadExistingGitHubAppAccounts(session.user)
            } catch (error) {
              console.error('Error in loadExistingGitHubAppAccounts:', error)
            }
            
            // Then try ensureUserProfile (but don't let it block the GitHub App restoration)
            try {
              await ensureUserProfile(session.user)
            } catch (error) {
              console.error('Error in ensureUserProfile:', error)
            }
          }
        } else {
          console.log('Ignoring Supabase auth state change - valid GitHub App session exists')
          
          // If Supabase tries to sign out but we have a GitHub App session, ignore it
          if (event === 'SIGNED_OUT') {
            console.log('Ignoring Supabase sign out - keeping GitHub App session')
            return
          }
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const ensureUserProfile = async (user: User) => {
    console.log('=== ensureUserProfile called ===')
    try {
      // Check if user profile exists
      console.log('Checking for existing user profile for:', user.id)
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      console.log('Existing user profile:', existingUser ? 'found' : 'not found')

      if (!existingUser) {
        console.log('Creating new user profile')
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
        } else {
          console.log('User profile created successfully')
        }
      }
      
      // Check for existing GitHub App installations for this user
      // console.log('ensureUserProfile: calling loadExistingGitHubAppAccounts')
      // await loadExistingGitHubAppAccounts(user)
    } catch (error) {
      console.error('Error ensuring user profile:', error)
    }
  }

  // New function to load existing GitHub App accounts for OAuth users
  const loadExistingGitHubAppAccounts = async (user: User) => {
    console.log('=== loadExistingGitHubAppAccounts called ===')
    try {
      const githubUsername = user.user_metadata?.user_name
      const githubId = user.user_metadata?.sub
      
      console.log('User metadata:', { githubUsername, githubId, email: user.email })
      
      if (!githubUsername && !githubId) {
        console.log('No GitHub username or ID found for user - exiting')
        return
      }

      console.log('Checking for existing GitHub App installations for:', githubUsername)

      // Check localStorage first for any stored GitHub App accounts
      const storedAccounts = localStorage.getItem('github_app_accounts')
      console.log('Stored accounts in localStorage:', storedAccounts ? 'found' : 'not found')
      if (storedAccounts) {
        try {
          const accounts: GitHubAccount[] = JSON.parse(storedAccounts)
          console.log('Parsed accounts from localStorage:', accounts.length)
          const userAccounts = accounts.filter(account => 
            account.username === githubUsername || 
            account.email === user.email
          )
          
          console.log('Filtered user accounts:', userAccounts.length)
          
          if (userAccounts.length > 0) {
            console.log('Found existing GitHub App accounts in localStorage:', userAccounts.length)
            setGitHubAccounts(userAccounts)
            
            // Set the first account as active
            const activeAccount = userAccounts.find(acc => acc.isActive) || userAccounts[0]
            if (activeAccount) {
              console.log('Setting active account:', activeAccount.username)
              setActiveGitHubAccount(activeAccount)
              setGitHubInstallationId(activeAccount.installationId)
              
              // CRITICAL: Restore the GitHub App session state in localStorage
              // This is what makes isGitHubAppSessionValid() return true
              const githubUserData = {
                id: githubId || user.id,
                login: activeAccount.username,
                name: activeAccount.fullName || activeAccount.username,
                avatar_url: activeAccount.avatarUrl || user.user_metadata?.avatar_url,
                email: activeAccount.email || user.email
              }
              
              console.log('Restoring GitHub App session state in localStorage')
              localStorage.setItem('github_app_user', JSON.stringify(githubUserData))
              localStorage.setItem('github_app_access_token', activeAccount.accessToken || 'restored_token')
              localStorage.setItem('github_app_installation_id', activeAccount.installationId.toString())
              localStorage.setItem('github_app_install_time', Date.now().toString())
              
              console.log('Restored complete GitHub App session for:', activeAccount.username)
            }
            return
          }
        } catch (parseError) {
          console.error('Error parsing stored GitHub App accounts:', parseError)
        }
      }

      // Check database for existing GitHub App installations
      if (githubUsername) {
        try {
          console.log('Checking database for GitHub App installations for:', githubUsername)
          const { data: installations, error } = await supabase
            .from('github_installations')
            .select('*')
            .eq('account_login', githubUsername)

          if (error) {
            console.error('Error querying GitHub installations:', error)
          } else if (installations && installations.length > 0) {
            console.log('Found existing GitHub App installations in database:', installations.length)
            
            // Convert database installations to GitHubAccount format
            const githubAccounts: GitHubAccount[] = installations.map(installation => ({
              installationId: installation.installation_id,
              username: installation.account_login,
              fullName: installation.account_login, // We don't have full name in the installations table
              avatarUrl: user.user_metadata?.avatar_url || '',
              email: user.email || '',
              accessToken: 'db_restored_token', // This will need to be refreshed when needed
              isActive: false,
              accountLogin: installation.account_login,
              accountType: installation.account_type || 'User'
            }))

            // Mark first account as active
            if (githubAccounts.length > 0) {
              githubAccounts[0].isActive = true
            }

            setGitHubAccounts(githubAccounts)
            setActiveGitHubAccount(githubAccounts[0])
            setGitHubInstallationId(githubAccounts[0].installationId)
            
            // Store in localStorage for faster future access
            localStorage.setItem('github_app_accounts', JSON.stringify(githubAccounts))
            
            // CRITICAL: Also restore the GitHub App session state in localStorage
            const githubUserData = {
              id: githubId || user.id,
              login: githubAccounts[0].username,
              name: githubAccounts[0].fullName || githubAccounts[0].username,
              avatar_url: githubAccounts[0].avatarUrl,
              email: githubAccounts[0].email
            }
            
            localStorage.setItem('github_app_user', JSON.stringify(githubUserData))
            localStorage.setItem('github_app_access_token', githubAccounts[0].accessToken)
            localStorage.setItem('github_app_installation_id', githubAccounts[0].installationId.toString())
            localStorage.setItem('github_app_install_time', Date.now().toString())
            
            console.log('Restored GitHub App access from database for:', githubAccounts[0].username)
            return
          }
        } catch (error) {
          console.error('Error checking database for GitHub App installations:', error)
        }
      }

      // If no localStorage accounts found, check if they need to link their GitHub App
      console.log('No existing GitHub App installations found for user:', githubUsername)
      
    } catch (error) {
      console.error('Error loading existing GitHub App accounts:', error)
    }
  }

  const signOut = async () => {
    console.log('=== signOut called ===')
    try {
      // Store the GitHub username before clearing session data
      const storedUser = localStorage.getItem('github_app_user')
      let githubUsername: string | null = null
      
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          githubUsername = userData.login
          // Store just the username for future login attempts
          localStorage.setItem('github_username_for_login', githubUsername)
          console.log('Stored GitHub username for future login:', githubUsername)
        } catch (error) {
          console.error('Error parsing stored user data during sign out:', error)
        }
      }
      
      console.log('Clearing GitHub App state...')
      
      // Clear GitHub App React state
      setGitHubInstallationId(null)
      setGitHubAccounts([])
      setActiveGitHubAccount(null)
      
      // Clear GitHub App localStorage data
      localStorage.removeItem('github_app_installing')
      localStorage.removeItem('github_app_install_time')
      localStorage.removeItem('github_oauth_state')
      localStorage.removeItem('github_app_installation_id')
      localStorage.removeItem('github_app_user')
      localStorage.removeItem('github_app_access_token')
      localStorage.removeItem('github_app_accounts')
      localStorage.removeItem('github_app_linking')
      
      // Clear admin session if it exists
      localStorage.removeItem('admin_session')
      
      console.log('Clearing React state first...')
      // Clear the state BEFORE calling Supabase signOut to prevent race conditions
      setUser(null)
      setSession(null)
      setLoading(false)
      
      console.log('Calling Supabase signOut...')
      try {
        const { error } = await supabase.auth.signOut()
        if (error) {
          console.error('Supabase signOut error:', error)
          // Don't throw - we want to complete the sign out even if Supabase fails
        } else {
          console.log('Supabase signOut successful')
        }
      } catch (supabaseError) {
        console.error('Supabase signOut exception:', supabaseError)
        // Don't throw - we want to complete the sign out even if Supabase fails
      }
      
      console.log('Sign out completed successfully')
      
      // Force a page reload to ensure clean state
      setTimeout(() => {
        window.location.href = '/login'
      }, 100)
      
    } catch (error) {
      console.error('Error signing out:', error)
      // Even if there's an error, try to clear state and redirect
      setUser(null)
      setSession(null)
      setLoading(false)
      setTimeout(() => {
        window.location.href = '/login'
      }, 100)
    }
  }

  const signInWithGitHubApp = async () => {
    // Build the GitHub App URL that works for both new and existing installations
    const appName = import.meta.env.VITE_GITHUB_APP_NAME || 'sigyl-dev'
    const redirectUrl = encodeURIComponent(window.location.origin + `/auth/callback`);
    const state = Math.random().toString(36).substring(2, 15); // for CSRF protection
    
    // Store installation state in localStorage for when user returns
    localStorage.setItem('github_app_installing', 'true')
    localStorage.setItem('github_app_install_time', Date.now().toString())
    localStorage.setItem('github_oauth_state', state)
    
    // Check if we have a stored GitHub username from a previous session
    let githubUsername: string | null = null
    
    // First try to get from current session
    const storedUser = localStorage.getItem('github_app_user')
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        githubUsername = userData.login
      } catch (error) {
        console.error('Error parsing stored user data:', error)
      }
    }
    
    // If no current session, try to get from stored username (from previous sign out)
    if (!githubUsername) {
      githubUsername = localStorage.getItem('github_username_for_login')
    }
    
    // If we have a GitHub username, check if they have an existing installation
    if (githubUsername) {
      try {
        const { checkExistingInstallation, getOAuthUrlForExistingInstallation } = await import('@/lib/githubApp')
        const installationCheck = await checkExistingInstallation(githubUsername)
        
        if (installationCheck.hasInstallation && installationCheck.installationId) {
          console.log('User has existing installation, using OAuth flow')
          
          // Store the installation ID for the callback handler
          localStorage.setItem('github_app_installation_id', installationCheck.installationId.toString())
          
          // Use OAuth flow for existing installation
          const oauthUrl = await getOAuthUrlForExistingInstallation(
            installationCheck.installationId,
            window.location.origin + `/auth/callback`,
            state
          )
          return oauthUrl
        }
      } catch (error) {
        console.error('Error checking existing installation:', error)
        // Fall through to new installation flow
      }
    }
    
    // Use installation flow for new installations
    console.log('Using new installation flow')
    const installUrl = `https://github.com/apps/${appName}/installations/new?state=${state}&request_oauth_on_install=true&redirect_uri=${redirectUrl}`
    
    return installUrl
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

  const isGitHubAppSessionValid = () => {
    const githubAppUser = localStorage.getItem('github_app_user')
    const githubAppToken = localStorage.getItem('github_app_access_token')
    const installTime = localStorage.getItem('github_app_install_time')
    
    if (!githubAppUser || !githubAppToken) {
      return false
    }
    
    // Check if installation is not too old (24 hours)
    if (installTime) {
      const installTimestamp = parseInt(installTime)
      const now = Date.now()
      const maxAge = 24 * 60 * 60 * 1000 // 24 hours
      
      if (now - installTimestamp > maxAge) {
        console.log('GitHub App session expired')
        return false
      }
    }
    
    return true
  }

  const addGitHubAccount = (account: GitHubAccount) => {
    setGitHubAccounts([...githubAccounts, account])
    if (account.isActive) {
      setActiveGitHubAccount(account)
    }
  }

  const removeGitHubAccount = (installationId: number) => {
    const newAccounts = githubAccounts.filter(account => account.installationId !== installationId)
    setGitHubAccounts(newAccounts)
    if (activeGitHubAccount && activeGitHubAccount.installationId === installationId) {
      setActiveGitHubAccount(null)
    }
  }

  const linkAdditionalGitHubAccount = async () => {
    // Build the GitHub App URL for linking additional accounts
    const appName = import.meta.env.VITE_GITHUB_APP_NAME || 'sigyl-dev'
    const redirectUrl = encodeURIComponent(window.location.origin + `/auth/callback`);
    const state = Math.random().toString(36).substring(2, 15); // for CSRF protection
    
    // Store linking state in localStorage
    localStorage.setItem('github_app_linking', 'true')
    localStorage.setItem('github_app_install_time', Date.now().toString())
    localStorage.setItem('github_oauth_state', state)
    
    // Use installation flow for linking additional accounts
    console.log('Linking additional GitHub account')
    const installUrl = `https://github.com/apps/${appName}/installations/new?state=${state}&request_oauth_on_install=true&redirect_uri=${redirectUrl}`
    
    return installUrl
  }

  // New function to clear invalid installations
  const clearInvalidInstallations = () => {
    console.log('Clearing invalid GitHub App installations...')
    
    // Clear all GitHub App localStorage data
    localStorage.removeItem('github_app_user')
    localStorage.removeItem('github_app_access_token')
    localStorage.removeItem('github_app_installation_id')
    localStorage.removeItem('github_app_accounts')
    localStorage.removeItem('github_app_install_time')
    
    // Clear React state
    setGitHubInstallationId(null)
    setGitHubAccounts([])
    setActiveGitHubAccount(null)
    
    console.log('Invalid installations cleared - user will need to reinstall GitHub App')
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
    isGitHubAppSessionValid,
    githubAccounts,
    activeGitHubAccount,
    setActiveGitHubAccount,
    addGitHubAccount,
    removeGitHubAccount,
    linkAdditionalGitHubAccount,
    clearInvalidInstallations,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
