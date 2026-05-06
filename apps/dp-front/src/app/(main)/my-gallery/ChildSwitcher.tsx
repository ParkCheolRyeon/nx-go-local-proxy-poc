'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { resolveAvatar } from '@/config/avatars';
import { cn } from '@/lib/utils';
import type { ChildProfile } from '@/stores/userStore';

type Props = {
  children: ChildProfile[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function ChildSwitcher({ children, selectedId, onSelect }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = useTranslations('child.switcher');

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const selected = children.find((c) => c.id === selectedId) ?? children[0] ?? null;
  const atMax = children.length >= 5;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2.5 rounded-full border border-[#1C7AE0]/15 bg-white/80 py-2 pl-2 pr-3.5 text-[13px] font-bold text-[#0b2a63] shadow-[0_4px_12px_rgba(28,122,224,0.08)] backdrop-blur-md transition-all duration-200',
          open
            ? 'border-[#1C7AE0]/35 shadow-[0_6px_18px_rgba(28,122,224,0.18)]'
            : 'hover:border-[#1C7AE0]/25 hover:shadow-[0_6px_16px_rgba(28,122,224,0.12)]',
        )}
      >
        <span
          aria-hidden
          className="flex h-8 w-8 items-center justify-center rounded-full text-[18px]"
          style={{
            background: 'linear-gradient(135deg,#EAF2FE,#D6E8FF)',
          }}
        >
          {selected ? resolveAvatar(selected.profileEmoji) : '👶'}
        </span>
        <span className="max-w-[120px] truncate">{selected?.name ?? t('select')}</span>
        <span
          aria-hidden
          className={cn(
            'text-[10px] text-[#8AA0BD] transition-transform duration-200',
            open && 'rotate-180',
          )}
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-[calc(100%+8px)] z-20 w-[260px] overflow-hidden rounded-[18px] border border-[#1C7AE0]/15 bg-white/95 backdrop-blur-md"
          style={{
            boxShadow: '0 18px 40px rgba(28,122,224,0.18)',
            animation: 'ac02-fade .2s ease-out both',
          }}
        >
          <div className="px-4 pb-1 pt-3 text-[10.5px] font-bold uppercase tracking-[0.8px] text-[#8AA0BD]">
            {t('title', { count: children.length })}
          </div>
          <ul className="max-h-[280px] overflow-y-auto px-1.5 pb-1.5">
            {children.map((c) => {
              const active = c.id === selectedId;
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onSelect(c.id);
                      setOpen(false);
                    }}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-[12px] px-2.5 py-2 text-left transition-colors duration-150',
                      active
                        ? 'bg-[#3196ff]/10'
                        : 'hover:bg-[#EAF2FE]/70',
                    )}
                  >
                    <span
                      aria-hidden
                      className="flex h-9 w-9 items-center justify-center rounded-[12px] text-[20px]"
                      style={{ background: 'linear-gradient(135deg,#EAF2FE,#D6E8FF)' }}
                    >
                      {resolveAvatar(c.profileEmoji)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13.5px] font-bold text-[#0b2a63]">{c.name}</div>
                      <div className="truncate text-[11px] text-[#8AA0BD]">{c.birthDate}</div>
                    </div>
                    {active && <span className="text-[12px] font-extrabold text-[#1C7AE0]">✓</span>}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-[#1C7AE0]/10 bg-[#EAF2FE]/40 px-2 py-2">
            <button
              type="button"
              disabled={atMax}
              onClick={() => {
                setOpen(false);
                router.push('/signup/children-profile?next=/my-gallery');
              }}
              className={cn(
                'flex w-full items-center justify-center gap-1.5 rounded-[12px] py-2 text-[12px] font-bold transition-colors duration-150',
                atMax
                  ? 'cursor-not-allowed text-[#B9CDE6]'
                  : 'text-[#1C7AE0] hover:bg-white',
              )}
            >
              <span className="text-[14px]">＋</span>
              <span>{atMax ? t('atMax') : t('addMore')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
