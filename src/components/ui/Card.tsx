'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: ReactNode;
  className?: string;
  gradient?: boolean;
  hover?: boolean;
  onClick?: () => void;
}

export default function Card({ 
  children, 
  className = '', 
  gradient = false,
  hover = true,
  onClick 
}: CardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -8, scale: 1.01 } : {}}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-card bg-white dark:bg-gray-900
        ${hover ? 'cursor-pointer' : ''}
        ${gradient ? 'bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900' : ''}
        shadow-card dark:shadow-card-dark
        hover:shadow-card-hover dark:hover:shadow-card-hover-dark
        border border-gray-100 dark:border-gray-800
        transition-all duration-300
        ${className}
      `}
    >
      {children}
    </motion.div>
  );
} 