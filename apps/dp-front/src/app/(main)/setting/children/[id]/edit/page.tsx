'use client';

import { useRouter } from 'next/navigation';
import { use, useEffect, useMemo, useState } from 'react';

import ChildProfileFields, {
  type ChildFormState,
  birthDateToFormParts,
  childFormBirthDate,
  initialChildFormState,
  isChildFormValid,
} from '@/app/components/ChildProfileFields';
import BackButton from '@/app/components/BackButton';
import { CHILD_AVATARS } from '@/config/avatars';
import { ApiError } from '@/lib/api';
import { apiChildToStoreChild, getChild, updateChild } from '@/lib/children-api';
import { cn } from '@/lib/utils';
import { useChildren, useUserActions } from '@/stores/userStore';

type EditPageProps = {
  params: Promise<{ id: string }>;
};

export default function ChildEditPage({ params }: EditPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const children = useChildren();
  const { upsertChild } = useUserActions();

  const fromStore = useMemo(() => children.find((c) => c.id === id), [children, id]);

  const [form, setForm] = useState<ChildFormState>(initialChildFormState);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loaded) return;

    if (fromStore) {
      const dob = birthDateToFormParts(fromStore.birthDate);
      const picked = Math.max(0, CHILD_AVATARS.findIndex((a) => a.key === fromStore.profileEmoji));
      setForm({
        picked,
        name: fromStore.name,
        yy: dob.yy,
        mm: dob.mm,
        dd: dob.dd,
        level: fromStore.drawingLevel,
      });
      setLoaded(true);
      return;
    }

    let cancelled = false;
    getChild(id)
      .then((c) => {
        if (cancelled) return;
        const dob = birthDateToFormParts(c.birthDate);
        const picked = Math.max(0, CHILD_AVATARS.findIndex((a) => a.key === c.profileEmoji));
        setForm({
          picked,
          name: c.name,
          yy: dob.yy,
          mm: dob.mm,
          dd: dob.dd,
          level: c.drawingLevel,
        });
        setLoaded(true);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setLoadError('자녀 프로필을 찾을 수 없어요.');
        } else if (err instanceof ApiError && err.status === 401) {
          router.replace('/signin');
        } else {
          setLoadError('자녀 프로필을 불러오지 못했어요.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [id, fromStore, loaded, router]);

  const canSubmit = isChildFormValid(form) && !submitting && loaded;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      const updated = await updateChild(id, {
        name: form.name.trim(),
        birthDate: childFormBirthDate(form),
        profileEmoji: CHILD_AVATARS[form.picked].key,
        drawingLevel: form.level,
      });
      upsertChild(apiChildToStoreChild(updated));
      router.replace('/setting/children');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          router.replace('/signin');
          return;
        }
        if (err.status === 404) {
          setError('자녀 프로필을 찾을 수 없어요.');
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

  if (loadError) {
    return (
      <section className="flex flex-col items-center gap-3 rounded-[22px] border border-[#1C7AE0]/[0.12] bg-white/85 px-5 py-10 text-center shadow-[0_18px_44px_rgba(28,122,224,0.12)] backdrop-blur-[14px]">
        <div className="text-[32px]">😿</div>
        <div className="text-[14px] font-semibold text-[#0b2a63]">{loadError}</div>
        <BackButton label="목록으로" href="/setting/children" />
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-[18px]">
      <div className="flex items-start justify-between gap-3">
        <header>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#3196ff]/25 bg-[#3196ff]/[0.12] px-3 py-[5px] text-[11px] font-bold tracking-[0.8px] text-[#1C7AE0]">
            <span>✏️</span>
            <span>EDIT</span>
          </div>
          <h2 className="text-[22px] font-extrabold leading-[1.15] tracking-[-0.3px] text-[#0b2a63]">
            자녀 프로필 수정
          </h2>
          <p className="mt-1 text-[12px] text-[#5C6F90]">캐릭터·이름·생년월일·그림 실력을 바꿀 수 있어요.</p>
        </header>
        <BackButton href="/setting/children" />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="flex flex-col gap-[18px] rounded-[24px] border border-[#1C7AE0]/10 bg-white/85 p-[22px] backdrop-blur-md"
        style={{ boxShadow: '0 20px 50px rgba(28,122,224,.15)' }}
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

      <div className="mt-2 flex gap-2.5">
        <button
          type="button"
          onClick={() => router.replace('/setting/children')}
          className="h-[54px] cursor-pointer rounded-[14px] border border-[#1C7AE0]/15 bg-white/70 px-[22px] text-[14px] font-semibold text-[#5C6F90]"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={cn(
            'flex h-[54px] flex-1 items-center justify-center gap-2 rounded-[14px] border-0 text-[16px] font-bold text-white',
            canSubmit
              ? 'cursor-pointer bg-[linear-gradient(135deg,#3196ff,#1C7AE0)] shadow-[0_10px_24px_rgba(28,122,224,0.4)]'
              : 'cursor-not-allowed bg-[#B9CDE6]',
          )}
        >
          {submitting ? '저장 중…' : '저장'}
        </button>
      </div>
    </section>
  );
}
