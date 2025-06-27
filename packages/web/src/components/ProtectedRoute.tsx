import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  fallback 
}) => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const hasRedirected = useRef(false)
  
  // Check for admin session
  const [adminSession] = useState(() => {
    const adminData = localStorage.getItem('admin_session');
    return adminData ? JSON.parse(adminData) : null;
  });

  useEffect(() => {
    console.log('ProtectedRoute state:', { 
      loading, 
      hasUser: !!user, 
      hasAdminSession: !!adminSession,
      pathname: location.pathname,
      hasRedirected: hasRedirected.current 
    })
    
    if (!loading && !user && !adminSession && !hasRedirected.current) {
      console.log('Redirecting to login from:', location.pathname)
      localStorage.setItem('intended_page', location.pathname)
      hasRedirected.current = true
      navigate('/login')
    }
  }, [loading, user, adminSession, navigate, location.pathname])

  if (loading) {
    console.log('ProtectedRoute: Showing loading state')
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user && !adminSession) {
    console.log('ProtectedRoute: No user or admin session, showing redirect state')
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mx-auto" />
          <p className="text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  console.log('ProtectedRoute: User or admin authenticated, rendering children')
  return <>{children}</>
}

export { ProtectedRoute } 