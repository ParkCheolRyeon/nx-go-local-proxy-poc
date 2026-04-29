'use client';

import Row from '@/app/(main)/setting/Row';
import SettingBox from '@/app/(main)/setting/SettingBox';
import TimeField from '@/app/(main)/setting/TimeField';
import Toggle from '@/app/(main)/setting/Toggle';
import { type SetTweak, type Tweaks } from '@/app/(main)/setting/page';

type AppTabProps = {
  tweaks: Tweaks;
  setT: SetTweak;
};

export default function AppTab({ tweaks, setT }: AppTabProps) {
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
