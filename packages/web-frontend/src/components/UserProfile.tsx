import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LogOut, User, Settings, Github } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const UserProfile: React.FC = () => {
  const { user, signOut } = useAuth()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const { toast } = useToast()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    if (isSigningOut) return // Prevent multiple clicks
    
    setIsSigningOut(true)
    try {
      await signOut()
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account.",
      })
      // Redirect to home page after successful sign out
      navigate('/', { replace: true })
    } catch (error) {
      console.error('Error signing out:', error)
      toast({
        title: "Sign out failed",
        description: "There was an error signing you out. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSigningOut(false)
    }
  }

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
          className={`${isSigningOut ? 'text-gray-500 cursor-not-allowed' : 'text-red-400 hover:text-red-300 hover:bg-gray-800 cursor-pointer'}`}
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