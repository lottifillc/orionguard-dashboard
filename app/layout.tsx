import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OrionGuard | نظام ذكاء الإنتاجية',
  description: 'لوحة قيادة ذكاء الإنتاجية للمؤسسات',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Added dir="rtl" and lang="ar" for proper Arabic layout processing
    <html lang="ar" dir="rtl">
      <body className="antialiased selection:bg-blue-500/30">
        {children}
      </body>
    </html>
  );
}
