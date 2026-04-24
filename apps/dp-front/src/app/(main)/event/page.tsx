'use client';

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
import { cn } from '@/lib/utils';
import Image, { type StaticImageData } from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

type EventStatus = 'open' | 'notOpen' | 'end';

type EventItem = {
  id: string;
  image: StaticImageData;
  title: string;
  subtitle: string;
  startAt: string;
  endAt: string;
  participant: number;
  status: EventStatus;
};

const EVENTS: EventItem[] = [
  {
    id: 'rainy-day',
    image: img01,
    title: '비가 오는날에',
    subtitle: '비가 오는날엔 나는 널 그리워해',
    startAt: '2026-04-01',
    endAt: '2026-05-15',
    participant: 128,
    status: 'open',
  },
  {
    id: 'stained-glass',
    image: img02,
    title: '스테인드글라스로 보는 세상',
    subtitle:
      '스테인드 글라스로 햇살이 들어온다면 어떤 느낌일까요? 너무 반짝반짝 눈이 부셔',
    startAt: '2026-04-10',
    endAt: '2026-05-20',
    participant: 74,
    status: 'open',
  },
  {
    id: 'korean-table',
    image: img03,
    title: '한국인의 밥상',
    subtitle: '속이 든든 맛도리 식탁을 그려보세요. 든든하게 먹어봐요.',
    startAt: '2026-05-10',
    endAt: '2026-06-10',
    participant: 0,
    status: 'notOpen',
  },
  {
    id: 'sea-sunset',
    image: img04,
    title: '바다와 만난 노을',
    subtitle: '바다랑 노을이 사귄데요. 여러분의 축하가 필요해요.',
    startAt: '2026-04-01',
    endAt: '2026-04-30',
    participant: 312,
    status: 'open',
  },
  {
    id: 'tiger-brother',
    image: img05,
    title: '호랑이 형님',
    subtitle: '무서울까요? 아님 멋있을까요? 생각하는 호랭이를 그려봐요.',
    startAt: '2026-02-01',
    endAt: '2026-03-31',
    participant: 512,
    status: 'end',
  },
  {
    id: 'arctic-now',
    image: img06,
    title: '북극의 지금',
    subtitle: '북극의 지금을 그려봐요. 이글루와 펭귄의 콜라보.',
    startAt: '2026-04-20',
    endAt: '2026-05-30',
    participant: 41,
    status: 'open',
  },
  {
    id: 'dad-commute',
    image: img07,
    title: '아빠가 지나는 출근길',
    subtitle: '아빠는 출근길에 어딜 지나가나요. 지하철? 버스?',
    startAt: '2026-06-01',
    endAt: '2026-07-15',
    participant: 0,
    status: 'notOpen',
  },
  {
    id: 'worldcup-2026',
    image: img08,
    title: '2026 북중미 월드컵',
    subtitle: '두둥 곧 시작하는 월드컵을 상상해봐요.',
    startAt: '2026-04-15',
    endAt: '2026-08-15',
    participant: 894,
    status: 'open',
  },
  {
    id: 'picasso',
    image: img09,
    title: '피카소가 될꺼야',
    subtitle:
      '피카소가 됐다치고 여러분이 그리고 싶은걸 아무거나 골라서 그려봐요.',
    startAt: '2026-01-01',
    endAt: '2026-02-28',
    participant: 732,
    status: 'end',
  },
  {
    id: 'bukchon',
    image: img10,
    title: '한옥마을 feat.북촌',
    subtitle:
      '모든 한옥마을이 북촌에 있는건 아니다. 하지만 북촌엔 한옥마을이 있쥬?',
    startAt: '2026-07-01',
    endAt: '2026-08-31',
    participant: 0,
    status: 'notOpen',
  },
];

type StatusMeta = {
  label: string;
  pillClass: string;
  dotClass: string | null;
};

const STATUS_META: Record<EventStatus, StatusMeta> = {
  open: {
    label: '진행 중',
    pillClass: 'bg-[#22C55E]/15 text-[#16A34A] border-[#22C55E]/30',
    dotClass: 'bg-[#22C55E] shadow-[0_0_0_3px_rgba(34,197,94,0.2)]',
  },
  notOpen: {
    label: '오픈 예정',
    pillClass: 'bg-[#3196ff]/15 text-[#1C7AE0] border-[#3196ff]/30',
    dotClass: 'bg-[#3196ff]',
  },
  end: {
    label: '종료',
    pillClass: 'bg-[#94A3B8]/20 text-[#64748B] border-[#94A3B8]/30',
    dotClass: null,
  },
};

type FilterOption = { value: EventStatus | 'all'; label: string };

const FILTER_OPTIONS: FilterOption[] = [
  { value: 'all', label: '전체' },
  { value: 'open', label: '진행 중' },
  { value: 'notOpen', label: '오픈 예정' },
  { value: 'end', label: '종료' },
];

function formatDateRange(startAt: string, endAt: string) {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };
  return `${fmt(startAt)} ~ ${fmt(endAt)}`;
}

function formatParticipant(n: number) {
  return new Intl.NumberFormat('ko-KR').format(n);
}

function isFilterValue(v: string | null): v is EventStatus {
  return v === 'open' || v === 'notOpen' || v === 'end';
}

export default function EventPage() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get('filter');
  const activeFilter: EventStatus | 'all' = isFilterValue(filterParam)
    ? filterParam
    : 'all';

  const filtered =
    activeFilter === 'all'
      ? EVENTS
      : EVENTS.filter((e) => e.status === activeFilter);

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden text-[#0b2a63]"
      style={{
        background:
          'linear-gradient(160deg,#F4F8FF 0%, #E5F0FF 55%, #D6E8FF 100%)',
      }}
    >
      <div className="relative z-10 flex flex-col gap-6 px-10 pt-12 pb-16">
        <header
          className="flex flex-wrap items-end justify-between gap-6"
          style={{ animation: 'ac02-fade .5s ease-out both' }}
        >
          <div>
            <div className="mb-3.5 flex items-center gap-2.5">
              <div className="h-px w-6 bg-[#1C7AE0]" />
              <div className="text-[11px] font-bold tracking-[2px] text-[#1C7AE0]">
                IGALLERY EXCLUSIVE
              </div>
            </div>
            <h1 className="text-[44px] leading-[1.05] font-extrabold tracking-[-0.5px]">
              이번 달의 <span className="text-[#1C7AE0]">이벤트</span>
            </h1>
            <p className="mt-2.5 max-w-[420px] text-[14px] leading-[1.55] text-[#5C6F90]">
              영감을 자극하는 특별 기획전.
              <br />
              마음에 드는 주제에 자유롭게 참여해 보세요.
            </p>
          </div>

          <nav
            className="flex items-center gap-1.5 rounded-full border border-[#1C7AE0]/10 bg-white/70 p-1.5 shadow-[0_4px_12px_rgba(28,122,224,0.08)]"
            aria-label="이벤트 필터"
          >
            {FILTER_OPTIONS.map((opt) => {
              const isActive = activeFilter === opt.value;
              const href =
                opt.value === 'all' ? '/event' : `/event?filter=${opt.value}`;
              return (
                <Link
                  key={opt.value}
                  href={href}
                  replace
                  scroll={false}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'rounded-full px-3.5 py-2 text-[12px] font-bold transition-all duration-200',
                    isActive
                      ? 'bg-[linear-gradient(135deg,#3196ff,#1C7AE0)] text-white shadow-[0_4px_10px_rgba(28,122,224,0.28)]'
                      : 'text-[#5C6F90] hover:text-[#1C7AE0]',
                  )}
                >
                  {opt.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <div
          className="h-px bg-[linear-gradient(90deg,rgba(28,122,224,0.2),rgba(28,122,224,0))]"
          style={{ animation: 'ac02-fade .5s ease-out .05s both' }}
        />

        {filtered.length === 0 ? (
          <div className="rounded-[20px] border border-[#1C7AE0]/10 bg-white/80 px-6 py-16 text-center text-[14px] text-[#5C6F90]">
            해당 상태의 이벤트가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((event, i) => {
              const originalIndex = EVENTS.findIndex((e) => e.id === event.id);
              const num = String(originalIndex + 1).padStart(2, '0');
              return (
                <EventCard
                  key={event.id}
                  event={event}
                  number={num}
                  stagger={i * 0.06 + 0.12}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

type EventCardProps = {
  event: EventItem;
  number: string;
  stagger: number;
};

function EventCard({ event, number, stagger }: EventCardProps) {
  const meta = STATUS_META[event.status];
  const dimmed = event.status === 'end';

  return (
    <Link
      href={`/event/${event.id}`}
      className={cn(
        'group flex flex-col overflow-hidden rounded-[20px] border border-[#1C7AE0]/10 bg-white shadow-[0_8px_24px_rgba(28,122,224,0.07)] transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] hover:-translate-y-1.5 hover:shadow-[0_22px_50px_rgba(28,122,224,0.18)]',
        dimmed && 'opacity-80',
      )}
      style={{
        animation: `ac02-slide .45s cubic-bezier(.22,1,.36,1) ${stagger}s both`,
      }}
    >
      <div className="relative h-[160px] overflow-hidden border-b border-[#1C7AE0]/10">
        <Image
          src={event.image}
          alt={event.title}
          fill
          sizes="(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"
          className={cn(
            'object-cover transition-transform duration-500 group-hover:scale-[1.04]',
            dimmed && 'grayscale',
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/45" />

        <div className="absolute top-3.5 left-4 text-[13px] font-bold tracking-[1px] text-white/85 drop-shadow">
          No. {number}
        </div>

        <div
          className={cn(
            'absolute top-3 right-3 flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold backdrop-blur-md',
            meta.pillClass,
          )}
        >
          {meta.dotClass && (
            <span
              className={cn('h-1.5 w-1.5 rounded-full', meta.dotClass)}
              aria-hidden
            />
          )}
          {meta.label}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-[18px] pt-4 pb-3">
        <div className="text-[20px] leading-[1.25] font-bold break-keep text-[#0b2a63]">
          {event.title}
        </div>
        <div className="line-clamp-2 text-[12.5px] leading-[1.5] break-keep text-[#5C6F90]">
          {event.subtitle}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-dashed border-[#1C7AE0]/15 px-[18px] py-3">
        <div className="flex items-center gap-2.5 text-[11px] font-semibold text-[#8AA0BD]">
          <span>{formatDateRange(event.startAt, event.endAt)}</span>
          <span className="opacity-30">|</span>
          <span>참여 {formatParticipant(event.participant)}명</span>
        </div>
        <div className="flex items-center gap-1.5 text-[12px] font-bold text-[#5C6F90] transition-[color,gap] duration-200 group-hover:gap-2 group-hover:text-[#1C7AE0]">
          <span>자세히</span>
          <span>→</span>
        </div>
      </div>
    </Link>
  );
}
