import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientSideLayout from "../components/layout/ClientSideLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Synoptic - Synthetic Data Generation for the AI Era",
  description:
    "Generate high-quality, privacy-compliant synthetic data to accelerate your AI and machine learning projects.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Script to prevent flash of wrong theme - moved inline to avoid chunking issues */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const storedTheme = localStorage.getItem('theme');
                  if (storedTheme === 'dark') {
                    document.documentElement.classList.add('dark');
                  } else if (storedTheme === 'light') {
                    document.documentElement.classList.remove('dark');
                  } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                  }
                } catch (e) {
                  console.error('Failed to set initial theme', e);
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300`}>
        <ClientSideLayout>
          {children}
        </ClientSideLayout>
      </body>
    </html>
  );
}
