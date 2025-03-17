import { NextResponse } from 'next/server';

interface RateLimitStore {
  timestamp: number;
  count: number;
}

const rateLimit = new Map<string, RateLimitStore>();

// Rate limit configuration
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_REQUESTS = 5; // Maximum requests per IP per window

export function getRateLimitConfig(ip: string): {
  isRateLimited: boolean;
  remainingRequests: number;
  resetTime: Date;
} {
  const now = Date.now();
  const store = rateLimit.get(ip);

  if (!store) {
    return {
      isRateLimited: false,
      remainingRequests: MAX_REQUESTS,
      resetTime: new Date(now + RATE_LIMIT_WINDOW),
    };
  }

  // Clean up old entries
  if (now - store.timestamp > RATE_LIMIT_WINDOW) {
    rateLimit.delete(ip);
    return {
      isRateLimited: false,
      remainingRequests: MAX_REQUESTS,
      resetTime: new Date(now + RATE_LIMIT_WINDOW),
    };
  }

  return {
    isRateLimited: store.count >= MAX_REQUESTS,
    remainingRequests: Math.max(0, MAX_REQUESTS - store.count),
    resetTime: new Date(store.timestamp + RATE_LIMIT_WINDOW),
  };
}

export function updateRateLimit(ip: string): void {
  const now = Date.now();
  const store = rateLimit.get(ip);

  if (!store) {
    rateLimit.set(ip, { timestamp: now, count: 1 });
    return;
  }

  // Reset if window has passed
  if (now - store.timestamp > RATE_LIMIT_WINDOW) {
    rateLimit.set(ip, { timestamp: now, count: 1 });
    return;
  }

  // Increment count
  store.count += 1;
} 