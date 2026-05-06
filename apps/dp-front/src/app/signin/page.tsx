'use client';

import { useRouter } from 'next/navigation';
import type { FC, SVGProps } from 'react';
import { useState } from 'react';

import IconPassword from '@/app/assets/icons/icon-password.svg';
import IconUserDefault from '@/app/assets/icons/icon-user-default.svg';
import IconApple from '@/app/assets/icons/sns/logo-apple.svg';
import IconGoogle from '@/app/assets/icons/sns/logo-google.svg';
import IconKakao from '@/app/assets/icons/sns/logo-kakao.svg';
import IconNaver from '@/app/assets/icons/sns/logo-naver.svg';
import AuthBackdrop from '@/app/components/AuthBackdrop';
import MainLogo from '@/app/components/MainLogo';
import { ApiError } from '@/lib/api';
import { signIn as apiSignIn } from '@/lib/auth-api';
import { apiUserToStoreUser } from '@/lib/userAdapter';
import { cn } from '@/lib/utils';
import { useUserActions } from '@/stores/userStore';

type QuickSocial = {
  id: string;
  bg: string;
  fg: string;
  Icon: FC<SVGProps<SVGSVGElement>>;
  border?: string;
};

const QUICK_SOCIALS: QuickSocial[] = [
  { id: 'kakao', bg: '#FEE500', fg: '#191600', Icon: IconKakao },
  { id: 'naver', bg: '#03C75A', fg: '#ffffff', Icon: IconNaver },
  {
    id: 'google',
    bg: '#ffffff',
    fg: '#1f1f1f',
    Icon: IconGoogle,
    border: '1px solid #E4E7EC',
  },
  { id: 'apple', bg: '#000000', fg: '#ffffff', Icon: IconApple },
];

export default function SigninPage() {
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const { signIn: storeSignIn } = useUserActions();
  const canSubmit = /@/.test(id) && pw.length >= 1 && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await apiSignIn(id.trim(), pw);
      storeSignIn(apiUserToStoreUser(result.user));
      router.replace('/my-gallery');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      } else {
        setError('로그인에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const clearError = () => {
    if (error) setError(null);
  };

  return (
    <AuthBackdrop>
      <div className="relative z-10 flex items-center justify-between px-11 pt-9">
        <MainLogo isExpanded onClick={() => router.replace('/')} />
        <div className="text-[13px] text-[#5C6F90]">
          처음 오셨나요?{' '}
          <button
            type="button"
            onClick={() => router.push('/signup')}
            className="ac02-link cursor-pointer border-0 bg-transparent p-0 font-bold text-[#1C7AE0]"
          >
            회원가입 →
          </button>
        </div>
      </div>

      <div className="relative z-10 m-auto flex w-full max-w-[460px] flex-col gap-6">
        <div className="text-center" style={{ animation: 'ac02-fade .5s ease-out both' }}>
          <div
            className="mb-3.5 inline-block rounded-full px-3 py-1 text-[11px] font-bold tracking-[0.4px] text-[#1C7AE0]"
            style={{ background: 'rgba(49,150,255,.12)' }}
          >
            부모 계정 로그인
          </div>
          <div className="text-[36px] font-extrabold leading-[1.15]">
            다시 만나서
            <br />
            <span className="text-[#1C7AE0]">반가워요</span> 👋
          </div>
          <div className="mt-2.5 text-[14px] leading-[1.6] text-[#5C6F90]">아이디와 비밀번호를 입력해 주세요.</div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex flex-col gap-3.5 rounded-[24px] border border-[#1C7AE0]/10 bg-white/85 p-7 backdrop-blur-md"
          style={{
            boxShadow: '0 20px 50px rgba(28,122,224,.15)',
            animation: 'ac02-fade .5s ease-out .1s both',
          }}
        >
          <label className="block" style={{ animation: 'ac02-slide .4s ease-out 0s both' }}>
            <div className="mb-1.5 text-[12px] font-bold text-[#5C6F90]">아이디</div>
            <div className="ac02-field flex h-[52px] items-center gap-2.5 rounded-[14px] border-[1.5px] border-[#DCE8FB] bg-[#F6F9FF] px-3.5 text-[#8AA0BD]">
              <IconUserDefault width={18} height={18} aria-hidden />
              <input
                value={id}
                onChange={(e) => {
                  setId(e.target.value);
                  clearError();
                }}
                type="text"
                placeholder="아이디를 입력하세요"
                autoComplete="username"
                className="h-full flex-1 border-0 bg-transparent text-[14px] text-[#0b2a63] outline-none"
              />
            </div>
          </label>

          <label className="block" style={{ animation: 'ac02-slide .4s ease-out .08s both' }}>
            <div className="mb-1.5 flex items-center justify-between">
              <div className="text-[12px] font-bold text-[#5C6F90]">비밀번호</div>
              <button
                type="button"
                className="ac02-link cursor-pointer border-0 bg-transparent p-0 text-[11px] font-semibold text-[#1C7AE0]"
              >
                비밀번호를 잊으셨나요?
              </button>
            </div>
            <div className="ac02-field flex h-[52px] items-center gap-2.5 rounded-[14px] border-[1.5px] border-[#DCE8FB] bg-[#F6F9FF] px-3.5 text-[#8AA0BD]">
              <IconPassword width={18} height={18} aria-hidden />
              <input
                value={pw}
                onChange={(e) => {
                  setPw(e.target.value);
                  clearError();
                }}
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
                className={cn(
                  'h-full flex-1 border-0 bg-transparent text-[14px] text-[#0b2a63] outline-none',
                  showPw ? 'tracking-normal' : 'tracking-[2px]',
                )}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="cursor-pointer border-0 bg-transparent text-[13px] font-semibold text-[#8AA0BD]"
              >
                {showPw ? '숨김' : '표시'}
              </button>
            </div>
          </label>

          <label
            className="flex cursor-pointer items-center gap-2.5 py-1 text-[13px] text-[#5C6F90]"
            style={{ animation: 'ac02-slide .4s ease-out .16s both' }}
          >
            <button
              type="button"
              onClick={() => setRemember((v) => !v)}
              aria-pressed={remember}
              className={cn(
                'flex h-5 w-5 flex-none items-center justify-center rounded-md border-[1.5px] text-[13px] font-extrabold text-white transition-all duration-200',
                remember ? 'border-[#1C7AE0] bg-[#1C7AE0]' : 'border-[#CFDFF4] bg-white',
              )}
            >
              {remember ? '✓' : ''}
            </button>
            <span>로그인 상태 유지</span>
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
            type="submit"
            disabled={!canSubmit}
            className={cn(
              'ac02-btn mt-1 h-[54px] rounded-[14px] border-0 text-[16px] font-bold text-white',
              canSubmit
                ? 'cursor-pointer bg-[linear-gradient(135deg,#3196ff,#1C7AE0)] shadow-[0_10px_24px_rgba(28,122,224,0.4)]'
                : 'cursor-not-allowed bg-[#B9CDE6]',
            )}
            style={{ animation: 'ac02-slide .4s ease-out .24s both' }}
          >
            로그인 →
          </button>

          <div
            className="mb-1 mt-2.5 flex items-center gap-2.5"
            style={{ animation: 'ac02-fade .4s ease-out .32s both' }}
          >
            <div
              className="h-px flex-1"
              style={{
                background: 'linear-gradient(90deg, transparent, #CFDFF4, transparent)',
              }}
            />
            <span className="text-[11px] tracking-[0.5px] text-[#8AA0BD]">간편 로그인</span>
            <div
              className="h-px flex-1"
              style={{
                background: 'linear-gradient(90deg, transparent, #CFDFF4, transparent)',
              }}
            />
          </div>

          <div className="flex gap-2.5" style={{ animation: 'ac02-slide .4s ease-out .38s both' }}>
            {QUICK_SOCIALS.map((s) => (
              <button
                type="button"
                key={s.id}
                aria-label={s.id}
                className="ac02-btn flex h-[48px] flex-1 cursor-pointer items-center justify-center rounded-[12px] shadow-[0_4px_12px_rgba(0,0,0,0.06)]"
                style={{
                  background: s.bg,
                  color: s.fg,
                  border: s.border ?? 'none',
                }}
              >
                <s.Icon width={24} height={24} aria-hidden />
              </button>
            ))}
          </div>
        </form>

        <div
          className="text-center text-[11px] text-[#8AA0BD]"
          style={{ animation: 'ac02-fade .5s ease-out .3s both' }}
        >
          로그인 시{' '}
          <button
            type="button"
            className="ac02-link cursor-pointer border-0 bg-transparent p-0 text-[11px] font-semibold text-[#5C6F90]"
          >
            이용약관
          </button>{' '}
          ·{' '}
          <button
            type="button"
            className="ac02-link cursor-pointer border-0 bg-transparent p-0 text-[11px] font-semibold text-[#5C6F90]"
          >
            개인정보 처리방침
          </button>
          에 동의하게 됩니다.
        </div>
      </div>
    </AuthBackdrop>
  );
}
