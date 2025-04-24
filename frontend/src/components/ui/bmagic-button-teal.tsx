import React from 'react';

// Define and export the Teal Button component
export const TealMagicButton = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <button
        className={`relative inline-flex h-12 overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 ${className}`}
        ref={ref}
        {...props}
      >
        {/* Updated gradient to include #69BECC, #FFFFFF, and #2D98A0 */}
        <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#69BECC_0%,#FFFFFF_33%,#2D98A0_66%,#69BECC_100%)]" />
        <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl">
          {children}
        </span>
      </button>
    );
  }
);
TealMagicButton.displayName = "TealMagicButton"; 