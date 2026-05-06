'use client';

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
        // 401은 AuthBootstrap이 처리. 그 외는 fallback 그대로 표시.
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
      // 실패 시 롤백
      setTweaks(prev);
      if (err instanceof ApiError && err.status === 401) return;
      void alert('변경사항을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.', { tone: 'warning' });
    }
  };

  const setT = <K extends AppKey>(key: K, value: Pick<Preferences, AppKey>[K]) => {
    if (!loaded) return;
    setTweaks((cur) => {
      const prev = cur;
      const next = { ...cur, [key]: value };
      // 토글류는 즉시, TimeField는 디바운스
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
      <SettingBox icon="🔔" title="알림 설정">
        <Row
          icon="🎨"
          title="드로잉"
          sub="그림 리마인더 및 완성 알림"
          right={<Toggle on={tweaks.notifDrawing} onClick={() => setT('notifDrawing', !tweaks.notifDrawing)} />}
        />
        <Row
          icon="🏆"
          title="이벤트"
          sub="신규 이벤트, 출품 및 결과 알림"
          right={<Toggle on={tweaks.notifEvent} onClick={() => setT('notifEvent', !tweaks.notifEvent)} />}
        />
        <Row
          icon="🛎"
          title="시스템"
          sub="중요 서비스 공지 및 업데이트 알림"
          right={<Toggle on={tweaks.notifSystem} onClick={() => setT('notifSystem', !tweaks.notifSystem)} />}
        />
        <Row
          icon="📢"
          title="마케팅"
          sub="프로모션 및 새 기능 소식 알림"
          right={<Toggle on={tweaks.notifMarketing} onClick={() => setT('notifMarketing', !tweaks.notifMarketing)} />}
          last
        />
      </SettingBox>

      <SettingBox icon="🌙" title="방해금지">
        <Row
          icon="🌙"
          title="방해금지 모드"
          sub="설정 시간대에 푸시 알림을 차단합니다."
          right={<Toggle on={tweaks.dndEnabled} onClick={() => setT('dndEnabled', !tweaks.dndEnabled)} />}
          last={!tweaks.dndEnabled}
        />
        {tweaks.dndEnabled && (
          <>
            <Row
              icon="⏰"
              title="시작시간"
              right={
                <TimeField
                  value={tweaks.dndStart}
                  onChange={(v) => setT('dndStart', v)}
                  ariaLabel="방해금지 시작시간"
                />
              }
            />
            <Row
              icon="🌅"
              title="종료시간"
              right={
                <TimeField value={tweaks.dndEnd} onChange={(v) => setT('dndEnd', v)} ariaLabel="방해금지 종료시간" />
              }
              last
            />
          </>
        )}
      </SettingBox>
    </>
  );
}
