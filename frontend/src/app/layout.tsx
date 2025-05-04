import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Figtree } from "next/font/google";
import "./globals.css";
import StoreProvider from "./StoreProvider";

// --- IMPORT NEW WRAPPER --- //
import { NavbarWrapper } from "@/components/navbar-client-wrapper";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: 'swap'
});

/*const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});*/

export const metadata: Metadata = {
  title: "Synoptic - The Synthetic Data Company",
  description: "The Synthetic Data Company",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning={true}>
      <head>
        {/* Add Font Preload Links - Using found TTF files */}
        {/* --- ADJUST IF OTHER WEIGHTS/STYLES ARE CRITICAL FOR LCP/CLS --- */}
        <link
          rel="preload"
          href="/fonts/Figtree-VariableFont_wght.ttf"
          as="font"
          type="font/ttf"
          crossOrigin="anonymous"
        />
        {/* Removed second preload for bold, as variable font contains weights */}
        {/* Add preload for italic if needed:
        <link
          rel="preload"
          href="/fonts/Figtree-Italic-VariableFont_wght.ttf" 
          as="font"
          type="font/ttf"                           
          crossOrigin="anonymous"
        />
        */}
        {/* --- END FONT PRELOAD --- */}
      </head>
      <body className={`${figtree.variable} font-sans antialiased bg-black`}>
        <StoreProvider>
          <div className="relative flex flex-col min-h-screen">
              <NavbarWrapper /> 
              {children} 
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
