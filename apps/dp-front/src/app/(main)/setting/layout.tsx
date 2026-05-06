'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export type SettingGroupId = 'account' | 'billing' | 'app' | 'kid' | 'support' | 'danger';

const GROUPS: { id: SettingGroupId; icon: string; href: string }[] = [
  { id: 'account', icon: '👤', href: '/setting/account' },
  { id: 'billing', icon: '💳', href: '/setting/billing' },
  { id: 'app', icon: '⚙️', href: '/setting/app' },
  { id: 'kid', icon: '🛡', href: '/setting/kid' },
  { id: 'support', icon: '💬', href: '/setting/support' },
  { id: 'danger', icon: '⚠️', href: '/setting/danger' },
];

function activeGroupFromPath(pathname: string | null): SettingGroupId | null {
  if (!pathname) return null;
  const match = GROUPS.find((g) => pathname === g.href || pathname.startsWith(`${g.href}/`));
  return match?.id ?? null;
}

export default function SettingLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const activeGroup = activeGroupFromPath(pathname);
  const t = useTranslations('setting');

  // 탈퇴 wizard / 자녀 삭제 브릿지는 자체 셸을 가지므로 layout 헤더/nav 생략.
  if (
    pathname?.startsWith('/setting/withdraw') ||
    pathname?.startsWith('/setting/children/delete')
  ) {
    return <>{children}</>;
  }

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
              <span>{t('tag')}</span>
            </div>
            <h1 className="text-[32px] font-extrabold leading-[1.15] tracking-[-0.5px] text-[#0b2a63]">{t('title')}</h1>
            <p className="mt-1 text-[13px] text-[#5C6F90]">{t('subtitle')}</p>
          </header>

          <nav className="grid grid-cols-3 gap-2" aria-label={t('groupAriaLabel')}>
            {GROUPS.map((g) => {
              const on = activeGroup === g.id;
              const danger = g.id === 'danger';
              return (
                <Link
                  key={g.id}
                  href={g.href}
                  aria-current={on ? 'page' : undefined}
                  className={cn(
                    'st-tab flex flex-col gap-1 rounded-[14px] px-3 py-3 text-left no-underline',
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
                      {t(`groups.${g.id}.label`)}
                    </span>
                  </div>
                  <div className="text-[10.5px] text-[#8AA0BD]">{t(`groups.${g.id}.sub`)}</div>
                </Link>
              );
            })}
          </nav>

          <div key={pathname} style={{ animation: 'st-fade .35s ease-out .05s both' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
