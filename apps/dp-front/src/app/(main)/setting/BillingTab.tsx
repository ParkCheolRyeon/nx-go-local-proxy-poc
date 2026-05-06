'use client';

import Row from '@/app/(main)/setting/Row';
import { alert } from '@/dialog';

const COMING_SOON_MSG = '준비 중인 기능이에요.';
const notifyComingSoon = () => {
  void alert(COMING_SOON_MSG);
};

export default function BillingTab() {
  return (
    <>
      <div
        className="relative mb-3.5 overflow-hidden rounded-[18px] border border-[#1C7AE0]/20 p-[18px] text-white"
        style={{
          background: 'linear-gradient(135deg,#0b2a63 0%,#1C7AE0 60%,#3196ff 100%)',
          boxShadow: '0 14px 30px rgba(28,122,224,0.28)',
        }}
      >
        <div className="absolute -right-7 -top-7 h-[140px] w-[140px] rounded-full bg-white/[0.12]" />
        <div className="flex items-center gap-2">
          <span className="text-[14px]">✨</span>
          <span className="text-[11px] font-bold tracking-[1px] opacity-85">IGALLERY PRO</span>
        </div>
        <div className="mt-1.5 text-[26px] font-extrabold">월 구독 중</div>
        <div className="mt-1 text-[12px] opacity-85">다음 결제 · 2026.05.15 · 4,900원</div>
        <div className="mt-3.5 flex gap-2">
          <button
            type="button"
            onClick={notifyComingSoon}
            className="cursor-pointer rounded-full bg-white px-4 py-[9px] text-[12.5px] font-bold text-[#1C7AE0]"
          >
            연 구독으로 변경
          </button>
          <button
            type="button"
            onClick={notifyComingSoon}
            className="cursor-pointer rounded-full border-[1.5px] border-white/40 bg-transparent px-4 py-[9px] text-[12.5px] font-bold text-white"
          >
            구독 취소
          </button>
        </div>
      </div>
      <Row
        icon="🪙"
        title="코인 지갑"
        sub="가입 후 7일간 매일 1개 자동 충전"
        right={
          <span className="flex items-center gap-1.5">
            <span className="text-[18px] font-extrabold text-[#1C7AE0]">3</span>
            <span className="text-[11px] text-[#8AA0BD]">개</span>
            <span className="text-[16px] text-[#8AA0BD]">›</span>
          </span>
        }
        onClick={notifyComingSoon}
      />
      <Row icon="🛒" title="코인 구매" sub="10개 9,900원" onClick={notifyComingSoon} />
      <Row icon="🧾" title="결제 내역" sub="최근 결제 · 2026.04.15" onClick={notifyComingSoon} />
      <Row icon="↩️" title="환불 신청" sub="결제일 30일 이내" onClick={notifyComingSoon} />
      <Row icon="📩" title="영수증 이메일" sub="kim.minsu@email.com" onClick={notifyComingSoon} last />
    </>
  );
}
