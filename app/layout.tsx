import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';
import LayoutWrapper from './components/LayoutWrapper';

export const metadata: Metadata = {
  title: 'Elephant App',
  description: 'Task and Project Management Application',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') || '/';

  return (
    <html lang="en">
      <body>
        <LayoutWrapper pathname={pathname}>{children}</LayoutWrapper>
      </body>
    </html>
  );
}

