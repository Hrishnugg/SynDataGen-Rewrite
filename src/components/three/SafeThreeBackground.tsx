'use client';

/**
 * Safe Three Background
 * 
 * A placeholder component for the 3D background while we update Three.js compatibility
 */

type Props = {
  className?: string;
  style?: React.CSSProperties;
};

const SafeThreeBackground = ({ className, style }: Props) => {
  return (
    <div 
      className={`w-full h-full ${className || ''}`}
      style={{ 
        ...style,
        background: 'radial-gradient(circle at 50% 50%, #2a3a4a 0%, #0a0a1a 100%)',
      }}
    />
  );
};

export default SafeThreeBackground;