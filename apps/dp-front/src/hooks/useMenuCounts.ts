'use client';

import { useMemo } from 'react';

import { getMockDrawingsForMonth } from '@/app/(main)/my-gallery/calendarMock';
import { useUnreadNotificationCount } from '@/stores/userStore';

// 사이드바 메뉴 배지 카운트.
//   draw         → 0 (사용자 요청으로 제외)
//   event        → 목데이터 개수 (event/page.tsx EVENTS 길이; R13 BE 도달 시 API 로 교체)
//   gallery      → 마이갤러리 캘린더 mock 의 이번 달 작품 수 (R7/R8 캔버스 도달 시 API 로 교체)
//   notification → 실제 미확인 알림 수 (R10 에서 zustand 에 채워짐)
//   setting      → 0
const MOCK_EVENT_COUNT = 10;

export function useMenuCounts(): Record<string, number> {
  const unread = useUnreadNotificationCount();

  const galleryCount = useMemo(() => {
    const t = new Date();
    return getMockDrawingsForMonth(t.getFullYear(), t.getMonth() + 1).length;
  }, []);

  return {
    draw: 0,
    event: MOCK_EVENT_COUNT,
    gallery: galleryCount,
    notification: unread,
    setting: 0,
  };
}
