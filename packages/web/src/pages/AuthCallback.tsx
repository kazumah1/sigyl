import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'

const AuthCallback = () => {
  const [message, setMessage] = useState('Processing authentication...')
  const navigate = useNavigate()

  useEffect(() => {
    // Let the AuthContext handle the authentication
    // This component just shows a loading state
    const timer = setTimeout(() => {
      setMessage('Authentication complete! Redirecting...')
    }, 1000)

    // Fallback redirect after 5 seconds in case something goes wrong
    const fallbackTimer = setTimeout(() => {
      console.log('AuthCallback: Fallback redirect to deploy page')
      navigate('/deploy', { replace: true })
    }, 5000)

    return () => {
      clearTimeout(timer)
      clearTimeout(fallbackTimer)
    }
  }, [navigate])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Authentication</h1>
          <p className="text-gray-400">{message}</p>
        </div>
        <div className="flex justify-center">
          <div className="w-32 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-400 animate-pulse rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthCallback 