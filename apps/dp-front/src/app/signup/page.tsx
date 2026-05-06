'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import AuthBackdrop from '@/app/components/AuthBackdrop';
import MainLogo from '@/app/components/MainLogo';
import EmailMode from '@/app/signup/EmailMode';
import SocialMode from '@/app/signup/SocialMode';
import { ApiError } from '@/lib/api';
import { signUp, signIn as apiSignIn } from '@/lib/auth-api';
import { apiUserToStoreUser } from '@/lib/userAdapter';
import { useUserActions } from '@/stores/userStore';

type Mode = 'social' | 'email';

export default function SignupPage() {
  const [mode, setMode] = useState<Mode>('social');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn: storeSignIn } = useUserActions();

  const canSubmit = /@/.test(email) && pw.length >= 6 && agreed;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await signUp({
        email: email.trim(),
        password: pw,
        name: email.split('@')[0],
        privacyAccepted: agreed,
        marketingAccepted: false,
      });

      const result = await apiSignIn(email.trim(), pw);
      storeSignIn(apiUserToStoreUser(result.user));
      router.replace('/signup/children-profile');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError('이미 가입된 이메일입니다.');
      } else if (err instanceof ApiError && err.status === 400) {
        setError(err.detail);
      } else {
        setError('가입에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthBackdrop>
      <div className="relative z-10 flex items-center justify-between px-11 pt-9">
        <MainLogo isExpanded onClick={() => router.replace('/')} />
        <div className="text-[13px] text-[#5C6F90]">
          이미 계정이 있나요?{' '}
          <button
            type="button"
            onClick={() => router.push('/signin')}
            className="ac02-link cursor-pointer border-0 bg-transparent p-0 font-bold text-[#1C7AE0]"
          >
            로그인 →
          </button>
        </div>
      </div>

      <div className="relative z-10 m-auto flex w-full max-w-[460px] flex-col gap-6">
        <div className="text-center" style={{ animation: 'ac02-fade .5s ease-out both' }}>
          <div className="text-[36px] font-extrabold leading-[1.15]">
            우리 아이
            <br />첫<span className="text-[#1C7AE0]"> 갤러리</span>를 만들어요
          </div>
          <div className="mt-2.5 text-[14px] leading-[1.6] text-[#5C6F90]">
            부모님 계정을 먼저 만들고, 자녀 프로필을 추가합니다.
            <br />
            3분이면 충분해요.
          </div>
        </div>

        <div
          className="rounded-[24px] border border-[#1C7AE0]/10 bg-white/85 p-7 backdrop-blur-md"
          style={{
            boxShadow: '0 20px 50px rgba(28,122,224,.15)',
            animation: 'ac02-fade .5s ease-out .1s both',
          }}
        >
          {mode === 'social' ? (
            <SocialMode onClickEmail={() => setMode('email')} />
          ) : (
            <EmailMode
              email={email}
              pw={pw}
              showPw={showPw}
              agreed={agreed}
              canSubmit={canSubmit}
              onEmailChange={setEmail}
              onPwChange={setPw}
              onToggleShowPw={() => setShowPw((v) => !v)}
              onToggleAgreed={() => setAgreed((v) => !v)}
              onBack={() => setMode('social')}
              onSubmit={handleSubmit}
            />
          )}
        </div>

        <div
          className="text-center text-[11px] text-[#8AA0BD]"
          style={{ animation: 'ac02-fade .5s ease-out .3s both' }}
        >
          가입 시 자녀의 활동은 부모 계정과 연결되어 보호받아요.
        </div>
      </div>
    </AuthBackdrop>
  );
}
