"use client";

import React from "react";
import { ThemeProvider } from "@/context/ThemeContext";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "next-auth/react";

/**
 * Client-side layout wrapper that handles all client components
 * This includes SessionProvider to make auth context available to all components
 */
export default function ClientSideLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
        <Toaster position="top-right" />
      </ThemeProvider>
    </SessionProvider>
  );
} 