'use client';

import { useRouter } from 'next/navigation';
import { useState, type ChangeEvent } from 'react';

import BackButton from '@/app/components/BackButton';
import { alert } from '@/dialog';
import { ApiError } from '@/lib/api';
import { changePassword, signOutLocal } from '@/lib/auth-api';
import { cn } from '@/lib/utils';
import { useUserActions } from '@/stores/userStore';

const STRENGTH_LABELS = ['', '약함', '보통', '안전', '아주 안전'] as const;
const STRENGTH_COLORS = ['#94A3B8', '#EF4444', '#F59E0B', '#3196ff', '#10B981'] as const;

type Rule = { key: string; label: string; ok: boolean };

function evaluateRules(next: string, current: string): Rule[] {
  return [
    { key: 'len', label: '8자 이상', ok: next.length >= 8 },
    { key: 'mix', label: '영문/숫자 조합', ok: /[A-Za-z]/.test(next) && /\d/.test(next) },
    {
      key: 'spc',
      label: '특수문자 1자 이상',
      ok: /[!@#$%^&*()_+\-={}[\]:";'<>,.?/]/.test(next),
    },
    { key: 'diff', label: '현재 비밀번호와 다름', ok: next.length > 0 && next !== current },
  ];
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggle: () => void;
  placeholder: string;
};

function Field({ label, value, onChange, show, onToggle, placeholder }: FieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12px] font-semibold text-[#5C6F90]">{label}</span>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={label === '현재 비밀번호' ? 'current-password' : 'new-password'}
          className="w-full rounded-[12px] border-[1.5px] border-[#1C7AE0]/[0.18] bg-white px-4 py-[13px] pr-[50px] text-[14px] text-[#0b2a63] outline-none transition-[border-color,box-shadow] placeholder:text-[#8AA0BD] focus:border-[#3196ff] focus:shadow-[0_0_0_4px_rgba(49,150,255,0.14)]"
        />
        <button
          type="button"
          onClick={onToggle}
          aria-label={show ? '비밀번호 숨기기' : '비밀번호 보기'}
          className="absolute right-1.5 top-1/2 flex h-8 w-[38px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-[14px] text-[#8AA0BD] transition-colors hover:bg-[#3196ff]/[0.1]"
        >
          {show ? '🙈' : '👁'}
        </button>
      </div>
    </label>
  );
}

export default function PasswordChangePage() {
  const router = useRouter();
  const { signOut } = useUserActions();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentError, setCurrentError] = useState<string | null>(null);

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
          setCurrentError('현재 비밀번호가 일치하지 않아요.');
          return;
        }
        if (err.status === 400) {
          void alert(err.detail || '비밀번호를 변경하지 못했어요.', { tone: 'warning' });
          return;
        }
      }
      void alert('비밀번호 변경에 실패했어요. 잠시 후 다시 시도해 주세요.', { tone: 'warning' });
      return;
    }

    // 성공: 모든 토큰이 무효화됐으므로 로컬 정리 후 재로그인 유도.
    signOutLocal();
    signOut();
    setSubmitting(false);
    await alert('비밀번호가 변경되었어요. 다시 로그인해 주세요.', { tone: 'success' });
    router.replace('/signin');
  };

  return (
    <section className="flex flex-col gap-[18px]">
      <div className="flex items-start justify-between gap-3">
        <header>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#3196ff]/25 bg-[#3196ff]/[0.12] px-3 py-[5px] text-[11px] font-bold tracking-[0.8px] text-[#1C7AE0]">
            <span>🔐</span>
            <span>SECURITY</span>
          </div>
          <h2 className="text-[22px] font-extrabold leading-[1.15] tracking-[-0.3px] text-[#0b2a63]">
            비밀번호 변경
          </h2>
          <p className="mt-1 text-[12px] text-[#5C6F90]">안전한 보관함을 위해 6개월마다 변경을 권장해요.</p>
        </header>
        <BackButton href="/setting/account" />
      </div>

      <div className="flex flex-col gap-3.5 rounded-[22px] border border-[#1C7AE0]/[0.14] bg-white/90 p-[22px] shadow-[0_14px_36px_rgba(28,122,224,0.12)] backdrop-blur-[14px]">
        <Field
          label="현재 비밀번호"
          value={current}
          onChange={(v) => {
            setCurrent(v);
            if (currentError) setCurrentError(null);
          }}
          show={showCurrent}
          onToggle={() => setShowCurrent((s) => !s)}
          placeholder="현재 사용 중인 비밀번호"
        />
        {currentError && (
          <div className="text-[11.5px] font-medium text-[#EF4444]" style={{ marginTop: -8 }}>
            {currentError}
          </div>
        )}
        <Field
          label="새 비밀번호"
          value={next}
          onChange={setNext}
          show={showNew}
          onToggle={() => setShowNew((s) => !s)}
          placeholder="새로 사용할 비밀번호"
        />

        {next.length > 0 && (
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11.5px] text-[#8AA0BD]">비밀번호 강도</span>
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
          label="새 비밀번호 확인"
          value={confirm}
          onChange={setConfirm}
          show={showNew}
          onToggle={() => setShowNew((s) => !s)}
          placeholder="다시 한 번 입력해 주세요"
        />
        {confirm.length > 0 && confirm !== next && (
          <div className="text-[11.5px] font-medium text-[#EF4444]">비밀번호가 일치하지 않아요</div>
        )}

        <div className="mt-1 flex items-start gap-2.5 rounded-[12px] border border-[#3196ff]/[0.18] bg-[#3196ff]/[0.08] px-3.5 py-3">
          <span className="text-[16px]">💡</span>
          <p className="text-[12px] leading-[1.55] text-[#5C6F90]">
            비밀번호는 가족 계정의 결제·자녀 보호 설정을 보호하는 열쇠입니다. 쉽게 추측되는 단어 대신
            영문·숫자·특수문자를 섞어 주세요.
          </p>
        </div>
      </div>

      <div className="mt-1 flex justify-end gap-2.5">
        <button
          type="button"
          onClick={() => router.replace('/setting/account')}
          className="cursor-pointer rounded-full border-[1.5px] border-[#1C7AE0]/[0.18] bg-white px-[22px] py-3 text-[13.5px] font-bold text-[#5C6F90] transition-colors hover:bg-[#3196ff]/[0.06]"
        >
          취소
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
          {submitting ? '변경 중…' : '비밀번호 변경'}
        </button>
      </div>
    </section>
  );
}
