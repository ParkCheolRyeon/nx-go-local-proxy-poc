'use client';

import Row from '@/app/(main)/setting/Row';

const COMING_SOON_MSG = '준비 중인 기능이에요.';
const notifyComingSoon = () => window.alert(COMING_SOON_MSG);

export default function DangerTab() {
  return (
    <>
      <Row icon="🚪" title="로그아웃" sub="이 기기에서만 로그아웃합니다" onClick={notifyComingSoon} />
      <Row
        icon="👶"
        title="자녀 프로필 삭제"
        sub="자녀별 작품·코인은 함께 정리돼요"
        onClick={notifyComingSoon}
        last
      />
      <div
        className="mt-3.5 rounded-[14px] p-4"
        style={{
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.18)',
        }}
      >
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-[14px]">⚠️</span>
          <span className="text-[13px] font-bold text-[#DC2626]">계정 탈퇴</span>
        </div>
        <p className="text-[11.5px] leading-[1.5] text-[#5C6F90]">
          탈퇴 시 작품·코인·구독이 정리됩니다. 즉시 삭제 또는 30일 유예 중 선택할 수 있어요.
          <br />
          GDPR · COPPA에 따라 ZIP 다운로드와 즉시 삭제 옵션을 제공해요.
        </p>
        <button
          type="button"
          onClick={notifyComingSoon}
          className="mt-3 cursor-pointer rounded-full border-[1.5px] border-[#EF4444]/40 bg-transparent px-4 py-[9px] text-[12px] font-bold text-[#DC2626]"
        >
          탈퇴 진행
        </button>
      </div>
    </>
  );
}
