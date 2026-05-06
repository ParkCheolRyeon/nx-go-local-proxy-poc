'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import ChildDeleteModal from '@/app/(main)/setting/children/ChildDeleteModal';
import Row from '@/app/(main)/setting/Row';
import { alert, confirm, openDialog } from '@/dialog';
import { ApiError } from '@/lib/api';
import { signOutLocal } from '@/lib/auth-api';
import { deleteChild } from '@/lib/children-api';
import { useChildren, useUserActions } from '@/stores/userStore';

export default function DangerTab() {
  const router = useRouter();
  const { signOut, removeChild } = useUserActions();
  const children = useChildren();
  const [deletingAll, setDeletingAll] = useState(false);

  const handleSignOut = async () => {
    const ok = await confirm('이 기기에서 로그아웃할까요?', {
      title: '로그아웃',
      yesButtonText: '로그아웃',
      noButtonText: '취소',
    });
    if (!ok) return;
    signOutLocal();
    signOut();
    router.replace('/signin');
  };

  const handleDeleteAllChildren = async () => {
    if (deletingAll) return;
    if (children.length === 0) {
      void alert('등록된 자녀 프로필이 없어요.');
      return;
    }
    const ok = await openDialog(ChildDeleteModal, { mode: 'all', targets: children });
    if (!ok) return;

    setDeletingAll(true);
    const results = await Promise.allSettled(children.map((c) => deleteChild(c.id)));
    const failed: { name: string; reason: string }[] = [];
    results.forEach((r, i) => {
      const c = children[i];
      if (r.status === 'fulfilled') {
        removeChild(c.id);
      } else {
        const reason =
          r.reason instanceof ApiError ? r.reason.detail : '서버에 연결할 수 없어요.';
        failed.push({ name: c.name, reason });
      }
    });
    setDeletingAll(false);

    if (failed.length === 0) {
      void alert('모든 자녀 프로필이 삭제되었어요.', { tone: 'success' });
      return;
    }
    const summary = failed.map((f) => `· ${f.name}: ${f.reason}`).join('\n');
    void alert(`일부 자녀를 삭제하지 못했어요.\n\n${summary}`, { tone: 'warning' });
  };

  return (
    <>
      <Row icon="🚪" title="로그아웃" sub="이 기기에서만 로그아웃합니다" onClick={handleSignOut} />
      <Row
        icon="👶"
        title="자녀 프로필 삭제"
        sub={
          deletingAll
            ? '삭제 중…'
            : children.length > 0
              ? `${children.length}명 모두 삭제 · 작품·코인 함께 정리`
              : '등록된 자녀 없음'
        }
        onClick={handleDeleteAllChildren}
        last
      />
      <div
        className="mt-3.5 rounded-[14px] p-4"
        style={{
          background: 'rgba(239,68,68,0.06)',
          border: '1px solid rgba(239,68,68,0.18)',
        }}
      >
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-[14px]">⚠️</span>
          <span className="text-[13px] font-bold text-[#DC2626]">계정 탈퇴</span>
        </div>
        <p className="text-[11.5px] leading-[1.5] text-[#5C6F90]">
          탈퇴 시 작품·코인·구독이 정리됩니다. 즉시 삭제 또는 30일 유예 중 선택할 수 있어요.
          <br />
          GDPR · COPPA에 따라 ZIP 다운로드와 즉시 삭제 옵션을 제공해요.
        </p>
        <button
          type="button"
          onClick={() => router.push('/setting/withdraw')}
          className="mt-3 cursor-pointer rounded-full border-[1.5px] border-[#EF4444]/40 bg-transparent px-4 py-[9px] text-[12px] font-bold text-[#DC2626]"
        >
          탈퇴 진행
        </button>
      </div>
    </>
  );
}
