'use client';

import { AnimatePresence, motion } from 'motion/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useEffect } from 'react';

import IconArrowRight from '@/app/assets/icons/icon-arrow-right.svg';
import IconLogout from '@/app/assets/icons/icon-logout.svg';
import PcSidebar from '@/app/components/Sidebar/PcSidebar';
import UserAvatar from '@/app/components/UserAvatar';
import UserHoldingCoins from '@/app/components/UserHoldingCoins';
import { INACTIVE_ICON_COLOR, MENU_ITEMS, type MenuItem } from '@/config/menu';
import { useActiveMenuId } from '@/hooks/useActiveMenuId';
import { cn } from '@/lib/utils';
import { useSidebarActions, useSidebarIsDrawerOpen } from '@/stores/sidebarStore';
import { getSubscriptionRemainingDays, useUser, useUserActions } from '@/stores/userStore';

export default function Sidebar() {
  return (
    <>
      <MobileTopBar />
      <MobileDrawer />
      <PcSidebar />
    </>
  );
}

function MobileTopBar() {
  const isOpen = useSidebarIsDrawerOpen();
  const { toggleDrawer } = useSidebarActions();
  const tSidebar = useTranslations('sidebar');

  return (
    <header
      className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-between px-[18px] md:hidden"
      style={{
        background: 'linear-gradient(180deg,rgba(255,255,255,.9) 0%,rgba(255,255,255,.6) 100%)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <motion.button
        type="button"
        aria-label={tSidebar('menuAriaLabel')}
        onClick={toggleDrawer}
        whileTap={{ scale: 0.92 }}
        className="flex h-11 w-11 cursor-pointer flex-col items-center justify-center gap-[5px] rounded-[14px] border-0"
        style={{
          background: 'rgba(255,255,255,.85)',
          backdropFilter: 'blur(8px)',
          boxShadow: '0 6px 18px rgba(28,122,224,.25)',
        }}
      >
        <motion.span
          className="h-[2px] w-[18px] rounded-[2px]"
          style={{ background: '#1C7AE0' }}
          animate={isOpen ? { y: 7, rotate: 45 } : { y: 0, rotate: 0 }}
          transition={{ duration: 0.35, ease: [0.7, -0.2, 0.3, 1.2] }}
        />
        <motion.span
          className="h-[2px] w-[18px] rounded-[2px]"
          style={{ background: '#1C7AE0' }}
          animate={{ opacity: isOpen ? 0 : 1 }}
          transition={{ duration: 0.2 }}
        />
        <motion.span
          className="h-[2px] w-[18px] rounded-[2px]"
          style={{ background: '#1C7AE0' }}
          animate={isOpen ? { y: -7, rotate: -45 } : { y: 0, rotate: 0 }}
          transition={{ duration: 0.35, ease: [0.7, -0.2, 0.3, 1.2] }}
        />
      </motion.button>
      <div className="text-[22px]" style={{ color: '#0b2a63', fontWeight: 800, letterSpacing: -0.3 }}>
        I Gallery V6
      </div>
      <div className="w-11" />
    </header>
  );
}

function MobileDrawer() {
  const isOpen = useSidebarIsDrawerOpen();
  const { closeDrawer } = useSidebarActions();
  const activeId = useActiveMenuId();
  const user = useUser();
  const { signOut } = useUserActions();
  const tSidebar = useTranslations('sidebar');
  const tPlan = useTranslations('plan');

  const handleLogout = () => {
    signOut();
    closeDrawer();
  };

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  return (
    <div className="md:hidden">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            onClick={closeDrawer}
            aria-hidden
            className="fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
              background: 'rgba(11,31,74,.45)',
              backdropFilter: 'blur(6px)',
            }}
          />
        )}
      </AnimatePresence>

      <motion.aside
        className="fixed bottom-0 left-0 top-0 z-50 flex w-[300px] max-w-[85vw] flex-col overflow-hidden text-white"
        initial={false}
        animate={{ x: isOpen ? 0 : '-108%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 38 }}
        style={{
          background: 'linear-gradient(160deg,#0b3a8f 0%,#1C7AE0 45%,#3196ff 100%)',
          boxShadow: '8px 0 40px rgba(0,0,0,.25)',
          borderTopRightRadius: 28,
          borderBottomRightRadius: 28,
        }}
      >
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full"
          style={{ background: 'rgba(255,255,255,.12)', filter: 'blur(2px)' }}
        />
        <div
          className="pointer-events-none absolute -left-10 bottom-16 h-[140px] w-[140px] rounded-full"
          style={{ background: 'rgba(255,255,255,.08)' }}
        />

        <motion.div
          className="relative z-10 px-6 pb-5 pt-7"
          initial={false}
          animate={{
            x: isOpen ? 0 : -20,
            opacity: isOpen ? 1 : 0,
          }}
          transition={{ duration: 0.45, delay: isOpen ? 0.08 : 0 }}
        >
          <div className="flex items-center gap-3">
            <UserAvatar
              size={54}
              radius={18}
              emojiClassName="text-3xl"
              style={{ boxShadow: '0 6px 16px rgba(0,0,0,.25)' }}
            />
            <div>
              {user ? (
                <>
                  <div className="text-xl font-bold">{user.name}</div>
                  <div className="text-[11px]" style={{ color: 'rgba(255,255,255,.75)' }}>
                    {user.description}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-xl font-bold">{tSidebar('guest')}</div>
                  <Link
                    href="/signup"
                    onClick={() => setTimeout(closeDrawer, 160)}
                    className="text-[11px] underline decoration-white/40 underline-offset-2"
                    style={{ color: 'rgba(255,255,255,.85)' }}
                  >
                    {tSidebar('loginOrSignup')}
                  </Link>
                </>
              )}
            </div>
          </div>
          {user && (
            <div
              className="mt-3.5 flex items-center justify-between rounded-[14px] px-3 py-2.5 text-xs"
              style={{
                background: 'rgba(255,255,255,.15)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,.22)',
              }}
            >
              <span>{tSidebar('planUsing', { plan: tPlan(user.plan) })}</span>
              <span style={{ fontWeight: 700 }}>D-{getSubscriptionRemainingDays(user.subscribeEndAt)}</span>
            </div>
          )}
        </motion.div>

        <nav className="relative z-10 flex-1 px-3.5 pb-2">
          {MENU_ITEMS.map((item, i) => (
            <MobileMenuLink
              key={item.id}
              item={item}
              isActive={activeId === item.id}
              isOpen={isOpen}
              order={i}
              onNavigate={closeDrawer}
            />
          ))}
        </nav>

        <motion.div
          className="relative z-10 px-5 pt-1"
          initial={false}
          animate={{ opacity: isOpen ? 1 : 0, y: isOpen ? 0 : 12 }}
          transition={{ duration: 0.4, delay: isOpen ? 0.45 : 0 }}
        >
          <UserHoldingCoins />
        </motion.div>

        {user && (
          <motion.div
            className="relative z-10 mt-3 px-5 pb-5 pt-3"
            initial={false}
            animate={{ opacity: isOpen ? 1 : 0, y: isOpen ? 0 : 12 }}
            transition={{ duration: 0.4, delay: isOpen ? 0.55 : 0 }}
            style={{ borderTop: '1px solid rgba(255,255,255,.15)' }}
          >
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-[14px] px-3.5 py-3 text-[13px] font-semibold text-white/75 transition-colors duration-200 hover:bg-white/10 hover:text-white"
            >
              <IconLogout width={18} height={18} aria-hidden className="flex-none" />
              <span>{tSidebar('logout')}</span>
            </button>
          </motion.div>
        )}
      </motion.aside>
    </div>
  );
}

function MobileMenuLink({
  item,
  isActive,
  isOpen,
  order,
  onNavigate,
}: {
  item: MenuItem;
  isActive: boolean;
  isOpen: boolean;
  order: number;
  onNavigate: () => void;
}) {
  const t = useTranslations('menu');
  const label = t(item.id);
  const subMobile = t(`${item.id}SubMobile`);
  return (
    <motion.div
      initial={false}
      animate={{
        x: isOpen ? 0 : -24,
        opacity: isOpen ? 1 : 0,
      }}
      transition={{
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
        delay: isOpen ? 0.18 + order * 0.07 : 0,
      }}
    >
      <Link
        href={item.href}
        onClick={() => {
          setTimeout(onNavigate, 160);
        }}
        className={cn(
          'group relative my-1 flex w-full items-center gap-3.5 overflow-hidden rounded-2xl px-3.5 py-3.5 text-left text-white transition-colors duration-200',
          isActive && 'bg-white/[.18] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3)]',
        )}
      >
        {!isActive && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-2xl bg-white/0 transition-colors duration-200 group-hover:bg-white/10"
          />
        )}
        <div
          className={cn(
            'absolute bottom-2 left-0 top-2 w-1 origin-center rounded transition-transform duration-[350ms] ease-[cubic-bezier(.7,-.2,.3,1.2)]',
            isActive ? 'scale-y-100' : 'scale-y-0',
          )}
          style={{ background: item.accent }}
        />
        <div
          className={cn(
            'relative flex h-[42px] w-[42px] flex-none items-center justify-center rounded-[14px]',
            isActive ? 'bg-white' : 'bg-white/[.12]',
            !isActive && 'group-hover:-rotate-[4deg] group-hover:scale-[1.08]',
          )}
          style={{
            color: isActive ? item.accent : INACTIVE_ICON_COLOR,
            boxShadow: isActive ? `0 8px 18px ${item.accent}66` : 'none',
            transition:
              'background .3s ease, box-shadow .3s ease, color .2s ease, transform .3s cubic-bezier(.34,1.56,.64,1)',
          }}
        >
          <item.Icon width={26} height={26} aria-hidden />
        </div>
        <div className="relative flex-1">
          <div className="text-[17px] font-bold">{label}</div>
          <div className="mt-0.5 text-[11px]" style={{ color: 'rgba(255,255,255,.7)' }}>
            {subMobile}
          </div>
        </div>
        <div
          className={cn(
            'relative text-lg text-white/60 transition-transform duration-[250ms]',
            isActive && 'translate-x-[2px]',
          )}
        >
          <IconArrowRight className="h-4 w-4" />
        </div>
      </Link>
    </motion.div>
  );
}
