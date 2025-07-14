import React, { useEffect, useState } from 'react';

interface HeroSectionProps {
  title: string;
  subtitle: string;
  buttons: React.ReactNode;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ title, subtitle, buttons }) => {
  const [showContent, setShowContent] = useState(false);

  // Fade in content after 1 second
  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Fullscreen image with centered content */}
      <section className="relative w-full h-screen min-h-[600px] flex items-center justify-center overflow-hidden select-none">
        <img
          src="/SIGYL_BACKDROP.png"
          alt="SIGYL Backdrop"
          className="absolute inset-0 w-full h-full object-cover object-center z-0"
          style={{ filter: 'none' }}
          draggable={false}
        />
        {/* Even softer, longer fade at the very bottom of the image */}
        <div
          className="absolute bottom-0 left-0 w-full h-64 z-10 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0) 88%, rgba(10,10,20,0.7) 95%, #000 100%)',
            backdropFilter: 'blur(0.5px)',
            WebkitBackdropFilter: 'blur(0.5px)',
          }}
        />
        <div className={`relative z-30 flex flex-col items-center justify-center text-center px-4 w-full transition-opacity duration-1000 ${showContent ? 'opacity-100' : 'opacity-0'}`}>
          <h1 className="hero-heading text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-white drop-shadow-xl mb-6" style={{letterSpacing:'-0.03em', textShadow:'0 4px 32px #0008'}}>
            {title}
          </h1>
          <p className="hero-subheading text-center whitespace-nowrap mb-8 mx-auto drop-shadow-lg" style={{
            textShadow: '0 2px 16px #0006',
            fontSize: 'clamp(1rem, 3vw, 1.6rem)',
            maxWidth: '100vw',
            color: 'rgba(255,255,255,0.9)'
          }}>
            {subtitle}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
            {buttons}
          </div>
        </div>
        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 animate-bounce text-white/80 opacity-80 pointer-events-none">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
        </div>
      </section>
    </>
  );
}; 