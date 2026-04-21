'use client';

import { components, createApiClient } from '@igallery/api-schema';
import { SyntheticEvent, useState } from 'react';

type User = components['schemas']['User'];

const api = createApiClient('https://api.dp.dev.local');

export default function UsersPanel() {
  const [name, setName] = useState('');
  const [created, setCreated] = useState<User[]>([]);

  const [lookupId, setLookupId] = useState('');
  const [lookupResult, setLookupResult] = useState<string>('');

  async function handleCreate(e: SyntheticEvent) {
    e.preventDefault();
    const { data, error } = await api.POST('/users', {
      body: { name },
    });

    if (error) {
      setLookupResult(`Error : ${JSON.stringify(error)}`);
      return;
    }

    if (data) {
      setCreated((prev) => [data, ...prev]);
      setName('');
    }
  }

  async function handleLookup(e: SyntheticEvent) {
    e.preventDefault();
    const { data, error, response } = await api.GET('/users/{id}', {
      params: { path: { id: lookupId } },
    });
    if (response.status === 404) {
      setLookupResult('NOT FOUND');
      return;
    }
    if (error) {
      setLookupResult(`Error : ${JSON.stringify(error)}`);
      return;
    }

    setLookupResult(JSON.stringify(data, null, 2));
  }

  return (
    <section className="mt-8 space-y-6">
      <div className="p-4 bg-white border rounded">
        <h2 className="text-lg font-semibold mb-2">사용자 생성</h2>
        <form onSubmit={handleCreate} className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 border rounded"
            placeholder="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={1}
            maxLength={50}
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            생성
          </button>
        </form>

        {created.length > 0 && (
          <ul className="mt-4 space-y-1 text-sm">
            {created.map((u) => (
              <li key={u.id} className="font-mono">
                {u.id} · {u.name} · {u.createdAt}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="p-4 bg-white border rounded">
        <h2 className="text-lg font-semibold mb-2">사용자 조회</h2>
        <form onSubmit={handleLookup} className="flex gap-2">
          <input
            className="flex-1 px-3 py-2 border rounded font-mono"
            placeholder="ID"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            required
          />
          <button
            type="submit"
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            조회
          </button>
        </form>
        {lookupResult && (
          <pre className="mt-4 p-3 bg-gray-100 rounded text-sm overflow-auto">
            {lookupResult}
          </pre>
        )}
      </div>
    </section>
  );
}
