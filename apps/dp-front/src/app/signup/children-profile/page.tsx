'use client';

import IconArrowRight from '@/app/assets/icons/icon-arrow-right.svg';
import AuthBackdrop from '@/app/components/AuthBackdrop';
import ChildProfileFields, {
  type ChildFormState,
  childFormBirthDate,
  initialChildFormState,
  isChildFormValid,
} from '@/app/components/ChildProfileFields';
import MainLogo from '@/app/components/MainLogo';
import { CHILD_AVATARS } from '@/config/avatars';
import { ApiError } from '@/lib/api';
import { apiChildToStoreChild, createChild } from '@/lib/children-api';
import { cn } from '@/lib/utils';
import { useUserActions } from '@/stores/userStore';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

// next 파라미터로 들어온 경로만 허용 (open redirect 방지를 위해 내부 path 만 통과)
function safeNext(raw: string | null): string {
  if (!raw) return '/my-gallery';
  if (!raw.startsWith('/') || raw.startsWith('//')) return '/my-gallery';
  return raw;
}

export default function ChildrenProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get('next'));
  const { addChild } = useUserActions();

  const [form, setForm] = useState<ChildFormState>({
    ...initialChildFormState,
    name: '짱구',
    yy: '2018',
    mm: '03',
    dd: '14',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = isChildFormValid(form) && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const created = await createChild({
        name: form.name.trim(),
        birthDate: childFormBirthDate(form),
        profileEmoji: CHILD_AVATARS[form.picked].key,
        drawingLevel: form.level,
      });
      addChild(apiChildToStoreChild(created));
      router.replace(next);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.replace('/signin');
          return;
        }
        setError(err.detail);
      } else {
        setError('자녀 프로필 저장에 실패했어요. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthBackdrop>
      <div className="relative z-10 flex items-center justify-between px-11 pt-9">
        <button
          type="button"
          onClick={() => router.back()}
          className="ac02-btn flex cursor-pointer items-center gap-1.5 rounded-full border border-[#1C7AE0]/10 bg-white/70 px-3.5 py-2 text-[13px] font-semibold text-[#5C6F90] shadow-[0_4px_12px_rgba(28,122,224,0.08)]"
        >
          <IconArrowRight
            width={12}
            height={12}
            aria-hidden
            className="-scale-x-100"
          />
          이전
        </button>
        <MainLogo isExpanded />
        <button
          type="button"
          onClick={() => router.replace(next)}
          className="ac02-link cursor-pointer border-0 bg-transparent p-0 text-[13px] font-semibold text-[#8AA0BD]"
        >
          건너뛰기
        </button>
      </div>

      <div
        className="relative z-10 m-auto flex w-full max-w-[460px] flex-col gap-[18px] pb-10"
        style={{ paddingTop: 24 }}
      >
        <div
          className="text-center"
          style={{ animation: 'ac02-fade .5s ease-out both' }}
        >
          <div className="text-[32px] leading-[1.15] font-extrabold">
            <span className="text-[#1C7AE0]">자녀 프로필</span>을 만들어요
          </div>
          <div className="mt-2 text-[13px] leading-[1.55] text-[#5C6F90]">
            나중에 설정에서 최대 5명까지 추가할 수 있어요.
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex flex-col gap-[18px] rounded-[24px] border border-[#1C7AE0]/10 bg-white/85 p-[22px] backdrop-blur-md"
          style={{
            boxShadow: '0 20px 50px rgba(28,122,224,.15)',
            animation: 'ac02-fade .5s ease-out .1s both',
          }}
        >
          <ChildProfileFields state={form} setState={setForm} />
        </form>

        {error && (
          <div
            role="alert"
            className="rounded-[12px] border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] font-semibold text-red-600"
          >
            {error}
          </div>
        )}

        <div
          className="mt-auto flex gap-2.5"
          style={{ animation: 'ac02-slide .4s ease-out .32s both' }}
        >
          <button
            type="button"
            onClick={() => router.replace(next)}
            className="ac02-btn h-[54px] cursor-pointer rounded-[14px] border border-[#1C7AE0]/15 bg-white/70 px-[22px] text-[14px] font-semibold text-[#5C6F90]"
          >
            나중에
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'ac02-btn flex h-[54px] flex-1 items-center justify-center gap-2 rounded-[14px] border-0 text-[16px] font-bold text-white',
              canSubmit
                ? 'cursor-pointer bg-[linear-gradient(135deg,#3196ff,#1C7AE0)] shadow-[0_10px_24px_rgba(28,122,224,0.4)]'
                : 'cursor-not-allowed bg-[#B9CDE6]',
            )}
          >
            <span>{submitting ? '저장 중…' : '완료 · 코인 3개 받기'}</span>
            <span className="text-[18px]">🪙</span>
          </button>
        </div>
      </div>
    </AuthBackdrop>
  );
}
