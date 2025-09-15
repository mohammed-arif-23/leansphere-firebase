import type {Metadata, Viewport} from 'next';
import './globals.css';
// Prism theme: using higher-contrast Tomorrow theme for better HTML/CSS visibility
import 'prismjs/themes/prism-tomorrow.css';
import { Toaster } from "@/components/ui/toaster";
import Header from "@/components/layout/Header";
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';
import BottomTabs from '@/components/layout/BottomTabs';

export const metadata: Metadata = {
  title: 'dynamIT',
  description: 'Your gateway to mastering new skills.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'dynamIT',
  },
  icons: {
    icon: '/logo.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0891b2',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="dynamIT" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col bg-white text-foreground">
        <Header />
        <main className="flex-grow pb-14 pt-10 sm:pb-24 md:pb-0">{children}</main>
        <BottomTabs />
        <Toaster />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
