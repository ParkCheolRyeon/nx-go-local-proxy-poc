'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import ChildDeleteModal from '@/app/(main)/setting/children/ChildDeleteModal';
import { CHILD_AVATAR_GRADIENTS, resolveAvatar } from '@/config/avatars';
import { alert, openDialog } from '@/dialog';
import { ApiError } from '@/lib/api';
import { deleteChild } from '@/lib/children-api';
import { type ChildProfile, useChildren, useUserActions } from '@/stores/userStore';

function ageOf(birthDate: string, now = new Date()): number | null {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  let years = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) years -= 1;
  return Math.max(0, years);
}

function statsFor(_child: ChildProfile): { drawings: number; awards: number } {
  return { drawings: 0, awards: 0 };
}

type Mode = 'individual' | 'all';

export default function DeleteClient() {
  const router = useRouter();
  const children = useChildren();
  const { removeChild } = useUserActions();
  const t = useTranslations('childDelete');

  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<Mode>('individual');
  const [submitting, setSubmitting] = useState(false);

  const togglePick = (id: string) => {
    if (mode !== 'individual') {
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
    const results = await Promise.allSettled(targets.map((tgt) => deleteChild(tgt.id)));
    const failed: { name: string; reason: string }[] = [];
    results.forEach((r, i) => {
      const tgt = targets[i];
      if (r.status === 'fulfilled') {
        removeChild(tgt.id);
      } else {
        const reason = r.reason instanceof ApiError ? r.reason.detail : t('errorServer');
        failed.push({ name: tgt.name, reason });
      }
    });
    setSubmitting(false);

    if (failed.length === 0) {
      void alert(
        targets.length === 1
          ? t('successOne', { name: targets[0].name })
          : t('successMany', { count: targets.length }),
        { tone: 'success' },
      );
      router.replace('/setting/children');
      return;
    }
    const summary = failed.map((f) => `· ${f.name}: ${f.reason}`).join('\n');
    void alert(`${t('partialFailureTitle')}\n\n${summary}`, { tone: 'warning' });
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
              <span>{t('headerTag')}</span>
            </div>
            <h1 className="text-[28px] font-extrabold leading-[1.18] tracking-[-0.4px] text-[#0b2a63]">
              {t('title')}
            </h1>
            <p className="mt-1.5 text-[13.5px] text-[#5C6F90]">{t('subtitle')}</p>
          </header>

          {children.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-[#1C7AE0]/30 bg-white/70 px-5 py-12 text-center">
              <div className="text-[32px]">👶</div>
              <div className="mt-2 text-[14px] font-bold text-[#0b2a63]">{t('emptyTitle')}</div>
              <p className="mt-1 text-[12px] text-[#5C6F90]">{t('emptySub')}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <ModeCard
                  active={mode === 'individual'}
                  icon="✂️"
                  title={t('modeIndividualTitle')}
                  sub={t('modeIndividualSub')}
                  accent="#1C7AE0"
                  onClick={enterIndividualMode}
                />
                <ModeCard
                  active={mode === 'all'}
                  icon="⚠️"
                  title={t('modeAllTitle')}
                  sub={t('modeAllSub', { count: children.length })}
                  accent="#EF4444"
                  onClick={enterAllMode}
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[12px] font-bold text-[#5C6F90]">
                    {t('linkedCount', { count: children.length })}
                  </div>
                  {mode === 'individual' && (
                    <button
                      type="button"
                      onClick={enterAllMode}
                      className="cursor-pointer rounded-full border-[1.5px] border-[#EF4444]/[0.28] bg-white px-3 py-1.5 text-[11.5px] font-bold text-[#B91C1C]"
                    >
                      {t('selectAll')}
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
              {t('back')}
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
                ? t('submitting')
                : !canNext
                  ? t('submitNoTarget')
                  : mode === 'all'
                    ? t('submitAll', { count: targets.length })
                    : targets.length === 1
                      ? t('submitOne', { name: targets[0].name })
                      : t('submitMany', { count: targets.length })}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function ModeCard({
  active,
  icon,
  title,
  sub,
  accent,
  onClick,
}: {
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
  const t = useTranslations('childDelete');
  const tLevel = useTranslations('child.level');
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
        {age !== null && t('ageSuffix', { age })}
        {age !== null && ' · '}
        {tLevel(child.drawingLevel)}
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
  const t = useTranslations('childDelete');

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
            {t('summaryEmptyTag')}
          </div>
          <div className="mt-0.5 text-[14px] font-bold text-[#0b2a63]">
            {t('summaryEmptyMsg')}
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
              {t('summaryWillDelete', { count: targets.length })}
            </div>
            <div className="mt-0.5 text-[13px] text-[#5C6F90]">{t('summaryHelp')}</div>
          </div>
        </div>
        <div className="flex flex-none gap-4 text-[11px] text-[#5C6F90]">
          <div className="text-right">
            <div className="text-[18px] font-extrabold leading-none text-[#0b2a63]">{drawings}</div>
            <div className="mt-0.5">{t('drawingsLabel')}</div>
          </div>
          <div className="text-right">
            <div className="text-[18px] font-extrabold leading-none text-[#0b2a63]">{awards}</div>
            <div className="mt-0.5">{t('awardsLabel')}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {targets.map((tgt) => (
          <span
            key={tgt.id}
            className="group inline-flex items-center gap-2 rounded-full border border-[#EF4444]/[0.28] bg-white py-1 pl-1 pr-1 text-[12.5px] font-bold text-[#0b2a63] shadow-[0_2px_8px_rgba(239,68,68,0.10)] transition-shadow hover:shadow-[0_4px_12px_rgba(239,68,68,0.18)]"
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{
                background: CHILD_AVATAR_GRADIENTS[tgt.profileEmoji],
                padding: 3,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4)',
              }}
            >
              <span
                className="flex h-full w-full items-center justify-center rounded-full"
                style={{ background: 'rgba(255,255,255,0.35)' }}
              >
                <span className="text-[14px] leading-none">{resolveAvatar(tgt.profileEmoji)}</span>
              </span>
            </span>
            <span className="pr-0.5">{tgt.name}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(tgt.id);
              }}
              aria-label={t('removeChipAria', { name: tgt.name })}
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
