'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, type FC, type SVGProps } from 'react';

import IconLogin from '@/app/assets/icons/icon-login.svg';
import { MENU_ITEMS } from '@/config/menu';
import { useUser } from '@/stores/userStore';

type Breadcrumb = {
  label: string;
  href: string;
  Icon?: FC<SVGProps<SVGSVGElement>>;
};

// path → i18n message key. top-level은 MENU_ITEMS.id로, 그 외 하위 라우트는 여기서 관리.
const PATH_KEYS: Record<string, string> = {
  '/setting/account': 'breadcrumb.settingAccount',
  '/setting/billing': 'breadcrumb.settingBilling',
  '/setting/app': 'breadcrumb.settingApp',
  '/setting/kid': 'breadcrumb.settingKid',
  '/setting/support': 'breadcrumb.settingSupport',
  '/setting/danger': 'breadcrumb.settingDanger',
  '/setting/children': 'breadcrumb.settingChildren',
  '/setting/account/password': 'breadcrumb.settingAccountPassword',
  '/setting/account/language': 'breadcrumb.settingAccountLanguage',
  '/setting/account/country': 'breadcrumb.settingAccountCountry',
  '/setting/withdraw': 'breadcrumb.settingWithdraw',
  '/setting/withdraw/cancel': 'breadcrumb.settingWithdrawCancel',
};

const PATTERN_KEYS: Array<{ test: RegExp; key: string }> = [
  { test: /^\/setting\/children\/[^/]+\/edit$/, key: 'breadcrumb.settingChildrenEdit' },
];

// dynamic id 등 breadcrumb에 표시할 의미가 없는 segment.
const SKIP_PATTERNS: RegExp[] = [/^\/setting\/children\/[^/]+$/];

function resolveKey(acc: string): string | null {
  if (PATH_KEYS[acc]) return PATH_KEYS[acc];
  for (const p of PATTERN_KEYS) if (p.test.test(acc)) return p.key;
  const menuItem = MENU_ITEMS.find((m) => m.href === acc);
  if (menuItem) return `menu.${menuItem.id}`;
  return null;
}

type RawCrumb = { key: string | null; fallback: string; href: string; Icon?: FC<SVGProps<SVGSVGElement>> };

function buildRawCrumbs(pathname: string | null): RawCrumb[] {
  if (!pathname || pathname === '/') return [];
  const segments = pathname.split('/').filter(Boolean);
  const out: RawCrumb[] = [];
  let acc = '';
  for (const seg of segments) {
    acc += `/${seg}`;
    if (SKIP_PATTERNS.some((p) => p.test(acc))) continue;
    const menuItem = MENU_ITEMS.find((m) => m.href === acc);
    out.push({ key: resolveKey(acc), fallback: decodeURIComponent(seg), href: acc, Icon: menuItem?.Icon });
  }
  return out;
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUser();
  const t = useTranslations();

  const rawCrumbs = buildRawCrumbs(pathname);
  const breadcrumbs: Breadcrumb[] = rawCrumbs.map((c) => ({
    label: c.key ? t(c.key) : c.fallback,
    href: c.href,
    Icon: c.Icon,
  }));

  return (
    <header className="sticky top-16 z-20 flex h-[72px] items-center justify-between border-b border-[#1C7AE0]/10 bg-[linear-gradient(135deg,rgba(234,242,254,0.85)_0%,rgba(214,232,255,0.65)_50%,rgba(244,248,255,0.85)_100%)] px-8 shadow-[0_8px_24px_rgba(28,122,224,0.08)] backdrop-blur-[14px] md:top-0">
      <nav aria-label={t('header.breadcrumbAriaLabel')} className="flex items-center gap-1.5 text-[13px]">
        {breadcrumbs.map((c, i) => {
          const last = i === breadcrumbs.length - 1;
          const isRoot = i === 0;
          const content = (
            <span className="flex items-center gap-1.5">
              {isRoot && c.Icon && <c.Icon width={16} height={16} aria-hidden className="text-[#1C7AE0]" />}
              <span>{c.label}</span>
            </span>
          );
          return (
            <Fragment key={c.href}>
              {last ? (
                <span className="px-1 py-0.5 font-bold text-[#1C7AE0]">{content}</span>
              ) : (
                <Link
                  href={c.href}
                  className="px-1 py-0.5 font-medium text-[#5C6F90] transition-colors hover:text-[#1C7AE0]"
                >
                  {content}
                </Link>
              )}
              {!last && (
                <span aria-hidden className="text-[11px] text-[#8AA0BD] opacity-60">
                  ›
                </span>
              )}
            </Fragment>
          );
        })}
      </nav>

      <div>
        {!user && (
          <button
            type="button"
            onClick={() => router.push('/signin')}
            className="flex items-center gap-2 rounded-full border-[1.5px] border-[#1C7AE0]/25 bg-transparent px-[18px] py-[9px] text-[13px] font-bold text-[#1C7AE0] transition-[background,color,border-color] duration-150 hover:border-[#1C7AE0]/40 hover:bg-[#3196ff]/10"
          >
            <IconLogin width={16} height={16} aria-hidden />
            <span>{t('header.loginButton')}</span>
          </button>
        )}
      </div>
    </header>
  );
}
