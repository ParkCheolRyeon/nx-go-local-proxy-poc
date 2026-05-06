'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMemo, useState, type ChangeEvent, type ReactNode } from 'react';

import { alert, confirm } from '@/dialog';
import { signOutLocal } from '@/lib/auth-api';
import { cn } from '@/lib/utils';
import { useUserActions } from '@/stores/userStore';

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

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

export default function WithdrawPage() {
  const router = useRouter();
  const { signOut } = useUserActions();
  const [step, setStep] = useState<Step>(1);
  const [s, setS] = useState<WithdrawState>(INITIAL);
  const t = useTranslations('withdraw');

  const update = <K extends keyof WithdrawState>(key: K, value: WithdrawState[K]) =>
    setS((prev) => ({ ...prev, [key]: value }));

  const goto = (next: Step) => setStep(next);
  const handlePrev = async () => {
    if (step === 1) {
      const ok = await confirm(t('exitConfirmMsg'), {
        title: t('exitConfirmTitle'),
        yesButtonText: t('exitYes'),
        noButtonText: t('exitNo'),
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
    await alert(s.method === 'instant' ? t('successInstant') : t('successGrace'), { tone: 'success' });
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
  const t = useTranslations('withdraw');
  const stepTitle = t(`stepTitle.${step}` as `stepTitle.${1 | 2 | 3 | 4 | 5 | 6 | 7}`);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-bold tracking-[0.6px] text-[#1C7AE0]">
          {t('stepLabel', { step, title: stepTitle })}
        </div>
        <div className="text-[11px] text-[#8AA0BD]">{t('estimated')}</div>
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

function Hero({ step }: { step: Step }) {
  const t = useTranslations('withdraw');
  return (
    <div>
      <div className="text-[28px] font-extrabold leading-[1.18] tracking-[-0.4px] text-[#0b2a63]">
        {t(`stepTitle.${step}` as `stepTitle.${1 | 2 | 3 | 4 | 5 | 6 | 7}`)}
      </div>
      <div className="mt-1.5 text-[13.5px] leading-[1.5] text-[#5C6F90]">
        {t(`heroSub.${step}` as `heroSub.${1 | 2 | 3 | 4 | 5 | 6 | 7}`)}
      </div>
    </div>
  );
}

// ---------- Card + Footer ----------

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[22px] border border-[#1C7AE0]/[0.14] bg-white/90 p-[22px] shadow-[0_14px_36px_rgba(28,122,224,0.12)] backdrop-blur-[14px]">
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
  const t = useTranslations('withdraw');
  const tCommon = useTranslations('common');
  return (
    <div className="flex items-center justify-between gap-3 pb-4 pt-1">
      <button
        type="button"
        onClick={onPrev}
        className="inline-flex h-11 flex-none cursor-pointer items-center justify-center whitespace-nowrap rounded-full border-[1.5px] border-[#1C7AE0]/[0.18] bg-transparent px-[22px] text-[13.5px] font-bold leading-none text-[#5C6F90] transition-colors hover:bg-[#3196ff]/[0.06]"
      >
        {step === 1 ? t('footerExit') : tCommon('prev')}
      </button>
      <div className="flex flex-none items-center gap-2.5">
        {step === 1 && (
          <button
            type="button"
            className="inline-flex h-11 flex-none cursor-pointer items-center justify-center whitespace-nowrap rounded-full border-[1.5px] border-[#3196ff]/[0.32] bg-white px-[22px] text-[13.5px] font-bold leading-none text-[#1C7AE0]"
          >
            {t('footerKeepFreeLocker')}
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
          {nextLabel ?? t('footerNext')}
        </button>
      </div>
    </div>
  );
}

type StepProps = {
  step: Step;
  state: WithdrawState;
  update: <K extends keyof WithdrawState>(key: K, value: WithdrawState[K]) => void;
  onPrev: () => void;
  onNext: () => void;
  goto: (next: Step) => void;
};

// ---------- Step 1 ----------

const REASON_KEYS: { k: ReasonKey; i: string }[] = [
  { k: 'price', i: '💰' },
  { k: 'use', i: '🌙' },
  { k: 'quality', i: '🎨' },
  { k: 'privacy', i: '🔒' },
  { k: 'kid', i: '🧒' },
  { k: 'other', i: '✏️' },
];

function Step1({ step, state, update, onPrev, onNext }: StepProps) {
  const t = useTranslations('withdraw.step1');
  const sel = REASON_KEYS.find((r) => r.k === state.reason);
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
                {t('statsTitle')} <span className="text-[#1C7AE0]">{t('statsTitleCount')}</span>
                {t('statsTitleSuffix')}
              </div>
              <div className="mt-0.5 text-[11.5px] text-[#8AA0BD]">{t('statsSub')}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {REASON_KEYS.map((r) => {
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
                  <span className="flex-1 text-[13px] font-semibold text-[#0b2a63]">
                    {t(`reasons.${r.k}.label`)}
                  </span>
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
                <div className="mb-1 text-[12px] font-bold text-[#92400E]">{t('tipTitle')}</div>
                <div className="text-[13px] leading-[1.55] text-[#5C6F90]">{t(`reasons.${sel.k}.hint`)}</div>
              </div>
            </div>
          )}

          {sel?.k === 'other' && (
            <textarea
              value={state.reasonOther}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => update('reasonOther', e.target.value)}
              placeholder={t('otherPlaceholder')}
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

// ---------- Step 2 ----------

const CHILD_OPT_KEYS: {
  k: ChildrenHandling;
  i: string;
  hasTag: boolean;
  tagBg: string;
}[] = [
  { k: 'all', i: '👨‍👩‍👧‍👦', hasTag: true, tagBg: '#1C7AE0' },
  { k: 'keep', i: '🛟', hasTag: true, tagBg: '#10B981' },
  { k: 'partial', i: '✂️', hasTag: false, tagBg: '' },
];

function Step2({ step, state, update, onPrev, onNext }: StepProps) {
  const t = useTranslations('withdraw.step2');
  return (
    <>
      <Card>
        <div className="flex flex-col gap-2.5">
          {CHILD_OPT_KEYS.map((o) => {
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
                    <div className="text-[16px] font-extrabold text-[#0b2a63]">
                      {t(`options.${o.k}.title`)}
                    </div>
                    {o.hasTag && (
                      <span
                        className="rounded-full px-2 py-[2px] text-[10px] font-bold text-white"
                        style={{ background: o.tagBg }}
                      >
                        {t(`options.${o.k}.tag` as `options.all.tag` | `options.keep.tag`)}
                      </span>
                    )}
                  </div>
                  <div className="text-[12.5px] leading-[1.55] text-[#5C6F90]">
                    {t(`options.${o.k}.desc`)}
                  </div>
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
            <span>{t('delegationNote')}</span>
          </div>
        </div>
      </Card>
      <Footer step={step} onPrev={onPrev} onNext={onNext} />
    </>
  );
}

// ---------- Step 3 ----------

const METHOD_OPT_KEYS: {
  k: DeletionMethod;
  i: string;
  badgeBg: string;
  accent: string;
  accentBg: string;
}[] = [
  {
    k: 'grace',
    i: '🗓',
    badgeBg: '#1C7AE0',
    accent: '#1C7AE0',
    accentBg: 'rgba(28,122,224,0.10)',
  },
  {
    k: 'instant',
    i: '⚡',
    badgeBg: '#EF4444',
    accent: '#EF4444',
    accentBg: 'rgba(239,68,68,0.10)',
  },
];

function Step3({ step, state, update, onPrev, onNext }: StepProps) {
  const t = useTranslations('withdraw.step3');
  return (
    <>
      <Card>
        <div className="grid grid-cols-2 gap-3">
          {METHOD_OPT_KEYS.map((o) => {
            const on = state.method === o.k;
            const list = [
              t(`options.${o.k}.list1` as 'options.grace.list1' | 'options.instant.list1'),
              t(`options.${o.k}.list2` as 'options.grace.list2' | 'options.instant.list2'),
              t(`options.${o.k}.list3` as 'options.grace.list3' | 'options.instant.list3'),
            ];
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
                    {t(`options.${o.k}.badge`)}
                  </span>
                </div>
                <div className="text-[17px] font-extrabold leading-[1.2] text-[#0b2a63]">
                  {t(`options.${o.k}.title`)}
                </div>
                <div className="text-[12.5px] leading-[1.55] text-[#5C6F90]">{t(`options.${o.k}.desc`)}</div>
                <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                  {list.map((x, i) => (
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
          <div>{t('legalNote')}</div>
        </div>
      </Card>
      <Footer step={step} onPrev={onPrev} onNext={onNext} />
    </>
  );
}

// ---------- Step 4 ----------

const ZIP_DEF_KEYS: { k: keyof ZipItems; i: string; size: number }[] = [
  { k: 'drawings', i: '🎨', size: 245 },
  { k: 'awards', i: '🏆', size: 12 },
  { k: 'timelapse', i: '🎬', size: 1280 },
  { k: 'profile', i: '👤', size: 4 },
];

function Step4({ step, state, update, onPrev, onNext }: StepProps) {
  const t = useTranslations('withdraw.step4');
  const total = useMemo(
    () => ZIP_DEF_KEYS.reduce((sum, d) => sum + (state.zipItems[d.k] ? d.size : 0), 0),
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
                <div className="text-[11px] font-bold tracking-[1px] opacity-85">{t('tag')}</div>
                <div className="text-[20px] font-extrabold leading-[1.2]">{t('fileLabel')}</div>
                <div className="mt-1 text-[12px] opacity-85">
                  {t('sizeNote', { total: total.toLocaleString() })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="mb-0.5 text-[12px] font-bold text-[#5C6F90]">{t('include')}</div>
            {ZIP_DEF_KEYS.map((d) => {
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
                    <div className="text-[13.5px] font-bold text-[#0b2a63]">{t(`items.${d.k}.label`)}</div>
                    <div className="text-[11.5px] text-[#8AA0BD]">{t(`items.${d.k}.sub`)}</div>
                  </div>
                </label>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              void alert(t('downloadToast'), { tone: 'success' });
            }}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-[12px] border-0 bg-[linear-gradient(135deg,#3196ff,#1C7AE0)] px-4 py-3.5 text-[13.5px] font-bold text-white shadow-[0_10px_22px_rgba(28,122,224,0.32)] transition-transform hover:-translate-y-px"
          >
            {t('downloadCta')}
          </button>

          <div className="text-center text-[11.5px] text-[#8AA0BD]">{t('rightNote')}</div>
        </div>
      </Card>
      <Footer step={step} onPrev={onPrev} onNext={onNext} />
    </>
  );
}

// ---------- Step 5 ----------

const TILE_KEYS: ('drawings' | 'awards' | 'coins' | 'subscription' | 'timelapse' | 'notification')[] = [
  'drawings', 'awards', 'coins', 'subscription', 'timelapse', 'notification',
];

const TILE_ICONS: Record<typeof TILE_KEYS[number], string> = {
  drawings: '🎨',
  awards: '🏆',
  coins: '🪙',
  subscription: '💎',
  timelapse: '🎬',
  notification: '🔔',
};

const KEPT_ROWS: ('row1' | 'row2' | 'row3')[] = ['row1', 'row2', 'row3'];

function Step5({ step, onPrev, onNext }: StepProps) {
  const t = useTranslations('withdraw.step5');
  return (
    <>
      <Card>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2.5">
            {TILE_KEYS.map((k) => (
              <div key={k} className="rounded-[14px] border-[1.5px] border-[#1C7AE0]/[0.12] bg-white px-4 py-3.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[#EF4444]/[0.08] text-[18px]">
                    {TILE_ICONS[k]}
                  </div>
                  <div className="flex-1">
                    <div className="text-[11.5px] text-[#8AA0BD]">{t(`tiles.${k}.title`)}</div>
                    <div className="text-[18px] font-extrabold leading-[1.1] text-[#0b2a63]">{t(`tiles.${k}.value`)}</div>
                  </div>
                </div>
                <div className="mt-2 text-[11.5px] text-[#8AA0BD]">{t(`tiles.${k}.sub`)}</div>
              </div>
            ))}
          </div>

          <div className="rounded-[14px] border-[1.5px] border-[#10B981]/[0.32] bg-[#10B981]/[0.06] px-4 py-3.5">
            <div className="mb-1.5 flex items-center gap-1.5 text-[12px] font-bold text-[#047857]">
              <span>📂</span>
              <span>{t('kept.heading')}</span>
            </div>
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {KEPT_ROWS.map((r) => (
                <li key={r} className="flex items-center justify-between text-[12px] text-[#5C6F90]">
                  <span>{t(`kept.${r}Title` as 'kept.row1Title' | 'kept.row2Title' | 'kept.row3Title')}</span>
                  <span className="text-[11px] text-[#8AA0BD]">
                    {t(`kept.${r}Sub` as 'kept.row1Sub' | 'kept.row2Sub' | 'kept.row3Sub')}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-2 text-[11px] leading-[1.5] text-[#8AA0BD]">{t('kept.footnote')}</div>
          </div>
        </div>
      </Card>
      <Footer step={step} onPrev={onPrev} onNext={onNext} />
    </>
  );
}

// ---------- Step 6 ----------

function Step6({ step, state, update, onPrev, onNext }: StepProps) {
  const t = useTranslations('withdraw.step6');
  const ok = state.password.length >= 8 && state.otp.length === 6;
  return (
    <>
      <Card>
        <div className="flex max-w-[520px] flex-col gap-3.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[12px] font-bold text-[#5C6F90]">{t('passwordLabel')}</span>
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
            <span className="text-[12px] font-bold text-[#5C6F90]">{t('otpLabel')}</span>
            <div className="flex gap-2">
              <input
                value={state.otp}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  update('otp', e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                placeholder={t('otpPlaceholder')}
                inputMode="numeric"
                className="flex-1 rounded-[12px] border-[1.5px] border-[#1C7AE0]/[0.18] bg-white px-4 py-3.5 text-[14px] tracking-[4px] text-[#0b2a63] outline-none transition-[border-color,box-shadow] placeholder:text-[#8AA0BD] focus:border-[#3196ff] focus:shadow-[0_0_0_4px_rgba(49,150,255,0.14)]"
              />
              <button
                type="button"
                onClick={() => {
                  void alert(t('otpToast'), { tone: 'success' });
                }}
                className="cursor-pointer whitespace-nowrap rounded-[12px] border-[1.5px] border-[#3196ff]/[0.32] bg-white px-[18px] text-[12.5px] font-bold text-[#1C7AE0]"
              >
                {t('otpSend')}
              </button>
            </div>
            <span className="mt-0.5 text-[11px] text-[#8AA0BD]">
              {t('otpTimerPre')}{' '}
              <span className="cursor-pointer font-bold text-[#1C7AE0]">{t('otpTimerLink')}</span>
            </span>
          </label>

          <div className="mt-1 flex gap-2.5 rounded-[12px] border border-[#3196ff]/[0.22] bg-[#3196ff]/[0.06] px-3.5 py-3 text-[12px] leading-[1.55] text-[#5C6F90]">
            <span>🛡</span>
            <span>{t('securityNote')}</span>
          </div>

          <div className="mt-1 flex items-center gap-2 rounded-[10px] bg-slate-50/80 px-3 py-2.5 text-[11.5px] text-[#8AA0BD]">
            <span>📞</span>
            <span>
              {t('lostPhonePre')}{' '}
              <span className="cursor-pointer font-bold text-[#1C7AE0]">{t('lostPhoneLink')}</span>
            </span>
          </div>
        </div>
      </Card>
      <Footer step={step} onPrev={onPrev} onNext={onNext} nextDisabled={!ok} />
    </>
  );
}

// ---------- Step 7 ----------

function Step7({ step, state, update, onPrev, onNext }: StepProps) {
  const t = useTranslations('withdraw.step7');
  const CONFIRM_PHRASE = t('phrase');
  const ok = state.c1 && state.c2 && state.c3 && state.phrase === CONFIRM_PHRASE;
  const childrenLabelMap: Record<ChildrenHandling, 'childrenAll' | 'childrenKeep' | 'childrenPartial'> = {
    all: 'childrenAll',
    keep: 'childrenKeep',
    partial: 'childrenPartial',
  };
  const methodLabelMap: Record<DeletionMethod, 'methodGrace' | 'methodInstant'> = {
    grace: 'methodGrace',
    instant: 'methodInstant',
  };
  const completion = state.method === 'grace' ? t('completionGrace') : t('completionInstant');

  const rows = [
    [t('rowMethod'), t(methodLabelMap[state.method])],
    [t('rowChildren'), t(childrenLabelMap[state.childrenHandling])],
    [t('rowZip'), t('rowZipValue')],
    [t('rowComplete'), completion],
  ];

  const checks = [
    { v: state.c1, key: 'c1' as const, l: t('agree1') },
    { v: state.c2, key: 'c2' as const, l: t('agree2') },
    { v: state.c3, key: 'c3' as const, l: t('agree3') },
  ];

  return (
    <>
      <Card>
        <div className="flex flex-col gap-3.5">
          <div className="rounded-[14px] border border-[#1C7AE0]/[0.12] bg-slate-50/80 px-4 py-3.5">
            <div className="mb-2 text-[12px] font-bold tracking-[0.6px] text-[#8AA0BD]">{t('summaryHeading')}</div>
            {rows.map(([k, v], i) => (
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
            {checks.map((c) => (
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
              {t('phraseLabelPre')}{' '}
              <span className="text-[#B91C1C]">{t('phraseLabelMid', { phrase: CONFIRM_PHRASE })}</span>
              {t('phraseLabelPost')}
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
      <Footer step={step} onPrev={onPrev} onNext={onNext} nextLabel={t('submit')} nextDisabled={!ok} danger />
    </>
  );
}
