'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { EventStatus, StatusMeta } from '@/app/(main)/event/EventClient';
import { cn } from '@/lib/utils';

type EventStatusBadgeProps = {
  status: EventStatus;
  meta: StatusMeta;
};

export default function EventStatusBadge(props: EventStatusBadgeProps) {
  const { status } = props;
  const { pillClass, dotClass } = props.meta;
  const t = useTranslations('event.status');

  return (
    <div
      className={cn(
        'absolute right-3.5 top-3.5 flex items-center gap-2.5 rounded-full border px-2.5 py-1 text-[11px] font-bold backdrop-blur-md',
        pillClass,
      )}
    >
      {dotClass && (
        <span className="relative h-1.5 w-1.5" aria-hidden>
          <span className={cn('absolute inset-0 rounded-full', dotClass)} />
          {status === 'open' && (
            <>
              <span
                className="absolute inset-0 rounded-full"
                style={{ animation: 'ev-dot-pulse 1.8s ease-out infinite' }}
              />
              <span
                className="absolute inset-0 rounded-full"
                style={{ animation: 'ev-dot-pulse 1.8s ease-out 0.9s infinite' }}
              />
            </>
          )}
        </span>
      )}
      {t(status)}
    </div>
  );
}
