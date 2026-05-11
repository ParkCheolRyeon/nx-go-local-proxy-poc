import { Suspense } from 'react';

import ChildrenProfileClient from './ChildrenProfileClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense>
      <ChildrenProfileClient />
    </Suspense>
  );
}
