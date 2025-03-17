# Integration Guide

This guide explains how to integrate the ThemedParticles component into your existing React website.

## Prerequisites

Make sure you have the following dependencies installed:

```bash
npm install three
# or
yarn add three
```

## Basic Integration

1. **Copy the components directory** to your project:
   - `components/themed-particles.js`
   - `components/index.js`

2. **Import the component** in your desired page or layout:

```jsx
import { ThemedParticles } from './components';
```

3. **Add the component** to your layout:

```jsx
<div style={{ 
  position: 'absolute', 
  top: 0, 
  left: 0, 
  width: '100%', 
  height: '100%', 
  zIndex: -1 
}}>
  <ThemedParticles theme="dark" />
</div>
```

## Integration with Theme Systems

### With Theme Context

```jsx
import React, { useContext } from 'react';
import { ThemedParticles } from './components';
import { ThemeContext } from './your-theme-system';

function Background() {
  const { theme } = useContext(ThemeContext);
  
  return (
    <div className="background-container">
      <ThemedParticles theme={theme === 'dark' ? 'dark' : 'light'} />
    </div>
  );
}
```

### With Styled Components / Theme Provider

```jsx
import React from 'react';
import { ThemedParticles } from './components';
import { useTheme } from 'styled-components';

function Background() {
  const theme = useTheme();
  
  return (
    <div className="background-container">
      <ThemedParticles theme={theme.mode} />
    </div>
  );
}
```

### With Next.js

For Next.js, you'll need to use dynamic importing with SSR disabled:

```jsx
import dynamic from 'next/dynamic';

// Dynamically import the component to avoid SSR issues
const ThemedParticles = dynamic(
  () => import('./components').then(mod => mod.ThemedParticles),
  { ssr: false }
);

export default function Layout({ children }) {
  return (
    <div className="layout">
      <div className="background">
        <ThemedParticles theme="dark" />
      </div>
      <main>{children}</main>
    </div>
  );
}
```

## Performance Considerations

- The component is relatively performance-intensive. Consider:
  - Only rendering it on the homepage or specific pages
  - Using a reduced version for mobile devices
  - Adding a simple loading state while it initializes

## Browser Compatibility

The component requires WebGL support, which is available in all modern browsers but may have issues in:
- Older browsers
- Some mobile browsers with WebGL limitations
- Browsers with hardware acceleration disabled

## Troubleshooting

If you encounter the "box artifact" in light mode, make sure:
- You're using the latest version of the component
- Three.js is properly installed
- You're not applying any conflicting CSS that might affect the rendering

For other issues, check the browser console for errors related to WebGL or Three.js. 