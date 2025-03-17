# Particle Waves

A beautiful particle wave animation component for React applications with theming support.

## Features

- Beautiful flowing particle waves
- Theme support (light/dark modes)
- Responsive design that adapts to any container
- Interactive mouse hover effects
- Optimized performance

## Installation

```bash
# If adding to your existing project:
npm install particle-waves
# or
yarn add particle-waves
```

## Usage

### Basic Usage

Import the component and add it to your React application:

```jsx
import { ThemedParticles } from 'particle-waves';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <ThemedParticles theme="dark" />
    </div>
  );
}
```

### With Theme Toggle

```jsx
import { useState } from 'react';
import { ThemedParticles } from 'particle-waves';

function App() {
  const [theme, setTheme] = useState('dark');

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <button 
        onClick={toggleTheme}
        style={{ 
          position: 'absolute', 
          top: '20px', 
          right: '20px',
          zIndex: 100,
        }}
      >
        Switch to {theme === 'dark' ? 'Light' : 'Dark'} Mode
      </button>
      <ThemedParticles theme={theme} />
    </div>
  );
}
```

### Integration with Theme Context

If you're using a theme context in your application, you can easily integrate with it:

```jsx
import { useContext } from 'react';
import { ThemedParticles } from 'particle-waves';
import { ThemeContext } from './your-theme-context';

function BackgroundAnimation() {
  const { theme } = useContext(ThemeContext);
  
  return (
    <div className="background-container">
      <ThemedParticles theme={theme === 'dark' ? 'dark' : 'light'} />
    </div>
  );
}
```

## Props

| Prop    | Type     | Default | Description               |
|---------|----------|---------|---------------------------|
| `theme` | `string` | `'dark'`| Either 'dark' or 'light'  |

## Browser Support

Supports all modern browsers with WebGL capabilities.

## License

MIT 