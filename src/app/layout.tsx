import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata: Metadata = {
  title: 'LOTOTO K3',
  description: 'Sistem Manajemen Keselamatan Kerja - LOTOTO K3 Dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          integrity="sha512-KyZXEAg3QhqLMpG8r+Knujsl5+5hb7ieOXh3F5R5b+c3q0SYLRjLlFw8PjV9O7S8Zeqfa7HWudC5Du5Xs7Th0Q=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
