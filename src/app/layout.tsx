import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RACE SAMPLES — Laboratory CBC Sample Management System',
  description: 'Enterprise laboratory administration dashboard for importing, analyzing, managing, and exporting camel CBC race sample reports.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Poppins:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-[#F5F7FA] text-[#1F2937] antialiased">
        {children}
      </body>
    </html>
  );
}
