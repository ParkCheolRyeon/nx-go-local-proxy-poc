'use client';

import IconArrowRight from '@/app/assets/icons/icon-arrow-right.svg';
import AuthBackdrop from '@/app/components/AuthBackdrop';
import MainLogo from '@/app/components/MainLogo';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

type Avatar = { emoji: string; gradient: string };

const AVATARS: Avatar[] = [
  { emoji: '🦁', gradient: 'linear-gradient(135deg,#FDE68A,#FBBF24)' },
  { emoji: '🐻', gradient: 'linear-gradient(135deg,#FDBA74,#F97316)' },
  { emoji: '🐰', gradient: 'linear-gradient(135deg,#FBCFE8,#F472B6)' },
  { emoji: '🐼', gradient: 'linear-gradient(135deg,#E5E7EB,#9CA3AF)' },
  { emoji: '🦊', gradient: 'linear-gradient(135deg,#FCA5A5,#F87171)' },
  { emoji: '🐶', gradient: 'linear-gradient(135deg,#FEF08A,#FACC15)' },
  { emoji: '🐱', gradient: 'linear-gradient(135deg,#C7D2FE,#818CF8)' },
  { emoji: '🦄', gradient: 'linear-gradient(135deg,#DDD6FE,#A78BFA)' },
];

type SkillLevel = 'beginner' | 'intermediate' | 'expert';

const LEVELS: { id: SkillLevel; label: string; icon: string; sub: string }[] = [
  { id: 'beginner', label: '왕초보', icon: '🌱', sub: '처음 그려봐요' },
  { id: 'intermediate', label: '중급', icon: '🎨', sub: '몇 번 해봤어요' },
  { id: 'expert', label: '고급', icon: '🏆', sub: '자신 있어요' },
];

export default function ChildrenProfilePage() {
  const router = useRouter();

  const [picked, setPicked] = useState(0);
  const [name, setName] = useState('짱구');
  const [yy, setYy] = useState('2018');
  const [mm, setMm] = useState('03');
  const [dd, setDd] = useState('14');
  const [level, setLevel] = useState<SkillLevel>('beginner');

  const nameOk = name.trim().length >= 1;
  const dobOk =
    /^\d{4}$/.test(yy) &&
    /^\d{1,2}$/.test(mm) &&
    /^\d{1,2}$/.test(dd) &&
    +mm >= 1 &&
    +mm <= 12 &&
    +dd >= 1 &&
    +dd <= 31;
  const canSubmit = nameOk && dobOk;

  const handleSubmit = () => {
    if (!canSubmit) return;
    // TODO: 자녀 프로필 저장 API 연동
    router.replace('/my-gallery');
  };

  return (
    <AuthBackdrop>
      <div className="relative z-10 flex items-center justify-between px-11 pt-9">
        <button
          type="button"
          onClick={() => router.back()}
          className="ac02-btn flex cursor-pointer items-center gap-1.5 rounded-full border border-[#1C7AE0]/10 bg-white/70 px-3.5 py-2 text-[13px] font-semibold text-[#5C6F90] shadow-[0_4px_12px_rgba(28,122,224,0.08)]"
        >
          <IconArrowRight
            width={12}
            height={12}
            aria-hidden
            className="-scale-x-100"
          />
          이전
        </button>
        <MainLogo isExpanded />
        <button
          type="button"
          onClick={() => router.replace('/my-gallery')}
          className="ac02-link cursor-pointer border-0 bg-transparent p-0 text-[13px] font-semibold text-[#8AA0BD]"
        >
          건너뛰기
        </button>
      </div>

      <div
        className="relative z-10 m-auto flex w-full max-w-[460px] flex-col gap-[18px] pb-10"
        style={{ paddingTop: 24 }}
      >
        <div
          className="text-center"
          style={{ animation: 'ac02-fade .5s ease-out both' }}
        >
          
          <div className="text-[32px] leading-[1.15] font-extrabold">
            <span className="text-[#1C7AE0]">자녀 프로필</span>을 만들어요
          </div>
          <div className="mt-2 text-[13px] leading-[1.55] text-[#5C6F90]">
            나중에 설정에서 최대 5명까지 추가할 수 있어요.
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="flex flex-col gap-[18px] rounded-[24px] border border-[#1C7AE0]/10 bg-white/85 p-[22px] backdrop-blur-md"
          style={{
            boxShadow: '0 20px 50px rgba(28,122,224,.15)',
            animation: 'ac02-fade .5s ease-out .1s both',
          }}
        >
          <section style={{ animation: 'ac02-slide .4s ease-out 0s both' }}>
            <div className="mb-2.5 flex items-baseline justify-between">
              <div className="text-[12px] font-bold text-[#5C6F90]">캐릭터</div>
              <div className="text-[11px] text-[#8AA0BD]">
                나중에 바꿀 수 있어요
              </div>
            </div>
            <div className="grid grid-cols-8 gap-2">
              {AVATARS.map((a, i) => {
                const isPicked = picked === i;
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setPicked(i)}
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
                        style={{
                          animation:
                            'ac02-pop .35s cubic-bezier(.34,1.56,.64,1) both',
                        }}
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>

          <label
            className="block"
            style={{ animation: 'ac02-slide .4s ease-out .08s both' }}
          >
            <div className="mb-1.5 text-[12px] font-bold text-[#5C6F90]">
              이름
            </div>
            <div className="ac02-field flex h-[50px] items-center gap-2.5 rounded-[14px] border-[1.5px] border-[#DCE8FB] bg-[#F6F9FF] px-3.5">
              <span className="text-[16px] text-[#8AA0BD]">✏️</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                placeholder="자녀 이름 혹은 별명"
                maxLength={12}
                className="h-full flex-1 border-0 bg-transparent text-[14px] text-[#0b2a63] outline-none"
              />
              <div className="text-[11px] text-[#8AA0BD]">{name.length}/12</div>
            </div>
          </label>

          <section style={{ animation: 'ac02-slide .4s ease-out .16s both' }}>
            <div className="mb-1.5 flex items-center justify-between">
              <div className="text-[12px] font-bold text-[#5C6F90]">
                생년월일
              </div>
              <div className="text-[10px] text-[#8AA0BD]">
                만 14세 미만 · 법정대리인 동의 필요
              </div>
            </div>
            <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2">
              <DobInput value={yy} placeholder="YYYY" max={4} onChange={setYy} />
              <DobInput value={mm} placeholder="MM" max={2} onChange={setMm} />
              <DobInput value={dd} placeholder="DD" max={2} onChange={setDd} />
            </div>
          </section>

          <section style={{ animation: 'ac02-slide .4s ease-out .24s both' }}>
            <div className="mb-2 text-[12px] font-bold text-[#5C6F90]">
              그림 실력
            </div>
            <div className="grid grid-cols-3 gap-2">
              {LEVELS.map((lv) => {
                const on = level === lv.id;
                return (
                  <button
                    type="button"
                    key={lv.id}
                    onClick={() => setLevel(lv.id)}
                    aria-pressed={on}
                    className={cn(
                      'ac02-btn flex cursor-pointer flex-col items-center gap-[3px] rounded-[14px] border-[1.5px] px-2 py-3',
                      on
                        ? 'border-[#1C7AE0] bg-[linear-gradient(135deg,rgba(49,150,255,0.14),rgba(49,150,255,0.06))] shadow-[0_6px_14px_rgba(28,122,224,0.18)]'
                        : 'border-[#DCE8FB] bg-[#F6F9FF]',
                    )}
                  >
                    <div className="text-[22px]">{lv.icon}</div>
                    <div
                      className={cn(
                        'text-[13px] font-bold',
                        on ? 'text-[#1C7AE0]' : 'text-[#0b2a63]',
                      )}
                    >
                      {lv.label}
                    </div>
                    <div className="text-[10px] text-[#8AA0BD]">{lv.sub}</div>
                  </button>
                );
              })}
            </div>
          </section>
        </form>

        <div
          className="mt-auto flex gap-2.5"
          style={{ animation: 'ac02-slide .4s ease-out .32s both' }}
        >
          <button
            type="button"
            onClick={() => router.replace('/my-gallery')}
            className="ac02-btn h-[54px] cursor-pointer rounded-[14px] border border-[#1C7AE0]/15 bg-white/70 px-[22px] text-[14px] font-semibold text-[#5C6F90]"
          >
            나중에
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              'ac02-btn flex h-[54px] flex-1 items-center justify-center gap-2 rounded-[14px] border-0 text-[16px] font-bold text-white',
              canSubmit
                ? 'cursor-pointer bg-[linear-gradient(135deg,#3196ff,#1C7AE0)] shadow-[0_10px_24px_rgba(28,122,224,0.4)]'
                : 'cursor-not-allowed bg-[#B9CDE6]',
            )}
          >
            <span>완료 · 코인 3개 받기</span>
            <span className="text-[18px]">🪙</span>
          </button>
        </div>
      </div>
    </AuthBackdrop>
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
        onChange={(e) =>
          onChange(e.target.value.replace(/\D/g, '').slice(0, max))
        }
        placeholder={placeholder}
        inputMode="numeric"
        className="w-full border-0 bg-transparent text-center text-[14px] tracking-[1px] text-[#0b2a63] outline-none"
      />
    </div>
  );
}
