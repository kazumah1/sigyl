import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/components/UserProfile";
import { Home, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-black">
      {/* Header - Matching landing page exactly */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div 
              className="text-2xl font-bold tracking-tight text-white cursor-pointer hover:text-blue-400 transition-colors"
              onClick={() => navigate('/')}
            >
              SIGYL
            </div>
            <nav className="flex items-center space-x-6">
              <button 
                onClick={() => navigate('/registry')}
                className="text-white font-bold tracking-tight hover:text-blue-400 transition-colors"
              >
                Registry
              </button>
              <button 
                onClick={() => navigate('/docs')}
                className="text-white font-bold tracking-tight hover:text-blue-400 transition-colors"
              >
                Docs
              </button>
              <button 
                onClick={() => navigate('/blog')}
                className="text-white font-bold tracking-tight hover:text-blue-400 transition-colors"
              >
                Blog
              </button>
              <Button
                size="lg"
                onClick={() => navigate('/deploy')}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold tracking-tight"
              >
                Deploy
              </Button>
              <UserProfile />
            </nav>
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center min-h-screen pt-20">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="mb-8">
            <h1 className="text-8xl font-bold text-white mb-4 tracking-tight">404</h1>
            <p className="text-2xl text-white opacity-70 mb-2 tracking-tight">Page Not Found</p>
            <p className="text-lg text-white opacity-50 tracking-tight">
              The page you're looking for doesn't exist.
            </p>
          </div>
          
          <div className="space-y-4">
            <Button 
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold tracking-tight transition-all duration-300 hover:scale-105"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Button>
            
            <div className="flex justify-center">
              <Button 
                variant="outline"
                className="bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 font-bold tracking-tight transition-all duration-300 hover:scale-105"
                onClick={() => navigate('/')}
              >
                <Home className="w-4 h-4 mr-2" />
                Return Home
              </Button>
            </div>

            <Button
              size="lg"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold tracking-tight transition-all duration-300 hover:scale-105"
            >
              Get Started Free
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
