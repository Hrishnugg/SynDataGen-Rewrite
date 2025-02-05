'use client';

import { ReactNode, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: ReactNode;
  className?: string;
  gradient?: boolean;
  hover?: boolean;
  onClick?: () => void;
  glowColor?: string;
}

export default function Card({ 
  children, 
  className = '', 
  gradient = false,
  hover = true,
  onClick,
  glowColor = 'rgba(59, 130, 246, 0.5)' // default blue glow
}: CardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left; // x position within the element
      const y = e.clientY - rect.top;  // y position within the element
      
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    };

    card.addEventListener('mousemove', handleMouseMove);

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <motion.div
      ref={cardRef}
      whileHover={hover ? { 
        y: -8, 
        scale: 1.02,
        transition: { duration: 0.2, ease: 'easeOut' }
      } : {}}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-[2rem] bg-white dark:bg-gray-900
        ${hover ? 'cursor-pointer' : ''}
        ${gradient ? 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-900' : ''}
        shadow-lg dark:shadow-2xl
        hover:shadow-xl dark:hover:shadow-2xl
        border border-gray-100/10 dark:border-gray-800/50
        transition-all duration-200
        group
        ${className}
      `}
      style={{
        '--glow-color': glowColor,
      } as any}
    >
      {/* Gradient glow effect */}
      <div 
        className="absolute inset-[-1px] rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{
          background: `radial-gradient(
            1000px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
            var(--glow-color),
            transparent 40%
          )`,
        }}
      />
      
      {/* Border glow */}
      <div 
        className="absolute inset-[-1px] rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{
          background: `linear-gradient(to bottom right, var(--glow-color), transparent)`,
        }}
      />

      {/* Content container */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
} 