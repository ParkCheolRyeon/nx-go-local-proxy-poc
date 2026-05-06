'use client';

import { useTranslations } from 'next-intl';

import IconArrowRight from '@/app/assets/icons/icon-arrow-right.svg';
import IconPassword from '@/app/assets/icons/icon-password.svg';
import IconEmail from '@/app/assets/icons/sns/icon-email.svg';
import { cn } from '@/lib/utils';

type EmailModeProps = {
  email: string;
  pw: string;
  showPw: boolean;
  agreed: boolean;
  canSubmit: boolean;
  error?: string | null;
  onEmailChange: (v: string) => void;
  onPwChange: (v: string) => void;
  onToggleShowPw: () => void;
  onToggleAgreed: () => void;
  onBack: () => void;
  onSubmit: () => void;
};

export default function EmailMode(props: EmailModeProps) {
  const {
    email,
    pw,
    showPw,
    agreed,
    canSubmit,
    error,
    onEmailChange,
    onPwChange,
    onToggleShowPw,
    onToggleAgreed,
    onBack,
    onSubmit,
  } = props;
  const t = useTranslations('auth.email');

  const strengthClass =
    pw.length < 6
      ? 'bg-[#F59E0B]'
      : pw.length < 10
        ? 'bg-[#3196ff]'
        : 'bg-[#22C55E]';

  return (
    <div className="flex flex-col gap-3.5">
      <button
        type="button"
        onClick={onBack}
        className="ac02-link flex cursor-pointer items-center gap-1 self-start border-0 bg-transparent p-0 text-[13px] font-semibold text-[#5C6F90]"
      >
        <IconArrowRight
          width={12}
          height={12}
          aria-hidden
          className="-scale-x-100"
        />
        {t('back')}
      </button>

      <label
        className="block"
        style={{ animation: 'ac02-slide .4s ease-out 0s both' }}
      >
        <div className="mb-1.5 text-[12px] font-bold text-[#5C6F90]">
          {t('emailLabel')}
        </div>
        <div className="ac02-field flex h-[52px] items-center gap-2.5 rounded-[14px] border-[1.5px] border-[#DCE8FB] bg-[#F6F9FF] px-3.5 text-[#8AA0BD]">
          <IconEmail width={18} height={18} aria-hidden />
          <input
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            type="email"
            placeholder="parent@example.com"
            className="h-full flex-1 border-0 bg-transparent text-[14px] text-[#0b2a63] outline-none"
          />
        </div>
      </label>

      <label
        className="block"
        style={{ animation: 'ac02-slide .4s ease-out .08s both' }}
      >
        <div className="mb-1.5 flex items-center justify-between">
          <div className="text-[12px] font-bold text-[#5C6F90]">{t('passwordLabel')}</div>
          <div className="text-[11px] text-[#8AA0BD]">{t('passwordHint')}</div>
        </div>
        <div className="ac02-field flex h-[52px] items-center gap-2.5 rounded-[14px] border-[1.5px] border-[#DCE8FB] bg-[#F6F9FF] px-3.5 text-[#8AA0BD]">
          <IconPassword width={18} height={18} aria-hidden />
          <input
            value={pw}
            onChange={(e) => onPwChange(e.target.value)}
            type={showPw ? 'text' : 'password'}
            placeholder="••••••••"
            className={cn(
              'h-full flex-1 border-0 bg-transparent text-[14px] text-[#0b2a63] outline-none',
              showPw ? 'tracking-normal' : 'tracking-[2px]',
            )}
          />
          <button
            type="button"
            onClick={onToggleShowPw}
            className="cursor-pointer border-0 bg-transparent text-[13px] font-semibold text-[#8AA0BD]"
          >
            {showPw ? t('hidePassword') : t('showPassword')}
          </button>
        </div>
        <div className="mt-2 flex gap-1">
          {[0, 1, 2, 3].map((i) => {
            const filled = pw.length >= (i + 1) * 2;
            return (
              <div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-sm transition-colors duration-200',
                  filled ? strengthClass : 'bg-[#E6EEF9]',
                )}
              />
            );
          })}
        </div>
      </label>

      <label
        className="flex cursor-pointer items-start gap-2.5 py-2 text-[12px] leading-[1.5] text-[#5C6F90]"
        style={{ animation: 'ac02-slide .4s ease-out .16s both' }}
      >
        <button
          type="button"
          onClick={onToggleAgreed}
          aria-pressed={agreed}
          className={cn(
            'mt-[1px] flex h-5 w-5 flex-none items-center justify-center rounded-md border-[1.5px] text-[13px] font-extrabold text-white transition-all duration-200',
            agreed
              ? 'border-[#1C7AE0] bg-[#1C7AE0]'
              : 'border-[#CFDFF4] bg-white',
          )}
        >
          {agreed ? '✓' : ''}
        </button>
        <div>
          <span className="text-[#0b2a63]">{t('termsLink')}</span> ·{' '}
          <span className="text-[#0b2a63]">{t('privacyLink')}</span>{t('agreementMid')}{' '}
          <span className="text-[#5C6F90]">{t('guardianConfirm')}</span>{t('agreementEnd')}
        </div>
      </label>

      {error && (
        <div
          role="alert"
          className="rounded-[10px] border border-[#F59E0B]/30 bg-[#FFF7EA] px-3 py-2 text-[12px] font-semibold text-[#B45309]"
        >
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        className={cn(
          'ac02-btn mt-1 h-[54px] rounded-[14px] border-0 text-[16px] font-bold text-white',
          canSubmit
            ? 'cursor-pointer bg-[linear-gradient(135deg,#3196ff,#1C7AE0)] shadow-[0_10px_24px_rgba(28,122,224,0.4)]'
            : 'cursor-not-allowed bg-[#B9CDE6]',
        )}
        style={{ animation: 'ac02-slide .4s ease-out .24s both' }}
      >
        {t('submit')}
      </button>
    </div>
  );
}
