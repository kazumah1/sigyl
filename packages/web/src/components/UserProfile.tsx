import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LogOut, User, Settings, Github } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const UserProfile: React.FC = () => {
  const { user, signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [profile, setProfile] = useState(null)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsSigningOut(false)
    }
  }

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return;
      try {
        let query = supabase.from('profiles').select('*');
        if (/^github_/.test(user.id)) {
          // Use github_id for GitHub App users
          query = query.eq('github_id', user.id.replace('github_', ''));
        } else {
          // Use id (UUID) for Supabase OAuth users
          query = query.eq('id', user.id);
        }
        const { data: profile, error } = await query.single();
        if (error) {
          console.error('Error loading profile:', error);
        } else {
          setProfile(profile);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      }
    };
    loadProfile();
  }, [user]);

  if (!user) {
    return null
  }

  const githubUsername = user.user_metadata?.user_name || user.user_metadata?.preferred_username
  const avatarUrl = user.user_metadata?.avatar_url
  const email = user.email

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatarUrl} alt={githubUsername || email} />
            <AvatarFallback className="bg-indigo-600 text-white font-bold">
              {githubUsername ? githubUsername.charAt(0).toUpperCase() : email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-gray-900 border-gray-800" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none text-white">
              {githubUsername || 'User'}
            </p>
            <p className="text-xs leading-none text-gray-400">
              {email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-gray-800" />
        <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer">
          <User className="mr-2 h-4 w-4" />
          <span>Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer">
          <Github className="mr-2 h-4 w-4" />
          <span>GitHub</span>
        </DropdownMenuItem>
        <DropdownMenuItem className="text-gray-300 hover:text-white hover:bg-gray-800 cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-gray-800" />
        <DropdownMenuItem 
          className="text-red-400 hover:text-red-300 hover:bg-gray-800 cursor-pointer"
          onClick={handleSignOut}
          disabled={isSigningOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>{isSigningOut ? 'Signing out...' : 'Sign out'}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export { UserProfile } 