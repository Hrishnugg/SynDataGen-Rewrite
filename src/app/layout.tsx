import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import { ThemeProvider } from '@/context/ThemeContext';
import ScrollProgressBar from '@/components/ScrollProgressBar';
import Footer from '@/components/Footer';

const plusJakarta = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
});

export const metadata: Metadata = {
  title: 'nGrams.ai - Enterprise Synthetic Data Generation',
  description: 'Generate high-quality synthetic data while maintaining privacy, security, and statistical accuracy.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${plusJakarta.variable} font-sans bg-white dark:bg-dark-primary text-gray-900 dark:text-white antialiased`}>
        <ThemeProvider>
          <ScrollProgressBar />
          <Navbar />
          <main className="flex flex-col items-center">
            <div className="w-full max-w-7xl">
              {children}
            </div>
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
