'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { alert } from '@/dialog';

export default function CancelClient() {
  const router = useRouter();
  const t = useTranslations('withdraw.cancelPage');

  const STATS: { i: string; nKey: 'stat1Value' | 'stat2Value' | 'stat3Value'; lKey: 'stat1' | 'stat2' | 'stat3' }[] = [
    { i: '🎨', nKey: 'stat1Value', lKey: 'stat1' },
    { i: '🏆', nKey: 'stat2Value', lKey: 'stat2' },
    { i: '🪙', nKey: 'stat3Value', lKey: 'stat3' },
  ];

  const handleCancel = async () => {
    await alert(t('successToast'), { tone: 'success' });
    router.replace('/');
  };

  const handleProceed = () => {
    router.replace('/');
  };

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden"
      style={{ background: 'linear-gradient(180deg,#EAF2FE 0%,#F7FAFF 60%,#FFFFFF 100%)' }}
    >
      <div
        className="pointer-events-none absolute -right-32 -top-40 h-[380px] w-[380px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,200,102,0.45), rgba(255,200,102,0) 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-36 -left-24 h-[360px] w-[360px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(49,150,255,0.30), rgba(49,150,255,0) 70%)' }}
      />

      <main
        className="relative z-10 flex min-h-[100dvh] items-center justify-center px-6 py-12"
        style={{ animation: 'st-fade .45s cubic-bezier(.22,1,.36,1) both' }}
      >
        <div className="flex w-full max-w-[620px] flex-col items-center gap-4 rounded-[24px] border border-[#1C7AE0]/[0.14] bg-white/95 p-8 text-center shadow-[0_14px_36px_rgba(28,122,224,0.12)] backdrop-blur-[14px]">
          <div
            className="flex h-[84px] w-[84px] items-center justify-center rounded-full text-[40px] shadow-[0_12px_30px_rgba(244,138,13,0.32)]"
            style={{ background: 'linear-gradient(135deg,#FFB84D,#F48A0D)' }}
          >
            👋
          </div>

          <div>
            <div className="inline-block rounded-full bg-[#EF4444]/[0.10] px-3 py-1 text-[11px] font-bold tracking-[0.6px] text-[#B91C1C]">
              {t('remainingDays')}
            </div>
            <div className="mt-3 text-[30px] font-extrabold leading-[1.2] text-[#0b2a63]">{t('title')}</div>
            <div className="mt-2 text-[14px] leading-[1.55] text-[#5C6F90]">{t('description')}</div>
          </div>

          <div
            className="grid w-full grid-cols-3 gap-2.5 rounded-[14px] border-[1.5px] border-[#3196ff]/[0.22] px-4 py-3.5"
            style={{ background: 'linear-gradient(135deg, rgba(49,150,255,0.10), rgba(49,150,255,0.02))' }}
          >
            {STATS.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-[20px]">{s.i}</div>
                <div className="mt-0.5 text-[18px] font-extrabold text-[#0b2a63]">{t(s.nKey)}</div>
                <div className="text-[11px] text-[#8AA0BD]">{t(s.lKey)}</div>
              </div>
            ))}
          </div>

          <div className="mt-1 flex w-full gap-2.5">
            <button
              type="button"
              onClick={handleProceed}
              className="flex-1 cursor-pointer rounded-[14px] border-[1.5px] border-[#1C7AE0]/[0.22] bg-white px-[22px] py-3.5 text-[13.5px] font-bold text-[#5C6F90]"
            >
              {t('proceed')}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex-[2] cursor-pointer rounded-[14px] border-0 bg-[linear-gradient(135deg,#3196ff,#1C7AE0)] px-[22px] py-3.5 text-[14.5px] font-bold text-white shadow-[0_12px_28px_rgba(28,122,224,0.36)] transition-transform hover:-translate-y-px"
            >
              {t('cancel')}
            </button>
          </div>

          <div className="mt-1 text-[11.5px] text-[#8AA0BD]">{t('footer')}</div>
        </div>
      </main>
    </div>
  );
}
