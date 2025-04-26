import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Figtree } from "next/font/google";
import "./globals.css";
import StoreProvider from "./StoreProvider";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
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
      <body
        className={`${figtree.variable} antialiased bg-black`}
      >
        <div className="flex flex-col min-h-screen">
         <StoreProvider>{children}</StoreProvider>
        </div>
      </body>
    </html>
  );
}
