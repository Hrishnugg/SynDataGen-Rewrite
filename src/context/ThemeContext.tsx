"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

// Create a default theme context
const defaultThemeContext: ThemeContextType = {
  theme: "light",
  toggleTheme: () => {},
  setTheme: () => {},
};

const ThemeContext = createContext<ThemeContextType>(defaultThemeContext);

// Safely check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Apply theme to document
  const applyTheme = (newTheme: Theme) => {
    if (!isBrowser) return;
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    try {
      localStorage.setItem("theme", newTheme);
    } catch (e) {
      console.error("Failed to set theme in localStorage:", e);
    }
  };

  // Set theme with side effects
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  };

  // Toggle between light and dark
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
  };

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true);
    
    // Get initial theme from localStorage or system preference
    const initializeTheme = () => {
      if (!isBrowser) return;
      
      let prefersDark = false;
      let storedTheme: Theme | null = null;
      
      // Safely access localStorage
      try {
        storedTheme = localStorage.getItem("theme") as Theme | null;
      } catch (e) {
        console.error("Failed to access localStorage:", e);
      }
      
      // Safely check system preference
      try {
        prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      } catch (e) {
        console.error("Failed to check color scheme preference:", e);
      }
      
      if (storedTheme === 'dark' || (storedTheme === null && prefersDark)) {
        setTheme('dark');
      } else {
        setTheme('light');
      }
    };
    
    initializeTheme();
    
    // Listen for system preference changes
    if (isBrowser) {
      let mediaQuery: MediaQueryList | null = null;
      
      try {
        mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      } catch (e) {
        console.error("Failed to create media query:", e);
      }
      
      if (mediaQuery) {
        const handleChange = (e: MediaQueryListEvent) => {
          let userTheme: Theme | null = null;
          
          try {
            userTheme = localStorage.getItem("theme") as Theme | null;
          } catch (e) {
            console.error("Failed to get theme from localStorage:", e);
          }
          
          if (!userTheme) {
            setTheme(e.matches ? 'dark' : 'light');
          }
        };
        
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      }
    }
  }, []);

  // Provide a value object that doesn't change on every render
  const providerValue = {
    theme, 
    toggleTheme, 
    setTheme
  };

  // Prevent hydration mismatch by only rendering children when mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={providerValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
