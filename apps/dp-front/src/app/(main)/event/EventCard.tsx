'use client';

import { useFormatter, useTranslations } from 'next-intl';
import Image from 'next/image';
import Link from 'next/link';

import EventStatusBadge from '@/app/(main)/event/EventStatusBadge';
import { EventItem, STATUS_META } from '@/app/(main)/event/EventClient';
import { cn } from '@/lib/utils';

type EventCardProps = {
  event: EventItem;
  number: string;
  stagger: number;
};

export default function EventCard(props: EventCardProps) {
  const { event, number, stagger } = props;
  const meta = STATUS_META[event.status];
  const dimmed = event.status === 'end';
  const t = useTranslations('event');
  const f = useFormatter();

  function formatDateRange(startAt: string, endAt: string) {
    const fmt = (iso: string) => {
      const d = new Date(iso);
      return `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
    };
    return `${fmt(startAt)} ~ ${fmt(endAt)}`;
  }

  const title = t(`items.${event.id}.title` as 'items.rainy-day.title');
  const subtitle = t(`items.${event.id}.subtitle` as 'items.rainy-day.subtitle');

  return (
    <Link
      href={`/event/${event.id}`}
      className={cn(
        'group relative flex h-[360px] flex-col overflow-hidden rounded-[12px] border border-[#eee] bg-[#0b2a63] shadow-[0_8px_12px_rgba(28,122,224,0.4)] transition-transform duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] hover:-translate-y-1.5',
        dimmed && 'opacity-80',
      )}
      style={{
        animation: `ac02-slide .45s cubic-bezier(.22,1,.36,1) ${stagger}s both`,
      }}
    >
      <Image
        src={event.image}
        alt={title}
        fill
        sizes="(min-width: 1280px) 400px, (min-width: 640px) 50vw, 100vw"
        className={cn(
          'object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.06]',
          dimmed && 'grayscale',
        )}
      />

      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.15)_0%,rgba(0,0,0,0)_28%,rgba(0,0,0,0.55)_68%,rgba(0,0,0,0.92)_100%)] transition-opacity duration-300 group-hover:opacity-95" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_55%,rgba(0,0,0,0.35)_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="absolute left-4 top-4 text-[13px] font-bold tracking-[1px] text-white/85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
        No. {number}
      </div>

      <EventStatusBadge status={event.status} meta={meta} />

      <div className="relative mt-auto flex flex-col gap-2 px-[20px] pb-[18px] pt-5 text-white">
        <div className="break-keep text-[22px] font-extrabold leading-[1.2] tracking-[-0.3px] drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]">
          {title}
        </div>

        <div className="grid -translate-y-1 grid-rows-[0fr] overflow-hidden opacity-0 blur-[2px] transition-[grid-template-rows,opacity,transform,filter] duration-[500ms] ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:translate-y-0 group-hover:grid-rows-[1fr] group-hover:opacity-100 group-hover:blur-0">
          <div className="line-clamp-2 min-h-0 break-keep text-[12.5px] leading-[1.5] text-white/85">
            {subtitle}
          </div>
        </div>

        <div className="mt-1 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-[11px] font-semibold text-white/80">
            <span>{formatDateRange(event.startAt, event.endAt)}</span>
            <span className="opacity-40">|</span>
            <span>{t('card.participants', { count: f.number(event.participant) })}</span>
          </div>
          <div className="flex translate-x-1 items-center gap-1 text-[12px] font-bold text-white/0 transition-[color,transform] duration-300 group-hover:translate-x-0 group-hover:gap-1.5 group-hover:text-white">
            <span>{t('card.more')}</span>
            <span>→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
