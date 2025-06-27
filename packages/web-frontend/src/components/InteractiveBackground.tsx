import { useRef, useEffect, useState } from "react";

interface InteractiveBackgroundProps {
  theme: string;
  onThemeChange: (theme: string) => void;
}

export const InteractiveBackground = ({ theme, onThemeChange }: InteractiveBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [graphData, setGraphData] = useState<Array<Array<{x: number, y: number}>>>([]);
  const [activeGraph, setActiveGraph] = useState(0);

  const themes = {
    vibrant: { primary: '#3d0288', secondary: '#EC4899', accent: '#10B981', bg: '#F8FAFC' },
    sunset: { primary: '#3d0288', secondary: '#EF4444', accent: '#8B5CF6', bg: '#FEF7ED' },
    ocean: { primary: '#3d0288', secondary: '#06B6D4', accent: '#3B82F6', bg: '#F0F9FF' },
    forest: { primary: '#3d0288', secondary: '#059669', accent: '#34D399', bg: '#F0FDF4' }
  };

  const currentTheme = themes[theme as keyof typeof themes] || themes.vibrant;

  // Only run this effect on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Generate multiple clean line datasets
    const generateGraphData = () => {
      const datasets = [];
      for (let i = 0; i < 3; i++) {
        const data = [];
        for (let x = 0; x < canvas.width; x += 20) {
          const y = canvas.height / 2 + 
                   Math.sin((x + i * 100) * 0.01) * 80 + 
                   Math.cos((x + i * 150) * 0.008) * 40;
          data.push({ x, y });
        }
        datasets.push(data);
      }
      return datasets;
    };
    setGraphData(generateGraphData());

    // Theme switching nodes
    const themeNodes = [
      { x: 50, y: 50, radius: 12, theme: 'vibrant' },
      { x: 120, y: 50, radius: 12, theme: 'sunset' },
      { x: 190, y: 50, radius: 12, theme: 'ocean' },
      { x: 260, y: 50, radius: 12, theme: 'forest' }
    ];

    let time = 0;
    let animationId: number;
    let isDragging = false;
    let dragOffset = 0;

    const animate = () => {
      time += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw animated line graphs
      if (graphData.length > 0) {
        graphData.forEach((dataset, index) => {
          if (index === activeGraph || Math.abs(index - activeGraph) <= 1) {
            const opacity = index === activeGraph ? 1 : 0.3;
            const colors = [currentTheme.primary, currentTheme.secondary, currentTheme.accent];
            
            ctx.beginPath();
            ctx.strokeStyle = colors[index % colors.length] + Math.floor(opacity * 255).toString(16).padStart(2, '0');
            ctx.lineWidth = index === activeGraph ? 3 : 2;
            
            dataset.forEach((point, i) => {
              const animatedY = point.y + Math.sin(time + i * 0.1) * 10;
              const x = point.x + dragOffset;
              
              if (i === 0) {
                ctx.moveTo(x, animatedY);
              } else {
                ctx.lineTo(x, animatedY);
              }
            });
            ctx.stroke();

            // Add flowing particles along the active line
            if (index === activeGraph) {
              for (let i = 0; i < 5; i++) {
                const progress = (time * 50 + i * 100) % canvas.width;
                const dataIndex = Math.floor(progress / 20);
                if (dataIndex < dataset.length) {
                  const point = dataset[dataIndex];
                  const y = point.y + Math.sin(time + dataIndex * 0.1) * 10;
                  
                  ctx.beginPath();
                  ctx.arc(progress + dragOffset, y, 4, 0, Math.PI * 2);
                  ctx.fillStyle = currentTheme.primary;
                  ctx.fill();
                }
              }
            }
          }
        });
      }

      // Draw theme switching nodes
      themeNodes.forEach((node, index) => {
        const themeColor = themes[node.theme as keyof typeof themes];
        const isActive = theme === node.theme;
        const radius = isActive ? node.radius + 2 : node.radius;
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = themeColor.primary;
        ctx.fill();

        // Pulsing effect for active theme
        if (isActive) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius + Math.sin(time * 3) * 3, 0, Math.PI * 2);
          ctx.strokeStyle = themeColor.primary + '40';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      animationId = requestAnimationFrame(animate);
    };
    animate();

    // Handle interactions
    const handleClick = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const clickY = event.clientY - rect.top;

      // Check theme node clicks
      themeNodes.forEach(node => {
        const distance = Math.sqrt(Math.pow(clickX - node.x, 2) + Math.pow(clickY - node.y, 2));
        if (distance <= node.radius + 5) {
          onThemeChange(node.theme);
        }
      });

      // Check graph clicks to switch active graph
      if (clickY > canvas.height / 4 && clickY < (canvas.height * 3) / 4) {
        setActiveGraph((prev) => (prev + 1) % 3);
      }
    };

    const handleMouseDown = (event: MouseEvent) => {
      isDragging = true;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging) {
        dragOffset += event.movementX * 0.5;
        dragOffset = Math.max(-200, Math.min(200, dragOffset));
      }
    };

    const handleMouseUp = () => {
      isDragging = false;
    };

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-auto cursor-pointer"
      style={{ 
        zIndex: -1,
        opacity: 0.8
      }}
    />
  );
};
