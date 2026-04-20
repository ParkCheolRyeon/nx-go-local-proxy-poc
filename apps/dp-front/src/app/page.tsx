import React from 'react';
import { createApiClient } from '@igallery/api-schema';

export default async function Home() {
  const api = createApiClient('https://api.dp.dev.local');

  const { data, error } = await api.GET('/health');

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">iGallery DP</h1>
      <section className="p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold">Backend Health</h2>
        {error && <pre className="text-red-400">{JSON.stringify(error)}</pre>}
        {data && (
          <pre className="text-green-500">{JSON.stringify(data, null, 2)}</pre>
        )}
      </section>
    </main>
  );
}
