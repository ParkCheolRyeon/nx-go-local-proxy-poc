'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import ChildDeleteModal from '@/app/(main)/setting/children/ChildDeleteModal';
import BackButton from '@/app/components/BackButton';
import { resolveAvatar } from '@/config/avatars';
import { alert, openDialog } from '@/dialog';
import { ApiError } from '@/lib/api';
import { deleteChild } from '@/lib/children-api';
import { cn } from '@/lib/utils';
import { type ChildProfile, useChildren, useUserActions } from '@/stores/userStore';

const MAX_CHILDREN = 5;

function ageOf(birthDate: string, now = new Date()): number | null {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  let years = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years -= 1;
  return Math.max(0, years);
}

export default function ChildrenPage() {
  const router = useRouter();
  const children = useChildren();
  const t = useTranslations('setting.childrenPage');

  const atMax = children.length >= MAX_CHILDREN;

  const handleAdd = () => {
    if (atMax) return;
    router.push('/signup/children-profile?next=/setting/children');
  };

  return (
    <section className="flex flex-col gap-[18px] rounded-[22px] border border-[#1C7AE0]/[0.12] bg-white/85 px-5 py-[18px] shadow-[0_18px_44px_rgba(28,122,224,0.12)] backdrop-blur-[14px]">
      <div className="flex items-start justify-between gap-3">
        <header>
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#3196ff]/25 bg-[#3196ff]/[0.12] px-3 py-[5px] text-[11px] font-bold tracking-[0.8px] text-[#1C7AE0]">
            <span>👶</span>
            <span>{t('tag')}</span>
          </div>
          <h2 className="text-[22px] font-extrabold leading-[1.15] tracking-[-0.3px] text-[#0b2a63]">{t('title')}</h2>
          <p className="mt-1 text-[12px] text-[#5C6F90]">
            {t('subtitle', { max: MAX_CHILDREN, count: children.length })}
          </p>
        </header>
        <BackButton href="/setting/account" />
      </div>

      {children.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[#1C7AE0]/30 bg-white/70 px-5 py-10 text-center">
          <div className="text-[32px]">👶</div>
          <div className="mt-2 text-[14px] font-bold text-[#0b2a63]">{t('emptyTitle')}</div>
          <p className="mt-1 text-[12px] text-[#5C6F90]">{t('emptySub')}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {children.map((c) => (
            <ChildCard key={c.id} child={c} />
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={atMax}
        className={cn(
          'flex h-[54px] items-center justify-center gap-2 rounded-[14px] border-0 text-[15px] font-bold text-white',
          atMax
            ? 'cursor-not-allowed bg-[#B9CDE6]'
            : 'cursor-pointer bg-[linear-gradient(135deg,#3196ff,#1C7AE0)] shadow-[0_10px_24px_rgba(28,122,224,0.35)]',
        )}
      >
        <span className="text-[18px]">＋</span>
        <span>{atMax ? t('atMaxLabel', { max: MAX_CHILDREN }) : t('addChild')}</span>
      </button>
    </section>
  );
}

type ChildCardProps = {
  child: ChildProfile;
};

function ChildCard({ child }: ChildCardProps) {
  const router = useRouter();
  const { removeChild } = useUserActions();
  const [deleting, setDeleting] = useState(false);
  const age = ageOf(child.birthDate);
  const t = useTranslations('setting.childrenPage');
  const tCommon = useTranslations('common');
  const tLevel = useTranslations('child.level');

  const handleDelete = async () => {
    const ok = await openDialog(ChildDeleteModal, { mode: 'single', target: child });
    if (!ok) return;

    setDeleting(true);
    try {
      await deleteChild(child.id);
      removeChild(child.id);
    } catch (err) {
      const msg = err instanceof ApiError ? err.detail : t('deleteFailed');
      void alert(msg, { tone: 'warning' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <li
      className="flex items-center gap-3.5 rounded-[18px] border border-[#1C7AE0]/[0.12] bg-white px-4 py-3.5"
      style={{ boxShadow: '0 8px 18px rgba(28,122,224,0.08)' }}
    >
      <div
        className="flex h-12 w-12 flex-none items-center justify-center rounded-[14px] text-[26px]"
        style={{ background: 'linear-gradient(135deg,#EAF2FE,#D6E8FF)' }}
        aria-hidden
      >
        {resolveAvatar(child.profileEmoji)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[15px] font-extrabold text-[#0b2a63]">{child.name}</div>
        <div className="mt-0.5 truncate text-[11.5px] text-[#5C6F90]">
          {child.birthDate}
          {age !== null && t('ageSuffix', { age })}
          {' · '}
          {tLevel(child.drawingLevel)}
        </div>
      </div>
      <button
        type="button"
        onClick={() => router.push(`/setting/children/${child.id}/edit`)}
        disabled={deleting}
        className="flex-none cursor-pointer rounded-full border-[1.5px] border-[#1C7AE0]/[0.24] bg-white px-3 py-1.5 text-[12px] font-bold text-[#1C7AE0] hover:bg-[#1C7AE0]/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {tCommon('edit')}
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className={cn(
          'flex-none rounded-full border-[1.5px] px-3 py-1.5 text-[12px] font-bold',
          deleting
            ? 'cursor-not-allowed border-red-200 bg-red-50 text-red-300'
            : 'cursor-pointer border-red-200 bg-white text-red-500 hover:bg-red-50',
        )}
      >
        {deleting ? tCommon('deleting') : tCommon('delete')}
      </button>
    </li>
  );
}
