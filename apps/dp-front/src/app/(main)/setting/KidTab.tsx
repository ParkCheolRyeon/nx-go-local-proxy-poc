'use client';

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

const COMING_SOON_MSG = '준비 중인 기능이에요.';
const notifyComingSoon = () => {
  void alert(COMING_SOON_MSG);
};

type KidKey = 'safeMode' | 'paymentLock' | 'togetherChat';

const FALLBACK: Pick<Preferences, KidKey> = {
  safeMode: true,
  paymentLock: true,
  togetherChat: false,
};

export default function KidTab() {
  const [tweaks, setTweaks] = useState<Pick<Preferences, KidKey>>(FALLBACK);
  const [loaded, setLoaded] = useState(false);

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
          void alert('변경사항을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.', { tone: 'warning' });
        }
      })();
      return next;
    });
  };

  return (
    <>
      <Row
        icon="🛡"
        title="자녀 보호 모드"
        sub="안전한 콘텐츠만 노출"
        right={<Toggle on={tweaks.safeMode} onClick={() => setT('safeMode', !tweaks.safeMode)} />}
      />
      <Row icon="⏱" title="이용 시간 제한" sub="하루 1시간 30분" onClick={notifyComingSoon} />
      <Row
        icon="🔒"
        title="결제 비밀번호"
        sub="자녀 결제 차단"
        right={<Toggle on={tweaks.paymentLock} onClick={() => setT('paymentLock', !tweaks.paymentLock)} />}
      />
      <Row
        icon="💬"
        title="함께 그리기 채팅"
        sub="2인 합방에서의 대화 허용"
        right={<Toggle on={tweaks.togetherChat} onClick={() => setT('togetherChat', !tweaks.togetherChat)} />}
      />
      <Row icon="👨‍👩‍👧" title="법정대리인 동의 이력" sub="만 14세 미만 자녀 1명" onClick={notifyComingSoon} last />
    </>
  );
}
