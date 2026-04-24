import type { ReactNode } from 'react';

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full flex-col">
      {children}
    </div>
  );
}
