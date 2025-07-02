import React, { useEffect, useRef } from 'react';

interface HeroSectionProps {
  title: string;
  subtitle: string;
  buttons: React.ReactNode;
}

const STAR_COUNT = 180;

function randomBetween(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export const HeroSection: React.FC<HeroSectionProps> = ({ title, subtitle, buttons }) => {
  const starsRef = useRef<HTMLCanvasElement>(null);

  // Draw and animate stars (bright, sharp, always visible in black area)
  useEffect(() => {
    const canvas = starsRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationId: number;
    let stars: {x: number, y: number, r: number, tw: number, sparkle: number}[] = [];
    const resize = () => {
      canvas.width = window.innerWidth;
      // Make the star field fill the entire black area up to the next section (no extra black gap)
      canvas.height = Math.round(window.innerHeight * 0.5); // 50vh, but will fill parent div
      stars = Array.from({length: STAR_COUNT}, () => ({
        x: randomBetween(0, canvas.width),
        y: randomBetween(0, canvas.height),
        r: randomBetween(0.7, 1.5),
        tw: randomBetween(0, Math.PI * 2),
        sparkle: Math.random()
      }));
    };
    resize();
    window.addEventListener('resize', resize);
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // Draw stars (no fade, always visible in black area)
      stars.forEach(star => {
        // Twinkle and sparkle
        star.tw += 0.018 + Math.random() * 0.012;
        star.sparkle += (Math.random() - 0.5) * 0.08;
        star.sparkle = Math.max(0, Math.min(1, star.sparkle));
        // Brighter, sparkly, and some stars pulse
        const baseAlpha = 0.95 + 0.05 * Math.sin(star.tw + star.sparkle * 2 * Math.PI);
        const sparkleAlpha = baseAlpha + 0.18 * Math.abs(Math.sin(star.tw * 2 + star.sparkle * 6));
        const alpha = Math.min(1, sparkleAlpha);
        ctx.save();
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.r * (1 + 0.18 * Math.sin(star.tw * 2)), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 2 + 4 * star.sparkle; // sharp
        ctx.fill();
        // Occasional sparkle effect
        if (star.sparkle > 0.85 && Math.random() > 0.7) {
          ctx.globalAlpha = 0.5 * star.sparkle;
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.r * 2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.shadowBlur = 8;
          ctx.fill();
        }
        ctx.restore();
      });
      animationId = requestAnimationFrame(animate);
    };
    animate();
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
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
        <div className="relative z-30 flex flex-col items-center justify-center text-center px-4 w-full">
          <h1 className="hero-heading text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold tracking-tight text-white drop-shadow-xl mb-6" style={{letterSpacing:'-0.03em', textShadow:'0 4px 32px #0008'}}>
            {title}
          </h1>
          <p className="hero-subheading text-lg sm:text-xl text-white/90 mb-8 max-w-2xl mx-auto drop-shadow-lg" style={{textShadow:'0 2px 16px #0006'}}>
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
      {/* Star field below the image, fills black area, no extra black space */}
      <div style={{ position: 'relative', width: '100%', height: '50vh', background: '#000', marginTop: '-2px', overflow: 'hidden' }}>
        <canvas
          ref={starsRef}
          className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none"
          style={{ transition: 'opacity 0.3s', display: 'block' }}
        />
      </div>
    </>
  );
}; 