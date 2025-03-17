"use client"

import * as React from "react"
import { cn } from "@/lib/utils/utils"

interface ExtendedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  gradient?: boolean;
  hoverEffect?: boolean;
  glowColor?: string;
  colorHover?: string;
}

const Card = React.forwardRef<
  HTMLDivElement,
  ExtendedCardProps
>(({ className, gradient, hoverEffect, glowColor, colorHover, style, ...domProps }, ref) => {
  // Create a mutable ref for the card element to track mouse position
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  
  // State to track mouse position
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = React.useState(false);
  
  // Handle the mouse move event to update gradient position
  const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (cardRef.current) {
      const rect = cardRef.current?.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, []);
  
  // Handle mouse enter/leave events
  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => setIsHovering(false);
  
  // Handle the custom props and create appropriate styles
  const cardStyle: React.CSSProperties = {
    ...style
  };
  
  // Add glow effect if glowColor is provided
  if (glowColor) {
    cardStyle.boxShadow = `0 0 20px ${glowColor}`;
  }
  
  // Build the class names
  const cardClasses = cn(
    "rounded-3xl border bg-card text-card-foreground shadow-sm relative overflow-hidden group",
    gradient ? "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900" : "",
    hoverEffect ? "transition-all duration-300 hover:-translate-y-1" : "",
    className
  );
  
  // Calculate the radial gradient style based on mouse position
  const gradientStyle: React.CSSProperties = {
    background: isHovering && colorHover 
      ? `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, ${colorHover.replace('from-', '').replace('to-', '').replace('/20', '/30').replace('/5', '/10')}, transparent 40%)`
      : 'transparent',
    opacity: isHovering ? 1 : 0,
    transition: 'opacity 0.3s ease'
  };
  
  return (
    <div
      ref={(node) => {
        // Handle both our local ref and the forwarded ref
        // Use a safe ref callback approach
        if (cardRef.current !== node) {
          // Set our local ref
          cardRef.current = node;
        }
        
        // Handle the forwarded ref
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      }}
      className={cardClasses}
      style={cardStyle}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...domProps}
    >
      {/* Dynamic radial gradient overlay that follows mouse position */}
      <div 
        className="absolute inset-0 pointer-events-none z-10" 
        style={gradientStyle}
      />
      <div className="relative z-20">{domProps.children}</div>
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
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-2xl font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />
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