'use client';

import { useState } from 'react';

import AccountTab from '@/app/(main)/setting/AccountTab';
import AppTab from '@/app/(main)/setting/AppTab';
import BillingTab from '@/app/(main)/setting/BillingTab';
import DangerTab from '@/app/(main)/setting/DangerTab';
import KidTab from '@/app/(main)/setting/KidTab';
import SupportTab from '@/app/(main)/setting/SupportTab';
import { cn } from '@/lib/utils';

export type GroupId = 'account' | 'billing' | 'app' | 'kid' | 'support' | 'danger';

export type Tweaks = {
  notifDrawing: boolean;
  notifEvent: boolean;
  notifSystem: boolean;
  notifMarketing: boolean;
  dndEnabled: boolean;
  dndStart: string;
  dndEnd: string;
  safeMode: boolean;
  paymentLock: boolean;
  togetherChat: boolean;
};

export type SetTweak = <K extends keyof Tweaks>(key: K, value: Tweaks[K]) => void;

const GROUPS: { id: GroupId; icon: string; label: string; sub: string }[] = [
  { id: 'account', icon: '👤', label: '계정', sub: '프로필 · 자녀' },
  { id: 'billing', icon: '💳', label: '구독 · 결제', sub: 'Pro · 코인' },
  { id: 'app', icon: '⚙️', label: '앱 설정', sub: '알림 · 테마' },
  { id: 'kid', icon: '🛡', label: '안전 · 자녀 보호', sub: '시간 · 콘텐츠' },
  { id: 'support', icon: '💬', label: '고객지원', sub: 'FAQ · 문의' },
  { id: 'danger', icon: '⚠️', label: '계정 관리', sub: '로그아웃 · 탈퇴' },
];

export default function SettingPage() {
  const [activeGroup, setActiveGroup] = useState<GroupId>('account');
  const [tweaks, setTweaks] = useState<Tweaks>({
    notifDrawing: true,
    notifEvent: true,
    notifSystem: true,
    notifMarketing: false,
    dndEnabled: false,
    dndStart: '22:00',
    dndEnd: '08:00',
    safeMode: true,
    paymentLock: true,
    togetherChat: false,
  });
  const setT: SetTweak = (key, value) => setTweaks((prev) => ({ ...prev, [key]: value }));

  const activeTabContent =
    activeGroup === 'account' ? (
      <AccountTab />
    ) : activeGroup === 'billing' ? (
      <BillingTab />
    ) : activeGroup === 'app' ? (
      <AppTab tweaks={tweaks} setT={setT} />
    ) : activeGroup === 'kid' ? (
      <KidTab tweaks={tweaks} setT={setT} />
    ) : activeGroup === 'support' ? (
      <SupportTab />
    ) : (
      <DangerTab />
    );

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden"
      style={{
        background: 'linear-gradient(180deg,#EAF2FE 0%,#F7FAFF 60%,#FFFFFF 100%)',
      }}
    >
      <div
        className="pointer-events-none absolute -left-40 -top-40 h-[460px] w-[460px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(49,150,255,.30), rgba(49,150,255,0) 70%)',
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-28 -right-24 h-[380px] w-[380px] rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(255,200,102,.28), rgba(255,200,102,0) 70%)',
        }}
      />

      <div className="relative z-10 flex justify-center px-6 pb-12 pt-10">
        <div
          className="flex w-full max-w-[600px] flex-col gap-[18px]"
          style={{ animation: 'st-fade .45s cubic-bezier(.22,1,.36,1) both' }}
        >
          <header>
            <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-[#3196ff]/25 bg-[#3196ff]/[0.12] px-3 py-[5px] text-[11px] font-bold tracking-[0.8px] text-[#1C7AE0]">
              <span>⚙️</span>
              <span>SETTINGS</span>
            </div>
            <h1 className="text-[32px] font-extrabold leading-[1.15] tracking-[-0.5px] text-[#0b2a63]">설정</h1>
            <p className="mt-1 text-[13px] text-[#5C6F90]">계정, 구독, 알림과 안전 옵션을 한곳에서 관리해요.</p>
          </header>

          <nav className="grid grid-cols-3 gap-2" aria-label="설정 그룹">
            {GROUPS.map((g) => {
              const on = activeGroup === g.id;
              const danger = g.id === 'danger';
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setActiveGroup(g.id)}
                  aria-pressed={on}
                  className={cn(
                    'st-tab flex flex-col gap-1 rounded-[14px] px-3 py-3 text-left',
                    on && !danger && 'shadow-[0_8px_18px_rgba(28,122,224,0.18)]',
                    on && danger && 'shadow-[0_8px_18px_rgba(239,68,68,0.18)]',
                    !on && 'shadow-[0_4px_12px_rgba(28,122,224,0.06)]',
                  )}
                  style={{
                    background: on
                      ? danger
                        ? 'linear-gradient(135deg,#fee2e2,#fecaca)'
                        : 'linear-gradient(135deg,#EAF2FE,#D6E8FF)'
                      : 'rgba(255,255,255,0.7)',
                    border: on
                      ? danger
                        ? '1.5px solid rgba(239,68,68,0.35)'
                        : '1.5px solid rgba(49,150,255,0.4)'
                      : '1px solid rgba(28,122,224,0.1)',
                    transform: on ? 'translateY(-1px)' : 'translateY(0)',
                    transition: 'transform .2s, background .2s, border-color .2s, box-shadow .2s',
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px]">{g.icon}</span>
                    <span
                      className={cn(
                        'text-[12px] font-bold',
                        on && !danger && 'text-[#1C7AE0]',
                        on && danger && 'text-[#DC2626]',
                        !on && 'text-[#0b2a63]',
                      )}
                    >
                      {g.label}
                    </span>
                  </div>
                  <div className="text-[10.5px] text-[#8AA0BD]">{g.sub}</div>
                </button>
              );
            })}
          </nav>

          {activeGroup === 'app' ? (
            <div
              key={activeGroup}
              className="flex flex-col gap-3.5"
              style={{ animation: 'st-fade .35s ease-out .05s both' }}
            >
              {activeTabContent}
            </div>
          ) : (
            <section
              key={activeGroup}
              className="rounded-[22px] border border-[#1C7AE0]/[0.12] bg-white/85 px-5 py-[18px] shadow-[0_18px_44px_rgba(28,122,224,0.12)] backdrop-blur-[14px]"
              style={{ animation: 'st-fade .35s ease-out .05s both' }}
            >
              {activeTabContent}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
