
import { useEffect, useState } from "react";

interface OpeningAnimationProps {
  onComplete: () => void;
  variant?: 'home' | 'page';
}

export const OpeningAnimation = ({ onComplete, variant = 'home' }: OpeningAnimationProps) => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    // For page variant, complete immediately to remove the gradient
    if (variant === 'page') {
      onComplete();
      return;
    }

    // Only show animation on home page
    const timers = [
      setTimeout(() => setStage(1), 300),
      setTimeout(() => setStage(2), 800),
      setTimeout(() => setStage(3), 1200),
      setTimeout(() => setStage(4), 1600),
      setTimeout(() => onComplete(), 2000)
    ];

    return () => timers.forEach(clearTimeout);
  }, [onComplete, variant]);

  // Don't render anything for page variant
  if (variant === 'page') {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-1000 ${
      stage >= 4 ? 'opacity-0 pointer-events-none' : 'opacity-100 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500'
    }`}>
      <div className="text-center">
        {/* Animated geometric loading */}
        <div className="relative mb-8">
          {/* Multiple rotating elements */}
          <div className={`w-16 h-16 border-4 border-white rounded-lg transition-all duration-700 ${
            stage >= 1 ? 'rotate-45 scale-110' : 'rotate-0 scale-100'
          }`} />
          <div className={`absolute inset-2 w-12 h-12 border-4 border-white/60 rounded-lg transition-all duration-700 delay-200 ${
            stage >= 2 ? 'rotate-90 scale-125' : 'rotate-0 scale-100'
          }`} />
          <div className={`absolute inset-4 w-8 h-8 border-4 border-white/40 rounded-lg transition-all duration-700 delay-400 ${
            stage >= 3 ? 'rotate-180 scale-150' : 'rotate-0 scale-100'
          }`} />
          
          {/* Pulsing center dot */}
          <div className={`absolute inset-6 w-4 h-4 bg-white rounded-full transition-all duration-500 ${
            stage >= 2 ? 'animate-pulse scale-100' : 'scale-0'
          }`} />
        </div>

        {/* SIGYL text reveal with gradient */}
        <div className={`text-5xl font-bold tracking-wider transition-all duration-700 delay-400 ${
          stage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        } text-white`}>
          SIGYL
        </div>

        {/* Animated tagline */}
        <div className={`text-sm text-white/80 mt-2 transition-all duration-500 delay-600 ${
          stage >= 3 ? 'opacity-100' : 'opacity-0'
        }`}>
          Strategic Intelligence Systems
        </div>

        {/* Loading bar */}
        <div className={`mt-6 w-48 h-1 bg-white/20 rounded-full mx-auto overflow-hidden transition-all delay-800 ${
          stage >= 3 ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className={`h-full bg-white rounded-full transition-all duration-800 ${
            stage >= 3 ? 'w-full' : 'w-0'
          }`} />
        </div>
      </div>
    </div>
  );
};
