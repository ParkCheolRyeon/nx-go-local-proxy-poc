'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react';

import { alert, confirm } from '@/dialog';
import { signOutLocal } from '@/lib/auth-api';
import { cn } from '@/lib/utils';
import { useUserActions } from '@/stores/userStore';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STEP_TITLES: Record<Step, string> = {
  1: '잠시만요, 정말 떠나시나요?',
  2: '자녀 프로필은 어떻게 할까요?',
  3: '삭제 방식을 선택해 주세요',
  4: '그림을 ZIP으로 받아두세요',
  5: '사라지는 데이터를 확인해 주세요',
  6: '본인 확인이 필요해요',
  7: '마지막으로 한 번만 더 확인할게요',
};

type ReasonKey = 'price' | 'use' | 'quality' | 'privacy' | 'kid' | 'other';
type ChildrenHandling = 'all' | 'keep' | 'partial';
type DeletionMethod = 'grace' | 'instant';

type ZipItems = {
  drawings: boolean;
  awards: boolean;
  timelapse: boolean;
  profile: boolean;
};

type WithdrawState = {
  reason: ReasonKey | null;
  reasonOther: string;
  childrenHandling: ChildrenHandling;
  method: DeletionMethod;
  zipItems: ZipItems;
  password: string;
  otp: string;
  c1: boolean;
  c2: boolean;
  c3: boolean;
  phrase: string;
};

const INITIAL: WithdrawState = {
  reason: null,
  reasonOther: '',
  childrenHandling: 'all',
  method: 'grace',
  zipItems: { drawings: true, awards: true, timelapse: true, profile: false },
  password: '',
  otp: '',
  c1: false,
  c2: false,
  c3: false,
  phrase: '',
};

const CONFIRM_PHRASE = '아트봉봉 갤러리 탈퇴';

export default function WithdrawPage() {
  const router = useRouter();
  const { signOut } = useUserActions();
  const [step, setStep] = useState<Step>(1);
  const [s, setS] = useState<WithdrawState>(INITIAL);

  const update = <K extends keyof WithdrawState>(key: K, value: WithdrawState[K]) =>
    setS((prev) => ({ ...prev, [key]: value }));

  const goto = (next: Step) => setStep(next);
  const handlePrev = async () => {
    if (step === 1) {
      const ok = await confirm('탈퇴 절차를 그만둘까요? 입력하신 내용은 사라져요.', {
        title: '탈퇴 절차 종료',
        yesButtonText: '나가기',
        noButtonText: '계속 진행',
      });
      if (ok) router.replace('/setting/danger');
      return;
    }
    setStep((step - 1) as Step);
  };

  const handleNext = async () => {
    if (step < 7) {
      setStep((step + 1) as Step);
      return;
    }
    // 최종 확정. 실제 hard-delete/유예 등록은 R14 본격 진입 시 BE 구현.
    await alert(
      s.method === 'instant'
        ? '탈퇴 요청이 접수되었어요. 모든 데이터가 즉시 삭제됩니다. (BE 미구현 — mock)'
        : '탈퇴 요청이 접수되었어요. 30일 안에 다시 로그인하시면 취소할 수 있어요. (BE 미구현 — mock)',
      { tone: 'success' },
    );
    signOutLocal();
    signOut();
    router.replace('/signin');
  };

  const stepProps = { step, state: s, update, onPrev: handlePrev, onNext: handleNext, goto };

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

      <main className="relative z-10 flex justify-center px-6 pb-8 pt-8">
        <div
          className="flex w-full max-w-[720px] flex-col gap-4"
          style={{ animation: 'st-fade .4s cubic-bezier(.22,1,.36,1) both' }}
        >
          <ProgressBar step={step} />
          <Hero step={step} />
          {step === 1 && <Step1 {...stepProps} />}
          {step === 2 && <Step2 {...stepProps} />}
          {step === 3 && <Step3 {...stepProps} />}
          {step === 4 && <Step4 {...stepProps} />}
          {step === 5 && <Step5 {...stepProps} />}
          {step === 6 && <Step6 {...stepProps} />}
          {step === 7 && <Step7 {...stepProps} />}
        </div>
      </main>
    </div>
  );
}

// ---------- Progress + Hero ----------

function ProgressBar({ step }: { step: Step }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-bold tracking-[0.6px] text-[#1C7AE0]">
          STEP {step} / 7 · {STEP_TITLES[step]}
        </div>
        <div className="text-[11px] text-[#8AA0BD]">예상 소요 2분</div>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => {
          const done = i < step;
          const cur = i === step;
          return (
            <div
              key={i}
              className="h-[5px] flex-1 rounded-[3px] transition-colors duration-[250ms]"
              style={{
                background: done
                  ? '#1C7AE0'
                  : cur
                    ? 'linear-gradient(90deg,#3196ff,#1C7AE0)'
                    : 'rgba(148,163,184,0.20)',
              }}
            />
          );
        })}
      </div>
    </div>
  );
}

const HERO_SUB: Record<Step, string> = {
  1: '떠나시는 이유를 알려주시면 더 좋은 서비스를 만드는 데 큰 도움이 돼요.',
  2: '가족 계정에 자녀가 연결되어 있어요. 어떻게 처리할지 선택해 주세요.',
  3: '언제 데이터를 삭제할지 결정할 수 있어요. 마음이 바뀌실 수 있다면 30일 유예를 추천해요.',
  4: '삭제 전 마지막 기회예요. 자녀의 작품과 활동 기록을 다운로드할 수 있어요.',
  5: '탈퇴가 완료되면 아래 항목들이 영구 삭제돼요. 한 번 더 확인 부탁드려요.',
  6: '계정 보안을 위해, 비밀번호와 등록된 휴대전화 인증을 한 번 더 진행할게요.',
  7: '지금 [영구 삭제하기]를 누르면 30일 유예 기간이 시작돼요. 그 안에 다시 로그인하면 취소할 수 있어요.',
};

function Hero({ step }: { step: Step }) {
  return (
    <div>
      <div className="text-[28px] font-extrabold leading-[1.18] tracking-[-0.4px] text-[#0b2a63]">
        {STEP_TITLES[step]}
      </div>
      <div className="mt-1.5 text-[13.5px] leading-[1.5] text-[#5C6F90]">{HERO_SUB[step]}</div>
    </div>
  );
}

// ---------- Card + Footer ----------

function Card({ children }: { children: ReactNode }) {
  return (
    <div
      className="rounded-[22px] border border-[#1C7AE0]/[0.14] bg-white/90 p-[22px] shadow-[0_14px_36px_rgba(28,122,224,0.12)] backdrop-blur-[14px]"
    >
      {children}
    </div>
  );
}

type FooterProps = {
  step: Step;
  onPrev: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  nextLabel?: string;
  danger?: boolean;
};

function Footer({ step, onPrev, onNext, nextDisabled, nextLabel, danger }: FooterProps) {
  return (
    <div className="flex items-center justify-between gap-3 pb-4 pt-1">
      <button
        type="button"
        onClick={onPrev}
        className="inline-flex h-11 flex-none cursor-pointer items-center justify-center whitespace-nowrap rounded-full border-[1.5px] border-[#1C7AE0]/[0.18] bg-transparent px-[22px] text-[13.5px] font-bold leading-none text-[#5C6F90] transition-colors hover:bg-[#3196ff]/[0.06]"
      >
        {step === 1 ? '나가기' : '← 이전'}
      </button>
      <div className="flex flex-none items-center gap-2.5">
        {step === 1 && (
          <button
            type="button"
            className="inline-flex h-11 flex-none cursor-pointer items-center justify-center whitespace-nowrap rounded-full border-[1.5px] border-[#3196ff]/[0.32] bg-white px-[22px] text-[13.5px] font-bold leading-none text-[#1C7AE0]"
          >
            한 달 무료 보관함 받기
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          disabled={nextDisabled}
          className={cn(
            'inline-flex h-11 flex-none items-center justify-center whitespace-nowrap rounded-full border-0 px-7 text-[13.5px] font-bold leading-none text-white transition-[transform,box-shadow]',
            nextDisabled
              ? 'cursor-not-allowed bg-[rgba(148,163,184,0.5)]'
              : danger
                ? 'cursor-pointer bg-[linear-gradient(135deg,#EF4444,#B91C1C)] shadow-[0_10px_22px_rgba(239,68,68,0.34)] hover:-translate-y-px'
                : 'cursor-pointer bg-[linear-gradient(135deg,#3196ff,#1C7AE0)] shadow-[0_10px_22px_rgba(28,122,224,0.32)] hover:-translate-y-px',
          )}
        >
          {nextLabel ?? '다음 →'}
        </button>
      </div>
    </div>
  );
}

// ---------- Step Props ----------

type StepProps = {
  step: Step;
  state: WithdrawState;
  update: <K extends keyof WithdrawState>(key: K, value: WithdrawState[K]) => void;
  onPrev: () => void;
  onNext: () => void;
  goto: (next: Step) => void;
};

// ---------- Step 1 만류 ----------

const REASONS: { k: ReasonKey; i: string; l: string; h: string }[] = [
  { k: 'price', i: '💰', l: '요금이 부담돼요', h: '월 4,900원이 부담되시나요? 연간 요금제로 최대 33% 절약하실 수 있어요.' },
  { k: 'use', i: '🌙', l: '잘 사용하지 않게 돼요', h: '한 달 무료 보관함을 받아두면 언제든 다시 시작할 수 있어요.' },
  { k: 'quality', i: '🎨', l: '도안·콘텐츠가 부족해요', h: '매주 새로운 도안이 추가돼요. 어떤 종류가 더 필요하셨나요?' },
  { k: 'privacy', i: '🔒', l: '개인정보가 걱정돼요', h: '자녀 보호 모드와 데이터 최소 수집을 다시 안내해 드릴게요.' },
  { k: 'kid', i: '🧒', l: '아이가 흥미를 잃었어요', h: '단계별/함께 그리기 모드를 추천해요. 아이 연령에 맞는 도안도 있어요.' },
  { k: 'other', i: '✏️', l: '기타', h: '어떤 점이 아쉬우셨는지 직접 알려 주세요.' },
];

function Step1({ step, state, update, onPrev, onNext }: StepProps) {
  const sel = REASONS.find((r) => r.k === state.reason);
  return (
    <>
      <Card>
        <div className="flex flex-col gap-3.5">
          <div
            className="flex items-center gap-3.5 rounded-[14px] border-[1.5px] border-[#3196ff]/[0.22] px-4 py-3.5"
            style={{ background: 'linear-gradient(135deg, rgba(49,150,255,0.10), rgba(49,150,255,0.02))' }}
          >
            <div
              className="flex h-12 w-12 flex-none items-center justify-center rounded-[14px] text-[22px] text-white"
              style={{ background: 'linear-gradient(135deg,#3196ff,#1C7AE0)' }}
            >
              📊
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-bold text-[#0b2a63]">
                지금까지 그린 작품은 <span className="text-[#1C7AE0]">24점</span>이에요
              </div>
              <div className="mt-0.5 text-[11.5px] text-[#8AA0BD]">수상 2회 · 누적 활동 시간 18시간 27분</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {REASONS.map((r) => {
              const on = state.reason === r.k;
              return (
                <button
                  key={r.k}
                  type="button"
                  onClick={() => update('reason', r.k)}
                  aria-pressed={on}
                  className={cn(
                    'flex cursor-pointer items-center gap-2.5 rounded-[12px] border-[1.5px] px-3.5 py-3 text-left transition-[background,border-color]',
                    on
                      ? 'border-[#3196ff]/[0.34] bg-[#3196ff]/[0.08]'
                      : 'border-[#1C7AE0]/[0.12] bg-white hover:bg-[#3196ff]/[0.04]',
                  )}
                >
                  <span className="text-[18px]">{r.i}</span>
                  <span className="flex-1 text-[13px] font-semibold text-[#0b2a63]">{r.l}</span>
                  <div
                    className={cn(
                      'flex h-[18px] w-[18px] items-center justify-center rounded-full text-[9px] font-extrabold text-white',
                      on ? 'border-0' : 'border-[1.5px] border-[#1C7AE0]/[0.22] bg-transparent',
                    )}
                    style={on ? { background: 'linear-gradient(135deg,#3196ff,#1C7AE0)' } : undefined}
                  >
                    {on ? '✓' : ''}
                  </div>
                </button>
              );
            })}
          </div>

          {sel && (
            <div
              className="flex items-start gap-3 rounded-[14px] border-[1.5px] px-4 py-3.5"
              style={{ background: 'rgba(255,200,102,0.10)', borderColor: 'rgba(255,200,102,0.4)' }}
            >
              <span className="text-[22px]">💡</span>
              <div className="flex-1">
                <div className="mb-1 text-[12px] font-bold text-[#92400E]">잠깐, 이런 방법은 어때요?</div>
                <div className="text-[13px] leading-[1.55] text-[#5C6F90]">{sel.h}</div>
              </div>
            </div>
          )}

          {sel?.k === 'other' && (
            <textarea
              value={state.reasonOther}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => update('reasonOther', e.target.value)}
              placeholder="자유롭게 알려 주세요 (최대 500자)"
              maxLength={500}
              className="min-h-[80px] w-full resize-y rounded-[12px] border-[1.5px] border-[#1C7AE0]/[0.18] bg-white px-3.5 py-3 text-[13px] text-[#0b2a63] outline-none transition-[border-color,box-shadow] placeholder:text-[#8AA0BD] focus:border-[#3196ff] focus:shadow-[0_0_0_4px_rgba(49,150,255,0.14)]"
            />
          )}
        </div>
      </Card>
      <Footer step={step} onPrev={onPrev} onNext={onNext} nextDisabled={!state.reason} />
    </>
  );
}

// ---------- Step 2 자녀 처리 ----------

const CHILD_OPTS: {
  k: ChildrenHandling;
  i: string;
  t: string;
  d: string;
  tag: string | null;
  tagBg: string;
}[] = [
  {
    k: 'all',
    i: '👨‍👩‍👧‍👦',
    t: '자녀와 함께 모두 탈퇴',
    d: '모든 자녀 프로필과 작품·수상 이력이 함께 삭제돼요. 가장 일반적인 선택이에요.',
    tag: '권장',
    tagBg: '#1C7AE0',
  },
  {
    k: 'keep',
    i: '🛟',
    t: '가족 계정만 탈퇴, 자녀는 보존',
    d: '가족 계정 1개만 정리하고, 자녀 프로필·작품은 다른 보호자(공동 양육자)에게 위임돼요.',
    tag: '양육 위임',
    tagBg: '#10B981',
  },
  {
    k: 'partial',
    i: '✂️',
    t: '일부 자녀만 함께 삭제',
    d: '여러 자녀 중 직접 선택한 자녀만 삭제해요. 다음 단계에서 누구를 삭제할지 고를 수 있어요.',
    tag: null,
    tagBg: '',
  },
];

function Step2({ step, state, update, onPrev, onNext }: StepProps) {
  return (
    <>
      <Card>
        <div className="flex flex-col gap-2.5">
          {CHILD_OPTS.map((o) => {
            const on = state.childrenHandling === o.k;
            return (
              <button
                key={o.k}
                type="button"
                onClick={() => update('childrenHandling', o.k)}
                aria-pressed={on}
                className={cn(
                  'flex cursor-pointer items-start gap-3.5 rounded-[14px] border-[1.5px] px-4 py-3.5 text-left transition-[background,border-color]',
                  on
                    ? 'border-[#3196ff]/[0.34] bg-[#3196ff]/[0.08]'
                    : 'border-[#1C7AE0]/[0.12] bg-white hover:bg-[#3196ff]/[0.04]',
                )}
              >
                <div
                  className="flex h-11 w-11 flex-none items-center justify-center rounded-[12px] text-[22px]"
                  style={{
                    background: on ? 'linear-gradient(135deg,#3196ff,#1C7AE0)' : 'rgba(49,150,255,0.10)',
                    color: on ? '#fff' : 'inherit',
                  }}
                >
                  {o.i}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <div className="text-[16px] font-extrabold text-[#0b2a63]">{o.t}</div>
                    {o.tag && (
                      <span
                        className="rounded-full px-2 py-[2px] text-[10px] font-bold text-white"
                        style={{ background: o.tagBg }}
                      >
                        {o.tag}
                      </span>
                    )}
                  </div>
                  <div className="text-[12.5px] leading-[1.55] text-[#5C6F90]">{o.d}</div>
                </div>
                <div
                  className={cn(
                    'flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[11px] font-extrabold text-white',
                    on ? 'border-0' : 'border-[1.5px] border-[#1C7AE0]/[0.22] bg-transparent',
                  )}
                  style={on ? { background: 'linear-gradient(135deg,#3196ff,#1C7AE0)' } : undefined}
                >
                  {on ? '✓' : ''}
                </div>
              </button>
            );
          })}

          <div className="mt-1 flex gap-2 rounded-[10px] border border-[#1C7AE0]/[0.10] bg-slate-50/80 px-3 py-2.5 text-[11.5px] text-[#8AA0BD]">
            <span>ℹ️</span>
            <span>"가족 계정만 탈퇴"를 선택하시면, 공동 양육자 이메일로 위임 안내가 발송돼요.</span>
          </div>
        </div>
      </Card>
      <Footer step={step} onPrev={onPrev} onNext={onNext} />
    </>
  );
}

// ---------- Step 3 삭제 방식 ----------

const METHOD_OPTS: {
  k: DeletionMethod;
  i: string;
  t: string;
  d: string;
  badge: string;
  badgeBg: string;
  list: string[];
  accent: string;
  accentBg: string;
}[] = [
  {
    k: 'grace',
    i: '🗓',
    t: '30일 유예 후 삭제',
    d: '30일 동안은 다시 로그인하면 탈퇴를 취소할 수 있어요. 그 후 자동 삭제돼요.',
    badge: '추천',
    badgeBg: '#1C7AE0',
    list: ['언제든 복구 가능', '30일 후 자동 hard-delete', '구독은 즉시 해지'],
    accent: '#1C7AE0',
    accentBg: 'rgba(28,122,224,0.10)',
  },
  {
    k: 'instant',
    i: '⚡',
    t: '즉시 삭제',
    d: '요청 즉시 모든 데이터가 영구 삭제돼요. GDPR 제17조 / COPPA에 따른 권리예요.',
    badge: '복구 불가',
    badgeBg: '#EF4444',
    list: ['되돌릴 수 없음', '즉시 hard-delete', '구독·코인 동시 소멸'],
    accent: '#EF4444',
    accentBg: 'rgba(239,68,68,0.10)',
  },
];

function Step3({ step, state, update, onPrev, onNext }: StepProps) {
  return (
    <>
      <Card>
        <div className="grid grid-cols-2 gap-3">
          {METHOD_OPTS.map((o) => {
            const on = state.method === o.k;
            return (
              <button
                key={o.k}
                type="button"
                onClick={() => update('method', o.k)}
                aria-pressed={on}
                className="flex cursor-pointer flex-col gap-2.5 rounded-[16px] border-[1.5px] p-4 text-left transition-[background,border-color]"
                style={{
                  background: on ? `linear-gradient(180deg, ${o.accent}11, #fff)` : '#fff',
                  borderColor: on ? o.accent : 'rgba(28,122,224,0.12)',
                  borderWidth: on ? 2 : 1.5,
                }}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-[12px] text-[22px]"
                    style={{
                      background: on ? o.accent : o.accentBg,
                      color: on ? '#fff' : o.accent,
                    }}
                  >
                    {o.i}
                  </div>
                  <span
                    className="rounded-full px-2.5 py-[3px] text-[10px] font-bold text-white"
                    style={{ background: o.badgeBg }}
                  >
                    {o.badge}
                  </span>
                </div>
                <div className="text-[17px] font-extrabold leading-[1.2] text-[#0b2a63]">{o.t}</div>
                <div className="text-[12.5px] leading-[1.55] text-[#5C6F90]">{o.d}</div>
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {o.list.map((x, i) => (
                    <li key={i} className="flex items-center gap-1.5 text-[11.5px] text-[#5C6F90]">
                      <span
                        className="flex h-[14px] w-[14px] items-center justify-center rounded-full text-[8px] font-extrabold text-white"
                        style={{ background: o.accent }}
                      >
                        ✓
                      </span>
                      {x}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>

        <div className="mt-3.5 flex gap-2.5 rounded-[12px] border border-dashed border-[#3196ff]/[0.36] bg-[#3196ff]/[0.06] px-3.5 py-3 text-[11.5px] leading-[1.55] text-[#5C6F90]">
          <span>📜</span>
          <div>
            GDPR 제17조 "잊혀질 권리" 및 미국 COPPA에 따라, 삭제 요청 시 14일 이내에 모든 처리·백업 시스템에서 데이터를 제거합니다.
            단, 결제 기록 등 법령상 5년 보관이 의무인 항목은 분리·암호화 보관됩니다.
          </div>
        </div>
      </Card>
      <Footer step={step} onPrev={onPrev} onNext={onNext} />
    </>
  );
}

// ---------- Step 4 ZIP 다운로드 ----------

const ZIP_DEFS: { k: keyof ZipItems; i: string; t: string; s: string; size: number }[] = [
  { k: 'drawings', i: '🎨', t: '그림 작품 (PNG, 원본 해상도)', s: '24작 · 약 245 MB', size: 245 },
  { k: 'awards', i: '🏆', t: '수상 이력 + 인증서 PDF', s: '2건 · 약 12 MB', size: 12 },
  { k: 'timelapse', i: '🎬', t: '타임랩스 영상 (MP4)', s: '18편 · 약 1,280 MB', size: 1280 },
  { k: 'profile', i: '👤', t: '프로필 메타데이터 (JSON)', s: '자녀 프로필 외 · 약 4 MB', size: 4 },
];

function Step4({ step, state, update, onPrev, onNext }: StepProps) {
  const total = useMemo(
    () => ZIP_DEFS.reduce((sum, d) => sum + (state.zipItems[d.k] ? d.size : 0), 0),
    [state.zipItems],
  );

  return (
    <>
      <Card>
        <div className="flex flex-col gap-3.5">
          <div
            className="relative overflow-hidden rounded-[16px] px-[18px] py-[18px] text-white"
            style={{ background: 'linear-gradient(135deg,#0b2a63 0%,#1C7AE0 60%,#3196ff 100%)' }}
          >
            <div className="pointer-events-none absolute -right-8 -top-8 h-[120px] w-[120px] rounded-full bg-white/[0.12]" />
            <div className="relative flex items-center gap-3.5">
              <div
                className="flex h-14 w-14 flex-none items-center justify-center rounded-[16px] text-[26px]"
                style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}
              >
                📦
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-bold tracking-[1px] opacity-85">BACKUP ARCHIVE</div>
                <div className="text-[20px] font-extrabold leading-[1.2]">artbongbong-backup-2026-05-06.zip</div>
                <div className="mt-1 text-[12px] opacity-85">
                  예상 크기 약 {total.toLocaleString()} MB · 최대 24시간 안에 메일로 전송
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="mb-0.5 text-[12px] font-bold text-[#5C6F90]">포함할 항목</div>
            {ZIP_DEFS.map((d) => {
              const on = state.zipItems[d.k];
              return (
                <label
                  key={d.k}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-[12px] border-[1.5px] px-3.5 py-3 transition-[background,border-color]',
                    on
                      ? 'border-[#3196ff]/[0.32] bg-[#3196ff]/[0.06]'
                      : 'border-[#1C7AE0]/[0.12] bg-white hover:bg-[#3196ff]/[0.04]',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) => update('zipItems', { ...state.zipItems, [d.k]: e.target.checked })}
                    className="h-[18px] w-[18px]"
                    style={{ accentColor: '#1C7AE0' }}
                  />
                  <span className="text-[22px]">{d.i}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13.5px] font-bold text-[#0b2a63]">{d.t}</div>
                    <div className="text-[11.5px] text-[#8AA0BD]">{d.s}</div>
                  </div>
                </label>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              void alert(
                'ZIP 다운로드가 요청됐어요. 가입 시 등록된 이메일로 24시간 안에 발송됩니다. (BE 미구현 — mock)',
                { tone: 'success' },
              );
            }}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-[12px] border-0 bg-[linear-gradient(135deg,#3196ff,#1C7AE0)] px-4 py-3.5 text-[13.5px] font-bold text-white shadow-[0_10px_22px_rgba(28,122,224,0.32)] transition-transform hover:-translate-y-px"
          >
            📥 ZIP 다운로드 요청하기
          </button>

          <div className="text-center text-[11.5px] text-[#8AA0BD]">
            GDPR 제20조 데이터 이동권에 따른 권리예요. 무료입니다.
          </div>
        </div>
      </Card>
      <Footer step={step} onPrev={onPrev} onNext={onNext} />
    </>
  );
}

// ---------- Step 5 데이터 안내 ----------

const DATA_TILES: { i: string; t: string; n: string; sub: string }[] = [
  { i: '🎨', t: '그림 작품', n: '24작', sub: '자녀 프로필 작품 전체' },
  { i: '🏆', t: '수상 이력', n: '2회', sub: '인증서 포함' },
  { i: '🪙', t: '코인 잔액', n: '24개', sub: '환불 불가 · 즉시 소멸' },
  { i: '💎', t: '구독', n: '월 4,900원', sub: '즉시 해지 · 잔여일 환불 X' },
  { i: '🎬', t: '타임랩스', n: '18편', sub: '복구 불가' },
  { i: '🔔', t: '알림 / 메시지', n: '전체', sub: '발송 기록 포함' },
];

const KEPT_BY_LAW: { t: string; s: string }[] = [
  { t: '결제 / 정산 기록', s: '전자상거래법 · 5년' },
  { t: '본인확인 인증 로그', s: '정보통신망법 · 6개월' },
  { t: '부정 사용 신고 기록', s: '필요 시 3년' },
];

function Step5({ step, onPrev, onNext }: StepProps) {
  return (
    <>
      <Card>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2.5">
            {DATA_TILES.map((d, i) => (
              <div key={i} className="rounded-[14px] border-[1.5px] border-[#1C7AE0]/[0.12] bg-white px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#EF4444]/[0.08] text-[18px]">
                    {d.i}
                  </div>
                  <div className="flex-1">
                    <div className="text-[11.5px] text-[#8AA0BD]">{d.t}</div>
                    <div className="text-[18px] font-extrabold leading-[1.1] text-[#0b2a63]">{d.n}</div>
                  </div>
                </div>
                <div className="mt-2 text-[11.5px] text-[#8AA0BD]">{d.sub}</div>
              </div>
            ))}
          </div>

          <div className="rounded-[14px] border-[1.5px] border-[#10B981]/[0.32] bg-[#10B981]/[0.06] px-4 py-3.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-[#047857]">
              <span>📂</span>
              <span>법령상 보관되는 항목</span>
            </div>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {KEPT_BY_LAW.map((x, i) => (
                <li key={i} className="flex items-center justify-between text-[12px] text-[#5C6F90]">
                  <span>{x.t}</span>
                  <span className="text-[11px] text-[#8AA0BD]">{x.s}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 text-[11px] leading-[1.5] text-[#8AA0BD]">
              * 이 항목들은 분리된 암호화 저장소에 보관되며, 별도 인증 없이는 복원되지 않아요.
            </div>
          </div>
        </div>
      </Card>
      <Footer step={step} onPrev={onPrev} onNext={onNext} />
    </>
  );
}

// ---------- Step 6 재인증 ----------

function Step6({ step, state, update, onPrev, onNext }: StepProps) {
  const ok = state.password.length >= 8 && state.otp.length === 6;
  return (
    <>
      <Card>
        <div className="flex max-w-[520px] flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold text-[#5C6F90]">현재 비밀번호</span>
            <input
              type="password"
              value={state.password}
              onChange={(e: ChangeEvent<HTMLInputElement>) => update('password', e.target.value)}
              placeholder="********"
              autoComplete="current-password"
              className="rounded-[12px] border-[1.5px] border-[#1C7AE0]/[0.18] bg-white px-4 py-3.5 text-[14px] text-[#0b2a63] outline-none transition-[border-color,box-shadow] placeholder:text-[#8AA0BD] focus:border-[#3196ff] focus:shadow-[0_0_0_4px_rgba(49,150,255,0.14)]"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold text-[#5C6F90]">휴대전화 인증번호</span>
            <div className="flex gap-2">
              <input
                value={state.otp}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  update('otp', e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder="등록된 번호로 발송된 6자리"
                inputMode="numeric"
                className="flex-1 rounded-[12px] border-[1.5px] border-[#1C7AE0]/[0.18] bg-white px-4 py-3.5 text-[14px] tracking-[4px] text-[#0b2a63] outline-none transition-[border-color,box-shadow] placeholder:text-[#8AA0BD] focus:border-[#3196ff] focus:shadow-[0_0_0_4px_rgba(49,150,255,0.14)]"
              />
              <button
                type="button"
                onClick={() => {
                  void alert('인증번호가 발송됐어요. (BE 미구현 — mock)', { tone: 'success' });
                }}
                className="cursor-pointer whitespace-nowrap rounded-[12px] border-[1.5px] border-[#3196ff]/[0.32] bg-white px-[18px] text-[12.5px] font-bold text-[#1C7AE0]"
              >
                인증번호 받기
              </button>
            </div>
            <span className="mt-0.5 text-[11px] text-[#8AA0BD]">
              ⏱ 02:48 남음 · 인증번호가 오지 않으면 <span className="cursor-pointer font-bold text-[#1C7AE0]">다시 받기</span>
            </span>
          </label>

          <div className="mt-1 flex gap-2.5 rounded-[12px] border border-[#3196ff]/[0.22] bg-[#3196ff]/[0.06] px-3.5 py-3 text-[12px] leading-[1.55] text-[#5C6F90]">
            <span>🛡</span>
            <span>본인 확인 정보는 인증 직후 폐기돼요. 5회 실패 시 계정이 24시간 잠깁니다.</span>
          </div>

          <div className="mt-1 flex items-center gap-2 rounded-[10px] bg-slate-50/80 px-3 py-2.5 text-[11.5px] text-[#8AA0BD]">
            <span>📞</span>
            <span>
              휴대전화를 분실하셨나요? <span className="cursor-pointer font-bold text-[#1C7AE0]">고객센터로 문의하기</span>
            </span>
          </div>
        </div>
      </Card>
      <Footer step={step} onPrev={onPrev} onNext={onNext} nextDisabled={!ok} />
    </>
  );
}

// ---------- Step 7 최종 확인 ----------

function Step7({ step, state, update, onPrev, onNext }: StepProps) {
  const ok = state.c1 && state.c2 && state.c3 && state.phrase === CONFIRM_PHRASE;
  const childrenLabel: Record<ChildrenHandling, string> = {
    all: '자녀와 함께 모두 탈퇴',
    keep: '가족 계정만 탈퇴, 자녀는 보존',
    partial: '일부 자녀만 함께 삭제',
  };
  const methodLabel: Record<DeletionMethod, string> = {
    grace: '30일 유예 후 자동 삭제',
    instant: '즉시 삭제 (복구 불가)',
  };
  const completion = state.method === 'grace' ? '30일 후' : '요청 즉시';

  return (
    <>
      <Card>
        <div className="flex flex-col gap-3.5">
          <div className="rounded-[14px] border border-[#1C7AE0]/[0.12] bg-slate-50/80 px-4 py-3.5">
            <div className="mb-2 text-[12px] font-bold tracking-[0.6px] text-[#8AA0BD]">요청 내용</div>
            {[
              ['삭제 방식', methodLabel[state.method]],
              ['자녀 처리', childrenLabel[state.childrenHandling]],
              ['ZIP 백업', '요청됨 · 24시간 내 메일 발송'],
              ['예상 완료', completion],
            ].map(([k, v], i) => (
              <div
                key={k}
                className="flex items-center justify-between py-1.5 text-[13px]"
                style={{ borderBottom: i < 3 ? '1px dashed rgba(28,122,224,0.08)' : 'none' }}
              >
                <span className="text-[#8AA0BD]">{k}</span>
                <span className="font-semibold text-[#0b2a63]">{v}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            {[
              { v: state.c1, key: 'c1' as const, l: '위 내용을 모두 확인했고, 결과에 동의해요.' },
              { v: state.c2, key: 'c2' as const, l: '자녀의 작품·수상 이력이 영구 삭제됨을 알고 있어요.' },
              { v: state.c3, key: 'c3' as const, l: '잔여 코인·구독 잔여일은 환불되지 않음을 이해했어요.' },
            ].map((c) => (
              <label
                key={c.key}
                className={cn(
                  'flex cursor-pointer items-start gap-2.5 rounded-[10px] border-[1.5px] px-3 py-2.5',
                  c.v ? 'border-[#EF4444]/[0.32] bg-[#EF4444]/[0.06]' : 'border-transparent bg-slate-50/80',
                )}
              >
                <input
                  type="checkbox"
                  checked={c.v}
                  onChange={(e) => update(c.key, e.target.checked)}
                  className="mt-0.5 h-4 w-4"
                  style={{ accentColor: '#EF4444' }}
                />
                <span className="text-[12.5px] leading-[1.5] text-[#5C6F90]">{c.l}</span>
              </label>
            ))}
          </div>

          <div>
            <div className="mb-1.5 text-[12px] font-bold text-[#5C6F90]">
              확인을 위해 <span className="text-[#B91C1C]">"{CONFIRM_PHRASE}"</span>를 그대로 입력해 주세요
            </div>
            <input
              value={state.phrase}
              onChange={(e: ChangeEvent<HTMLInputElement>) => update('phrase', e.target.value)}
              placeholder={CONFIRM_PHRASE}
              className="w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-3 text-[14px] text-[#0b2a63] outline-none placeholder:text-[#8AA0BD]"
              style={{
                borderColor: state.phrase === CONFIRM_PHRASE ? '#10B981' : 'rgba(239,68,68,0.30)',
              }}
            />
          </div>
        </div>
      </Card>
      <Footer step={step} onPrev={onPrev} onNext={onNext} nextLabel="🗑 영구 삭제하기" nextDisabled={!ok} danger />
    </>
  );
}
