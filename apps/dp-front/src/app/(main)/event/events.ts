// 'use client' 없는 일반 module — server 와 client 둘 다 import 가능.
// EventClient.tsx (use client) 에서 import 시 array 그대로 받음.
// /event/[slug]/page.tsx (server component) 에서도 .find() 등 정상 동작.

import { type StaticImageData } from 'next/image';

import img01 from '@/app/assets/event/1.png';
import img02 from '@/app/assets/event/2.png';
import img03 from '@/app/assets/event/3.png';
import img04 from '@/app/assets/event/4.png';
import img05 from '@/app/assets/event/5.jpg';
import img06 from '@/app/assets/event/6.jpg';
import img07 from '@/app/assets/event/7.jpg';
import img08 from '@/app/assets/event/8.png';
import img09 from '@/app/assets/event/9.png';
import img10 from '@/app/assets/event/10.jpg';

export type EventStatus = 'open' | 'notOpen' | 'end';

export type EventItem = {
  id: string;
  image: StaticImageData;
  startAt: string;
  endAt: string;
  participant: number;
  status: EventStatus;
};

export const EVENTS: EventItem[] = [
  { id: 'rainy-day', image: img01, startAt: '2026-04-01', endAt: '2026-05-15', participant: 128, status: 'open' },
  { id: 'stained-glass', image: img02, startAt: '2026-04-10', endAt: '2026-05-20', participant: 74, status: 'open' },
  { id: 'korean-table', image: img03, startAt: '2026-05-10', endAt: '2026-06-10', participant: 0, status: 'notOpen' },
  { id: 'sea-sunset', image: img04, startAt: '2026-04-01', endAt: '2026-04-30', participant: 312, status: 'open' },
  { id: 'tiger-brother', image: img05, startAt: '2026-02-01', endAt: '2026-03-31', participant: 512, status: 'end' },
  { id: 'arctic-now', image: img06, startAt: '2026-04-20', endAt: '2026-05-30', participant: 41, status: 'open' },
  { id: 'dad-commute', image: img07, startAt: '2026-06-01', endAt: '2026-07-15', participant: 0, status: 'notOpen' },
  { id: 'worldcup-2026', image: img08, startAt: '2026-04-15', endAt: '2026-08-15', participant: 894, status: 'open' },
  { id: 'picasso', image: img09, startAt: '2026-01-01', endAt: '2026-02-28', participant: 732, status: 'end' },
  { id: 'bukchon', image: img10, startAt: '2026-07-01', endAt: '2026-08-31', participant: 0, status: 'notOpen' },
];
