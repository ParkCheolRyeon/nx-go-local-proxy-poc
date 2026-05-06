'use client';

import { useEffect, useState, type ChangeEvent } from 'react';

import { CHILD_AVATAR_GRADIENTS, resolveAvatar } from '@/config/avatars';
import { type ChildDrawingLevel, type ChildProfile } from '@/stores/userStore';
import { type DialogRequestComponentProps } from '@/stores/dialogStore';

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

const CONFIRM_PHRASE = '모두 삭제';

type Stats = { drawings: number; awards: number };

// R9a/R10/R7 등의 통계 API 미연동 상태 — 추후 BE 연동 시 prop으로 주입.
function statsFor(_child: ChildProfile): Stats {
  return { drawings: 0, awards: 0 };
}

export type ChildDeleteModalProps = DialogRequestComponentProps<boolean> & {
  mode: 'single' | 'all';
  target?: ChildProfile;
  targets?: ChildProfile[];
};

export default function ChildDeleteModal(props: ChildDeleteModalProps) {
  const { resolve, mode } = props;
  const isAll = mode === 'all';
  const single = !isAll ? props.target : undefined;
  const all = isAll ? props.targets ?? [] : [];

  const [agree1, setAgree1] = useState(false);
  const [agree2, setAgree2] = useState(false);
  const [typed, setTyped] = useState('');

  const close = (confirmed: boolean) => resolve(confirmed);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSubmit = isAll
    ? agree1 && agree2 && typed === CONFIRM_PHRASE
    : agree1 && agree2;

  const headerText = isAll
    ? '자녀 프로필을 모두 삭제할까요?'
    : `${single?.name ?? '이 자녀'} 프로필을 삭제할까요?`;

  const headerSub = isAll ? 'DELETE ALL CHILD PROFILES' : 'DELETE CHILD PROFILE';

  const headerGradient = isAll
    ? 'linear-gradient(135deg,#7F1D1D 0%, #B91C1C 60%, #EF4444 100%)'
    : 'linear-gradient(135deg,#0b2a63 0%,#1C7AE0 60%,#3196ff 100%)';

  // 통계 합계
  const totalStats: Stats = isAll
    ? all.reduce<Stats>(
        (a, c) => {
          const s = statsFor(c);
          return { drawings: a.drawings + s.drawings, awards: a.awards + s.awards };
        },
        { drawings: 0, awards: 0 },
      )
    : single
      ? statsFor(single)
      : { drawings: 0, awards: 0 };

  const submitLabel = isAll
    ? `${all.length}명 모두 삭제`
    : `${single?.name ?? '자녀'} 삭제하기`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="child-delete-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ animation: 'st-fade .2s ease-out both' }}
    >
      <div
        className="absolute inset-0 bg-[#0b2a63]/45 backdrop-blur-[2px]"
        onClick={() => close(false)}
        aria-hidden
      />

      <div
        className="relative flex max-h-[90vh] w-full max-w-[540px] flex-col overflow-hidden rounded-[24px] border border-[#1C7AE0]/[0.10] bg-white shadow-[0_40px_100px_rgba(28,122,224,0.34)]"
        style={{ animation: 'st-fade .25s cubic-bezier(.22,1,.36,1) both' }}
      >
        {/* header band */}
        <div
          className="relative overflow-hidden px-[26px] py-[22px] text-white"
          style={{ background: headerGradient }}
        >
          <div
            className="pointer-events-none absolute -right-8 -top-8 h-[130px] w-[130px] rounded-full"
            style={{ background: 'rgba(255,255,255,0.14)' }}
          />
          <div
            className="pointer-events-none absolute -bottom-10 right-12 h-[90px] w-[90px] rounded-full"
            style={{ background: 'rgba(255,255,255,0.10)' }}
          />
          <div className="relative flex items-center gap-3">
            <div
              className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] text-[22px]"
              style={{ background: 'rgba(255,255,255,0.20)', backdropFilter: 'blur(8px)' }}
            >
              {isAll ? '⚠️' : '🗑'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-bold tracking-[1px] opacity-85">{headerSub}</div>
              <div id="child-delete-title" className="mt-0.5 text-[20px] font-extrabold leading-[1.2]">
                {headerText}
              </div>
            </div>
            <button
              type="button"
              onClick={() => close(false)}
              aria-label="닫기"
              className="flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-[10px] border-0 bg-white/[0.18] text-[16px] text-white transition-transform hover:-translate-y-px"
            >
              ✕
            </button>
          </div>
        </div>

        {/* body */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-[26px] py-5">
          {!isAll && single && <SingleTargetCard child={single} />}
          {isAll && <AllTargetsList targets={all} />}

          <ImpactGrid drawings={totalStats.drawings} awards={totalStats.awards} />

          <div
            className="flex items-start gap-2.5 rounded-[12px] border border-[#3196ff]/[0.22] bg-[#3196ff]/[0.08] px-3.5 py-3"
          >
            <span className="text-[16px]">💾</span>
            <div className="flex-1 text-[12px] leading-[1.55] text-[#5C6F90]">
              삭제 전에 그림 작품을 ZIP으로 내려받을 수 있어요.
              <span className="ml-1 cursor-not-allowed font-bold text-[#1C7AE0] opacity-70">
                작품 다운로드 →
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <CheckRow
              checked={agree1}
              onChange={setAgree1}
              label="삭제 후에는 작품·수상·진행 중 그림을 복구할 수 없음을 이해했어요."
            />
            <CheckRow
              checked={agree2}
              onChange={setAgree2}
              label={
                isAll
                  ? `${all.length}명의 자녀 프로필이 모두 사라지며, 가족 계정만 남는다는 점을 확인했어요.`
                  : '진행 중이던 그림과 미수령 보상은 모두 사라진다는 점을 확인했어요.'
              }
            />
          </div>

          {isAll && (
            <div>
              <div className="mb-1.5 text-[12px] font-bold text-[#5C6F90]">
                확인을 위해 <span className="text-[#B91C1C]">"{CONFIRM_PHRASE}"</span>를 입력해 주세요
              </div>
              <input
                value={typed}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTyped(e.target.value)}
                placeholder={CONFIRM_PHRASE}
                className="w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-3 text-[14px] text-[#0b2a63] outline-none transition-[border-color,box-shadow] placeholder:text-[#8AA0BD] focus:shadow-[0_0_0_4px_rgba(239,68,68,0.14)]"
                style={{
                  borderColor: typed === CONFIRM_PHRASE ? '#10B981' : 'rgba(239,68,68,0.30)',
                }}
              />
              {typed.length > 0 && typed !== CONFIRM_PHRASE && (
                <div className="mt-1 text-[11px] text-[#EF4444]">정확하게 일치해야 해요</div>
              )}
            </div>
          )}
        </div>

        {/* footer */}
        <div
          className="flex items-center justify-between gap-3 border-t border-[#1C7AE0]/[0.10] px-[26px] py-4"
          style={{ background: 'rgba(248,250,252,0.6)' }}
        >
          <div className="text-[11.5px] text-[#8AA0BD]">🛡 삭제 후 30일간 고객센터로 복구 요청 가능</div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => close(false)}
              className="cursor-pointer rounded-full border-[1.5px] border-[#1C7AE0]/[0.18] bg-white px-[22px] py-[11px] text-[13.5px] font-bold text-[#5C6F90]"
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => close(true)}
              disabled={!canSubmit}
              className="rounded-full border-0 px-6 py-[11px] text-[13.5px] font-bold text-white transition-transform"
              style={{
                background: canSubmit
                  ? 'linear-gradient(135deg,#EF4444,#B91C1C)'
                  : 'rgba(148,163,184,0.5)',
                cursor: canSubmit ? 'pointer' : 'not-allowed',
                boxShadow: canSubmit ? '0 10px 22px rgba(239,68,68,0.34)' : 'none',
              }}
            >
              {submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- subcomponents ----------

function SingleTargetCard({ child }: { child: ChildProfile }) {
  const age = ageOf(child.birthDate);
  const stats = statsFor(child);
  return (
    <div
      className="flex items-center gap-3.5 rounded-[14px] border-[1.5px] border-[#3196ff]/[0.22] px-4 py-3.5"
      style={{ background: 'linear-gradient(135deg, rgba(49,150,255,0.08), rgba(49,150,255,0.02))' }}
    >
      <div
        className="flex h-14 w-14 flex-none items-center justify-center rounded-full text-[28px] shadow-[0_6px_16px_rgba(28,122,224,0.18)]"
        style={{ background: CHILD_AVATAR_GRADIENTS[child.profileEmoji] }}
      >
        {resolveAvatar(child.profileEmoji)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[18px] font-extrabold text-[#0b2a63]">{child.name}</div>
        <div className="text-[12px] text-[#8AA0BD]">
          {age !== null && `${age}세 · `}
          {LEVEL_LABEL[child.drawingLevel]}
        </div>
        <div className="mt-1 flex gap-2.5 text-[11.5px] text-[#5C6F90]">
          <span>🎨 {stats.drawings}작</span>
          <span>🏆 {stats.awards}회 수상</span>
        </div>
      </div>
    </div>
  );
}

function AllTargetsList({ targets }: { targets: ChildProfile[] }) {
  return (
    <div className="rounded-[14px] border-[1.5px] border-[#EF4444]/[0.24] bg-[#EF4444]/[0.06] px-4 py-3.5">
      <div className="mb-2 text-[12px] font-bold tracking-[0.4px] text-[#B91C1C]">
        삭제 대상 자녀 {targets.length}명
      </div>
      <div className="flex flex-col gap-2">
        {targets.map((c) => {
          const stats = statsFor(c);
          return (
            <div
              key={c.id}
              className="flex items-center gap-2.5 rounded-[10px] border border-[#EF4444]/[0.16] bg-white px-2.5 py-2"
            >
              <div
                className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-[16px]"
                style={{ background: CHILD_AVATAR_GRADIENTS[c.profileEmoji] }}
              >
                {resolveAvatar(c.profileEmoji)}
              </div>
              <div className="min-w-0 flex-1 text-[13px] font-bold text-[#0b2a63]">{c.name}</div>
              <div className="text-[11px] text-[#8AA0BD]">
                🎨 {stats.drawings} · 🏆 {stats.awards}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ImpactGrid({ drawings, awards }: { drawings: number; awards: number }) {
  const tiles = [
    { i: '🎨', t: '그림 작품', n: `${drawings}작` },
    { i: '🏆', t: '수상 이력', n: `${awards}회` },
    { i: '🪙', t: '코인 잔액', n: '소멸' },
    { i: '⏱', t: '타임랩스 기록', n: '영구 삭제' },
  ];
  return (
    <div>
      <div className="mb-2 text-[12px] font-bold text-[#5C6F90]">삭제하면 다음 데이터가 함께 사라져요</div>
      <div className="grid grid-cols-2 gap-2">
        {tiles.map((d) => (
          <div
            key={d.t}
            className="flex items-center gap-2.5 rounded-[10px] border border-[#1C7AE0]/[0.12] bg-slate-50/80 px-3 py-2.5"
          >
            <span className="text-[16px]">{d.i}</span>
            <div className="min-w-0 flex-1">
              <div className="text-[11.5px] text-[#8AA0BD]">{d.t}</div>
              <div className="text-[13px] font-bold text-[#0b2a63]">{d.n}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label
      className="flex cursor-pointer items-start gap-2.5 rounded-[10px] border-[1.5px] px-3 py-2.5"
      style={{
        background: checked ? 'rgba(239,68,68,0.06)' : 'rgba(248,250,252,0.8)',
        borderColor: checked ? 'rgba(239,68,68,0.32)' : 'transparent',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4"
        style={{ accentColor: '#EF4444' }}
      />
      <span className="text-[12.5px] leading-[1.5] text-[#5C6F90]">{label}</span>
    </label>
  );
}
