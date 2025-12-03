import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AppProvider } from '@/lib/contexts/AppContext';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'ChickenBids',
  description: 'Descending price drops. Don’t chicken out.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const year = new Date().getFullYear();

  return (
    <html lang='en'>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <AppProvider>
          {children}
          <footer className='site-footer'>
            <p>© {year} ChickenBids. All rights reserved.</p>
            <p>Experimental descending-price auction experience.</p>
          </footer>
        </AppProvider>
      </body>
    </html>
  );
}
