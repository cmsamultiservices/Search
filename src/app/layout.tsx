import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { SettingsButton } from '@/components/settings-button';
import { Header } from '@/components/header';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Buscador de Libros | CMSA',
  description: 'Buscador de libros para la biblioteca del CMSA.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col" suppressHydrationWarning>
        <ThemeProvider>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Toaster />
          {/* Floating Settings Button */}
          <div className="fixed top-4 right-4 z-40">
            <SettingsButton />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
