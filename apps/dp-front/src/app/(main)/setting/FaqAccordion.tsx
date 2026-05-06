'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { cn } from '@/lib/utils';

const Q_FADE_TRANSITION = 'opacity .45s cubic-bezier(.4,0,.2,1), color .45s cubic-bezier(.4,0,.2,1)';

export default function FaqAccordion() {
  const t = useTranslations('setting');
  const items = t.raw('faq') as { q: string; a: string }[];
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="mb-2 mt-1 rounded-[14px] border border-[#1C7AE0]/[0.12] bg-white/70 px-3 py-1">
      {items.map((item, i) => {
        const open = openIdx === i;
        const isLast = i === items.length - 1;
        return (
          <div key={item.q} className={cn(!isLast && 'border-b border-dashed border-[#1C7AE0]/[0.12]')}>
            <button
              type="button"
              onClick={() => setOpenIdx(open ? null : i)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 py-3 text-left"
            >
              <span
                className="relative flex h-6 w-6 flex-none items-center justify-center overflow-hidden rounded-full text-[11px] font-bold"
                style={{ background: 'linear-gradient(135deg,#3196ff,#1C7AE0)' }}
              >
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-[#EAF2FE]"
                  style={{
                    opacity: open ? 0 : 1,
                    transition: Q_FADE_TRANSITION,
                  }}
                />
                <span
                  className="relative"
                  style={{
                    color: open ? '#fff' : '#1C7AE0',
                    transition: Q_FADE_TRANSITION,
                  }}
                >
                  Q
                </span>
              </span>
              <span
                className="flex-1 text-[13px] font-semibold"
                style={{
                  color: open ? '#1C7AE0' : '#0b2a63',
                  transition: Q_FADE_TRANSITION,
                }}
              >
                {item.q}
              </span>
              <span
                className="text-[16px] text-[#8AA0BD]"
                style={{
                  transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
                }}
                aria-hidden
              >
                ›
              </span>
            </button>
            <div
              className="grid overflow-hidden transition-[grid-template-rows,opacity] duration-[400ms] ease-[cubic-bezier(.4,0,.2,1)]"
              style={{
                gridTemplateRows: open ? '1fr' : '0fr',
                opacity: open ? 1 : 0,
              }}
            >
              <div className="min-h-0">
                <div className="mb-3 ml-9 rounded-[10px] bg-[#EAF2FE]/50 px-3 py-2.5 text-[12px] leading-[1.6] text-[#5C6F90]">
                  {item.a}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
