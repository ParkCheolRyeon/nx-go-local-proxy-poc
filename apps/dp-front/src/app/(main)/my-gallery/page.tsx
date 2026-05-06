'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import ChildSwitcher from '@/app/(main)/my-gallery/ChildSwitcher';
import DrawingCard from '@/app/(main)/my-gallery/DrawingCard';
import MonthCalendar from '@/app/(main)/my-gallery/MonthCalendar';
import { ApiError } from '@/lib/api';
import {
  listAwards,
  listDrawings,
  type ApiAwardEntry,
  type ApiDrawing,
} from '@/lib/drawings-api';
import { cn } from '@/lib/utils';
import { useChildren, useSelectedChildId, useUserActions } from '@/stores/userStore';

type TabId = 'archive' | 'public' | 'awards';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'archive', label: '보관함', icon: '📦' },
  { id: 'public', label: '공개작품', icon: '🎨' },
  { id: 'awards', label: '수상작', icon: '🏆' },
];

type CardItem = {
  key: string;
  drawingId: string;
  mode: ApiDrawing['mode'];
  title: string;
  thumbnailUrl?: string;
  status?: ApiDrawing['status'];
  isPublic?: boolean;
  completedAt?: string;
  awardRank?: ApiAwardEntry['rank'];
};

function drawingToItem(d: ApiDrawing): CardItem {
  return {
    key: `d-${d.id}`,
    drawingId: d.id,
    mode: d.mode,
    title: d.title,
    thumbnailUrl: d.thumbnailUrl,
    status: d.status,
    isPublic: d.isPublic,
    completedAt: d.completedAt,
  };
}

function awardToItem(a: ApiAwardEntry): CardItem {
  return {
    key: `a-${a.awardId}`,
    drawingId: a.drawingId,
    mode: a.mode,
    title: a.title,
    thumbnailUrl: a.thumbnailUrl,
    status: 'completed',
    isPublic: a.isPublic,
    completedAt: a.completedAt,
    awardRank: a.rank,
  };
}

export default function MyGalleryPage() {
  const router = useRouter();
  const children = useChildren();
  const selectedChildId = useSelectedChildId();
  const { setSelectedChildId } = useUserActions();

  const [tab, setTab] = useState<TabId>('archive');
  const [items, setItems] = useState<CardItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 자녀가 1명 이상이고 selected 가 비어있으면 첫 번째로 자동 선택
  useEffect(() => {
    if (!selectedChildId && children.length > 0) {
      setSelectedChildId(children[0].id);
    }
    // selected 가 가리키던 자녀가 삭제됐으면 폴백
    if (selectedChildId && children.length > 0 && !children.some((c) => c.id === selectedChildId)) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId, setSelectedChildId]);

  const selectedChild = useMemo(
    () => children.find((c) => c.id === selectedChildId) ?? null,
    [children, selectedChildId],
  );

  // 탭/자녀 변경 시 데이터 fetch
  useEffect(() => {
    if (!selectedChild) {
      setItems(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      if (!selectedChild) return;
      try {
        if (tab === 'awards') {
          const data = await listAwards(selectedChild.id);
          if (!cancelled) setItems(data.map(awardToItem));
        } else if (tab === 'public') {
          const data = await listDrawings(selectedChild.id, {
            status: 'completed',
            visibility: 'public',
          });
          if (!cancelled) setItems(data.map(drawingToItem));
        } else {
          const data = await listDrawings(selectedChild.id);
          if (!cancelled) setItems(data.map(drawingToItem));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.detail : '작품을 불러오지 못했어요.');
          setItems([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [selectedChild, tab]);

  // 자녀 0명 — 추가 유도
  if (children.length === 0) {
    return (
      <PageBackdrop>
        <div className="mx-auto flex w-full max-w-[600px] flex-col items-center gap-4 px-6 pb-12 pt-16 text-center">
          <div className="text-[40px]">👶</div>
          <h1 className="text-[22px] font-extrabold text-[#0b2a63]">아직 등록된 자녀가 없어요</h1>
          <p className="text-[13px] text-[#5C6F90]">자녀 프로필을 먼저 만들어야 마이갤러리를 사용할 수 있어요.</p>
          <button
            type="button"
            onClick={() => router.push('/signup/children-profile?next=/my-gallery')}
            className="mt-2 rounded-[14px] bg-[linear-gradient(135deg,#3196ff,#1C7AE0)] px-5 py-3 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(28,122,224,0.32)]"
          >
            자녀 추가하기
          </button>
        </div>
      </PageBackdrop>
    );
  }

  return (
    <PageBackdrop>
      <div className="relative z-10 mx-auto w-full max-w-[1100px] px-6 pb-16 pt-10">
        {/* Header ----------------------------------------------------------- */}
        <header
          className="flex flex-wrap items-end justify-between gap-4"
          style={{ animation: 'ac02-fade .5s ease-out both' }}
        >
          <div>
            <div className="mb-2.5 inline-flex items-center gap-1.5 rounded-full border border-[#3196ff]/25 bg-[#3196ff]/15 px-2.5 py-1 text-[11px] font-bold text-[#1C7AE0]">
              <span>🖼</span>
              <span>MY GALLERY</span>
            </div>
            <h1 className="text-[32px] font-extrabold leading-[1.1] tracking-[-0.5px] text-[#0b2a63] sm:text-[36px]">
              {selectedChild ? (
                <>
                  <span className="text-[#1C7AE0]">{selectedChild.name}</span>의 갤러리
                </>
              ) : (
                '마이 갤러리'
              )}
            </h1>
            <p className="mt-1 text-[13px] text-[#8AA0BD]">
              보관함에서 이어 그리고, 공개작품으로 자랑하고, 수상작으로 모아둬요.
            </p>
          </div>

          <ChildSwitcher
            children={children}
            selectedId={selectedChildId}
            onSelect={(id) => setSelectedChildId(id)}
          />
        </header>

        {/* Tabs ------------------------------------------------------------- */}
        <nav
          aria-label="갤러리 탭"
          className="mt-6 flex flex-wrap items-center gap-1.5 rounded-full border border-[#1C7AE0]/10 bg-white/70 p-1.5 shadow-[0_4px_12px_rgba(28,122,224,0.08)] sm:w-fit"
          style={{ animation: 'ac02-fade .5s ease-out .05s both' }}
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-4 py-2 text-[12.5px] font-bold transition-all duration-200',
                  active
                    ? 'bg-[linear-gradient(135deg,#3196ff,#1C7AE0)] text-white shadow-[0_4px_10px_rgba(28,122,224,0.28)]'
                    : 'text-[#5C6F90] hover:text-[#1C7AE0]',
                )}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Grid ------------------------------------------------------------- */}
        <section
          className="mt-5"
          style={{ animation: 'ac02-fade .5s ease-out .1s both' }}
        >
          {error && (
            <div className="mb-4 rounded-[14px] border border-red-200 bg-red-50/80 px-4 py-3 text-[12.5px] font-semibold text-red-600">
              {error}
            </div>
          )}

          {loading && items === null ? (
            <GridPlaceholder />
          ) : items && items.length === 0 ? (
            <EmptyState tab={tab} onGoDraw={() => router.push('/drawing')} />
          ) : (
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
              {(items ?? []).map((it, i) => (
                <DrawingCard
                  key={it.key}
                  id={it.drawingId}
                  mode={it.mode}
                  title={it.title}
                  thumbnailUrl={it.thumbnailUrl}
                  status={it.status}
                  isPublic={it.isPublic}
                  completedAt={it.completedAt}
                  awardRank={it.awardRank}
                  stagger={Math.min(i, 11) * 0.04}
                  onClick={() => router.push(`/drawing/${it.drawingId}`)}
                />
              ))}
            </div>
          )}
        </section>

        {/* Calendar --------------------------------------------------------- */}
        <section
          className="mt-8"
          style={{ animation: 'ac02-fade .5s ease-out .15s both' }}
        >
          <MonthCalendar />
        </section>

        {/* CTA -------------------------------------------------------------- */}
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => router.push('/drawing')}
            className="flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#3196ff,#1C7AE0)] px-6 py-3 text-[13.5px] font-extrabold text-white shadow-[0_10px_24px_rgba(28,122,224,0.35)] transition-transform duration-200 hover:-translate-y-0.5"
          >
            <span className="text-[16px]">🎨</span>
            <span>그리러 가기</span>
            <span className="text-[14px]">→</span>
          </button>
        </div>
      </div>
    </PageBackdrop>
  );
}

// =============================================================================
// helper components
// =============================================================================

function PageBackdrop({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden text-[#0b2a63]"
      style={{ background: 'linear-gradient(180deg,#EAF2FE 0%,#F7FAFF 60%,#FFFFFF 100%)' }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[40px] -top-[60px] h-[320px] w-[320px] rounded-full"
        style={{
          background: 'radial-gradient(circle,rgba(49,150,255,.18),transparent 70%)',
          filter: 'blur(24px)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-[80px] -left-[60px] h-[280px] w-[280px] rounded-full"
        style={{
          background: 'radial-gradient(circle,rgba(255,184,77,.12),transparent 70%)',
          filter: 'blur(24px)',
        }}
      />
      {children}
    </div>
  );
}

function GridPlaceholder() {
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          aria-hidden
          className="aspect-[3/4] animate-pulse rounded-[16px] border border-[#1C7AE0]/8 bg-white/70"
          style={{ animationDelay: `${i * 0.06}s` }}
        />
      ))}
    </div>
  );
}

function EmptyState({ tab, onGoDraw }: { tab: TabId; onGoDraw: () => void }) {
  const meta = {
    archive: { icon: '📦', title: '아직 보관된 작품이 없어요', sub: '첫 그림을 그려서 보관함을 채워보세요.' },
    public: { icon: '🎨', title: '공개한 작품이 없어요', sub: '완성한 작품을 공개로 전환해 자랑해보세요.' },
    awards: { icon: '🏆', title: '수상한 작품이 없어요', sub: '이벤트에 출품해서 수상해보세요.' },
  }[tab];

  return (
    <div className="rounded-[20px] border border-dashed border-[#1C7AE0]/25 bg-white/60 px-6 py-14 text-center backdrop-blur-md">
      <div className="text-[40px]">{meta.icon}</div>
      <div className="mt-2 text-[15px] font-extrabold text-[#0b2a63]">{meta.title}</div>
      <p className="mt-1 text-[12.5px] text-[#5C6F90]">{meta.sub}</p>
      {tab !== 'awards' && (
        <button
          type="button"
          onClick={onGoDraw}
          className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[linear-gradient(135deg,#3196ff,#1C7AE0)] px-4 py-2 text-[12px] font-bold text-white shadow-[0_8px_18px_rgba(28,122,224,0.32)]"
        >
          <span>🎨</span>
          <span>그리러 가기</span>
        </button>
      )}
    </div>
  );
}
