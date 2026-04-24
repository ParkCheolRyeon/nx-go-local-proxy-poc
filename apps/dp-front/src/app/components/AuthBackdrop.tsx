import type { ReactNode } from 'react';

type FloatEmoji = {
  emoji: string;
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  size: number;
  rotate: string;
  duration: number;
  delay: number;
};

const FLOAT_EMOJIS: FloatEmoji[] = [
  { emoji: '✨', top: 120, right: 260, size: 22, rotate: '8deg', duration: 4.2, delay: 0 },
  { emoji: '⭐', bottom: 160, left: 240, size: 18, rotate: '-10deg', duration: 5.4, delay: 0.6 },
  { emoji: '🖍', top: 220, left: 200, size: 16, rotate: '0deg', duration: 6, delay: 1.2 },
  { emoji: '🎨', bottom: 220, right: 230, size: 20, rotate: '6deg', duration: 4.8, delay: 0.3 },
];

export default function AuthBackdrop({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative flex min-h-[100dvh] flex-col overflow-hidden text-[#0b2a63]"
      style={{
        background:
          'linear-gradient(160deg,#F4F8FF 0%, #E5F0FF 55%, #D6E8FF 100%)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-[160px] -left-[120px] h-[460px] w-[460px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(49,150,255,.35), rgba(49,150,255,0) 70%)',
          animation: 'bb-float 9s ease-in-out infinite',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[100px] -bottom-[140px] h-[420px] w-[420px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(255,200,102,.3), rgba(255,200,102,0) 70%)',
          animation: 'bb-float 11s ease-in-out infinite .8s',
        }}
      />

      {FLOAT_EMOJIS.map((e, i) => (
        <div
          key={i}
          aria-hidden
          className="pointer-events-none absolute opacity-50 select-none"
          style={{
            top: e.top,
            bottom: e.bottom,
            left: e.left,
            right: e.right,
            fontSize: e.size,
            ['--r' as string]: e.rotate,
            animation: `ac02-float ${e.duration}s ease-in-out infinite ${e.delay}s`,
          }}
        >
          {e.emoji}
        </div>
      ))}

      {children}
    </div>
  );
}
