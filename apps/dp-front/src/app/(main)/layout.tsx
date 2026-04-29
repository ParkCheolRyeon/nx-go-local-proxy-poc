import type { ReactNode } from 'react';

import Header from '@/app/components/Header';
import Sidebar from '@/app/components/Sidebar';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col pt-16 md:pt-0">
        <Header />
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
