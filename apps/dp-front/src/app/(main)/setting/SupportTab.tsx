'use client';

import ContactModal from '@/app/(main)/setting/ContactModal';
import FaqAccordion from '@/app/(main)/setting/FaqAccordion';
import Row from '@/app/(main)/setting/Row';
import { alert, openDialog } from '@/dialog';

const COMING_SOON_MSG = '준비 중인 기능이에요.';
const notifyComingSoon = () => {
  void alert(COMING_SOON_MSG);
};
const openContactDialog = () => {
  void openDialog(ContactModal);
};

export default function SupportTab() {
  return (
    <>
      <div className="px-1 pt-1">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[14px]">❓</span>
          <span className="text-[13px] font-bold text-[#0b2a63]">자주 묻는 질문</span>
        </div>
        <FaqAccordion />
      </div>

      <Row
        icon="💬"
        title="문의하기"
        sub="help@artbonbon.com · 평일 10:00 ~ 18:00"
        onClick={openContactDialog}
      />
      <Row icon="📜" title="이용약관" onClick={notifyComingSoon} />
      <Row icon="🔐" title="개인정보 처리방침" onClick={notifyComingSoon} />
      <Row icon="©️" title="이벤트 저작권 안내" onClick={notifyComingSoon} />
      <Row icon="ℹ️" title="버전" right={<span className="text-[12px] text-[#8AA0BD]">1.0.0</span>} last />
    </>
  );
}
