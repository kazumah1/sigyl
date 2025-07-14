import React from "react";

interface MarkerHighlightProps {
  children: React.ReactNode;
  progress: number; // 0 to 1
  className?: string;
}

// SVG marker path is a hand-drawn squiggle under the text
const MarkerHighlight: React.FC<MarkerHighlightProps> = ({ children, progress, className }) => {
  return (
    <div className={`relative inline-block w-full ${className || ''}`} style={{ maxWidth: '100%' }}>
      <span
        className="relative z-10"
        style={{
          fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif',
          fontWeight: 800,
          letterSpacing: '-0.02em',
          fontSize: 'clamp(2.5rem, 7vw, 5rem)',
          lineHeight: 1.1,
          color: 'white',
          display: 'inline-block',
        }}
      >
        {children}
      </span>
      <svg
        className="absolute left-0 bottom-0 w-full h-[0.35em] pointer-events-none select-none"
        viewBox="0 0 1000 60"
        fill="none"
        style={{
          zIndex: 1,
          width: '100%',
          height: '0.35em',
        }}
        aria-hidden="true"
      >
        <path
          d="M 10 40 Q 100 60 200 30 Q 300 0 400 30 Q 500 60 600 30 Q 700 0 800 30 Q 900 60 990 20"
          stroke="#00FFB2"
          strokeWidth="32"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          style={{
            strokeDasharray: 1000,
            strokeDashoffset: 1000 - 1000 * progress,
            transition: 'stroke-dashoffset 0.4s cubic-bezier(.4,2,.6,1)',
            filter: 'drop-shadow(0 0 16px #00FFB2AA)',
          }}
        />
      </svg>
    </div>
  );
};

export default MarkerHighlight; 