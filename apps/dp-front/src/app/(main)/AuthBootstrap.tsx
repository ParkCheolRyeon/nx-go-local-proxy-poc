'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';

import { ApiError, getStoredAccessToken } from '@/lib/api';
import { getMe, signOutLocal } from '@/lib/auth-api';
import { apiChildToStoreChild, listChildren } from '@/lib/children-api';
import { getMyWallet } from '@/lib/coins-api';
import { isSupportedLocale, readLocaleCookie, writeLocaleCookie } from '@/lib/locale-cookie';
import { listNotifications } from '@/lib/notifications-api';
import { apiUserToStoreUser } from '@/lib/userAdapter';
import { useHasHydrated, useUser, useUserActions } from '@/stores/userStore';

export default function AuthBootstrap({ children }: { children: ReactNode }) {
  const router = useRouter();
  const user = useUser();
  const { signIn, signOut, setChildren, setHoldingCoins, setNotifications } = useUserActions();

  const hasHydrated = useHasHydrated();
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    if (!hasHydrated) return;

    let cancelled = false;
    async function bootstrap() {
      const token = getStoredAccessToken();
      if (!token) {
        router.replace('/signin');
        return;
      }

      try {
        const [apiUser, apiChildren, wallet, notif] = await Promise.all([
          getMe(),
          listChildren(),
          getMyWallet(),
          listNotifications({ limit: 50 }),
        ]);
        if (cancelled) return;
        signIn(apiUserToStoreUser(apiUser));
        setChildren(apiChildren.map(apiChildToStoreChild));
        setHoldingCoins(wallet.holdingCoins);
        setNotifications(notif.items);

        // 서버 저장 locale을 cookie와 sync (다른 디바이스에서 변경된 값이 있을 수 있음).
        if (isSupportedLocale(apiUser.locale) && readLocaleCookie() !== apiUser.locale) {
          writeLocaleCookie(apiUser.locale);
          router.refresh();
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          signOutLocal();
          signOut();
          router.replace('/signin');
          return;
        }
      } finally {
        if (!cancelled) setBootstrapped(true);
      }
    }

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [hasHydrated]);

  // hydration 전엔 절대 자식 렌더 X — 이게 깜빡임을 막음
  if (!hasHydrated) return null;
  if (!bootstrapped && !user) return null;

  return <>{children}</>;
}
