import type { ReactNode } from 'react';

import DialogRenderer from '@/dialog/DialogRenderer';

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <div className="mx-auto flex min-h-screen w-full flex-col">
      {children}
      <DialogRenderer />
    </div>
  );
}
