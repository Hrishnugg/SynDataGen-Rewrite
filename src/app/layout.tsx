import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import AuthContext from '@/context/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Synoptic - Synthetic Data Generation for the AI Era',
  description: 'Generate high-quality, privacy-compliant synthetic data to accelerate your AI and machine learning projects.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} bg-gray-50 dark:bg-dark-primary`}>
        <AuthContext>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </AuthContext>
      </body>
    </html>
  );
}
