import { useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface AgentHighwayProps {
  searchBarRef?: React.RefObject<HTMLDivElement>;
}

interface Bead {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  path: { x: number; y: number }[];
  pathIndex: number;
  speed: number;
}

interface FlowLine {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  beads: Bead[];
  opacity: number;
  width: number;
}

export const AgentHighway = ({ searchBarRef }: AgentHighwayProps) => {
  const { theme } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const flowLinesRef = useRef<FlowLine[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create flow lines emanating from search bars
    const createFlowLines = () => {
      flowLinesRef.current = [];
      const lineCount = 8;
      
      for (let i = 0; i < lineCount; i++) {
        const angle = (i / lineCount) * Math.PI * 2;
        const startX = canvas.width / 2;
        const startY = canvas.height / 2;
        const endX = startX + Math.cos(angle) * canvas.width * 0.8;
        const endY = startY + Math.sin(angle) * canvas.height * 0.8;
        
        const beads: Bead[] = [];
        const beadCount = 15;
        
        for (let j = 0; j < beadCount; j++) {
          const progress = j / beadCount;
          const x = startX + (endX - startX) * progress;
          const y = startY + (endY - startY) * progress;
          
          beads.push({
            x,
            y,
            vx: (endX - startX) * 0.002,
            vy: (endY - startY) * 0.002,
            size: Math.random() * 3 + 2,
            opacity: Math.random() * 0.8 + 0.2,
            color: theme === 'dark' ? '#6366F1' : '#4F46E5',
            path: [{ x: startX, y: startY }, { x: endX, y: endY }],
            pathIndex: 0,
            speed: Math.random() * 0.001 + 0.0005
          });
        }
        
        flowLinesRef.current.push({
          startX,
          startY,
          endX,
          endY,
          beads,
          opacity: Math.random() * 0.6 + 0.2,
          width: Math.random() * 2 + 1
        });
      }
    };

    createFlowLines();

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw flow lines and beads
      flowLinesRef.current.forEach((line) => {
        // Draw the flow line
        ctx.beginPath();
        ctx.moveTo(line.startX, line.startY);
        ctx.lineTo(line.endX, line.endY);
        ctx.strokeStyle = `${line.color || (theme === 'dark' ? '#6366F1' : '#4F46E5')}${Math.floor(line.opacity * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = line.width;
        ctx.stroke();
        
        // Update and draw beads
        line.beads.forEach((bead) => {
          // Move bead along the path
          bead.pathIndex += bead.speed;
          if (bead.pathIndex >= 1) {
            bead.pathIndex = 0;
            // Reset bead to start
            bead.x = line.startX;
            bead.y = line.startY;
          } else {
            bead.x = line.startX + (line.endX - line.startX) * bead.pathIndex;
            bead.y = line.startY + (line.endY - line.startY) * bead.pathIndex;
          }
          
          // Draw bead with glow effect
          ctx.beginPath();
          ctx.arc(bead.x, bead.y, bead.size + 2, 0, Math.PI * 2);
          ctx.fillStyle = `${bead.color}20`;
          ctx.fill();
          
          ctx.beginPath();
          ctx.arc(bead.x, bead.y, bead.size, 0, Math.PI * 2);
          ctx.fillStyle = `${bead.color}${Math.floor(bead.opacity * 255).toString(16).padStart(2, '0')}`;
          ctx.fill();
        });
      });
      
      // Draw connecting network lines
      flowLinesRef.current.forEach((line1, i) => {
        flowLinesRef.current.forEach((line2, j) => {
          if (i !== j) {
            const distance = Math.sqrt(
              Math.pow(line1.endX - line2.endX, 2) + Math.pow(line1.endY - line2.endY, 2)
            );
            
            if (distance < 200) {
              ctx.beginPath();
              ctx.moveTo(line1.endX, line1.endY);
              ctx.lineTo(line2.endX, line2.endY);
              ctx.strokeStyle = `${theme === 'dark' ? '#6366F1' : '#4F46E5'}${Math.floor((1 - distance / 200) * 0.2 * 255).toString(16).padStart(2, '0')}`;
              ctx.lineWidth = 1;
              ctx.stroke();
            }
          }
        });
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: 'transparent' }}
    />
  );
};

export default AgentHighway; 