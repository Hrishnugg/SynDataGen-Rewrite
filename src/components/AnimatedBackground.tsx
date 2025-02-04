'use client';

import { useEffect, useRef } from 'react';

const AnimatedBackground = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let mouseX = 0;
    let mouseY = 0;
    let rafId: number;

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { width, height } = container.getBoundingClientRect();
      
      // Calculate mouse position relative to container center
      mouseX = (clientX - width / 2) * 0.1;
      mouseY = (clientY - height / 2) * 0.1;
    };

    const animate = () => {
      const shapes = container.querySelectorAll('.animated-shape');
      
      shapes.forEach((shape, index) => {
        const speed = 1 - index * 0.2; // Different speeds for each shape
        const x = mouseX * speed;
        const y = mouseY * speed;
        
        (shape as HTMLElement).style.transform = `translate(${x}px, ${y}px)`;
      });

      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener('mousemove', handleMouseMove);
    rafId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Gradient Orb */}
      <div className="animated-shape absolute top-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl" />
      
      {/* Cylinder */}
      <div className="animated-shape absolute -top-20 right-1/3 w-40 h-80 bg-gradient-to-b from-purple-400/10 to-blue-400/10 rounded-full transform rotate-45 blur-2xl" />
      
      {/* Zigzag */}
      <div className="animated-shape absolute bottom-1/4 left-1/4">
        <svg width="200" height="200" viewBox="0 0 200 200" className="opacity-20">
          <path
            d="M10 10 L40 40 L10 70 L40 100 L10 130 L40 160 L10 190"
            stroke="url(#gradient)"
            strokeWidth="4"
            fill="none"
          />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#60A5FA" />
              <stop offset="100%" stopColor="#818CF8" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Dots Grid */}
      <div className="animated-shape absolute top-1/3 left-1/3 grid grid-cols-3 gap-4 opacity-20">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-400 to-indigo-400"
          />
        ))}
      </div>

      {/* Circle Ring */}
      <div className="animated-shape absolute bottom-1/4 right-1/4 w-32 h-32 rounded-full border-4 border-blue-400/20 transform rotate-45" />
    </div>
  );
};

export default AnimatedBackground; 