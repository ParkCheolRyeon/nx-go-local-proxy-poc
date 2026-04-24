'use client';

import IconLogin from '@/app/assets/icons/icon-login.svg';
import { MENU_ITEMS } from '@/config/menu';
import { useUser } from '@/stores/userStore';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, type FC, type SVGProps } from 'react';

type Breadcrumb = {
  label: string;
  href: string;
  Icon?: FC<SVGProps<SVGSVGElement>>;
};

function buildBreadcrumbs(pathname: string | null): Breadcrumb[] {
  if (!pathname || pathname === '/') return [];
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: Breadcrumb[] = [];
  let acc = '';
  for (const seg of segments) {
    acc += `/${seg}`;
    const menuItem = MENU_ITEMS.find((m) => m.href === acc);
    crumbs.push({
      label: menuItem?.label ?? decodeURIComponent(seg),
      href: acc,
      Icon: menuItem?.Icon,
    });
  }
  return crumbs;
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useUser();

  const breadcrumbs = buildBreadcrumbs(pathname);

  return (
    <header className="sticky top-16 z-20 flex h-[72px] items-center justify-between border-b border-[#1C7AE0]/10 bg-white/70 px-8 shadow-[0_8px_24px_rgba(28,122,224,0.08)] backdrop-blur-[14px] md:top-0">
      <nav
        aria-label="breadcrumb"
        className="flex items-center gap-1.5 text-[13px]"
      >
        {breadcrumbs.map((c, i) => {
          const last = i === breadcrumbs.length - 1;
          const isRoot = i === 0;
          const content = (
            <span className="flex items-center gap-1.5">
              {isRoot && c.Icon && (
                <c.Icon
                  width={16}
                  height={16}
                  aria-hidden
                  className="text-[#1C7AE0]"
                />
              )}
              <span>{c.label}</span>
            </span>
          );
          return (
            <Fragment key={c.href}>
              {last ? (
                <span className="px-1 py-0.5 font-bold text-[#1C7AE0]">
                  {content}
                </span>
              ) : (
                <Link
                  href={c.href}
                  className="px-1 py-0.5 font-medium text-[#5C6F90] transition-colors hover:text-[#1C7AE0]"
                >
                  {content}
                </Link>
              )}
              {!last && (
                <span
                  aria-hidden
                  className="text-[11px] text-[#8AA0BD] opacity-60"
                >
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
            <span>로그인</span>
          </button>
        )}
      </div>
    </header>
  );
}
