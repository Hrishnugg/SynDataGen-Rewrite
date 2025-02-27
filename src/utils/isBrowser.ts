/**
 * Safely determines if code is running in a browser environment
 * This is important for React Three Fiber which requires browser APIs
 */
export const isBrowser = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof window.document !== 'undefined' && 
         typeof window.document.createElement !== 'undefined';
};

/**
 * A global flag to ensure React Three Fiber only loads in browser environments
 */
if (typeof window !== 'undefined') {
  (window as any).__IS_BROWSER_ENVIRONMENT__ = true;
} else {
  // Ensure global object exists even in non-browser environments
  (global as any).__IS_BROWSER_ENVIRONMENT__ = false;
} 