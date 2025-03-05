import React from 'react';

/**
 * Type for Next.js 15 Promise-based params
 */
export type PromiseParams<T extends Record<string, any>> = Promise<T>;

/**
 * Type for regular params used in client components
 */
export type RegularParams<T extends Record<string, any>> = T;

/**
 * Type for props with promise-based params
 */
export interface ServerPageProps<T extends Record<string, any>> {
  params: PromiseParams<T>;
}

/**
 * Type for props with regular params
 */
export interface ClientPageProps<T extends Record<string, any>> {
  params: RegularParams<T>;
}

/**
 * Server component that resolves Promise-based params and renders client components
 * This component serves as a bridge between server and client components
 */
export async function withResolvedParams<T extends Record<string, any>>(
  Component: React.ComponentType<ClientPageProps<T>>,
  props: ServerPageProps<T>
) {
  // Resolve the params promise
  const resolvedParams = await props.params;

  // Render the client component with resolved params
  return <Component params={resolvedParams} />;
} 