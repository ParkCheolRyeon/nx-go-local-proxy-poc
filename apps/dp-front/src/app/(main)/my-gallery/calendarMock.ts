// BE 에 그림 저장 기능이 없는 동안 마이갤러리 캘린더용 임시 mock.
// /public/dummy 의 갤러리 이미지를 활용. 월 이동해도 데이터가 보이도록
// (year, month) 시드 기반 결정론적 생성.

import type { DrawingMode } from '@/lib/drawings-api';

export type MockCalendarDrawing = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  imageUrl: string;
  mode: DrawingMode;
};

const IMAGES = [
  '/dummy/gallery1.jpg',
  '/dummy/gallery2.jpg',
  '/dummy/gallery3.jpg',
  '/dummy/gallery4.jpg',
  '/dummy/gallery5.png',
  '/dummy/gallery6.png',
  '/dummy/gallery7.jpg',
  '/dummy/gallery8.jpg',
  '/dummy/gallery9.jpg',
  '/dummy/gallery10.jpg',
  '/dummy/gallery11.jpg',
  '/dummy/gallery12.png',
  '/dummy/gallery13.png',
  '/dummy/gallery14.jpg',
  '/dummy/gallery15.png',
  '/dummy/gallery16.jpg',
  '/dummy/gallery17.jpg',
  '/dummy/gallery18.png',
  '/dummy/gallery19.jpg',
  '/dummy/gallery20.png',
];

const TITLES = [
  '우리 가족',
  '비 오는 날',
  '바다와 나',
  '엄마 코끼리',
  '도깨비 친구',
  '하늘 풍경',
  '별이 빛나는 밤',
  '동물원에서',
  '학교 가는 길',
  '나의 꿈',
  '봄꽃',
  '여름 바다',
  '가을 단풍',
  '겨울 눈사람',
  '맛있는 케이크',
  '내 친구',
  '우주 탐험',
  '공룡 친구',
  '무지개',
  '비행기',
];

const MODES: DrawingMode[] = ['coloring', 'stepwise', 'freeform', 'together'];

// 각 월에 어느 날짜에 몇 개의 그림이 있을지 정해둔 패턴.
// 같은 날짜가 여러 번 등장하면 그 날에 여러 작품 (슬라이더로 보여주기).
const DAY_PATTERN = [1, 3, 5, 8, 8, 12, 15, 15, 15, 18, 20, 22, 22, 25, 28];

export function getMockDrawingsForMonth(year: number, month: number): MockCalendarDrawing[] {
  // month 는 1-indexed
  const daysInMonth = new Date(year, month, 0).getDate();
  const seed = year * 12 + (month - 1);
  const drawings: MockCalendarDrawing[] = [];

  DAY_PATTERN.filter((d) => d <= daysInMonth).forEach((day, idx) => {
    const imgIdx = (seed * 7 + idx * 3) % IMAGES.length;
    const titleIdx = (seed * 5 + idx) % TITLES.length;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    drawings.push({
      id: `mock-${seed}-${idx}`,
      date: dateStr,
      title: TITLES[titleIdx],
      imageUrl: IMAGES[imgIdx],
      mode: MODES[(idx + seed) % MODES.length],
    });
  });

  return drawings;
}

export function groupByDate(drawings: MockCalendarDrawing[]): Map<string, MockCalendarDrawing[]> {
  const map = new Map<string, MockCalendarDrawing[]>();
  for (const d of drawings) {
    const arr = map.get(d.date) ?? [];
    arr.push(d);
    map.set(d.date, arr);
  }
  return map;
}
