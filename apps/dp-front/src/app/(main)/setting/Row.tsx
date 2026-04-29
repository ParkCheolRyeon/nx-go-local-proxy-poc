'use client';

import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

type RowProps = {
  icon?: string;
  title: string;
  sub?: string;
  right?: ReactNode;
  danger?: boolean;
  onClick?: () => void;
  last?: boolean;
};

export default function Row({ icon, title, sub, right, danger, onClick, last }: RowProps) {
  return (
    <div
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={cn(
        'st-row flex w-full items-center gap-3.5 px-1 py-3.5 text-left',
        !last && 'border-b border-dashed border-[#1C7AE0]/[0.12]',
        onClick && 'is-clickable cursor-pointer',
      )}
    >
      {icon && (
        <div
          className="flex h-9 w-9 flex-none items-center justify-center rounded-[11px] text-[16px]"
          style={{
            background: danger ? 'rgba(239,68,68,0.1)' : 'rgba(49,150,255,0.1)',
            color: danger ? '#DC2626' : '#1C7AE0',
          }}
          aria-hidden
        >
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className={cn('text-[13.5px] font-semibold', danger ? 'text-[#DC2626]' : 'text-[#0b2a63]')}>{title}</div>
        {sub && <div className="mt-0.5 text-[11.5px] text-[#8AA0BD]">{sub}</div>}
      </div>
      {right}
      {onClick && !right && <span className="text-[16px] font-light text-[#8AA0BD]">›</span>}
    </div>
  );
}
