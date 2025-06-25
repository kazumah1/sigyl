import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { InteractiveBackground } from "@/components/InteractiveBackground";
import { OpeningAnimation } from "@/components/OpeningAnimation";
import MathyGraphs from "@/components/MathyGraphs";
import { UserProfile } from "@/components/UserProfile";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Zap, Layers, Code, Crown, Brain, Rocket, Shield } from "lucide-react";

const Index = () => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [shouldBounce, setShouldBounce] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [heroVisible, setHeroVisible] = useState(false);
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const [heroLocked, setHeroLocked] = useState(false);
  const [scrollBuffer, setScrollBuffer] = useState(0);
  const [showScrollText, setShowScrollText] = useState(false);
  const navigate = useNavigate();

  const themes = {
    dark: { 
      bg: 'bg-black', 
      text: 'text-white', 
      accent: 'bg-indigo-500 hover:bg-indigo-600',
      card: 'bg-gray-900/50 border-gray-700',
      solid: 'text-indigo-400',
      gradient: 'from-indigo-500 to-pink-500'
    }
  };

  const currentTheme = themes[theme as keyof typeof themes];

  // Show scroll text after 3.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowScrollText(true);
    }, 3500);
    return () => clearTimeout(timer);
  }, []);

  // Scroll resistance system with proper lock-in effect
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout;
    let lastScrollY = 0;
    let scrollBuffer = 0;
    let heroResistanceBuffer = 0;
    let isInHeroZone = false;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDelta = Math.abs(currentScrollY - lastScrollY);
      
      // Add scroll buffer to prevent rapid scrolling
      scrollBuffer += scrollDelta;
      
      // Only update state if we've scrolled enough (buffer threshold)
      if (scrollBuffer > 30) {
        setScrollY(currentScrollY);
        scrollBuffer = 0;
        
        // Header appears after 50px scroll and stays visible
        if (currentScrollY > 50 && !headerVisible) {
          setHeaderVisible(true);
        }
        
        // Hero content appears after 150px scroll and stays visible
        if (currentScrollY > 150 && !heroVisible) {
          setHeroVisible(true);
        }
        
        // Hero section gets locked in after 300px scroll
        if (currentScrollY > 300 && !heroLocked) {
          setHeroLocked(true);
          isInHeroZone = true;
        }
        
        // Features appear after hero section is unlocked
        if (currentScrollY > 800 && !featuresVisible) {
          setFeaturesVisible(true);
        }
      }
      
      // HERO RESISTANCE SYSTEM - This is the key part
      if (isInHeroZone && currentScrollY > 300) {
        // Add resistance buffer - requires much more scrolling to escape hero zone
        heroResistanceBuffer += scrollDelta;
        
        // Only allow progression past hero section after significant additional scrolling
        if (heroResistanceBuffer > 300) { // Increased resistance threshold
          heroResistanceBuffer = 0;
          // Only unlock after substantial scrolling past the hero zone
          if (currentScrollY > 800) {
            setHeroLocked(false);
            isInHeroZone = false;
          }
        }
        
        // If we're in the hero zone, prevent normal scrolling behavior
        if (currentScrollY < 800 && heroResistanceBuffer < 300) {
          // This creates the "sticky" effect - the page resists scrolling
          // The hero section stays in view until enough resistance is overcome
        }
      }
      
      lastScrollY = currentScrollY;
      
      // Clear timeout and reset buffer after a delay
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        scrollBuffer = 0;
        if (!isInHeroZone) {
          heroResistanceBuffer = 0;
        }
      }, 150);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [headerVisible, heroVisible, featuresVisible, heroLocked]);

  // Occasional bounce effect
  useEffect(() => {
    if (isLoaded) {
      const bounceInterval = setInterval(() => {
        setShouldBounce(true);
        setTimeout(() => setShouldBounce(false), 1000);
      }, 8000); // Every 8 seconds

      return () => clearInterval(bounceInterval);
    }
  }, [isLoaded]);

  return (
    <div className={`min-h-screen ${currentTheme.bg} relative overflow-hidden transition-all duration-700 ease-out`}>
      {/* Enhanced Animated Math Background */}
      <MathyGraphs />
      
      <InteractiveBackground theme={theme} onThemeChange={setTheme} />
      
      {!isLoaded && <OpeningAnimation onComplete={() => setIsLoaded(true)} />}
      
      {/* Scroll Down Text - Appears after 3.5 seconds, disappears when content is visible */}
      {showScrollText && !headerVisible && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 text-center animate-fade-in">
          <p className={`text-lg font-bold tracking-tight ${currentTheme.text}`}>
            Scroll Down
          </p>
        </div>
      )}
      
      {/* Header - Appears on scroll and stays visible */}
      {headerVisible && (
        <header className="fixed top-0 left-0 right-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div 
                className="text-2xl font-bold tracking-tight text-white cursor-pointer hover:text-indigo-400 transition-colors"
                onClick={() => navigate('/')}
              >
                SIGYL
              </div>
              <nav className="flex items-center space-x-6">
                <button 
                  onClick={() => navigate('/marketplace')}
                  className="text-white font-bold tracking-tight hover:text-indigo-400 transition-colors"
                >
                  Marketplace
                </button>
                <button 
                  onClick={() => navigate('/docs')}
                  className="text-white font-bold tracking-tight hover:text-indigo-400 transition-colors"
                >
                  Docs
                </button>
                <button 
                  onClick={() => navigate('/blog')}
                  className="text-white font-bold tracking-tight hover:text-indigo-400 transition-colors"
                >
                  Blog
                </button>
                <Button 
                  onClick={() => navigate('/deploy')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold tracking-tight"
                >
                  Deploy
                </Button>
                <UserProfile />
              </nav>
            </div>
          </div>
        </header>
      )}

      {/* Hero Section - Reveals on scroll and gets locked in place */}
      <section className={`relative min-h-screen flex items-center justify-center px-6 pt-20 transition-all duration-1000 ${
        heroLocked ? 'sticky top-0 z-30' : ''
      }`}>
        <div className="max-w-6xl mx-auto text-center">
          
          <div className={`transition-all duration-1500 ${
            heroVisible 
              ? 'opacity-100 translate-y-0' 
              : 'opacity-0 translate-y-12'
          }`}>
            {/* Main heading with bold, simple messaging */}
            <h1 className={`text-8xl md:text-9xl font-black tracking-tight ${currentTheme.text} leading-none mb-8 animate-fade-in`}>
              Deploy Smart.
              <br />
              <span className={`${currentTheme.solid}`}>
                Scale Fast.
              </span>
            </h1>
            
            {/* Bold, simple subheading */}
            <p className={`text-2xl md:text-3xl ${currentTheme.text} font-bold leading-relaxed mb-12 max-w-4xl mx-auto animate-fade-in delay-300`}>
              The most advanced MCP deployment platform.
            </p>

            {/* CTA Buttons */}
            <div className={`flex flex-col sm:flex-row gap-6 justify-center mb-16 animate-fade-in delay-500`}>
              <Button 
                size="lg" 
                className={`${currentTheme.accent} text-white px-10 py-8 text-xl font-bold transition-all duration-300 hover:scale-110 hover:shadow-2xl group ${
                  shouldBounce ? 'animate-bounce-gentle' : ''
                }`}
                onClick={() => navigate('/marketplace')}
              >
                Explore Marketplace
                <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className={`border-2 border-gray-600 text-indigo-400 hover:bg-indigo-500 hover:border-indigo-500 hover:text-white px-10 py-8 text-xl font-bold transition-all duration-300 hover:scale-110 hover:shadow-2xl`}
                onClick={() => navigate('/deploy')}
              >
                Start Deploying
              </Button>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className={`absolute bottom-8 left-1/2 transform -translate-x-1/2 text-center animate-bounce ${
          heroVisible ? 'opacity-100' : 'opacity-0'
        } transition-opacity duration-1000`}>
          {/* Scroll indicator text removed */}
        </div>
      </section>

      {/* Value Add Section - Appears after hero section is unlocked */}
      <section className={`relative py-32 px-6 ${currentTheme.bg} transition-all duration-1500 ${
        featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
      }`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className={`text-6xl md:text-7xl font-black ${currentTheme.text} mb-8`}>
              Why Choose SIGYL?
            </h2>
            <p className={`text-xl ${currentTheme.text} opacity-70 max-w-3xl mx-auto leading-relaxed`}>
              Built for developers who demand speed, reliability, and innovation.
            </p>
          </div>

          {/* Feature cards with staggered animations */}
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { 
                icon: Zap, 
                title: "Instant Deploy", 
                desc: "Launch MCP servers in seconds with our optimized infrastructure. No waiting, no delays.", 
                delay: "delay-700" 
              },
              { 
                icon: Layers, 
                title: "Rich Marketplace", 
                desc: "Discover thousands of pre-built agents and integrations. Ready to deploy immediately.", 
                delay: "delay-900" 
              },
              { 
                icon: Code, 
                title: "Developer First", 
                desc: "Built by developers, for developers. Simple APIs, powerful tools, complete control.", 
                delay: "delay-1000" 
              }
            ].map((feature, index) => (
              <div key={index} className={`${currentTheme.card} backdrop-blur-sm rounded-3xl p-8 border hover:shadow-2xl transition-all duration-700 hover:scale-105 hover:-translate-y-4 animate-fade-in ${feature.delay} group`}>
                <div className={`w-16 h-16 ${currentTheme.accent.split(' ')[0]} rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:rotate-12 transition-transform duration-500`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className={`text-2xl font-bold ${currentTheme.text} mb-4 group-hover:scale-105 transition-transform`}>{feature.title}</h3>
                <p className={`${currentTheme.text} opacity-60 text-lg leading-relaxed`}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ready to Scale Section - Appears after features */}
      <section className={`relative py-32 px-6 ${currentTheme.bg} transition-all duration-1500 ${
        featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
      }`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className={`text-6xl md:text-7xl font-black ${currentTheme.text} mb-8`}>
              Ready to Scale?
            </h2>
            <p className={`text-xl ${currentTheme.text} opacity-70 max-w-3xl mx-auto leading-relaxed mb-12`}>
              Join thousands of developers who trust SIGYL for their MCP deployments.
            </p>
            <Button 
              size="lg" 
              className={`${currentTheme.accent} text-white px-12 py-10 text-2xl font-bold transition-all duration-300 hover:scale-110 hover:shadow-2xl`}
              onClick={() => navigate('/marketplace')}
            >
              Get Started Today
              <ArrowRight className="ml-4 w-8 h-8" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer section to ensure black background */}
      <footer className={`relative py-16 px-6 ${currentTheme.bg} border-t border-gray-800`}>
        <div className="max-w-6xl mx-auto text-center">
          <p className={`${currentTheme.text} opacity-50`}>
            © 2024 SIGYL. Built for the future of AI deployment.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
