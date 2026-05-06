'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';

import { alert } from '@/dialog';
import { ApiError } from '@/lib/api';
import { createSupportInquiry } from '@/lib/support-api';
import { cn } from '@/lib/utils';
import { type DialogRequestComponentProps } from '@/stores/dialogStore';

type ContactModalProps = DialogRequestComponentProps<void>;

export default function ContactModal({ resolve }: ContactModalProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const t = useTranslations('setting.contact');
  const tCommon = useTranslations('common');
  const tDialog = useTranslations('dialog');

  const close = () => resolve();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await createSupportInquiry({ subject: subject.trim(), message: message.trim() });
      setSubject('');
      setMessage('');
      close();
      void alert(t('successToast'), { tone: 'success' });
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : t('errorToast');
      void alert(msg, { tone: 'warning' });
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !submitting && subject.trim().length > 0 && message.trim().length > 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ animation: 'st-fade .2s ease-out both' }}
    >
      <div className="absolute inset-0 bg-[#0b2a63]/45 backdrop-blur-[2px]" onClick={close} aria-hidden />
      <div
        className="relative w-full max-w-[440px] overflow-hidden rounded-[22px] border border-[#1C7AE0]/[0.12] bg-white shadow-[0_24px_60px_rgba(11,42,99,0.28)]"
        style={{ animation: 'st-fade .25s cubic-bezier(.22,1,.36,1) both' }}
      >
        <div
          className="px-5 pb-4 pt-5"
          style={{
            background: 'linear-gradient(135deg,#EAF2FE 0%,#D6E8FF 100%)',
            borderBottom: '1px solid rgba(28,122,224,0.12)',
          }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-[#3196ff]/25 bg-white px-2.5 py-[3px] text-[10.5px] font-bold tracking-[0.6px] text-[#1C7AE0]">
                <span>💬</span>
                <span>{t('tag')}</span>
              </div>
              <h2 id="contact-modal-title" className="text-[20px] font-extrabold tracking-[-0.3px] text-[#0b2a63]">
                {t('title')}
              </h2>
              <p className="mt-1 text-[11.5px] text-[#5C6F90]">{t('subtitle')}</p>
              <a
                href="mailto:help@artbonbon.com"
                className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-[3px] text-[11.5px] font-bold text-[#1C7AE0] underline-offset-2 hover:underline"
              >
                <span>📩</span>
                <span>help@artbonbon.com</span>
              </a>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label={tDialog('closeAriaLabel')}
              className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full bg-white text-[16px] font-light text-[#5C6F90] shadow-[0_2px_6px_rgba(28,122,224,0.18)]"
            >
              ×
            </button>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-3 px-5 py-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] font-bold text-[#0b2a63]">{t('subjectLabel')}</span>
            <input
              type="text"
              value={subject}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
              placeholder={t('subjectPlaceholder')}
              maxLength={60}
              className="rounded-[12px] border border-[#1C7AE0]/[0.18] bg-white px-3 py-2.5 text-[13px] text-[#0b2a63] outline-none placeholder:text-[#8AA0BD] focus:border-[#3196ff] focus:shadow-[0_0_0_4px_rgba(49,150,255,0.18)]"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11.5px] font-bold text-[#0b2a63]">{t('messageLabel')}</span>
            <textarea
              value={message}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
              placeholder={t('messagePlaceholder')}
              rows={6}
              maxLength={1000}
              className="resize-none rounded-[12px] border border-[#1C7AE0]/[0.18] bg-white px-3 py-2.5 text-[13px] leading-[1.55] text-[#0b2a63] outline-none placeholder:text-[#8AA0BD] focus:border-[#3196ff] focus:shadow-[0_0_0_4px_rgba(49,150,255,0.18)]"
            />
            <span className="self-end text-[10.5px] text-[#8AA0BD]">{message.length} / 1000</span>
          </label>

          <div className="mt-1 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="cursor-pointer rounded-full border border-[#1C7AE0]/[0.18] bg-white px-4 py-2 text-[12.5px] font-bold text-[#5C6F90]"
            >
              {tCommon('cancel')}
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                'rounded-full px-4 py-2 text-[12.5px] font-bold text-white shadow-[0_4px_10px_rgba(28,122,224,0.28)] transition-opacity',
                canSubmit ? 'cursor-pointer opacity-100' : 'cursor-not-allowed opacity-50',
              )}
              style={{ background: 'linear-gradient(135deg,#3196ff,#1C7AE0)' }}
            >
              {submitting ? t('submitting') : t('submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
