'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import BackButton from '@/app/components/BackButton';
import { alert } from '@/dialog';
import { ApiError } from '@/lib/api';
import {
  DEFAULT_LOCALE,
  readLocaleCookie,
  type SupportedLocale,
  writeLocaleCookie,
} from '@/lib/locale-cookie';
import { patchMe } from '@/lib/me-api';
import { cn } from '@/lib/utils';

type LangOption = {
  id: SupportedLocale;
  flag: string;
};

const LANGS: LangOption[] = [
  { id: 'ko', flag: '🇰🇷' },
  { id: 'en', flag: '🇺🇸' },
  { id: 'ja', flag: '🇯🇵' },
];

export default function LanguagePage() {
  const router = useRouter();
  const [lang, setLang] = useState<SupportedLocale>(DEFAULT_LOCALE);
  const [submitting, setSubmitting] = useState(false);
  const t = useTranslations('setting.languagePage');
  const tAccount = useTranslations('setting.account');
  const tCommon = useTranslations('common');

  useEffect(() => {
    const stored = readLocaleCookie();
    if (stored) setLang(stored);
  }, []);

  const cur = LANGS.find((l) => l.id === lang) ?? LANGS[0];
  const curName = t(cur.id);
  const curPreview = t(`${cur.id}Preview` as 'koPreview' | 'enPreview' | 'jaPreview');

  const handleSave = async () => {
    setSubmitting(true);
    writeLocaleCookie(lang);
    try {
      await patchMe({ locale: lang });
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 401) {
        setSubmitting(false);
        await alert(tAccount('saveFailedToast'), { tone: 'warning' });
        return;
      }
    }
    setSubmitting(false);
    await alert(tAccount('languageSavedToast', { name: curName }), { tone: 'success' });
    router.replace('/setting/account');
    router.refresh();
  };

  return (
    <section className="flex flex-col gap-[18px]">
      <div className="flex items-start justify-between gap-3">
        <header>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#3196ff]/25 bg-[#3196ff]/[0.12] px-3 py-[5px] text-[11px] font-bold tracking-[0.8px] text-[#1C7AE0]">
            <span>🌐</span>
            <span>{t('tag')}</span>
          </div>
          <h2 className="text-[22px] font-extrabold leading-[1.15] tracking-[-0.3px] text-[#0b2a63]">{t('title')}</h2>
          <p className="mt-1 text-[12px] text-[#5C6F90]">{t('subtitle')}</p>
        </header>
        <BackButton href="/setting/account" />
      </div>

      <div className="flex flex-col gap-3.5 rounded-[22px] border border-[#1C7AE0]/[0.14] bg-white/90 p-[22px] shadow-[0_14px_36px_rgba(28,122,224,0.12)] backdrop-blur-[14px]">
        <div
          className="relative overflow-hidden rounded-[16px] px-[18px] py-[18px] text-white"
          style={{
            background: 'linear-gradient(135deg,#0b2a63 0%,#1C7AE0 60%,#3196ff 100%)',
            boxShadow: '0 12px 28px rgba(28,122,224,0.28)',
          }}
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-[130px] w-[130px] rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          />
          <div className="relative">
            <div className="text-[11px] font-bold tracking-[1px] opacity-85">{t('previewLabel')} · {curName}</div>
            <div className="mt-2 flex items-center gap-3">
              <span className="text-[36px]">{cur.flag}</span>
              <div>
                <div className="text-[18px] font-extrabold leading-[1.2]">{curPreview}</div>
                <div className="mt-1 text-[12px] opacity-80">{t('previewNote')}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {LANGS.map((l) => {
            const on = lang === l.id;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => setLang(l.id)}
                aria-pressed={on}
                className={cn(
                  'flex cursor-pointer items-center gap-3.5 rounded-[14px] border-[1.5px] px-3.5 py-3 text-left transition-[background,border-color]',
                  on
                    ? 'border-[#3196ff]/[0.32] bg-[#3196ff]/[0.08]'
                    : 'border-transparent bg-transparent hover:bg-[#3196ff]/[0.06]',
                )}
              >
                <span className="text-[24px]">{l.flag}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-bold text-[#0b2a63]">{t(l.id)}</div>
                  <div className="text-[11.5px] text-[#8AA0BD]">{t(`${l.id}Sub` as 'koSub' | 'enSub' | 'jaSub')}</div>
                </div>
                <div
                  className={cn(
                    'flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] font-extrabold text-white',
                    on ? 'border-0' : 'border-[1.5px] border-[#1C7AE0]/[0.25] bg-white',
                  )}
                  style={
                    on
                      ? {
                          background: 'linear-gradient(135deg,#3196ff,#1C7AE0)',
                          boxShadow: '0 4px 10px rgba(28,122,224,0.3)',
                        }
                      : undefined
                  }
                >
                  {on ? '✓' : ''}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-1 flex justify-end gap-2.5">
        <button
          type="button"
          onClick={() => router.replace('/setting/account')}
          className="cursor-pointer rounded-full border-[1.5px] border-[#1C7AE0]/[0.18] bg-white px-[22px] py-3 text-[13.5px] font-bold text-[#5C6F90] transition-colors hover:bg-[#3196ff]/[0.06]"
        >
          {tCommon('cancel')}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={submitting}
          className={cn(
            'rounded-full border-0 px-[26px] py-3 text-[13.5px] font-bold text-white transition-[transform,box-shadow]',
            submitting
              ? 'cursor-not-allowed bg-[rgba(148,163,184,0.5)]'
              : 'cursor-pointer bg-[linear-gradient(135deg,#3196ff,#1C7AE0)] shadow-[0_10px_22px_rgba(28,122,224,0.32)] hover:-translate-y-px hover:shadow-[0_12px_24px_rgba(28,122,224,0.34)]',
          )}
        >
          {submitting ? tCommon('saving') : tCommon('save')}
        </button>
      </div>
    </section>
  );
}
