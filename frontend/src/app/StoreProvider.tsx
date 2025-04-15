'use client';

import { useRef } from 'react';
import { Provider } from 'react-redux';
import { makeStore, AppStore } from '@/store'; // Using path alias defined during setup

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<AppStore | null>(null);
  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore();
    // If you have initial state loading logic (e.g., from server components or storage),
    // you might dispatch actions here upon initialization.
    // Example: storeRef.current.dispatch(initializeAuth(initialAuthState));
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
} 