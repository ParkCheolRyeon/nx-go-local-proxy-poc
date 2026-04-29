'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';

const FAQ_ITEMS: { q: string; a: string }[] = [
  {
    q: '구독을 어떻게 해지하나요?',
    a: "설정 → 구독 관리에서 '구독 해지'를 탭하세요. 현재 결제 기간이 끝날 때까지 서비스를 이용할 수 있습니다.",
  },
  {
    q: '삭제된 그림을 복구할 수 있나요?',
    a: '계정 탈퇴 후 30일 이내에는 탈퇴 취소로 모든 데이터를 복구할 수 있습니다. 30일 경과 후에는 영구 삭제됩니다.',
  },
  {
    q: '코인은 어떻게 사용하나요?',
    a: '그림 1회 이용 시 코인 1개가 소모됩니다. 매일 무료 코인이 충전되며, 구독 시 무제한으로 이용할 수 있습니다.',
  },
  {
    q: '자녀 프로필은 어떻게 추가하나요?',
    a: '설정 → 계정 정보 → 자녀 프로필 추가에서 최대 5개까지 추가할 수 있습니다.',
  },
  {
    q: '이벤트에 어떻게 참가하나요?',
    a: '이벤트 탭에서 원하는 이벤트를 선택하고 출품 단계를 따라가세요. 본인확인이 필요할 수 있습니다.',
  },
];

const Q_FADE_TRANSITION = 'opacity .45s cubic-bezier(.4,0,.2,1), color .45s cubic-bezier(.4,0,.2,1)';

export default function FaqAccordion() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="mb-2 mt-1 rounded-[14px] border border-[#1C7AE0]/[0.12] bg-white/70 px-3 py-1">
      {FAQ_ITEMS.map((item, i) => {
        const open = openIdx === i;
        const isLast = i === FAQ_ITEMS.length - 1;
        return (
          <div key={item.q} className={cn(!isLast && 'border-b border-dashed border-[#1C7AE0]/[0.12]')}>
            <button
              type="button"
              onClick={() => setOpenIdx(open ? null : i)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 py-3 text-left"
            >
              <span
                className="relative flex h-6 w-6 flex-none items-center justify-center overflow-hidden rounded-full text-[11px] font-bold"
                style={{ background: 'linear-gradient(135deg,#3196ff,#1C7AE0)' }}
              >
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-full bg-[#EAF2FE]"
                  style={{
                    opacity: open ? 0 : 1,
                    transition: Q_FADE_TRANSITION,
                  }}
                />
                <span
                  className="relative"
                  style={{
                    color: open ? '#fff' : '#1C7AE0',
                    transition: Q_FADE_TRANSITION,
                  }}
                >
                  Q
                </span>
              </span>
              <span
                className="flex-1 text-[13px] font-semibold"
                style={{
                  color: open ? '#1C7AE0' : '#0b2a63',
                  transition: Q_FADE_TRANSITION,
                }}
              >
                {item.q}
              </span>
              <span
                className="text-[16px] text-[#8AA0BD]"
                style={{
                  transform: open ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform .25s cubic-bezier(.4,0,.2,1)',
                }}
                aria-hidden
              >
                ›
              </span>
            </button>
            <div
              className="grid overflow-hidden transition-[grid-template-rows,opacity] duration-[400ms] ease-[cubic-bezier(.4,0,.2,1)]"
              style={{
                gridTemplateRows: open ? '1fr' : '0fr',
                opacity: open ? 1 : 0,
              }}
            >
              <div className="min-h-0">
                <div className="mb-3 ml-9 rounded-[10px] bg-[#EAF2FE]/50 px-3 py-2.5 text-[12px] leading-[1.6] text-[#5C6F90]">
                  {item.a}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
