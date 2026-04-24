import { MENU_ITEMS } from '@/config/menu';
import { usePathname } from 'next/navigation';

export function useActiveMenuId() {
  const pathName = usePathname();
  if (!pathName) {
    return null;
  }
  const match = MENU_ITEMS.find(
    (item) => pathName === item.href || pathName.startsWith(`${item.href}/`),
  );

  return match?.id ?? null;
}
