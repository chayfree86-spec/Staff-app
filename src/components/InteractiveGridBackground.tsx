import React, { useEffect, useRef } from 'react';

export function InteractiveGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (window.innerWidth < 1024) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const mouse = { x: -1000, y: -1000 };
    const targetMouse = { x: -1000, y: -1000 };

    // Set canvas dimensions
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Track mouse coordinates
    const handleMouseMove = (e: MouseEvent) => {
      targetMouse.x = e.clientX;
      targetMouse.y = e.clientY;
    };
    const handleMouseLeave = () => {
      targetMouse.x = -1000;
      targetMouse.y = -1000;
    };
    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    const spacing = 28; // Space between dots
    const baseRadius = 1.0;
    const maxRadius = 1.8;
    const influenceRadius = 220;

    const draw = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse follow (easing)
      mouse.x += (targetMouse.x - mouse.x) * 0.12;
      mouse.y += (targetMouse.y - mouse.y) * 0.12;

      const isDark = document.documentElement.classList.contains('dark');
      
      // Determine colors based on dark mode
      // Light Mode colors
      const dotColorBase = 'rgba(233, 223, 255, 0.7)'; // --border-app light mode
      const dotColorActive = 'rgba(124, 58, 237, '; // --color-primary light mode
      
      // Dark Mode colors
      const dotColorBaseDark = 'rgba(42, 33, 66, 0.7)'; // --border-app dark mode
      const dotColorActiveDark = 'rgba(167, 139, 250, '; // purple-400 dark mode

      const cols = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const targetX = c * spacing;
          const targetY = r * spacing;

          const dx = mouse.x - targetX;
          const dy = mouse.y - targetY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          let drawX = targetX;
          let drawY = targetY;
          let radius = baseRadius;
          let opacity = 0.5;
          let activeFactor = 0;

          if (dist < influenceRadius) {
            const factor = (influenceRadius - dist) / influenceRadius;
            activeFactor = Math.sin(factor * Math.PI / 2); // organic ease-out curve

            // Magnetic pull towards mouse
            drawX = targetX + dx * activeFactor * 0.22;
            drawY = targetY + dy * activeFactor * 0.22;

            // Grow size
            radius = baseRadius + (maxRadius - baseRadius) * activeFactor;
            
            // Highlight opacity
            opacity = 0.5 + activeFactor * 0.5;
          }

          ctx.beginPath();
          ctx.arc(drawX, drawY, radius, 0, Math.PI * 2);

          if (activeFactor > 0) {
            // Glow and transition color
            const alpha = opacity;
            const r = Math.round(isDark ? (167 + (52 - 167) * activeFactor) : (124 + (16 - 124) * activeFactor));
            const g = Math.round(isDark ? (139 + (211 - 139) * activeFactor) : (58 + (185 - 58) * activeFactor));
            const b = Math.round(isDark ? (250 + (153 - 250) * activeFactor) : (237 + (129 - 237) * activeFactor));
            
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
            
            // Add extra glow shadow for active dots
            ctx.shadowBlur = activeFactor * 6;
            ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.35)`;
          } else {
            ctx.fillStyle = isDark ? dotColorBaseDark : dotColorBase;
            ctx.shadowBlur = 0;
          }

          ctx.fill();
        }
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-0" />;
}
