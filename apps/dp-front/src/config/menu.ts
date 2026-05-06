import type { FC, SVGProps } from 'react';
import DrawingIcon from '@/app/assets/icons/icon-drawing.svg';
import EventIcon from '@/app/assets/icons/icon-event.svg';
import GalleryIcon from '@/app/assets/icons/icon-my-gallery.svg';
import NotificationIcon from '@/app/assets/icons/icon-notification.svg';
import SettingIcon from '@/app/assets/icons/icon-setting.svg';

export type MenuItem = {
  id: string;
  Icon: FC<SVGProps<SVGSVGElement>>;
  accent: string;
  href: string;
};

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'draw',
    Icon: DrawingIcon,
    accent: '#3196ff',
    href: '/drawing',
  },
  {
    id: 'event',
    Icon: EventIcon,
    accent: '#F59E0B',
    href: '/event',
  },
  {
    id: 'gallery',
    Icon: GalleryIcon,
    accent: '#22C55E',
    href: '/my-gallery',
  },
  {
    id: 'notification',
    Icon: NotificationIcon,
    accent: '#D85A30',
    href: '/notification',
  },
  {
    id: 'setting',
    Icon: SettingIcon,
    accent: '#6366F1',
    href: '/setting',
  },
];

export const SIDEBAR_BREAKPOINT_PX = 768;

export const INACTIVE_ICON_COLOR = '#ffffff';
