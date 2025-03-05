# Next.js 15 Promise-Based Params Pattern

This document explains the pattern for handling Promise-based params in Next.js 15, which is a requirement introduced in this version to support various optimizations and features like Partial Prerendering.

## The Challenge

Next.js 15 introduces a breaking change where dynamic route parameters are now provided as Promises rather than direct values. This means:

1. In Next.js 14 and earlier, route params were directly available as objects: `{ params: { id: 'abc123' } }`
2. In Next.js 15, params must be awaited: `const { id } = await params`

This creates a challenge for client components, which cannot use `async/await` at the component level due to React's limitations on client-side rendering.

## Our Solution: The Server-Client Bridge Pattern

We've implemented a pattern that creates a clear separation between server and client components with proper typing:

1. **Server Components**: Handle the Promise-based params and pass resolved values to client components
2. **Client Components**: Receive regular (non-Promise) params and render the UI 

## Implementation

### 1. Utility Types and Functions (`src/lib/page-utils.tsx`)

```tsx
import React from 'react';

// Type for Next.js 15 Promise-based params
export type PromiseParams<T extends Record<string, any>> = Promise<T>;

// Type for regular params used in client components
export type RegularParams<T extends Record<string, any>> = T;

// Type for props with promise-based params
export interface ServerPageProps<T extends Record<string, any>> {
  params: PromiseParams<T>;
}

// Type for props with regular params
export interface ClientPageProps<T extends Record<string, any>> {
  params: RegularParams<T>;
}

// Server component that resolves Promise-based params and renders client components
export async function withResolvedParams<T extends Record<string, any>>(
  Component: React.ComponentType<ClientPageProps<T>>,
  props: ServerPageProps<T>
) {
  // Resolve the params promise
  const resolvedParams = await props.params;

  // Render the client component with resolved params
  return <Component params={resolvedParams} />;
}
```

### 2. Server Component (Page Component)

For each dynamic route, create a server component that handles Promise-based params:

```tsx
// src/app/dashboard/admin/customers/[id]/page.tsx
import { Metadata } from "next";
import { withResolvedParams, ServerPageProps } from "@/lib/page-utils";
import CustomerDetailClientPage from "./client-page";

// Define the params type for this specific page
type CustomerDetailParams = {
  id: string;
};

// Metadata for the page (optional)
export const metadata: Metadata = {
  title: "Customer Details",
  description: "View customer details",
};

// Server component that handles Promise-based params
export default async function CustomerDetailPage(props: ServerPageProps<CustomerDetailParams>) {
  return withResolvedParams(CustomerDetailClientPage, props);
}
```

### 3. Client Component

Create a client component that receives resolved params:

```tsx
// src/app/dashboard/admin/customers/[id]/client-page.tsx
"use client"; // Mark as client component

import { useState, useEffect } from "react";
import { ClientPageProps } from "@/lib/page-utils";

// Define the params type (same as server component)
type CustomerDetailParams = {
  id: string;
};

// Client component that receives resolved params
export default function CustomerDetailClientPage({ params }: ClientPageProps<CustomerDetailParams>) {
  const { id } = params; // No need to await, params are already resolved
  
  // Rest of your component implementation...
  return (
    <div>
      <h1>Customer ID: {id}</h1>
      {/* Your component JSX */}
    </div>
  );
}
```

## When to Use This Pattern

Use this pattern for:

1. Any page with dynamic route parameters (like `[id]`)
2. Any page that's a client component and needs access to route parameters
3. Components that need to mix server and client-side rendering

## Benefits

1. **Type Safety**: Proper typing throughout the component chain
2. **Separation of Concerns**: Clear distinction between server and client code
3. **Compatibility**: Works seamlessly with Next.js 15's Promise-based params
4. **Reusability**: Consistent pattern that can be applied across the application
5. **Maintainability**: Easy to understand and extend

## Migration Steps

To migrate existing pages to this pattern:

1. Create a `client-page.tsx` file with your existing client-side logic
2. Update the component to use `ClientPageProps` for params
3. Convert the original `page.tsx` to a server component using `withResolvedParams`
4. Make sure to maintain the same params type definition across both files

## Example Migration

Before:
```tsx
// page.tsx (client component)
"use client";

export default function Page({ params }: { params: { id: string } }) {
  // Client-side logic
}
```

After:
```tsx
// client-page.tsx (client component)
"use client";
import { ClientPageProps } from "@/lib/page-utils";

type PageParams = { id: string };

export default function PageClient({ params }: ClientPageProps<PageParams>) {
  // Client-side logic
}

// page.tsx (server component)
import { ServerPageProps, withResolvedParams } from "@/lib/page-utils";
import PageClient from "./client-page";

type PageParams = { id: string };

export default async function Page(props: ServerPageProps<PageParams>) {
  return withResolvedParams(PageClient, props);
}
``` 