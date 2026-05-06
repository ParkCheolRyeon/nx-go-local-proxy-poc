'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import Row from '@/app/(main)/setting/Row';
import SettingBox from '@/app/(main)/setting/SettingBox';
import TimeField from '@/app/(main)/setting/TimeField';
import Toggle from '@/app/(main)/setting/Toggle';
import { alert } from '@/dialog';
import { ApiError } from '@/lib/api';
import {
  getMyPreferences,
  type PatchPreferencesInput,
  patchMyPreferences,
  type Preferences,
} from '@/lib/preferences-api';

type AppKey =
  | 'notifDrawing'
  | 'notifEvent'
  | 'notifSystem'
  | 'notifMarketing'
  | 'dndEnabled'
  | 'dndStart'
  | 'dndEnd';

const FALLBACK: Pick<Preferences, AppKey> = {
  notifDrawing: true,
  notifEvent: true,
  notifSystem: true,
  notifMarketing: false,
  dndEnabled: false,
  dndStart: '22:00',
  dndEnd: '08:00',
};

const TIME_FIELD_DEBOUNCE_MS = 500;

export default function AppTab() {
  const [tweaks, setTweaks] = useState<Pick<Preferences, AppKey>>(FALLBACK);
  const [loaded, setLoaded] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = useTranslations('setting.app');

  useEffect(() => {
    let cancelled = false;
    getMyPreferences()
      .then((p) => {
        if (cancelled) return;
        setTweaks({
          notifDrawing: p.notifDrawing,
          notifEvent: p.notifEvent,
          notifSystem: p.notifSystem,
          notifMarketing: p.notifMarketing,
          dndEnabled: p.dndEnabled,
          dndStart: p.dndStart,
          dndEnd: p.dndEnd,
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

  const persist = async (patch: PatchPreferencesInput, prev: Pick<Preferences, AppKey>) => {
    try {
      await patchMyPreferences(patch);
    } catch (err) {
      setTweaks(prev);
      if (err instanceof ApiError && err.status === 401) return;
      void alert(t('saveFailed'), { tone: 'warning' });
    }
  };

  const setT = <K extends AppKey>(key: K, value: Pick<Preferences, AppKey>[K]) => {
    if (!loaded) return;
    setTweaks((cur) => {
      const prev = cur;
      const next = { ...cur, [key]: value };
      if (key === 'dndStart' || key === 'dndEnd') {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
          void persist({ [key]: value } as PatchPreferencesInput, prev);
        }, TIME_FIELD_DEBOUNCE_MS);
      } else {
        void persist({ [key]: value } as PatchPreferencesInput, prev);
      }
      return next;
    });
  };

  return (
    <>
      <SettingBox icon="🔔" title={t('boxNotif')}>
        <Row
          icon="🎨"
          title={t('drawing')}
          sub={t('drawingSub')}
          right={<Toggle on={tweaks.notifDrawing} onClick={() => setT('notifDrawing', !tweaks.notifDrawing)} />}
        />
        <Row
          icon="🏆"
          title={t('event')}
          sub={t('eventSub')}
          right={<Toggle on={tweaks.notifEvent} onClick={() => setT('notifEvent', !tweaks.notifEvent)} />}
        />
        <Row
          icon="🛎"
          title={t('system')}
          sub={t('systemSub')}
          right={<Toggle on={tweaks.notifSystem} onClick={() => setT('notifSystem', !tweaks.notifSystem)} />}
        />
        <Row
          icon="📢"
          title={t('marketing')}
          sub={t('marketingSub')}
          right={<Toggle on={tweaks.notifMarketing} onClick={() => setT('notifMarketing', !tweaks.notifMarketing)} />}
          last
        />
      </SettingBox>

      <SettingBox icon="🌙" title={t('boxDnd')}>
        <Row
          icon="🌙"
          title={t('dnd')}
          sub={t('dndSub')}
          right={<Toggle on={tweaks.dndEnabled} onClick={() => setT('dndEnabled', !tweaks.dndEnabled)} />}
          last={!tweaks.dndEnabled}
        />
        {tweaks.dndEnabled && (
          <>
            <Row
              icon="⏰"
              title={t('dndStart')}
              right={
                <TimeField
                  value={tweaks.dndStart}
                  onChange={(v) => setT('dndStart', v)}
                  ariaLabel={t('dndStartAria')}
                />
              }
            />
            <Row
              icon="🌅"
              title={t('dndEnd')}
              right={
                <TimeField value={tweaks.dndEnd} onChange={(v) => setT('dndEnd', v)} ariaLabel={t('dndEndAria')} />
              }
              last
            />
          </>
        )}
      </SettingBox>
    </>
  );
}
