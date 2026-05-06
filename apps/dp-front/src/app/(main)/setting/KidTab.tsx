'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import Row from '@/app/(main)/setting/Row';
import Toggle from '@/app/(main)/setting/Toggle';
import { alert } from '@/dialog';
import { ApiError } from '@/lib/api';
import {
  getMyPreferences,
  type PatchPreferencesInput,
  patchMyPreferences,
  type Preferences,
} from '@/lib/preferences-api';

type KidKey = 'safeMode' | 'paymentLock' | 'togetherChat';

const FALLBACK: Pick<Preferences, KidKey> = {
  safeMode: true,
  paymentLock: true,
  togetherChat: false,
};

export default function KidTab() {
  const [tweaks, setTweaks] = useState<Pick<Preferences, KidKey>>(FALLBACK);
  const [loaded, setLoaded] = useState(false);
  const t = useTranslations('setting.kid');
  const tDialog = useTranslations('dialog');
  const notifyComingSoon = () => {
    void alert(tDialog('comingSoon'));
  };

  useEffect(() => {
    let cancelled = false;
    getMyPreferences()
      .then((p) => {
        if (cancelled) return;
        setTweaks({
          safeMode: p.safeMode,
          paymentLock: p.paymentLock,
          togetherChat: p.togetherChat,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        if (!(err instanceof ApiError) || err.status !== 401) {
          console.error('preferences load failed', err);
        }
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setT = <K extends KidKey>(key: K, value: Pick<Preferences, KidKey>[K]) => {
    if (!loaded) return;
    setTweaks((cur) => {
      const prev = cur;
      const next = { ...cur, [key]: value };
      void (async () => {
        try {
          await patchMyPreferences({ [key]: value } as PatchPreferencesInput);
        } catch (err) {
          setTweaks(prev);
          if (err instanceof ApiError && err.status === 401) return;
          void alert(t('saveFailed'), { tone: 'warning' });
        }
      })();
      return next;
    });
  };

  return (
    <>
      <Row
        icon="🛡"
        title={t('safeMode')}
        sub={t('safeModeSub')}
        right={<Toggle on={tweaks.safeMode} onClick={() => setT('safeMode', !tweaks.safeMode)} />}
      />
      <Row icon="⏱" title={t('timeLimit')} sub={t('timeLimitSub')} onClick={notifyComingSoon} />
      <Row
        icon="🔒"
        title={t('paymentLock')}
        sub={t('paymentLockSub')}
        right={<Toggle on={tweaks.paymentLock} onClick={() => setT('paymentLock', !tweaks.paymentLock)} />}
      />
      <Row
        icon="💬"
        title={t('togetherChat')}
        sub={t('togetherChatSub')}
        right={<Toggle on={tweaks.togetherChat} onClick={() => setT('togetherChat', !tweaks.togetherChat)} />}
      />
      <Row icon="👨‍👩‍👧" title={t('consent')} sub={t('consentSub')} onClick={notifyComingSoon} last />
    </>
  );
}
