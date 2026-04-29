'use client';

import Row from '@/app/(main)/setting/Row';
import Toggle from '@/app/(main)/setting/Toggle';
import { type SetTweak, type Tweaks } from '@/app/(main)/setting/page';

const COMING_SOON_MSG = '준비 중인 기능이에요.';
const notifyComingSoon = () => window.alert(COMING_SOON_MSG);

type KidTabProps = {
  tweaks: Tweaks;
  setT: SetTweak;
};

export default function KidTab({ tweaks, setT }: KidTabProps) {
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
