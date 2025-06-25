import React, { useRef, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface GraphLine {
  id: number;
  type: 'lissajous' | 'spiral' | 'wave' | 'parametric';
  phase: number;
  speed: number;
  amplitude: number;
  frequency: number;
  opacity: number;
  thickness: number;
}

// Helper function to convert hex to RGB
const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `${r}, ${g}, ${b}`;
  }
  return '99, 102, 241'; // fallback to indigo
};

const MathyGraphs: React.FC = () => {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const radarAngle = useRef(0);
  const mcpPoints = useRef<MCPPoint[]>([]);
  const lines = useRef<GraphLine[]>([]);
  
  // Theme-aware colors
  const getThemeColors = useCallback(() => {
    const colors = {
      dark: {
        primary: '#6366F1',    // Bright indigo
        secondary: '#EC4899',  // Bright pink
        accent: '#10B981',     // Bright emerald
        tertiary: '#F59E0B',   // Bright amber
        background: '#000000', // Pure black
        overlay: 'rgba(0, 0, 0, 0.3)'
      },
      light: {
        primary: '#4F46E5',    // Darker indigo for light mode
        secondary: '#DC2626',  // Darker red for light mode
        accent: '#059669',     // Darker emerald for light mode
        tertiary: '#D97706',   // Darker amber for light mode
        background: '#FFFFFF', // Pure white
        overlay: 'rgba(255, 255, 255, 0.3)'
      }
    };
    return colors[theme as keyof typeof colors] || colors.dark;
  }, [theme]);

  // Initialize lines with more vibrant parameters
  useEffect(() => {
    const colors = getThemeColors();
    lines.current = [
      // Lissajous curves - more prominent
      { id: 1, type: 'lissajous', phase: 0, speed: 0.002, amplitude: 150, frequency: 2, opacity: 0.8, thickness: 3 },
      { id: 2, type: 'lissajous', phase: Math.PI / 2, speed: 0.0015, amplitude: 120, frequency: 3, opacity: 0.7, thickness: 2 },
      { id: 3, type: 'lissajous', phase: Math.PI, speed: 0.003, amplitude: 180, frequency: 1.5, opacity: 0.9, thickness: 4 },
      
      // Waves - more prominent
      { id: 4, type: 'wave', phase: 0, speed: 0.002, amplitude: 100, frequency: 2, opacity: 0.8, thickness: 3 },
      { id: 5, type: 'wave', phase: Math.PI / 4, speed: 0.0015, amplitude: 80, frequency: 3, opacity: 0.7, thickness: 2 },
      { id: 6, type: 'wave', phase: Math.PI / 2, speed: 0.003, amplitude: 120, frequency: 1.5, opacity: 0.9, thickness: 4 },
      
      // Parametric curves - more vibrant
      { id: 7, type: 'parametric', phase: 0, speed: 0.002, amplitude: 140, frequency: 2, opacity: 0.8, thickness: 3 },
      { id: 8, type: 'parametric', phase: Math.PI / 6, speed: 0.0015, amplitude: 110, frequency: 2.5, opacity: 0.7, thickness: 2 },
      { id: 9, type: 'parametric', phase: Math.PI / 3, speed: 0.0025, amplitude: 170, frequency: 1.8, opacity: 0.9, thickness: 4 },
      { id: 10, type: 'parametric', phase: Math.PI / 2, speed: 0.0018, amplitude: 130, frequency: 2.2, opacity: 0.8, thickness: 3 }
    ];
  }, [getThemeColors]);

  // Drawing functions for different curve types
  const drawLissajous = (ctx: CanvasRenderingContext2D, line: GraphLine, width: number, height: number, time: number) => {
    const colors = getThemeColors();
    const colorArray = [colors.primary, colors.secondary, colors.accent, colors.tertiary];
    const color = colorArray[line.id % colorArray.length];
    
    ctx.strokeStyle = `rgba(${hexToRgb(color)}, ${line.opacity})`;
    ctx.lineWidth = line.thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    const steps = 200;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2 + time * line.speed + line.phase;
      const x = width / 2 + Math.sin(t * line.frequency) * line.amplitude;
      const y = height / 2 + Math.sin(t * line.frequency * 1.5) * line.amplitude * 0.8;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  };

  const drawWave = (ctx: CanvasRenderingContext2D, line: GraphLine, width: number, height: number, time: number) => {
    const colors = getThemeColors();
    const colorArray = [colors.primary, colors.secondary, colors.accent, colors.tertiary];
    const color = colorArray[line.id % colorArray.length];
    
    ctx.strokeStyle = `rgba(${hexToRgb(color)}, ${line.opacity})`;
    ctx.lineWidth = line.thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    const steps = 300;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * width;
      const t = (i / steps) * Math.PI * 4 + time * line.speed + line.phase;
      const y = height / 2 + Math.sin(t * line.frequency) * line.amplitude;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  };

  const drawParametric = (ctx: CanvasRenderingContext2D, line: GraphLine, width: number, height: number, time: number) => {
    const colors = getThemeColors();
    const colorArray = [colors.primary, colors.secondary, colors.accent, colors.tertiary];
    const color = colorArray[line.id % colorArray.length];
    
    ctx.strokeStyle = `rgba(${hexToRgb(color)}, ${line.opacity})`;
    ctx.lineWidth = line.thickness;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    const steps = 200;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2 + time * line.speed + line.phase;
      const radius = line.amplitude * (1 + Math.sin(t * 2) * 0.3);
      const x = width / 2 + Math.cos(t * line.frequency) * radius;
      const y = height / 2 + Math.sin(t * line.frequency * 2) * radius * 0.7;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  };

  // Main animation loop
  const animate = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    
    // Clear canvas completely transparent - no black background
    ctx.clearRect(0, 0, width, height);
    
    // Draw each line
    lines.current.forEach(line => {
      switch (line.type) {
        case 'lissajous':
          drawLissajous(ctx, line, width, height, time);
          break;
        case 'wave':
          drawWave(ctx, line, width, height, time);
          break;
        case 'parametric':
          drawParametric(ctx, line, width, height, time);
          break;
      }
    });
    
    animationRef.current = requestAnimationFrame(animate);
  }, [drawLissajous, drawWave, drawParametric]);

  // Handle resize
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  }, []);

  // Setup and cleanup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Set canvas size
    handleResize();
    
    // Start animation
    animationRef.current = requestAnimationFrame(animate);
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [animate, handleResize]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
      style={{
        background: 'transparent'
      }}
    />
  );
};

export default MathyGraphs; 