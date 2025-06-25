
import { useState, useEffect, useRef } from "react";

interface Chess3DProps {
  scrollY: number;
}

export const Chess3D = ({ scrollY }: Chess3DProps) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        const mouseX = (e.clientX - centerX) / 10;
        const mouseY = (e.clientY - centerY) / 10;
        
        if (isDragging) {
          setRotation(prev => ({
            x: prev.x + mouseY * 0.5,
            y: prev.y + mouseX * 0.5
          }));
        } else {
          setMousePosition({ x: mouseX, y: mouseY });
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const baseRotationX = isDragging ? rotation.x : mousePosition.y + scrollY * 0.1;
  const baseRotationY = isDragging ? rotation.y : mousePosition.x + scrollY * 0.05;
  const scale = isHovered ? 1.1 : 1;

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-96 flex items-center justify-center"
      style={{ perspective: '1000px' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={handleMouseDown}
    >
      {/* Enhanced Glow Effect */}
      <div 
        className="absolute inset-0 rounded-full blur-3xl transition-all duration-500"
        style={{ 
          background: isHovered 
            ? 'radial-gradient(circle, rgba(0,0,0,0.1) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(0,0,0,0.05) 0%, transparent 70%)',
          opacity: isHovered ? 0.8 : 0.4
        }}
      />
      
      {/* Chess Knight with Enhanced 3D */}
      <div
        className="relative transition-all duration-300 ease-out cursor-pointer select-none"
        style={{
          transform: `
            rotateX(${baseRotationX}deg) 
            rotateY(${baseRotationY}deg) 
            scale(${scale})
            translateZ(${scrollY * 0.1}px)
          `,
          transformStyle: 'preserve-3d'
        }}
      >
        {/* Knight SVG with 3D layering */}
        <svg
          width="320"
          height="320"
          viewBox="0 0 320 320"
          className="drop-shadow-2xl"
        >
          <defs>
            <linearGradient id="knightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a1a1a" />
              <stop offset="30%" stopColor="#000000" />
              <stop offset="70%" stopColor="#2a2a2a" />
              <stop offset="100%" stopColor="#000000" />
            </linearGradient>
            <filter id="innerShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4"/>
              <feOffset dx="3" dy="3" result="offset"/>
              <feComposite in="SourceGraphic" in2="offset" operator="over"/>
            </filter>
            <filter id="outerGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge> 
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Enhanced Knight Silhouette */}
          <path
            d="M80 260 L80 230 Q80 210 90 200 L100 190 Q110 180 125 175 L145 170 Q165 165 180 170 L200 175 Q220 180 235 195 L250 210 Q265 225 268 240 L270 255 Q270 270 260 280 L245 285 Q225 290 205 285 L185 280 Q165 275 150 270 L135 265 Q120 260 105 255 L90 250 Q80 240 80 260 Z"
            fill="url(#knightGradient)"
            filter="url(#innerShadow)"
            className="transition-all duration-300"
          />
          
          {/* Knight Mane Detail */}
          <path
            d="M140 200 Q160 195 180 200 Q200 205 210 220 Q205 215 185 215 Q165 215 150 220 Q145 215 140 200"
            fill="#333333"
            opacity="0.8"
          />
          
          {/* Knight Eye */}
          <circle cx="170" cy="210" r="4" fill="#ffffff" opacity="0.9" />
          <circle cx="171" cy="209" r="2" fill="#000000" />
          
          {/* Knight Nostril */}
          <ellipse cx="200" cy="225" rx="2" ry="3" fill="#000000" opacity="0.6" />
          
          {/* Base Shadow */}
          <ellipse cx="160" cy="285" rx="60" ry="8" fill="#000000" opacity="0.2" />
        </svg>

        {/* Floating Strategic Particles */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-black/30 rounded-full"
              style={{
                left: `${25 + i * 12}%`,
                top: `${35 + (i % 4) * 15}%`,
                animation: `pulse ${2 + i * 0.3}s infinite`,
                animationDelay: `${i * 0.2}s`,
                transform: `translateZ(${(i % 3) * 10}px)`
              }}
            />
          ))}
        </div>
      </div>

      {/* Interactive Instruction */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">
          {isDragging ? 'Rotating • Strategic' : 'Click & Drag • Interactive • Strategic'}
        </p>
      </div>
    </div>
  );
};
