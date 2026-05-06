import UserAvatar from '@/app/components/UserAvatar';
import UserHoldingCoins from '@/app/components/UserHoldingCoins';
import MainLogo from '@/app/components/MainLogo';
import { MENU_ITEMS, INACTIVE_ICON_COLOR, MenuItem } from '@/config/menu';
import { useActiveMenuId } from '@/hooks/useActiveMenuId';
import { useMenuCounts } from '@/hooks/useMenuCounts';
import { cn } from '@/lib/utils';
import {
  useSidebarActions,
  useSidebarIsRailExpanded,
} from '@/stores/sidebarStore';
import {
  getSubscriptionRemainingDays,
  useUser,
  useUserActions,
} from '@/stores/userStore';
import { AnimatePresence, motion, type Transition } from 'motion/react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import IconArrowRight from '@/app/assets/icons/icon-arrow-right.svg';
import IconLogout from '@/app/assets/icons/icon-logout.svg';

const RAIL_WIDTH_EXPANDED = 250;
const RAIL_WIDTH_COLLAPSED = 100;
const RAIL_SPRING: Transition = {
  type: 'spring',
  stiffness: 260,
  damping: 32,
  mass: 0.85,
};
const HOVER_SPRING: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 14,
};

const FADE_OUT: Transition = { duration: 0.18, ease: 'easeOut' };
const FADE_IN: Transition = { duration: 0.26, ease: 'easeOut', delay: 0.08 };

export default function PcSidebar() {
  const isExpanded = useSidebarIsRailExpanded();
  const { toggleRail } = useSidebarActions();
  const activeId = useActiveMenuId();
  const user = useUser();
  const { signOut } = useUserActions();
  const counts = useMenuCounts();
  const tSidebar = useTranslations('sidebar');

  return (
    <motion.aside
      className="sticky top-0 z-40 hidden h-screen flex-none flex-col self-start px-4 py-[22px] text-white md:flex"
      initial={false}
      animate={{
        width: isExpanded ? RAIL_WIDTH_EXPANDED : RAIL_WIDTH_COLLAPSED,
      }}
      transition={RAIL_SPRING}
      style={{
        background:
          'linear-gradient(180deg,#0b2a63 0%,#1C7AE0 60%,#3196ff 100%)',
      }}
    >
      <div
        className="pointer-events-none absolute -top-10 -right-8 h-[140px] w-[140px] rounded-full"
        style={{ background: 'rgba(255,255,255,.1)', filter: 'blur(2px)' }}
      />
      <div
        className="pointer-events-none absolute top-[180px] -left-8 h-[120px] w-[120px] rounded-full"
        style={{ background: 'rgba(255,255,255,.08)' }}
      />

      <MainLogo isExpanded={isExpanded} />

      <motion.button
        type="button"
        onClick={toggleRail}
        aria-label={isExpanded ? tSidebar('collapse') : tSidebar('expand')}
        className="absolute top-[60px] -right-4 z-30 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-0 text-base font-bold"
        style={{
          background: '#fff',
          color: '#1C7AE0',
          boxShadow:
            '0 6px 18px rgba(11,42,99,.25), 0 0 0 4px rgba(255,255,255,.9)',
        }}
        animate={{ rotate: isExpanded ? 180 : 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        whileTap={{ scale: 0.88 }}
      >
        <IconArrowRight className="h-3 w-3" />
      </motion.button>

      <PCProfileCard isExpanded={isExpanded} />

      <nav className="relative mt-3 flex flex-col gap-1">
        {MENU_ITEMS.map((item) => (
          <PCMenuLink
            key={item.id}
            item={item}
            isActive={activeId === item.id}
            isExpanded={isExpanded}
            count={counts[item.id] ?? 0}
          />
        ))}
      </nav>

      <div className="flex-1" />

      <motion.div
        initial={false}
        animate={{
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        transition={{
          height: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
          opacity: { duration: 0.2, ease: 'easeOut' },
        }}
        style={{ overflow: 'hidden' }}
      >
        <div className="pt-4">
          <UserHoldingCoins />
        </div>
      </motion.div>

      {user && (
        <div
          className="relative z-10 mt-3 pt-3"
          style={{ borderTop: '1px solid rgba(255,255,255,.15)' }}
        >
          <button
            type="button"
            onClick={signOut}
            aria-label={tSidebar('logout')}
            className="group relative block w-full overflow-visible rounded-[14px] text-left text-white/75 transition-colors duration-200 hover:bg-white/10 hover:text-white"
          >
            <div className="relative flex items-center gap-3 px-3.5 py-2.5">
              <div className="flex h-10 w-10 flex-none items-center justify-center">
                <IconLogout width={20} height={20} aria-hidden />
              </div>
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.span
                    key="logout-label"
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={isExpanded ? FADE_IN : FADE_OUT}
                    className="flex-1 overflow-hidden text-[13px] font-semibold whitespace-nowrap"
                  >
                    {tSidebar('logout')}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </button>
        </div>
      )}
    </motion.aside>
  );
}

function PCProfileCard({ isExpanded }: { isExpanded: boolean }) {
  const user = useUser();
  const tSidebar = useTranslations('sidebar');
  const tPlan = useTranslations('plan');
  const remainingDays = user
    ? getSubscriptionRemainingDays(user.subscribeEndAt)
    : 0;

  return (
    <div
      className="group relative z-50 mt-6 flex min-h-[66px] items-center gap-2.5 rounded-2xl p-3"
      style={{
        background: 'rgba(255,255,255,.13)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(255,255,255,.18)',
      }}
    >
      <motion.div
        whileHover={{ rotate: -6, scale: 1.08 }}
        transition={HOVER_SPRING}
      >
        <UserAvatar size={42} radius={14} />
      </motion.div>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="profile-text"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={isExpanded ? FADE_IN : FADE_OUT}
            className="flex h-[42px] flex-col justify-center overflow-hidden"
          >
            {user ? (
              <>
                <div className="text-sm font-bold whitespace-nowrap">
                  {user.name}
                </div>
                <div
                  className="text-[10px] whitespace-nowrap"
                  style={{ color: 'rgba(255,255,255,.75)' }}
                >
                  ✨ {tPlan(user.plan)} · D-{remainingDays}
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-bold whitespace-nowrap">
                  {tSidebar('guest')}
                </div>
                <Link
                  href="/signup"
                  className="inline-block text-[10px] whitespace-nowrap underline decoration-white/40 underline-offset-2"
                  style={{ color: 'rgba(255,255,255,.85)' }}
                >
                  {tSidebar('loginOrSignup')}
                </Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {user && <ProfileTooltip />}
    </div>
  );
}

function PCMenuLink({
  item,
  isActive,
  isExpanded,
  count,
}: {
  item: MenuItem;
  isActive: boolean;
  isExpanded: boolean;
  count: number;
}) {
  const t = useTranslations('menu');
  const label = t(item.id);
  const subPc = t(`${item.id}SubPc`);
  return (
    <Link
      href={item.href}
      className="group relative block w-full overflow-visible rounded-[14px] text-left text-white"
    >
      <div
        className={cn(
          'absolute inset-0 rounded-[14px] transition-[background,box-shadow] duration-200',
          isActive
            ? 'bg-white/[.18] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.3),0_10px_24px_rgba(0,0,0,0.15)]'
            : 'group-hover:bg-white/10',
        )}
      />
      <div
        className={cn(
          'absolute top-3 bottom-3 left-1.5 w-[3px] origin-center rounded-[3px] transition-transform duration-[350ms] ease-[cubic-bezier(.7,-.2,.3,1.2)]',
          isActive ? 'scale-y-100' : 'scale-y-0',
        )}
        style={{ background: item.accent }}
      />
      <div className="relative flex items-center gap-3 px-3.5 py-2.5">
        <div
          className={cn(
            'flex h-10 w-10 flex-none items-center justify-center rounded-xl',
            isActive ? 'bg-white' : 'bg-white/10',
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
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="text"
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={isExpanded ? FADE_IN : FADE_OUT}
              className="flex-1 overflow-hidden"
            >
              <div className="text-[15px] font-bold whitespace-nowrap">
                {label}
              </div>
              <div
                className="text-[10px] whitespace-nowrap"
                style={{ color: 'rgba(255,255,255,.65)' }}
              >
                {subPc}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {count > 0 && isExpanded && (
            <motion.div
              key="count"
              initial={{ opacity: 0, scale: 0.6, width: 0, marginLeft: 0 }}
              animate={{
                opacity: 1,
                scale: 1,
                width: 'auto',
                marginLeft: 0,
              }}
              exit={{ opacity: 0, scale: 0.6, width: 0 }}
              transition={isExpanded ? FADE_IN : FADE_OUT}
              className={cn(
                'flex h-[22px] min-w-[22px] flex-none items-center justify-center overflow-hidden rounded-[11px] px-1.5 text-[11px] font-bold',
                isActive ? 'bg-white' : 'bg-white/[.22]',
              )}
              style={{ color: isActive ? item.accent : '#fff' }}
            >
              {count}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!isExpanded && (
        <div
          className="pointer-events-none absolute top-1/2 left-[calc(100%+14px)] z-20 -translate-y-1/2 rounded-[10px] px-3 py-2 whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{
            background: '#0b2a63',
            color: '#fff',
            boxShadow: '0 10px 24px rgba(0,0,0,.25)',
          }}
        >
          <div
            className="absolute top-1/2 -left-1 h-2.5 w-2.5 -translate-y-1/2 rotate-45"
            style={{ background: '#0b2a63' }}
          />
          <div className="flex items-center gap-2 text-[13px] font-bold">
            <span>{label}</span>
            {count > 0 && (
              <span
                className="flex h-[18px] min-w-[18px] items-center justify-center rounded-[9px] px-1.5 text-[10px] font-bold"
                style={{ background: item.accent }}
              >
                {count}
              </span>
            )}
          </div>
          <div
            className="mt-0.5 text-[10px]"
            style={{ color: 'rgba(255,255,255,.7)' }}
          >
            {subPc}
          </div>
        </div>
      )}
    </Link>
  );
}

function ProfileTooltip() {
  const user = useUser();
  const tSidebar = useTranslations('sidebar');
  const tPlan = useTranslations('plan');
  if (!user) return null;
  const remainingDays = getSubscriptionRemainingDays(user.subscribeEndAt);
  const endDate = user.subscribeEndAt.slice(0, 10);

  return (
    <div
      className="pointer-events-none absolute top-1/2 left-[calc(100%+14px)] z-[100] w-[200px] -translate-x-1 -translate-y-1/2 rounded-[12px] px-3.5 py-3 whitespace-nowrap opacity-0 transition-[opacity,transform] duration-200 group-hover:translate-x-0 group-hover:opacity-100"
      style={{
        background: '#0b2a63',
        color: '#fff',
        boxShadow: '0 16px 32px rgba(0,0,0,.28)',
      }}
    >
      <div
        className="absolute top-1/2 -left-1 h-2.5 w-2.5 -translate-y-1/2 rotate-45"
        style={{ background: '#0b2a63' }}
      />
      <div className="flex items-center gap-2">
        <UserAvatar size={32} radius={10} emojiClassName="text-xl" />
        <div>
          <div className="text-[14px] font-bold">{user.name}</div>
          <div
            className="text-[10px]"
            style={{ color: 'rgba(255,255,255,.7)' }}
          >
            {user.description}
          </div>
        </div>
      </div>
      <div
        className="my-2 h-px"
        style={{ background: 'rgba(255,255,255,.15)' }}
      />
      <div className="flex items-center justify-between text-[11px]">
        <span style={{ color: 'rgba(255,255,255,.65)' }}>{tSidebar('tooltipPlan')}</span>
        <span className="font-bold">✨ {tPlan(user.plan)}</span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px]">
        <span style={{ color: 'rgba(255,255,255,.65)' }}>{tSidebar('tooltipPeriod')}</span>
        <span className="font-bold">
          {endDate} (D-{remainingDays})
        </span>
      </div>
    </div>
  );
}
