import * as React from "react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

// Extended interface for Card props
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  gradient?: boolean;
  glowColor?: string;
  hoverEffect?: boolean;
}

const Card = React.forwardRef<
  HTMLDivElement,
  CardProps
>(({ className, gradient, glowColor, hoverEffect = true, ...props }, ref) => {
  // Track mouse position for dynamic gradient effect
  const [position, setPosition] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  
  // Generate styles for gradient and glow effects
  const style: React.CSSProperties = {
    ...(props.style || {}),
    position: "relative",
    overflow: "hidden",
    transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    ...(isHovered && hoverEffect ? { 
      transform: 'translateY(-5px)',
      boxShadow: glowColor ? `0 15px 30px -5px ${glowColor}` : '0 15px 30px -5px rgba(0, 0, 0, 0.1)'
    } : {}),
  };
  
  // Handle mouse movement for gradient effect
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hoverEffect) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPosition({ x, y });
  };
  
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-3xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm",
        className
      )}
      style={style}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...props}
    >
      {/* Content container */}
      <div className="relative z-10">
        {props.children}
      </div>
      
      {/* Mouse-following gradient overlay on hover */}
      {gradient && isHovered && hoverEffect && (
        <div 
          className="absolute inset-0 pointer-events-none rounded-3xl z-0"
          style={{
            background: `radial-gradient(circle at ${position.x}% ${position.y}%, rgba(255,255,255,0.5), transparent 70%)`,
            mixBlendMode: 'overlay',
            opacity: 0.8,
          }}
        />
      )}
      
      {/* Colored glow edge effect */}
      {gradient && glowColor && (
        <div 
          className={`absolute inset-0 -z-10 rounded-3xl transition-opacity duration-300 ${isHovered ? 'opacity-40' : 'opacity-15'}`}
          style={{
            background: `linear-gradient(45deg, ${glowColor}33, ${glowColor}00, ${glowColor}22)`,
            boxShadow: isHovered ? `inset 0 0 30px 5px ${glowColor}33` : 'none',
          }}
        />
      )}
    </div>
  );
})
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-xl font-semibold text-gray-900 dark:text-white", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm text-gray-500 dark:text-gray-400", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0 text-gray-700 dark:text-gray-300", className)} {...props} />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
