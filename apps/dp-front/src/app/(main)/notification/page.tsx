'use client';

import { useState } from 'react';

import { alert } from '@/dialog';
import { ApiError } from '@/lib/api';
import {
  markAllNotificationsRead as apiMarkAllRead,
  markNotificationRead as apiMarkRead,
} from '@/lib/notifications-api';
import { cn } from '@/lib/utils';
import {
  formatTimeAgo,
  isTodayIso,
  useNotifications,
  useUnreadNotificationCount,
  useUserActions,
  type NotificationCategory,
  type UserNotification,
} from '@/stores/userStore';

type TabId = 'all' | NotificationCategory;

const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: '전체' },
  { id: 'contest', label: '대회' },
  { id: 'social', label: '소셜' },
  { id: 'coin', label: '코인' },
  { id: 'system', label: '시스템' },
];

const CATEGORY_DEFAULT_ICON: Record<NotificationCategory, string> = {
  contest: '🏆',
  social: '💬',
  coin: '🪙',
  system: '🔔',
};

const CATEGORY_STYLES: Record<NotificationCategory, { bg: string; shadow: string }> = {
  contest: {
    bg: 'linear-gradient(135deg,#FFE3B8,#FFB84D)',
    shadow: 'rgba(244,138,13,.2)',
  },
  social: {
    bg: 'linear-gradient(135deg,#FFD0E0,#FF78A8)',
    shadow: 'rgba(255,120,168,.2)',
  },
  coin: {
    bg: 'linear-gradient(135deg,#FFE9A8,#FFC640)',
    shadow: 'rgba(255,198,64,.25)',
  },
  system: {
    bg: 'linear-gradient(135deg,#CFE4FF,#3196ff)',
    shadow: 'rgba(49,150,255,.2)',
  },
};

export default function NotificationPage() {
  const notifications = useNotifications();
  const unreadCount = useUnreadNotificationCount();
  const { markNotificationRead, markAllNotificationsRead } = useUserActions();

  const [tab, setTab] = useState<TabId>('all');

  // 옵티미스틱 — 스토어 먼저 갱신, API 실패 시 alert.
  const handleRead = (id: string) => {
    markNotificationRead(id);
    apiMarkRead(id).catch((err) => {
      const msg = err instanceof ApiError ? err.detail : '읽음 처리에 실패했어요.';
      alert(msg, { tone: 'warning' });
    });
  };
  const handleReadAll = () => {
    if (unreadCount === 0) return;
    markAllNotificationsRead();
    apiMarkAllRead().catch((err) => {
      const msg = err instanceof ApiError ? err.detail : '전체 읽음 처리에 실패했어요.';
      alert(msg, { tone: 'warning' });
    });
  };

  const tabCounts: Record<TabId, number> = {
    all: notifications.length,
    contest: 0,
    social: 0,
    coin: 0,
    system: 0,
  };
  for (const n of notifications) {
    tabCounts[n.category] += 1;
  }

  const visible = tab === 'all' ? notifications : notifications.filter((n) => n.category === tab);
  const today = visible.filter((n) => isTodayIso(n.createdAt));
  const earlier = visible.filter((n) => !isTodayIso(n.createdAt));

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden"
      style={{
        background: 'linear-gradient(180deg,#EAF2FE 0%,#F7FAFF 60%,#FFFFFF 100%)',
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[40px] -top-[60px] h-[320px] w-[320px] rounded-full"
        style={{
          background: 'radial-gradient(circle,rgba(49,150,255,.22),transparent 70%)',
          filter: 'blur(24px)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[80px] -left-[60px] h-[280px] w-[280px] rounded-full"
        style={{
          background: 'radial-gradient(circle,rgba(244,138,13,.12),transparent 70%)',
          filter: 'blur(24px)',
        }}
      />

      <main className="relative z-10 flex justify-center px-6 pb-12 pt-8">
        <div className="flex w-full max-w-[600px] flex-col gap-4">
          <header className="flex items-end justify-between gap-4 px-1">
            <div>
              <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-[#3196ff]/25 bg-[#3196ff]/15 px-2.5 py-1 text-[11px] font-bold text-[#1C7AE0]">
                <span>🔔</span>
                <span>알림 센터</span>
              </div>
              <h1 className="text-[28px] font-extrabold tracking-[-0.5px] text-[#0b2a63]">
                안 읽은 알림 <span className="text-[#1C7AE0]">{unreadCount}개</span>
              </h1>
              <p className="mt-1 text-[13px] text-[#8AA0BD]">최근 7일 동안 받은 알림을 모았어요</p>
            </div>
            <button
              type="button"
              onClick={handleReadAll}
              disabled={unreadCount === 0}
              className="flex flex-none items-center gap-1 px-2 py-1.5 text-[13px] font-semibold text-[#5C6F90] transition-colors duration-150 hover:text-[#1C7AE0] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-[#5C6F90]"
            >
              <span>✓</span>
              <span>모두 읽음 처리</span>
            </button>
          </header>

          <div
            className="overflow-hidden rounded-[20px] border border-[#1C7AE0]/15 bg-white/80 backdrop-blur-[14px]"
            style={{
              boxShadow: '0 18px 48px rgba(28,122,224,.1), 0 0 0 1px rgba(255,255,255,.5) inset',
            }}
          >
            <div className="flex gap-1 overflow-x-auto border-b border-[#1C7AE0]/10 bg-[#EAF2FE]/40 px-4 py-3.5">
              {TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={cn(
                      'flex flex-none items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition-all duration-200',
                      active
                        ? 'bg-[linear-gradient(135deg,#3196ff,#1C7AE0)] text-white shadow-[0_4px_12px_rgba(28,122,224,0.28)]'
                        : 'text-[#5C6F90] hover:text-[#1C7AE0]',
                    )}
                  >
                    <span>{t.label}</span>
                    <span
                      className={cn(
                        'rounded-full px-1.5 text-[10px]',
                        active ? 'bg-white/25 text-white' : 'bg-[#1C7AE0]/10 text-[#8AA0BD]',
                      )}
                    >
                      {tabCounts[t.id]}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="px-2 pb-3 pt-2">
              {today.length > 0 && (
                <>
                  <GroupLabel label="오늘" />
                  {today.map((n, i) => (
                    <NotificationRow key={n.id} notification={n} index={i} onRead={() => handleRead(n.id)} />
                  ))}
                </>
              )}
              {earlier.length > 0 && (
                <>
                  <GroupLabel label="이전 알림" />
                  {earlier.map((n, i) => (
                    <NotificationRow
                      key={n.id}
                      notification={n}
                      index={i + today.length}
                      onRead={() => handleRead(n.id)}
                    />
                  ))}
                </>
              )}
              {visible.length === 0 && (
                <div className="px-5 py-14 text-center">
                  <div className="mb-2.5 text-[40px]">🌤</div>
                  <div className="text-[14px] font-semibold text-[#5C6F90]">해당 알림이 없어요</div>
                  <div className="mt-1 text-[12px] text-[#8AA0BD]">다른 탭을 확인해 보세요</div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[#1C7AE0]/10 bg-[#EAF2FE]/30 px-4 py-3 text-[12px] text-[#8AA0BD]">
              <span>7일이 지난 알림은 자동으로 정리돼요</span>
              <button
                type="button"
                onClick={() => alert('asdf', { tone: 'success' })}
                className="font-semibold text-[#5C6F90] transition-colors duration-150 hover:text-[#1C7AE0]"
              >
                알림 설정 →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function GroupLabel({ label }: { label: string }) {
  return (
    <div className="px-3 pb-1.5 pt-3.5 text-[11px] font-bold uppercase tracking-[0.8px] text-[#8AA0BD]">{label}</div>
  );
}

type NotificationRowProps = {
  notification: UserNotification;
  index: number;
  onRead: () => void;
};

function NotificationRow({ notification: n, index, onRead }: NotificationRowProps) {
  const accent = CATEGORY_STYLES[n.category];
  const unread = n.readStatus === 'unRead';

  return (
    <div
      onClick={onRead}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onRead();
        }
      }}
      className={cn(
        'relative mb-0.5 flex cursor-pointer gap-3.5 rounded-[14px] py-3.5 pl-[18px] pr-3.5 transition-[background,transform,box-shadow] duration-200 hover:translate-x-0.5 hover:bg-white hover:shadow-[0_6px_16px_rgba(28,122,224,0.1)]',
        unread && 'bg-[#3196ff]/10',
      )}
      style={{
        animation: `ac02-fade .3s ${index * 0.04}s backwards cubic-bezier(.22,1,.36,1)`,
      }}
    >
      {unread && (
        <div
          aria-hidden
          className="absolute bottom-[18px] left-1.5 top-[18px] w-[3px] rounded-[2px]"
          style={{ background: 'linear-gradient(180deg,#3196ff,#1C7AE0)' }}
        />
      )}

      <div
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[14px] text-[22px] text-white"
        style={{
          background: accent.bg,
          boxShadow: `0 6px 14px ${accent.shadow}`,
        }}
      >
        {n.icon || CATEGORY_DEFAULT_ICON[n.category]}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2.5">
          <div className="flex items-center gap-2 text-[14px] font-bold text-[#0b2a63]">
            <span>{n.title}</span>
            {unread && (
              <span
                aria-hidden
                className="h-[7px] w-[7px] rounded-full bg-[#1C7AE0] shadow-[0_0_0_3px_rgba(49,150,255,0.2)]"
              />
            )}
          </div>
          <div className="flex-shrink-0 text-[11px] tabular-nums text-[#8AA0BD]">{formatTimeAgo(n.createdAt)}</div>
        </div>
        <div className="mt-0.5 break-keep text-[13px] leading-[1.5] text-[#5C6F90]">{n.description}</div>
        {n.cta && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="mt-2 inline-flex items-center gap-1 rounded-full border border-[#1C7AE0]/30 bg-white px-3 py-1 text-[11px] font-bold text-[#1C7AE0] transition-[background,color,transform] duration-150 hover:translate-x-0.5 hover:bg-[#1C7AE0] hover:text-white"
          >
            <span>{n.cta}</span>
            <span className="text-[10px]">→</span>
          </button>
        )}
      </div>
    </div>
  );
}
