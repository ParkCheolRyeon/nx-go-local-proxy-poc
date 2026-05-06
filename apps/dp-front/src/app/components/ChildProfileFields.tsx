'use client';

import { useTranslations } from 'next-intl';
import type { Dispatch, SetStateAction } from 'react';

import { CHILD_AVATARS } from '@/config/avatars';
import { cn } from '@/lib/utils';
import type { ChildDrawingLevel } from '@/stores/userStore';

const LEVELS: { id: ChildDrawingLevel; icon: string }[] = [
  { id: 'beginner', icon: '🌱' },
  { id: 'intermediate', icon: '🎨' },
  { id: 'expert', icon: '🏆' },
];

export type ChildFormState = {
  picked: number;
  name: string;
  yy: string;
  mm: string;
  dd: string;
  level: ChildDrawingLevel;
};

export const initialChildFormState: ChildFormState = {
  picked: 0,
  name: '',
  yy: '',
  mm: '',
  dd: '',
  level: 'beginner',
};

export function isChildFormValid(s: ChildFormState): boolean {
  const nameOk = s.name.trim().length >= 1;
  const dobOk =
    /^\d{4}$/.test(s.yy) &&
    /^\d{1,2}$/.test(s.mm) &&
    /^\d{1,2}$/.test(s.dd) &&
    +s.mm >= 1 &&
    +s.mm <= 12 &&
    +s.dd >= 1 &&
    +s.dd <= 31;
  return nameOk && dobOk;
}

export function childFormBirthDate(s: ChildFormState): string {
  return `${s.yy}-${s.mm.padStart(2, '0')}-${s.dd.padStart(2, '0')}`;
}

export function birthDateToFormParts(birthDate: string): { yy: string; mm: string; dd: string } {
  const [yy = '', mm = '', dd = ''] = birthDate.split('-');
  return { yy, mm, dd };
}

type Props = {
  state: ChildFormState;
  setState: Dispatch<SetStateAction<ChildFormState>>;
};

const LEVEL_SUB_KEY: Record<ChildDrawingLevel, string> = {
  beginner: 'levelBeginnerSub',
  intermediate: 'levelIntermediateSub',
  expert: 'levelExpertSub',
};

export default function ChildProfileFields({ state, setState }: Props) {
  const tForm = useTranslations('child.form');
  const tLevel = useTranslations('child.level');
  return (
    <>
      <section style={{ animation: 'ac02-slide .4s ease-out 0s both' }}>
        <div className="mb-2.5 flex items-baseline justify-between">
          <div className="text-[12px] font-bold text-[#5C6F90]">{tForm('characterLabel')}</div>
          <div className="text-[11px] text-[#8AA0BD]">{tForm('characterHint')}</div>
        </div>
        <div className="grid grid-cols-8 gap-2">
          {CHILD_AVATARS.map((a, i) => {
            const isPicked = state.picked === i;
            return (
              <button
                type="button"
                key={i}
                onClick={() => setState((s) => ({ ...s, picked: i }))}
                aria-pressed={isPicked}
                aria-label={`avatar ${i + 1}`}
                className={cn(
                  'ac02-avatar relative flex aspect-square items-center justify-center rounded-[14px] text-[26px]',
                  isPicked
                    ? 'scale-105 border-[2.5px] border-[#1C7AE0] shadow-[0_8px_18px_rgba(28,122,224,0.35),0_0_0_4px_rgba(49,150,255,0.18)]'
                    : 'border-2 border-transparent shadow-[0_4px_10px_rgba(0,0,0,0.06)]',
                )}
                style={{ background: a.gradient }}
              >
                {a.emoji}
                {isPicked && (
                  <span
                    className="absolute -top-1.5 -right-1.5 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#1C7AE0] text-[10px] font-extrabold text-white shadow-[0_2px_6px_rgba(28,122,224,0.5)]"
                    style={{ animation: 'ac02-pop .35s cubic-bezier(.34,1.56,.64,1) both' }}
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <label className="block" style={{ animation: 'ac02-slide .4s ease-out .08s both' }}>
        <div className="mb-1.5 text-[12px] font-bold text-[#5C6F90]">{tForm('nameLabel')}</div>
        <div className="ac02-field flex h-[50px] items-center gap-2.5 rounded-[14px] border-[1.5px] border-[#DCE8FB] bg-[#F6F9FF] px-3.5">
          <span className="text-[16px] text-[#8AA0BD]">✏️</span>
          <input
            value={state.name}
            onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
            type="text"
            placeholder={tForm('namePlaceholder')}
            maxLength={12}
            className="h-full flex-1 border-0 bg-transparent text-[14px] text-[#0b2a63] outline-none"
          />
          <div className="text-[11px] text-[#8AA0BD]">{state.name.length}/12</div>
        </div>
      </label>

      <section style={{ animation: 'ac02-slide .4s ease-out .16s both' }}>
        <div className="mb-1.5 flex items-center justify-between">
          <div className="text-[12px] font-bold text-[#5C6F90]">{tForm('birthLabel')}</div>
          <div className="text-[10px] text-[#8AA0BD]">{tForm('birthHint')}</div>
        </div>
        <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2">
          <DobInput
            value={state.yy}
            placeholder="YYYY"
            max={4}
            onChange={(v) => setState((s) => ({ ...s, yy: v }))}
          />
          <DobInput
            value={state.mm}
            placeholder="MM"
            max={2}
            onChange={(v) => setState((s) => ({ ...s, mm: v }))}
          />
          <DobInput
            value={state.dd}
            placeholder="DD"
            max={2}
            onChange={(v) => setState((s) => ({ ...s, dd: v }))}
          />
        </div>
      </section>

      <section style={{ animation: 'ac02-slide .4s ease-out .24s both' }}>
        <div className="mb-2 text-[12px] font-bold text-[#5C6F90]">{tForm('drawingLabel')}</div>
        <div className="grid grid-cols-3 gap-2">
          {LEVELS.map((lv) => {
            const on = state.level === lv.id;
            return (
              <button
                type="button"
                key={lv.id}
                onClick={() => setState((s) => ({ ...s, level: lv.id }))}
                aria-pressed={on}
                className={cn(
                  'ac02-btn flex cursor-pointer flex-col items-center gap-[3px] rounded-[14px] border-[1.5px] px-2 py-3',
                  on
                    ? 'border-[#1C7AE0] bg-[linear-gradient(135deg,rgba(49,150,255,0.14),rgba(49,150,255,0.06))] shadow-[0_6px_14px_rgba(28,122,224,0.18)]'
                    : 'border-[#DCE8FB] bg-[#F6F9FF]',
                )}
              >
                <div className="text-[22px]">{lv.icon}</div>
                <div className={cn('text-[13px] font-bold', on ? 'text-[#1C7AE0]' : 'text-[#0b2a63]')}>
                  {tLevel(lv.id)}
                </div>
                <div className="text-[10px] text-[#8AA0BD]">{tForm(LEVEL_SUB_KEY[lv.id])}</div>
              </button>
            );
          })}
        </div>
      </section>
    </>
  );
}

type DobInputProps = {
  value: string;
  placeholder: string;
  max: number;
  onChange: (v: string) => void;
};

function DobInput({ value, placeholder, max, onChange }: DobInputProps) {
  return (
    <div className="ac02-field flex h-[50px] items-center rounded-[14px] border-[1.5px] border-[#DCE8FB] bg-[#F6F9FF] px-3">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, max))}
        placeholder={placeholder}
        inputMode="numeric"
        className="w-full border-0 bg-transparent text-center text-[14px] tracking-[1px] text-[#0b2a63] outline-none"
      />
    </div>
  );
}
