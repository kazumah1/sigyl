import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { Loader2, CheckCircle, XCircle } from 'lucide-react'

const AuthCallback = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Authenticating...')
  const navigate = useNavigate()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        setStatus('loading')
        setMessage('Processing authentication...')

        const { data, error } = await supabase.auth.getSession()
        
        if (error) {
          throw error
        }

        if (data.session) {
          setStatus('success')
          setMessage('Authentication successful! Redirecting...')
          
          // Redirect to the intended page or home
          setTimeout(() => {
            navigate('/deploy', { replace: true })
          }, 1500)
        } else {
          throw new Error('No session found')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        setStatus('error')
        setMessage('Authentication failed. Please try again.')
        
        setTimeout(() => {
          navigate('/deploy', { replace: true })
        }, 3000)
      }
    }

    handleAuthCallback()
  }, [navigate])

  const getIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-400" />
      case 'error':
        return <XCircle className="w-8 h-8 text-red-400" />
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          {getIcon()}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Authentication</h1>
          <p className="text-gray-400">{message}</p>
        </div>
        {status === 'loading' && (
          <div className="flex justify-center">
            <div className="w-32 h-1 bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-400 animate-pulse rounded-full"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthCallback 