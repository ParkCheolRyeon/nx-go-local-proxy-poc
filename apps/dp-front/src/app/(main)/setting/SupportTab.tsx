'use client';

import { useTranslations } from 'next-intl';

import ContactModal from '@/app/(main)/setting/ContactModal';
import FaqAccordion from '@/app/(main)/setting/FaqAccordion';
import Row from '@/app/(main)/setting/Row';
import { alert, openDialog } from '@/dialog';

export default function SupportTab() {
  const t = useTranslations('setting.support');
  const tDialog = useTranslations('dialog');
  const notifyComingSoon = () => {
    void alert(tDialog('comingSoon'));
  };
  const openContactDialog = () => {
    void openDialog(ContactModal);
  };

  return (
    <>
      <div className="px-1 pt-1">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-[14px]">❓</span>
          <span className="text-[13px] font-bold text-[#0b2a63]">{t('faqHeading')}</span>
        </div>
        <FaqAccordion />
      </div>

      <Row
        icon="💬"
        title={t('contact')}
        sub={t('contactSub')}
        onClick={openContactDialog}
      />
      <Row icon="📜" title={t('terms')} onClick={notifyComingSoon} />
      <Row icon="🔐" title={t('privacy')} onClick={notifyComingSoon} />
      <Row icon="©️" title={t('copyright')} onClick={notifyComingSoon} />
      <Row icon="ℹ️" title={t('version')} right={<span className="text-[12px] text-[#8AA0BD]">{t('versionValue')}</span>} last />
    </>
  );
}
