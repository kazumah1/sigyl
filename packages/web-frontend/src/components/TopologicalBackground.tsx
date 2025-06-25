import { useEffect, useRef } from "react";

export const TopologicalBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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

    // Elegant mathematical nodes
    const nodes: Array<{
      x: number, 
      y: number, 
      vx: number, 
      vy: number, 
      radius: number,
      opacity: number,
      phase: number
    }> = [];
    
    const numNodes = 30; // Reduced for cleaner look

    // Initialize nodes with mathematical positioning
    for (let i = 0; i < numNodes; i++) {
      const angle = (i / numNodes) * Math.PI * 2;
      const radius = Math.random() * 200 + 100;
      
      nodes.push({
        x: canvas.width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 400,
        y: canvas.height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 400,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.3 + 0.1,
        phase: Math.random() * Math.PI * 2
      });
    }

    let time = 0;

    const animate = () => {
      time += 0.01;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Update and draw nodes
      nodes.forEach((node, index) => {
        // Gentle wave motion
        node.x += node.vx + Math.sin(time + node.phase) * 0.1;
        node.y += node.vy + Math.cos(time + node.phase) * 0.1;

        // Soft boundary reflection
        if (node.x < 0 || node.x > canvas.width) node.vx *= -0.8;
        if (node.y < 0 || node.y > canvas.height) node.vy *= -0.8;

        // Keep nodes generally in bounds
        node.x = Math.max(0, Math.min(canvas.width, node.x));
        node.y = Math.max(0, Math.min(canvas.height, node.y));

        // Pulsing opacity
        const pulseOpacity = node.opacity + Math.sin(time * 2 + index) * 0.1;

        // Draw node with subtle glow
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${pulseOpacity})`;
        ctx.fill();

        // Add subtle glow effect
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${pulseOpacity * 0.1})`;
        ctx.fill();
      });

      // Draw elegant connections
      nodes.forEach((nodeA, i) => {
        nodes.slice(i + 1).forEach(nodeB => {
          const dx = nodeA.x - nodeB.x;
          const dy = nodeA.y - nodeB.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 150) {
            const opacity = (1 - distance / 150) * 0.15;
            
            // Create gradient line
            const gradient = ctx.createLinearGradient(nodeA.x, nodeA.y, nodeB.x, nodeB.y);
            gradient.addColorStop(0, `rgba(0, 0, 0, ${opacity})`);
            gradient.addColorStop(0.5, `rgba(0, 0, 0, ${opacity * 0.5})`);
            gradient.addColorStop(1, `rgba(0, 0, 0, ${opacity})`);

            ctx.beginPath();
            ctx.moveTo(nodeA.x, nodeA.y);
            ctx.lineTo(nodeB.x, nodeB.y);
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ 
        zIndex: -1,
        opacity: 0.4,
        background: 'transparent'
      }}
    />
  );
};
