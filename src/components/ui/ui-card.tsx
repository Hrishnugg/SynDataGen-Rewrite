"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ExtendedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  gradient?: boolean;
  hoverEffect?: boolean;
  glowColor?: string;
}

const Card = React.forwardRef<
  HTMLDivElement,
  ExtendedCardProps
>(({ className, gradient, hoverEffect, glowColor, style, ...props }, ref) => {
  // Handle the custom props and create appropriate styles
  const cardStyle: React.CSSProperties = {
    ...style
  };
  
  // Add glow effect if glowColor is provided
  if (glowColor) {
    cardStyle.boxShadow = `0 0 15px ${glowColor}`;
  }
  
  // Build the class names
  const cardClasses = cn(
    "rounded-lg border bg-card text-card-foreground shadow-sm",
    gradient ? "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900" : "",
    hoverEffect ? "transition-all duration-300 hover:-translate-y-1" : "",
    className
  );
  
  return (
    <div
      ref={ref}
      className={cardClasses}
      style={cardStyle}
      {...props}
    />
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