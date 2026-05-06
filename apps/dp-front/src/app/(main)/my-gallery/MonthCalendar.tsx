'use client';

import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import { useLocale, useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';

import IconArrowRight from '@/app/assets/icons/icon-arrow-right.svg';
import { MODE_META } from '@/app/(main)/my-gallery/DrawingCard';
import {
  type MockCalendarDrawing,
  getMockDrawingsForMonth,
  groupByDate,
} from '@/app/(main)/my-gallery/calendarMock';
import { cn } from '@/lib/utils';

// FullCalendar 의 dayCellContent 는 매 렌더마다 새로 호출됨.
// 같은 날짜에 여러 그림이 있을 때 슬라이더 인덱스를 보존하려면 외부에 상태가 필요.
// → 셀 단위 컴포넌트(DayCell) 에 useState 두고 React 가 reconciliation 에서 보존.

type Props = {
  initialMonth?: { year: number; month: number };
};

export default function MonthCalendar({ initialMonth }: Props) {
  const calRef = useRef<FullCalendar>(null);
  const t = useTranslations('myGallery.calendar');
  const locale = useLocale();

  const initial = useMemo(() => {
    if (initialMonth) return initialMonth;
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }, [initialMonth]);

  const [view, setView] = useState(initial);

  // 현재 보이는 달 + 인접 달의 mock 을 모두 합쳐 둠.
  // (fc 가 prev/next 시 인접 달 "회색 셀" 도 같이 보여주므로)
  const drawingsByDate = useMemo(() => {
    const cur = getMockDrawingsForMonth(view.year, view.month);
    const prevDate = view.month === 1 ? { y: view.year - 1, m: 12 } : { y: view.year, m: view.month - 1 };
    const nextDate = view.month === 12 ? { y: view.year + 1, m: 1 } : { y: view.year, m: view.month + 1 };
    const prev = getMockDrawingsForMonth(prevDate.y, prevDate.m);
    const next = getMockDrawingsForMonth(nextDate.y, nextDate.m);
    return groupByDate([...prev, ...cur, ...next]);
  }, [view.year, view.month]);

  const goPrev = () => calRef.current?.getApi().prev();
  const goNext = () => calRef.current?.getApi().next();

  return (
    <section
      className="overflow-hidden rounded-[20px] border border-[#1C7AE0]/15 bg-white/85 backdrop-blur-[14px]"
      style={{
        boxShadow: '0 18px 48px rgba(28,122,224,.1), 0 0 0 1px rgba(255,255,255,.5) inset',
      }}
    >
      {/* 커스텀 헤더 */}
      <header className="flex items-center justify-between border-b border-[#1C7AE0]/10 bg-[#EAF2FE]/40 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="text-[16px]">📅</span>
          <span className="text-[13.5px] font-extrabold text-[#0b2a63]">{t('title')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <NavButton onClick={goPrev} ariaLabel={t('prevMonthAria')} direction="left" />
          <div className="min-w-[88px] text-center text-[13px] font-extrabold tabular-nums text-[#0b2a63]">
            {view.year}.{String(view.month).padStart(2, '0')}
          </div>
          <NavButton onClick={goNext} ariaLabel={t('nextMonthAria')} direction="right" />
        </div>
      </header>

      {/* FullCalendar */}
      <div className="mg-calendar p-3">
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          firstDay={1}
          headerToolbar={false}
          height="auto"
          fixedWeekCount={false}
          showNonCurrentDates={true}
          locale={locale}
          dayHeaderFormat={{ weekday: 'short' }}
          dayCellContent={(arg) => {
            const dateStr = formatLocalDate(arg.date);
            const drawings = drawingsByDate.get(dateStr) ?? [];
            return (
              <DayCell
                dateStr={dateStr}
                dayNumber={arg.date.getDate()}
                isOtherMonth={arg.isOther}
                isToday={arg.isToday}
                drawings={drawings}
              />
            );
          }}
          datesSet={(arg) => {
            // arg.start ~ arg.end 사이에 보이는 셀들. arg.view.currentStart 가 그 달의 1일.
            const cur = arg.view.currentStart;
            setView({ year: cur.getFullYear(), month: cur.getMonth() + 1 });
          }}
        />
      </div>
    </section>
  );
}

// =============================================================================
// 날짜 셀 (셀 별 슬라이더 포함)
// =============================================================================

type DayCellProps = {
  dateStr: string;
  dayNumber: number;
  isOtherMonth: boolean;
  isToday: boolean;
  drawings: MockCalendarDrawing[];
};

function DayCell({ dateStr, dayNumber, isOtherMonth, isToday, drawings }: DayCellProps) {
  const [idx, setIdx] = useState(0);
  const total = drawings.length;
  const t = useTranslations('myGallery.calendar');
  const safeIdx = total === 0 ? 0 : idx % total;
  const current = drawings[safeIdx];

  const day = new Date(dateStr).getDay(); // 0=일, 6=토
  const numberColor = isOtherMonth
    ? 'text-[#B9CDE6]'
    : day === 6
      ? 'text-[#3196ff]'
      : day === 0
        ? 'text-[#FF7878]'
        : 'text-[#5C6F90]';

  const goPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i - 1 + total) % total);
  };
  const goNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx((i) => (i + 1) % total);
  };

  return (
    <div className="flex h-full w-full flex-col">
      {/* 날짜 숫자 — 그림이 있건 없건 항상 보여줌 */}
      <div className="flex items-center justify-between px-2 pt-1.5">
        <div
          className={cn(
            'flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-[11px] font-extrabold tabular-nums',
            isToday
              ? 'bg-[#1C7AE0] text-white shadow-[0_2px_8px_rgba(28,122,224,0.4)]'
              : current
                ? cn('bg-white/95 shadow-[0_1px_3px_rgba(0,0,0,0.12)]', numberColor)
                : numberColor,
          )}
        >
          {dayNumber}
        </div>
        {total > 1 && (
          <div className="rounded-full bg-[#1C7AE0]/90 px-1.5 py-[1px] text-[9px] font-extrabold text-white shadow-[0_1px_3px_rgba(28,122,224,0.4)]">
            {safeIdx + 1}/{total}
          </div>
        )}
      </div>

      {/* 그림 영역 */}
      {current ? (
        <div
          key={`${dateStr}-${current.id}`}
          className="group/cell relative mx-1.5 mb-1.5 mt-1 flex-1 overflow-hidden rounded-[10px] border border-[#1C7AE0]/15"
          style={{
            background: `center/cover no-repeat url("${current.imageUrl}"), ${MODE_META[current.mode].tint}`,
            animation: 'mg-cell-fade .25s ease-out both',
          }}
        >
          {/* 모드 라벨 (좌하) */}
          <div className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded-full bg-white/85 px-1.5 py-[1px] text-[9px] font-bold text-[#0b2a63] shadow-[0_1px_2px_rgba(0,0,0,0.06)]">
            <span>{MODE_META[current.mode].icon}</span>
          </div>

          {/* 슬라이더 좌우 버튼 (다중일 때만, hover 시 드러남) */}
          {total > 1 && (
            <>
              <button
                type="button"
                onClick={goPrev}
                aria-label={t('prevImageAria')}
                className="absolute left-1 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 opacity-0 shadow-[0_2px_6px_rgba(0,0,0,0.18)] transition-opacity duration-150 group-hover/cell:opacity-100 hover:bg-white"
              >
                <IconArrowRight
                  width={10}
                  height={10}
                  aria-hidden
                  className="-scale-x-100 text-[#1C7AE0]"
                />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label={t('nextImageAria')}
                className="absolute right-1 top-1/2 z-10 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-white/85 opacity-0 shadow-[0_2px_6px_rgba(0,0,0,0.18)] transition-opacity duration-150 group-hover/cell:opacity-100 hover:bg-white"
              >
                <IconArrowRight width={10} height={10} aria-hidden className="text-[#1C7AE0]" />
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}

// =============================================================================
// helpers
// =============================================================================

function formatLocalDate(d: Date): string {
  // YYYY-MM-DD (로컬 타임존). FullCalendar 의 arg.date 는 그 셀이 표시하는 자정 로컬 시각.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

type NavButtonProps = {
  onClick: () => void;
  ariaLabel: string;
  direction: 'left' | 'right';
};

function NavButton({ onClick, ariaLabel, direction }: NavButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-[#1C7AE0]/15 bg-white text-[#1C7AE0] transition-all hover:border-[#1C7AE0]/35 hover:bg-[#1C7AE0]/5"
    >
      <IconArrowRight
        width={11}
        height={11}
        aria-hidden
        className={direction === 'left' ? '-scale-x-100' : ''}
      />
    </button>
  );
}
