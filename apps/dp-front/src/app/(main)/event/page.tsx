import { Suspense } from 'react';

import EventClient from './EventClient';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense>
      <EventClient />
    </Suspense>
  );
}
