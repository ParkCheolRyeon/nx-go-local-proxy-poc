'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import ChildDeleteModal from '@/app/(main)/setting/children/ChildDeleteModal';
import BackButton from '@/app/components/BackButton';
import { resolveAvatar } from '@/config/avatars';
import { alert, openDialog } from '@/dialog';
import { ApiError } from '@/lib/api';
import { deleteChild } from '@/lib/children-api';
import { cn } from '@/lib/utils';
import { type ChildDrawingLevel, type ChildProfile, useChildren, useUserActions } from '@/stores/userStore';

const MAX_CHILDREN = 5;

const LEVEL_LABEL: Record<ChildDrawingLevel, string> = {
  beginner: '왕초보',
  intermediate: '중급',
  expert: '고급',
};

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
  const { removeChild } = useUserActions();

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
            <span>CHILDREN</span>
          </div>
          <h2 className="text-[22px] font-extrabold leading-[1.15] tracking-[-0.3px] text-[#0b2a63]">자녀 프로필</h2>
          <p className="mt-1 text-[12px] text-[#5C6F90]">
            가족 계정당 최대 {MAX_CHILDREN}명까지 등록할 수 있어요. 현재 {children.length} / {MAX_CHILDREN}명.
          </p>
        </header>
        <BackButton href="/setting/account" />
      </div>

      {children.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[#1C7AE0]/30 bg-white/70 px-5 py-10 text-center">
          <div className="text-[32px]">👶</div>
          <div className="mt-2 text-[14px] font-bold text-[#0b2a63]">아직 추가된 자녀가 없어요</div>
          <p className="mt-1 text-[12px] text-[#5C6F90]">자녀를 추가하면 그림을 그리고 보관할 수 있어요.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {children.map((c) => (
            <ChildCard key={c.id} child={c} onDeleted={removeChild} />
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
        <span>{atMax ? `최대 ${MAX_CHILDREN}명까지 등록 가능` : '자녀 추가'}</span>
      </button>
    </section>
  );
}

type ChildCardProps = {
  child: ChildProfile;
  onDeleted: (id: string) => void;
};

function ChildCard({ child, onDeleted }: ChildCardProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const age = ageOf(child.birthDate);

  const handleDelete = async () => {
    const ok = await openDialog(ChildDeleteModal, { mode: 'single', target: child });
    if (!ok) return;

    setDeleting(true);
    try {
      await deleteChild(child.id);
      onDeleted(child.id);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.detail : '삭제에 실패했어요. 잠시 후 다시 시도해 주세요.';
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
          {age !== null && ` · 만 ${age}세`}
          {' · '}
          {LEVEL_LABEL[child.drawingLevel]}
        </div>
      </div>
      <button
        type="button"
        onClick={() => router.push(`/setting/children/${child.id}/edit`)}
        disabled={deleting}
        className="flex-none cursor-pointer rounded-full border-[1.5px] border-[#1C7AE0]/[0.24] bg-white px-3 py-1.5 text-[12px] font-bold text-[#1C7AE0] hover:bg-[#1C7AE0]/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
      >
        편집
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
        {deleting ? '삭제 중…' : '삭제'}
      </button>
    </li>
  );
}
