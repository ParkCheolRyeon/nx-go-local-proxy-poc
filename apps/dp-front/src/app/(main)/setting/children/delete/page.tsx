'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import ChildDeleteModal from '@/app/(main)/setting/children/ChildDeleteModal';
import { CHILD_AVATAR_GRADIENTS, resolveAvatar } from '@/config/avatars';
import { alert, openDialog } from '@/dialog';
import { ApiError } from '@/lib/api';
import { deleteChild } from '@/lib/children-api';
import { type ChildDrawingLevel, type ChildProfile, useChildren, useUserActions } from '@/stores/userStore';

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

// 자녀별 통계 — R7/R9 BE 통합 시 실 데이터로 교체.
function statsFor(_child: ChildProfile): { drawings: number; awards: number } {
  return { drawings: 0, awards: 0 };
}

type Mode = 'individual' | 'all';

export default function ChildDeleteBridgePage() {
  const router = useRouter();
  const children = useChildren();
  const { removeChild } = useUserActions();

  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>('individual');
  const [submitting, setSubmitting] = useState(false);

  const togglePick = (id: string) => {
    if (mode !== 'individual') {
      // 'all' 모드에서 카드 클릭 시 individual 로 전환하면서 클릭한 카드만 해제.
      setMode('individual');
      setPicked(new Set(children.filter((c) => c.id !== id).map((c) => c.id)));
      return;
    }
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const removeOne = (id: string) => {
    if (mode !== 'individual') {
      setMode('individual');
      setPicked(new Set(children.filter((c) => c.id !== id).map((c) => c.id)));
      return;
    }
    setPicked((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const enterAllMode = () => {
    setMode('all');
    setPicked(new Set(children.map((c) => c.id)));
  };

  const enterIndividualMode = () => {
    setMode('individual');
    setPicked(new Set());
  };

  const targets = useMemo(() => {
    if (mode === 'all') return children;
    // picked Set 의 insertion 순서를 보존 — 사용자가 선택한 차례대로 표시.
    const byId = new Map(children.map((c) => [c.id, c]));
    return Array.from(picked)
      .map((id) => byId.get(id))
      .filter((c): c is ChildProfile => Boolean(c));
  }, [mode, children, picked]);

  const sumDrawings = targets.reduce((a, c) => a + statsFor(c).drawings, 0);
  const sumAwards = targets.reduce((a, c) => a + statsFor(c).awards, 0);
  const canNext = targets.length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!canNext) return;

    const single = targets.length === 1 && mode === 'individual';
    const ok = single
      ? await openDialog(ChildDeleteModal, { mode: 'single', target: targets[0] })
      : await openDialog(ChildDeleteModal, {
          mode: 'multi',
          targets,
          totalCount: children.length,
        });
    if (!ok) return;

    setSubmitting(true);
    const results = await Promise.allSettled(targets.map((t) => deleteChild(t.id)));
    const failed: { name: string; reason: string }[] = [];
    results.forEach((r, i) => {
      const t = targets[i];
      if (r.status === 'fulfilled') {
        removeChild(t.id);
      } else {
        const reason = r.reason instanceof ApiError ? r.reason.detail : '서버에 연결할 수 없어요.';
        failed.push({ name: t.name, reason });
      }
    });
    setSubmitting(false);

    if (failed.length === 0) {
      void alert(
        targets.length === 1
          ? `${targets[0].name} 프로필이 삭제되었어요.`
          : `${targets.length}명의 자녀 프로필이 삭제되었어요.`,
        { tone: 'success' },
      );
      router.replace('/setting/children');
      return;
    }
    const summary = failed.map((f) => `· ${f.name}: ${f.reason}`).join('\n');
    void alert(`일부 자녀를 삭제하지 못했어요.\n\n${summary}`, { tone: 'warning' });
    // 부분 실패 시에도 Bridge에 머무름. 성공한 자녀는 store에서 빠져 grid 자동 갱신.
    setPicked((prev) => {
      const next = new Set(prev);
      failed.forEach((f) => {
        const stillExists = children.find((c) => c.name === f.name);
        if (stillExists) next.add(stillExists.id);
      });
      return next;
    });
  };

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden"
      style={{ background: 'linear-gradient(180deg,#EAF2FE 0%,#F7FAFF 60%,#FFFFFF 100%)' }}
    >
      <div
        className="pointer-events-none absolute -right-32 -top-40 h-[380px] w-[380px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(49,150,255,0.30), rgba(49,150,255,0) 70%)' }}
      />
      <div
        className="pointer-events-none absolute -bottom-36 -left-24 h-[360px] w-[360px] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(255,200,102,0.22), rgba(255,200,102,0) 70%)' }}
      />

      <main
        className="relative z-10 flex justify-center px-8 pb-12 pt-10"
        style={{ animation: 'st-fade .4s cubic-bezier(.22,1,.36,1) both' }}
      >
        <div className="flex w-full max-w-[880px] flex-col gap-[18px]">
          <header>
            <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-[#EF4444]/[0.28] bg-[#EF4444]/[0.10] px-3 py-[5px] text-[11px] font-bold tracking-[0.6px] text-[#B91C1C]">
              <span>🗑</span>
              <span>DELETE CHILD PROFILE</span>
            </div>
            <h1 className="text-[28px] font-extrabold leading-[1.18] tracking-[-0.4px] text-[#0b2a63]">
              어떤 자녀 프로필을 삭제할까요?
            </h1>
            <p className="mt-1.5 text-[13.5px] text-[#5C6F90]">
              개별 자녀를 골라 삭제하거나, 모든 자녀 프로필을 한 번에 삭제할 수 있어요.
            </p>
          </header>

          {children.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-[#1C7AE0]/30 bg-white/70 px-5 py-12 text-center">
              <div className="text-[32px]">👶</div>
              <div className="mt-2 text-[14px] font-bold text-[#0b2a63]">등록된 자녀가 없어요</div>
              <p className="mt-1 text-[12px] text-[#5C6F90]">자녀 프로필이 없으면 삭제할 게 없어요.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <ModeCard
                  mode="individual"
                  active={mode === 'individual'}
                  icon="✂️"
                  title="선택해서 삭제"
                  sub="자녀 카드를 골라 1명 또는 여러 명을 삭제"
                  accent="#1C7AE0"
                  onClick={enterIndividualMode}
                />
                <ModeCard
                  mode="all"
                  active={mode === 'all'}
                  icon="⚠️"
                  title="모든 자녀 삭제"
                  sub={`${children.length}명의 자녀 프로필을 모두 한 번에 삭제`}
                  accent="#EF4444"
                  onClick={enterAllMode}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[12px] font-bold text-[#5C6F90]">
                    연결된 자녀 {children.length}명
                  </div>
                  {mode === 'individual' && (
                    <button
                      type="button"
                      onClick={enterAllMode}
                      className="cursor-pointer rounded-full border-[1.5px] border-[#EF4444]/[0.28] bg-white px-3 py-1.5 text-[11.5px] font-bold text-[#B91C1C]"
                    >
                      전체 선택
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
                  {children.map((c) => (
                    <ChildPickCard
                      key={c.id}
                      child={c}
                      selected={mode === 'all' || picked.has(c.id)}
                      onClick={() => togglePick(c.id)}
                    />
                  ))}
                </div>
              </div>

              <SummaryBar
                targets={targets}
                drawings={sumDrawings}
                awards={sumAwards}
                onRemove={removeOne}
              />
            </>
          )}

          <div className="mt-1 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => router.replace('/setting/children')}
              className="inline-flex h-12 flex-none cursor-pointer items-center justify-center whitespace-nowrap rounded-full border-[1.5px] border-[#1C7AE0]/[0.18] bg-white/70 text-[13.5px] font-bold leading-none text-[#5C6F90] transition-colors hover:bg-[#3196ff]/[0.06]"
              style={{ paddingLeft: 22, paddingRight: 22 }}
            >
              ← 자녀 관리로 돌아가기
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canNext}
              className="inline-flex h-12 flex-none items-center justify-center whitespace-nowrap rounded-full border-0 text-[14px] font-bold leading-none transition-transform"
              style={{
                paddingLeft: 32,
                paddingRight: 32,
                minWidth: 200,
                background: canNext
                  ? 'linear-gradient(135deg,#EF4444,#B91C1C)'
                  : 'rgba(148,163,184,0.5)',
                color: '#ffffff',
                boxShadow: canNext ? '0 12px 26px rgba(239,68,68,0.34)' : 'none',
                cursor: canNext ? 'pointer' : 'not-allowed',
              }}
            >
              {submitting
                ? '삭제 중…'
                : !canNext
                  ? '대상을 선택해 주세요'
                  : mode === 'all'
                    ? `${targets.length}명 모두 삭제하기 →`
                    : targets.length === 1
                      ? `${targets[0].name} 삭제하기 →`
                      : `${targets.length}명 삭제하기 →`}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ---------- subcomponents ----------

function ModeCard({
  active,
  icon,
  title,
  sub,
  accent,
  onClick,
}: {
  mode: Mode;
  active: boolean;
  icon: string;
  title: string;
  sub: string;
  accent: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex cursor-pointer items-start gap-3.5 rounded-[16px] px-[18px] py-[18px] text-left transition-[background,border-color,transform] hover:-translate-y-0.5"
      style={{
        background: active ? `linear-gradient(180deg, ${accent}1f, #fff)` : '#fff',
        border: active ? `2px solid ${accent}` : '1.5px solid rgba(28,122,224,0.12)',
      }}
    >
      <div
        className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[14px] text-[22px]"
        style={{
          background: active ? accent : `${accent}1a`,
          color: active ? '#fff' : accent,
        }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[17px] font-extrabold leading-[1.25] text-[#0b2a63]">{title}</div>
        <div className="mt-1 text-[12.5px] leading-[1.5] text-[#5C6F90]">{sub}</div>
      </div>
      <div
        className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[11px] font-extrabold text-white"
        style={{
          background: active ? accent : 'transparent',
          border: active ? 'none' : '1.5px solid rgba(28,122,224,0.22)',
        }}
      >
        {active ? '✓' : ''}
      </div>
    </button>
  );
}

function ChildPickCard({
  child,
  selected,
  onClick,
}: {
  child: ChildProfile;
  selected: boolean;
  onClick: () => void;
}) {
  const age = ageOf(child.birthDate);
  const stats = statsFor(child);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="relative flex cursor-pointer flex-col items-start rounded-[16px] p-4 text-left"
      style={{
        background: selected
          ? 'linear-gradient(180deg, rgba(239,68,68,0.10), #ffffff 70%)'
          : '#ffffff',
        border: selected ? '2px solid #EF4444' : '1.5px solid rgba(28,122,224,0.12)',
        boxShadow: selected
          ? '0 12px 28px rgba(239,68,68,0.18)'
          : '0 4px 14px rgba(28,122,224,0.08)',
      }}
    >
      {/* 선택 표시 */}
      <div
        className="absolute right-3 top-3 flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11px] font-extrabold"
        style={{
          background: selected ? 'linear-gradient(135deg,#EF4444,#B91C1C)' : '#ffffff',
          border: selected ? 'none' : '1.5px solid rgba(28,122,224,0.22)',
          color: '#ffffff',
          boxShadow: selected ? '0 4px 10px rgba(239,68,68,0.32)' : 'none',
        }}
      >
        {selected ? '✓' : ''}
      </div>

      {/* 아바타 — 외곽 ring 안쪽에 emoji 영역을 별도 div로 두어 padding 확보 */}
      <div
        className="mb-3 flex h-[64px] w-[64px] items-center justify-center rounded-full"
        style={{
          background: CHILD_AVATAR_GRADIENTS[child.profileEmoji],
          padding: 6,
          boxShadow: '0 8px 18px rgba(28,122,224,0.18)',
        }}
      >
        <div
          className="flex h-full w-full items-center justify-center rounded-full"
          style={{
            background: 'rgba(255,255,255,0.35)',
            backdropFilter: 'blur(2px)',
          }}
        >
          <span className="text-[26px] leading-none">{resolveAvatar(child.profileEmoji)}</span>
        </div>
      </div>

      <div className="w-full truncate text-[16px] font-extrabold leading-[1.2] text-[#0b2a63]">
        {child.name}
      </div>
      <div className="mt-0.5 truncate text-[11px] text-[#8AA0BD]">
        {age !== null && `${age}세`}
        {age !== null && ' · '}
        {LEVEL_LABEL[child.drawingLevel]}
      </div>

      <div className="mt-2.5 flex w-full items-center gap-1.5 text-[11px] text-[#5C6F90]">
        <span className="rounded-full bg-slate-100 px-2 py-0.5">🎨 {stats.drawings}</span>
        <span className="rounded-full bg-slate-100 px-2 py-0.5">🏆 {stats.awards}</span>
      </div>
    </button>
  );
}

function SummaryBar({
  targets,
  drawings,
  awards,
  onRemove,
}: {
  targets: ChildProfile[];
  drawings: number;
  awards: number;
  onRemove: (id: string) => void;
}) {
  const empty = targets.length === 0;

  if (empty) {
    return (
      <div
        className="flex items-center gap-3.5 rounded-[14px] border-[1.5px] border-dashed border-[#1C7AE0]/[0.18] bg-slate-50/80 px-[18px] py-3.5"
      >
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] bg-slate-200/70 text-[18px] text-[#8AA0BD]">
          –
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-bold tracking-[0.6px] text-[#8AA0BD]">
            NO TARGET SELECTED
          </div>
          <div className="mt-0.5 text-[14px] font-bold text-[#0b2a63]">
            카드를 선택하거나 "모든 자녀 삭제"를 골라 주세요
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-[14px] border-[1.5px] border-[#EF4444]/[0.28] px-[18px] py-3.5"
      style={{
        background: 'linear-gradient(135deg, rgba(239,68,68,0.08), rgba(239,68,68,0.02))',
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 flex-none items-center justify-center rounded-[12px] text-[18px] text-white"
            style={{ background: 'linear-gradient(135deg,#EF4444,#B91C1C)' }}
          >
            🗑
          </div>
          <div>
            <div className="text-[11px] font-bold tracking-[0.6px] text-[#B91C1C]">
              {targets.length}명 삭제 예정
            </div>
            <div className="mt-0.5 text-[13px] text-[#5C6F90]">
              아래 칩의 ✕로 한 명씩 제외할 수 있어요.
            </div>
          </div>
        </div>
        <div className="flex flex-none gap-4 text-[11px] text-[#5C6F90]">
          <div className="text-right">
            <div className="text-[18px] font-extrabold leading-none text-[#0b2a63]">{drawings}</div>
            <div className="mt-0.5">🎨 작품</div>
          </div>
          <div className="text-right">
            <div className="text-[18px] font-extrabold leading-none text-[#0b2a63]">{awards}</div>
            <div className="mt-0.5">🏆 수상</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {targets.map((t) => (
          <span
            key={t.id}
            className="group inline-flex items-center gap-2 rounded-full border border-[#EF4444]/[0.28] bg-white py-1 pl-1 pr-1 text-[12.5px] font-bold text-[#0b2a63] shadow-[0_2px_8px_rgba(239,68,68,0.10)] transition-shadow hover:shadow-[0_4px_12px_rgba(239,68,68,0.18)]"
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{
                background: CHILD_AVATAR_GRADIENTS[t.profileEmoji],
                padding: 3,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4)',
              }}
            >
              <span
                className="flex h-full w-full items-center justify-center rounded-full"
                style={{ background: 'rgba(255,255,255,0.35)' }}
              >
                <span className="text-[14px] leading-none">{resolveAvatar(t.profileEmoji)}</span>
              </span>
            </span>
            <span className="pr-0.5">{t.name}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(t.id);
              }}
              aria-label={`${t.name} 제외`}
              className="flex h-6 w-6 flex-none cursor-pointer items-center justify-center rounded-full border-0 text-[11px] font-extrabold leading-none text-white transition-colors"
              style={{
                background: 'linear-gradient(135deg,#EF4444,#B91C1C)',
                boxShadow: '0 2px 6px rgba(239,68,68,0.30)',
              }}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
