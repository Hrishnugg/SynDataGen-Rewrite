'use client';

/**
 * Safe Decagon Model
 * 
 * A placeholder component for the 3D decagon model while we update Three.js compatibility
 */

type Props = {
  className?: string;
  style?: React.CSSProperties;
  rotationSpeed?: number;
  color?: string;
};

const SafeDecagonModel = ({ className, style, color = '#6366f1' }: Props) => {
  return (
    <div 
      className={`w-full h-full flex items-center justify-center ${className || ''}`}
      style={style}
    >
      {/* Simple SVG placeholder for the 3D decagon */}
      <svg 
        width="200" 
        height="200" 
        viewBox="0 0 200 200" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="animate-spin-slow"
        style={{ animationDuration: '10s' }}
      >
        <polygon 
          points="100,10 129.4,19.1 153.2,40.8 165.5,70.1 165.5,103.3 153.2,132.6 129.4,154.3 100,163.4 70.6,154.3 46.8,132.6 34.5,103.3 34.5,70.1 46.8,40.8 70.6,19.1" 
          fill="transparent" 
          stroke={color} 
          strokeWidth="2" 
        />
        <circle cx="100" cy="100" r="40" fill={color} fillOpacity="0.2" />
      </svg>
    </div>
  );
};

export default SafeDecagonModel;