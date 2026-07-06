import './globals.css';
import ToastContainer from '../components/ui/ToastContainer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pulpax Klinik Yönetim Sistemi',
  description: 'Premium SaaS Dental Management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr">
      <body>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
