'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import Row from '@/app/(main)/setting/Row';
import { alert, confirm } from '@/dialog';
import { signOutLocal } from '@/lib/auth-api';
import { useChildren, useUserActions } from '@/stores/userStore';

export default function DangerTab() {
  const router = useRouter();
  const { signOut } = useUserActions();
  const children = useChildren();
  const t = useTranslations('setting.danger');
  const tCommon = useTranslations('common');

  const handleSignOut = async () => {
    const ok = await confirm(t('logoutConfirmMsg'), {
      title: t('logoutConfirmTitle'),
      yesButtonText: t('logoutConfirmYes'),
      noButtonText: tCommon('cancel'),
    });
    if (!ok) return;
    signOutLocal();
    signOut();
    router.replace('/signin');
  };

  const handleDeleteChildren = () => {
    if (children.length === 0) {
      void alert(t('noChildrenAlert'));
      return;
    }
    router.push('/setting/children/delete');
  };

  return (
    <>
      <Row icon="🚪" title={t('logout')} sub={t('logoutSub')} onClick={handleSignOut} />
      <Row
        icon="👶"
        title={t('deleteChildren')}
        sub={
          children.length > 0
            ? t('deleteChildrenSub', { count: children.length })
            : t('deleteChildrenEmpty')
        }
        onClick={handleDeleteChildren}
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
          <span className="text-[13px] font-bold text-[#DC2626]">{t('withdrawTitle')}</span>
        </div>
        <p className="text-[11.5px] leading-[1.5] text-[#5C6F90]">
          {t('withdrawDescLine1')}
          <br />
          {t('withdrawDescLine2')}
        </p>
        <button
          type="button"
          onClick={() => router.push('/setting/withdraw')}
          className="mt-3 cursor-pointer rounded-full border-[1.5px] border-[#EF4444]/40 bg-transparent px-4 py-[9px] text-[12px] font-bold text-[#DC2626]"
        >
          {t('withdrawCta')}
        </button>
      </div>
    </>
  );
}
