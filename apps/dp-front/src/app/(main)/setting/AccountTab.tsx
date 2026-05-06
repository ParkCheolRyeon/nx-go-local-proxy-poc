'use client';

import { useRouter } from 'next/navigation';

import Row from '@/app/(main)/setting/Row';
import UserAvatar from '@/app/components/UserAvatar';
import { alert } from '@/dialog';
import { PLAN_LABELS, useUser } from '@/stores/userStore';

const COMING_SOON_MSG = '준비 중인 기능이에요.';
const notifyComingSoon = () => {
  void alert(COMING_SOON_MSG);
};

export default function AccountTab() {
  const router = useRouter();
  const user = useUser();

  if (!user) {
    return (
      <div className="rounded-[14px] border border-dashed border-[#1C7AE0]/[0.24] bg-white/70 px-4 py-10 text-center">
        <div className="text-[14px] font-semibold text-[#0b2a63]">로그인이 필요해요</div>
        <p className="mt-1 text-[12px] text-[#5C6F90]">계정 정보를 보려면 로그인해 주세요.</p>
      </div>
    );
  }

  const planLabel = PLAN_LABELS[user.plan];
  const childNames =
    user.children.length > 0 ? user.children.map((c) => c.name).join(' · ') : '추가된 자녀가 없어요';

  return (
    <>
      <div
        className="mb-3.5 flex items-center gap-3.5 rounded-[18px] border border-[#1C7AE0]/[0.14] p-[18px]"
        style={{ background: 'linear-gradient(135deg,#EAF2FE 0%,#D6E8FF 100%)' }}
      >
        <UserAvatar
          size={56}
          radius={18}
          emojiClassName="text-[28px]"
          style={{
            background: 'linear-gradient(135deg,#3196ff,#1C7AE0)',
            color: '#fff',
            boxShadow: '0 8px 18px rgba(28,122,224,0.32)',
          }}
        />

        <div className="min-w-0 flex-1">
          <div className="truncate text-[19px] font-extrabold text-[#0b2a63]">{user.name}</div>
          <div className="mt-0.5 truncate text-[11.5px] text-[#5C6F90]">{user.description}</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="rounded-full border border-[#3196ff]/[0.24] bg-white px-2.5 py-[3px] text-[10.5px] font-bold text-[#1C7AE0]">
              가족 계정
            </span>
            <span
              className="rounded-full px-2.5 py-[3px] text-[10.5px] font-bold text-[#7a4a06]"
              style={{ background: 'linear-gradient(135deg,#FFD166,#FBBF24)' }}
            >
              ✨ {planLabel}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={notifyComingSoon}
          className="flex-none cursor-pointer rounded-full border-[1.5px] border-[#1C7AE0]/[0.24] bg-white px-3.5 py-2 text-[12px] font-bold text-[#1C7AE0]"
        >
          편집
        </button>
      </div>
      <Row
        icon="👶"
        title="자녀 프로필 관리"
        sub={`${childNames} (${user.children.length} / 5명)`}
        onClick={() => router.push('/setting/children')}
      />
      <Row
        icon="🔐"
        title="비밀번호 변경"
        sub="6개월마다 변경 권장"
        onClick={() => router.push('/setting/account/password')}
      />
      <Row icon="🪪" title="본인확인 정보" sub="PASS · 1년 캐시" onClick={notifyComingSoon} />
      <Row
        icon="🌐"
        title="언어"
        sub="한국어"
        onClick={() => router.push('/setting/account/language')}
      />
      <Row
        icon="🇰🇷"
        title="국가 / 지역"
        sub="대한민국"
        onClick={() => router.push('/setting/account/country')}
        last
      />
    </>
  );
}
