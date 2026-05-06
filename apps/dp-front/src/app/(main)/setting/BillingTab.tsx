'use client';

import { useTranslations } from 'next-intl';

import Row from '@/app/(main)/setting/Row';
import { alert } from '@/dialog';

export default function BillingTab() {
  const t = useTranslations('setting.billing');
  const tDialog = useTranslations('dialog');
  const notifyComingSoon = () => {
    void alert(tDialog('comingSoon'));
  };

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
          <span className="text-[11px] font-bold tracking-[1px] opacity-85">{t('tag')}</span>
        </div>
        <div className="mt-1.5 text-[26px] font-extrabold">{t('monthlyTitle')}</div>
        <div className="mt-1 text-[12px] opacity-85">{t('nextPayment')}</div>
        <div className="mt-3.5 flex gap-2">
          <button
            type="button"
            onClick={notifyComingSoon}
            className="cursor-pointer rounded-full bg-white px-4 py-[9px] text-[12.5px] font-bold text-[#1C7AE0]"
          >
            {t('switchYearly')}
          </button>
          <button
            type="button"
            onClick={notifyComingSoon}
            className="cursor-pointer rounded-full border-[1.5px] border-white/40 bg-transparent px-4 py-[9px] text-[12.5px] font-bold text-white"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
      <Row
        icon="🪙"
        title={t('wallet')}
        sub={t('walletSub')}
        right={
          <span className="flex items-center gap-1.5">
            <span className="text-[18px] font-extrabold text-[#1C7AE0]">3</span>
            <span className="text-[11px] text-[#8AA0BD]">{t('coinUnit')}</span>
            <span className="text-[16px] text-[#8AA0BD]">›</span>
          </span>
        }
        onClick={notifyComingSoon}
      />
      <Row icon="🛒" title={t('buy')} sub={t('buySub')} onClick={notifyComingSoon} />
      <Row icon="🧾" title={t('history')} sub={t('historySub')} onClick={notifyComingSoon} />
      <Row icon="↩️" title={t('refund')} sub={t('refundSub')} onClick={notifyComingSoon} />
      <Row icon="📩" title={t('receiptEmail')} sub={t('receiptEmailValue')} onClick={notifyComingSoon} last />
    </>
  );
}
