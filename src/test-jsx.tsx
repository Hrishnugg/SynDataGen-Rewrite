/**
 * JSX Test Component
 */

import React from 'react';

export interface TestProps {
  message: string;
}

export function TestComponent({ message }: TestProps) {
  return (
    <div className="test-component">
      <h1>Test JSX</h1>
      <p>{message}</p>
    </div>
  );
} 