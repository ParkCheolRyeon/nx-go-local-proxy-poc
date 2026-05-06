import type { FC, SVGProps } from 'react';
import DrawingIcon from '@/app/assets/icons/icon-drawing.svg';
import EventIcon from '@/app/assets/icons/icon-event.svg';
import GalleryIcon from '@/app/assets/icons/icon-my-gallery.svg';
import NotificationIcon from '@/app/assets/icons/icon-notification.svg';
import SettingIcon from '@/app/assets/icons/icon-setting.svg';

export type MenuItem = {
  id: string;
  label: string;
  Icon: FC<SVGProps<SVGSVGElement>>;
  accent: string;
  sub: { mobile: string; pc: string };
  href: string;
};

// 배지 카운트는 hooks/useMenuCounts.ts 에서 동적으로 계산.
export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'draw',
    label: '드로잉',
    Icon: DrawingIcon,
    accent: '#3196ff',
    sub: { mobile: '그리기 시작', pc: '새 캔버스 · 이어그리기' },
    href: '/drawing',
  },
  {
    id: 'event',
    label: '이벤트',
    Icon: EventIcon,
    accent: '#F59E0B',
    sub: { mobile: '공모전 · 배지', pc: '공모전 · 수상 내역' },
    href: '/event',
  },
  {
    id: 'gallery',
    label: '마이갤러리',
    Icon: GalleryIcon,
    accent: '#22C55E',
    sub: { mobile: '내 작품 보관함', pc: '작품 · 타임랩스' },
    href: '/my-gallery',
  },
  {
    id: 'notification',
    label: '알림',
    Icon: NotificationIcon,
    accent: '#D85A30',
    sub: { mobile: '새 소식', pc: '새 소식 · 초대' },
    href: '/notification',
  },
  {
    id: 'setting',
    label: '설정',
    Icon: SettingIcon,
    accent: '#6366F1',
    sub: { mobile: '계정 · 결제', pc: '계정 · 지갑 · 결제' },
    href: '/setting',
  },
];

export const SIDEBAR_BREAKPOINT_PX = 768;

export const INACTIVE_ICON_COLOR = '#ffffff';
