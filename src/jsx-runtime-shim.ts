/**
 * JSX Runtime Shim
 * 
 * This file provides compatibility shims for JSX transformation.
 * It ensures that the JSX runtime functions are available when needed
 * for TypeScript's JSX transformation.
 */

import * as React from 'react';

// Re-export default React
export default React;

// Re-export JSX runtime functions used by the 'react-jsx' transform
export const jsx = React.createElement;
export const jsxs = React.createElement;
export const Fragment = React.Fragment;

// Export other commonly used React APIs
export const useState = React.useState;
export const useEffect = React.useEffect;
export const useContext = React.useContext;
export const useRef = React.useRef;
export const useMemo = React.useMemo;
export const useCallback = React.useCallback; 