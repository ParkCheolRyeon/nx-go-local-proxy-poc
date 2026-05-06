'use client';

import { cn } from '@/lib/utils';
import type { AwardRank, DrawingMode, DrawingStatus } from '@/lib/drawings-api';

export const MODE_META: Record<DrawingMode, { label: string; icon: string; tint: string }> = {
  coloring: { label: '컬러링', icon: '🎨', tint: '#FFD0E0' },
  stepwise: { label: '단계별', icon: '📐', tint: '#CFE4FF' },
  freeform: { label: '자유', icon: '✏️', tint: '#FFE9A8' },
  together: { label: '함께', icon: '🤝', tint: '#D8F3DC' },
};

export const RANK_META: Record<AwardRank, { label: string; icon: string; bg: string; shadow: string }> = {
  grand: {
    label: '대상',
    icon: '🏆',
    bg: 'linear-gradient(135deg,#FFE3B8,#FFB84D)',
    shadow: 'rgba(244,138,13,.3)',
  },
  gold: {
    label: '금상',
    icon: '🥇',
    bg: 'linear-gradient(135deg,#FFE9A8,#FFC640)',
    shadow: 'rgba(255,198,64,.3)',
  },
  silver: {
    label: '은상',
    icon: '🥈',
    bg: 'linear-gradient(135deg,#E8EBF0,#B0B5BF)',
    shadow: 'rgba(176,181,191,.3)',
  },
  bronze: {
    label: '동상',
    icon: '🥉',
    bg: 'linear-gradient(135deg,#E8C8A8,#C7894C)',
    shadow: 'rgba(199,137,76,.3)',
  },
  encourage: {
    label: '장려상',
    icon: '🌟',
    bg: 'linear-gradient(135deg,#FFD0E0,#FF78A8)',
    shadow: 'rgba(255,120,168,.3)',
  },
};

type Props = {
  id: string;
  mode: DrawingMode;
  title: string;
  thumbnailUrl?: string;
  status?: DrawingStatus;
  isPublic?: boolean;
  completedAt?: string;
  awardRank?: AwardRank;
  stagger?: number;
  onClick?: () => void;
};

function formatDate(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function DrawingCard({
  mode,
  title,
  thumbnailUrl,
  status,
  isPublic,
  completedAt,
  awardRank,
  stagger = 0,
  onClick,
}: Props) {
  const modeMeta = MODE_META[mode];
  const rankMeta = awardRank ? RANK_META[awardRank] : null;
  const inProgress = status === 'in_progress';

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex aspect-[3/4] flex-col overflow-hidden rounded-[16px] border border-[#1C7AE0]/10 bg-white text-left shadow-[0_8px_18px_rgba(28,122,224,0.08)] transition-all duration-300 ease-[cubic-bezier(.34,1.56,.64,1)] hover:-translate-y-1 hover:shadow-[0_14px_32px_rgba(28,122,224,0.18)]',
      )}
      style={{ animation: `ac02-slide .45s cubic-bezier(.22,1,.36,1) ${stagger}s both` }}
    >
      {/* thumbnail */}
      <div
        aria-hidden
        className="relative flex-1 overflow-hidden"
        style={{
          background: thumbnailUrl
            ? `center/cover no-repeat url("${thumbnailUrl}"), ${modeMeta.tint}`
            : `linear-gradient(135deg,${modeMeta.tint},#FFFFFF)`,
        }}
      >
        {!thumbnailUrl && (
          <div className="absolute inset-0 flex items-center justify-center text-[64px] opacity-40">
            {modeMeta.icon}
          </div>
        )}

        {/* mode pill — top left */}
        <div className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-[3px] text-[10.5px] font-extrabold text-[#0b2a63] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <span>{modeMeta.icon}</span>
          <span>{modeMeta.label}</span>
        </div>

        {/* status / public flags — top right */}
        <div className="absolute right-2.5 top-2.5 flex flex-col items-end gap-1">
          {inProgress && (
            <span className="rounded-full bg-[#3196ff]/85 px-2 py-[3px] text-[10px] font-bold text-white shadow-[0_2px_8px_rgba(28,122,224,0.35)]">
              이어그리기
            </span>
          )}
          {isPublic && !inProgress && (
            <span className="rounded-full bg-emerald-500/85 px-2 py-[3px] text-[10px] font-bold text-white shadow-[0_2px_8px_rgba(16,185,129,0.32)]">
              공개
            </span>
          )}
        </div>

        {/* award rank — center overlay */}
        {rankMeta && (
          <div
            className="absolute right-2.5 bottom-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-[5px] text-[11px] font-extrabold text-[#7a4a06]"
            style={{
              background: rankMeta.bg,
              boxShadow: `0 4px 12px ${rankMeta.shadow}`,
            }}
          >
            <span className="text-[12px]">{rankMeta.icon}</span>
            <span>{rankMeta.label}</span>
          </div>
        )}
      </div>

      {/* meta strip */}
      <div className="flex flex-col gap-0.5 border-t border-[#1C7AE0]/8 bg-white px-3.5 py-2.5">
        <div className="truncate text-[13px] font-extrabold text-[#0b2a63]">{title}</div>
        <div className="truncate text-[10.5px] text-[#8AA0BD]">
          {inProgress ? '진행 중' : formatDate(completedAt)}
        </div>
      </div>
    </button>
  );
}
