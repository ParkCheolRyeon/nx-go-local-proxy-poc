'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import Row from '@/app/(main)/setting/Row';
import UserAvatar from '@/app/components/UserAvatar';
import { alert } from '@/dialog';
import { useUser } from '@/stores/userStore';

export default function AccountTab() {
  const router = useRouter();
  const user = useUser();
  const t = useTranslations('setting.account');
  const tDialog = useTranslations('dialog');
  const tPlan = useTranslations('plan');

  const notifyComingSoon = () => {
    void alert(tDialog('comingSoon'));
  };

  if (!user) {
    return (
      <div className="rounded-[14px] border border-dashed border-[#1C7AE0]/[0.24] bg-white/70 px-4 py-10 text-center">
        <div className="text-[14px] font-semibold text-[#0b2a63]">{t('loggedOutTitle')}</div>
        <p className="mt-1 text-[12px] text-[#5C6F90]">{t('loggedOutSub')}</p>
      </div>
    );
  }

  const planLabel = tPlan(user.plan);
  const childNames =
    user.children.length > 0 ? user.children.map((c) => c.name).join(' · ') : t('noChildren');

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
              {t('familyAccount')}
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
          {t('edit')}
        </button>
      </div>
      <Row
        icon="👶"
        title={t('childrenManage')}
        sub={t('childrenSub', { names: childNames, count: user.children.length })}
        onClick={() => router.push('/setting/children')}
      />
      <Row
        icon="🔐"
        title={t('password')}
        sub={t('passwordSub')}
        onClick={() => router.push('/setting/account/password')}
      />
      <Row icon="🪪" title={t('identity')} sub={t('identitySub')} onClick={notifyComingSoon} />
      <Row
        icon="🌐"
        title={t('language')}
        sub={t('languageValue')}
        onClick={() => router.push('/setting/account/language')}
      />
      <Row
        icon="🇰🇷"
        title={t('country')}
        sub={t('countryValue')}
        onClick={() => router.push('/setting/account/country')}
        last
      />
    </>
  );
}
