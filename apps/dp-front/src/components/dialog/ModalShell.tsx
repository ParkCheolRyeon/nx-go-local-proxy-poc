'use client';

import { type ReactNode } from 'react';

export type ModalPalette = {
  grad: string;
  icon: string;
  ring: string;
};

type ModalShellProps = {
  children: ReactNode;
  onBackdropClick?: () => void;
};

export default function ModalShell({ children, onBackdropClick }: ModalShellProps) {
  return (
    <div
      role="presentation"
      onClick={onBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-[4px]"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(11,42,99,0.55) 0%, rgba(11,42,99,0.72) 100%)',
        animation: 'mdl-fade .25s ease-out both',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[380px] max-w-[92%] overflow-hidden rounded-[24px] bg-white"
        style={{
          boxShadow: '0 30px 80px rgba(11,42,99,0.45), 0 0 0 1px rgba(28,122,224,0.1)',
          animation: 'mdl-pop .35s cubic-bezier(.34,1.56,.64,1) both',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function ModalBanner({ palette }: { palette: ModalPalette }) {
  return (
    <div
      className="relative h-[132px] overflow-hidden border-b border-[#1C7AE0]/[0.08]"
      style={{ background: palette.grad }}
    >
      <div className="absolute -right-[30px] -top-10 h-[120px] w-[120px] rounded-full bg-white/50" />
      <div className="absolute -bottom-[30px] -left-5 h-[80px] w-[80px] rounded-full bg-white/40" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div
            aria-hidden
            className="absolute -inset-2.5 rounded-full"
            style={{
              background: palette.ring,
              animation: 'mdl-ring 1.4s ease-out infinite',
            }}
          />
          <div
            className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full bg-white text-[34px]"
            style={{
              boxShadow: '0 10px 28px rgba(11,42,99,0.18)',
              animation: 'mdl-icon-pulse .5s cubic-bezier(.34,1.56,.64,1) both',
            }}
          >
            {palette.icon}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ModalBody({ title, message }: { title: string; message: string }) {
  return (
    <div className="px-[26px] pb-2 pt-[22px] text-center">
      <div className="text-[20px] font-extrabold leading-[1.2] text-[#0b2a63]">{title}</div>
      <div className="mt-2 whitespace-pre-line text-[13.5px] leading-[1.55] text-[#5C6F90]">{message}</div>
    </div>
  );
}
