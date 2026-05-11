'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState, type ChangeEvent } from 'react';

import BackButton from '@/app/components/BackButton';
import { alert } from '@/dialog';
import { ApiError } from '@/lib/api';
import { changePassword, signOutLocal } from '@/lib/auth-api';
import { cn } from '@/lib/utils';
import { useUserActions } from '@/stores/userStore';

const STRENGTH_COLORS = ['#94A3B8', '#EF4444', '#F59E0B', '#3196ff', '#10B981'] as const;

type Rule = { key: string; label: string; ok: boolean };

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
  isCurrent?: boolean;
  showAriaLabel: string;
  hideAriaLabel: string;
};

function Field({ label, value, onChange, show, onToggle, placeholder, isCurrent, showAriaLabel, hideAriaLabel }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-[#5C6F90]">{label}</span>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={isCurrent ? 'current-password' : 'new-password'}
          className="w-full rounded-[12px] border-[1.5px] border-[#1C7AE0]/[0.18] bg-white px-4 py-[13px] pr-[50px] text-[14px] text-[#0b2a63] outline-none transition-[border-color,box-shadow] placeholder:text-[#8AA0BD] focus:border-[#3196ff] focus:shadow-[0_0_0_4px_rgba(49,150,255,0.14)]"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? hideAriaLabel : showAriaLabel}
          className="absolute right-1.5 top-1/2 flex h-8 w-[38px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-[14px] text-[#8AA0BD] transition-colors hover:bg-[#3196ff]/[0.1]"
        >
          {show ? '🙈' : '👁'}
        </button>
      </div>
    </label>
  );
}

export default function PasswordClient() {
  const router = useRouter();
  const { signOut } = useUserActions();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const t = useTranslations('setting.passwordPage');
  const tCommon = useTranslations('common');

  const STRENGTH_LABELS = ['', t('strength1'), t('strength2'), t('strength3'), t('strength4')] as const;

  const evaluateRules = (n: string, c: string): Rule[] => [
    { key: 'len', label: t('ruleLen'), ok: n.length >= 8 },
    { key: 'mix', label: t('ruleMix'), ok: /[A-Za-z]/.test(n) && /\d/.test(n) },
    { key: 'spc', label: t('ruleSpc'), ok: /[!@#$%^&*()_+\-={}[\]:";'<>,.?/]/.test(n) },
    { key: 'diff', label: t('ruleDiff'), ok: n.length > 0 && n !== c },
  ];

  const rules = evaluateRules(next, current);
  const score = rules.filter((r) => r.ok).length;
  const strength = STRENGTH_LABELS[score];
  const strengthColor = STRENGTH_COLORS[score];

  const passwordsMatch = confirm.length > 0 && confirm === next;
  const canSubmit = score >= 3 && passwordsMatch && current.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setCurrentError(null);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setCurrentError(t('errorMismatch'));
          return;
        }
        if (err.status === 400) {
          void alert(err.detail || t('errorChangeFailed'), { tone: 'warning' });
          return;
        }
      }
      void alert(t('errorGeneric'), { tone: 'warning' });
      return;
    }

    signOutLocal();
    signOut();
    setSubmitting(false);
    await alert(t('successToast'), { tone: 'success' });
    router.replace('/signin');
  };

  return (
    <section className="flex flex-col gap-[18px]">
      <div className="flex items-start justify-between gap-3">
        <header>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#3196ff]/25 bg-[#3196ff]/[0.12] px-3 py-[5px] text-[11px] font-bold tracking-[0.8px] text-[#1C7AE0]">
            <span>🔐</span>
            <span>{t('tag')}</span>
          </div>
          <h2 className="text-[22px] font-extrabold leading-[1.15] tracking-[-0.3px] text-[#0b2a63]">
            {t('title')}
          </h2>
          <p className="mt-1 text-[12px] text-[#5C6F90]">{t('subtitle')}</p>
        </header>
        <BackButton href="/setting/account" />
      </div>

      <div className="flex flex-col gap-3.5 rounded-[22px] border border-[#1C7AE0]/[0.14] bg-white/90 p-[22px] shadow-[0_14px_36px_rgba(28,122,224,0.12)] backdrop-blur-[14px]">
        <Field
          label={t('currentLabel')}
          value={current}
          onChange={(v) => {
            setCurrent(v);
            if (currentError) setCurrentError(null);
          }}
          show={showCurrent}
          onToggle={() => setShowCurrent((s) => !s)}
          placeholder={t('currentPlaceholder')}
          isCurrent
          showAriaLabel={t('showAria')}
          hideAriaLabel={t('hideAria')}
        />
        {currentError && (
          <div className="text-[11.5px] font-medium text-[#EF4444]" style={{ marginTop: -8 }}>
            {currentError}
          </div>
        )}
        <Field
          label={t('newLabel')}
          value={next}
          onChange={setNext}
          show={showNew}
          onToggle={() => setShowNew((s) => !s)}
          placeholder={t('newPlaceholder')}
          showAriaLabel={t('showAria')}
          hideAriaLabel={t('hideAria')}
        />

        {next.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11.5px] text-[#8AA0BD]">{t('strengthLabel')}</span>
              <span className="text-[11.5px] font-bold" style={{ color: strengthColor }}>
                {strength}
              </span>
            </div>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[5px] flex-1 rounded-[3px] transition-colors duration-[250ms]"
                  style={{
                    background: i <= score ? strengthColor : 'rgba(148,163,184,0.18)',
                  }}
                />
              ))}
            </div>
            <ul className="mt-2.5 grid list-none grid-cols-2 gap-x-3 gap-y-1.5 p-0">
              {rules.map((r) => (
                <li
                  key={r.key}
                  className="flex items-center gap-1.5 text-[11.5px]"
                  style={{ color: r.ok ? '#1C7AE0' : '#8AA0BD' }}
                >
                  <span
                    className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-extrabold text-white"
                    style={{ background: r.ok ? '#1C7AE0' : 'rgba(148,163,184,0.25)' }}
                  >
                    {r.ok ? '✓' : ''}
                  </span>
                  <span>{r.label}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <Field
          label={t('confirmLabel')}
          value={confirm}
          onChange={setConfirm}
          show={showNew}
          onToggle={() => setShowNew((s) => !s)}
          placeholder={t('confirmPlaceholder')}
          showAriaLabel={t('showAria')}
          hideAriaLabel={t('hideAria')}
        />
        {confirm.length > 0 && confirm !== next && (
          <div className="text-[11.5px] font-medium text-[#EF4444]">{t('mismatch')}</div>
        )}

        <div className="mt-1 flex items-start gap-2.5 rounded-[12px] border border-[#3196ff]/[0.18] bg-[#3196ff]/[0.08] px-3.5 py-3">
          <span className="text-[16px]">💡</span>
          <p className="text-[12px] leading-[1.55] text-[#5C6F90]">{t('infoNote')}</p>
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
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            'rounded-full border-0 px-[26px] py-3 text-[13.5px] font-bold text-white transition-[transform,box-shadow]',
            canSubmit
              ? 'cursor-pointer bg-[linear-gradient(135deg,#3196ff,#1C7AE0)] shadow-[0_10px_22px_rgba(28,122,224,0.32)] hover:-translate-y-px hover:shadow-[0_12px_24px_rgba(28,122,224,0.34)]'
              : 'cursor-not-allowed bg-[rgba(148,163,184,0.5)]',
          )}
        >
          {submitting ? t('submitting') : t('submit')}
        </button>
      </div>
    </section>
  );
}
