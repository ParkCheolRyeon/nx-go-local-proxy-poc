import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type SubscriptionPlan = 'monthlySubscribe' | 'yearlySubscribe' | 'pro';

export type NotificationReadStatus = 'read' | 'unRead';
export type NotificationCategory = 'contest' | 'social' | 'coin' | 'system';

export type UserNotification = {
  id: string;
  title: string;
  description: string;
  icon: string;
  time: string;
  readStatus: NotificationReadStatus;
  notificationStatus: NotificationCategory;
  cta?: string;
};

export type ChildProfileEmoji =
  | 'lion'
  | 'bear'
  | 'rabbit'
  | 'panda'
  | 'fox'
  | 'dog'
  | 'cat'
  | 'unikorn';

export type ChildDrawingLevel = 'beginner' | 'intermediate' | 'expert';

export type ChildProfile = {
  name: string;
  birthDate: string;
  profileEmoji: ChildProfileEmoji;
  drawingLevel: ChildDrawingLevel;
};

export type User = {
  id: string;
  name: string;
  description: string;
  avatar: string;
  plan: SubscriptionPlan;
  subscribeStartAt: string;
  subscribeEndAt: string;
  holdingCoins: number;
  monthlyCoinAllowance: number;
  notifications: UserNotification[];
  children: ChildProfile[];
};

export const PLAN_LABELS: Record<SubscriptionPlan, string> = {
  monthlySubscribe: '월 구독',
  yearlySubscribe: '연 구독',
  pro: 'Pro 플랜',
};

// TODO: auth 연동 전까지 개발용으로 쓰는 목업 자격증명. 실제 인증 붙으면 제거.
export const MOCK_CREDENTIALS = {
  email: 'test@test.com',
  password: '1q2w3e4r',
};

// 오늘(3개) / 이전(4개) 분포를 현재 시각 기준으로 항상 유지하도록 동적 계산.
function buildMockNotifications(): UserNotification[] {
  const now = Date.now();
  const startOfToday = new Date(new Date().setHours(0, 0, 0, 0)).getTime();

  // 오늘: hoursBack만큼 과거로 이동하되, 오늘 0시 이전으로는 못 내려가도록 클램프.
  const withinToday = (hoursBack: number) => {
    const candidate = now - hoursBack * 3_600_000;
    return new Date(Math.max(candidate, startOfToday)).toISOString();
  };

  const daysAgo = (days: number, hour: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  return [
    {
      id: 'n1',
      title: '수상 알림',
      description: "봄 그림 대회 '우주 토끼'가 대상을 받았어요!",
      icon: '🥇',
      time: withinToday(0),
      readStatus: 'unRead',
      notificationStatus: 'contest',
      cta: '상세 보기',
    },
    {
      id: 'n2',
      title: '심사가 시작됐어요',
      description: "'멋진 사자' 작품 심사가 방금 시작됐어요",
      icon: '⏰',
      time: withinToday(2),
      readStatus: 'unRead',
      notificationStatus: 'contest',
      cta: '심사 페이지',
    },
    {
      id: 'n3',
      title: '좋아요 21개',
      description: "'우주 토끼' 작품에 21명이 좋아했어요",
      icon: '❤️',
      time: withinToday(5),
      readStatus: 'unRead',
      notificationStatus: 'social',
    },
    {
      id: 'n4',
      title: '이번 주 무료 도안',
      description: "'우주 토끼' 도안이 공개됐어요",
      icon: '🎁',
      time: daysAgo(1, 15),
      readStatus: 'read',
      notificationStatus: 'system',
    },
    {
      id: 'n5',
      title: '매일 코인 획득',
      description: '오늘 로그인 보상 코인 1개를 받았어요 (7일차 보너스 +3)',
      icon: '🪙',
      time: daysAgo(1, 9),
      readStatus: 'read',
      notificationStatus: 'coin',
    },
    {
      id: 'n6',
      title: '함께 그리기 초대',
      description: "곰곰이가 '같이 그려요' 방에 초대했어요",
      icon: '👯',
      time: daysAgo(2, 10),
      readStatus: 'read',
      notificationStatus: 'social',
      cta: '방으로 이동',
    },
    {
      id: 'n7',
      title: '보호자 확인 요청',
      description: '민준이의 작품 업로드에 보호자 승인이 필요해요',
      icon: '🛡',
      time: daysAgo(3, 11),
      readStatus: 'read',
      notificationStatus: 'system',
    },
  ];
}

// TODO: auth 연동 전까지 개발용으로 쓰는 목업 유저. setMockUser에서 buildMockUser()를 매번 호출해 fresh 데이터 주입.
export function buildMockUser(): User {
  return {
    id: 'mock-user-1',
    name: '련철박',
    description: '만 97세 · 왕초보',
    avatar: '🦁',
    plan: 'pro',
    subscribeStartAt: '2026-04-11T00:00:00.000Z',
    subscribeEndAt: '2026-05-11T00:00:00.000Z',
    holdingCoins: 999,
    monthlyCoinAllowance: 30,
    notifications: buildMockNotifications(),
    children: [
      {
        name: '티라노사우르스',
        birthDate: '2010-01-23',
        profileEmoji: 'fox',
        drawingLevel: 'beginner',
      },
      {
        name: '파파덕',
        birthDate: '2019-04-21',
        profileEmoji: 'unikorn',
        drawingLevel: 'intermediate',
      },
    ],
  };
}

export const MOCK_USER: User = buildMockUser();

const EMPTY_NOTIFICATIONS: UserNotification[] = [];

type UserState = {
  user: User | null;
  isAuthenticated: boolean;
};

type UserActions = {
  signIn: (user: User) => void;
  signOut: () => void;
  setMockUser: () => void;
  setHoldingCoins: (count: number) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
};

type UserStore = UserState & { actions: UserActions };

const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      actions: {
        signIn: (user) => set({ user, isAuthenticated: true }),
        signOut: () => set({ user: null, isAuthenticated: false }),
        setMockUser: () =>
          set({ user: buildMockUser(), isAuthenticated: true }),
        setHoldingCoins: (count) =>
          set((s) =>
            s.user ? { user: { ...s.user, holdingCoins: count } } : s,
          ),
        markNotificationRead: (id) =>
          set((s) =>
            s.user
              ? {
                  user: {
                    ...s.user,
                    notifications: s.user.notifications.map((n) =>
                      n.id === id ? { ...n, readStatus: 'read' } : n,
                    ),
                  },
                }
              : s,
          ),
        markAllNotificationsRead: () =>
          set((s) =>
            s.user
              ? {
                  user: {
                    ...s.user,
                    notifications: s.user.notifications.map((n) => ({
                      ...n,
                      readStatus: 'read' as const,
                    })),
                  },
                }
              : s,
          ),
      },
    }),
    {
      name: 'igallery:user',
      version: 4,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      migrate: (persistedState, version) => {
        // 스키마 변경 또는 stale mock 데이터 무효화를 위해 이전 버전은 로그아웃 상태로 리셋.
        if (version < 4) {
          return { user: null, isAuthenticated: false };
        }
        return persistedState as UserState;
      },
    },
  ),
);

export const useUser = () => useUserStore((s) => s.user);
export const useIsAuthenticated = () =>
  useUserStore((s) => s.isAuthenticated);
export const useHoldingCoins = () =>
  useUserStore((s) => s.user?.holdingCoins ?? 0);
export const useMonthlyCoinAllowance = () =>
  useUserStore((s) => s.user?.monthlyCoinAllowance ?? 0);
export const useNotifications = () =>
  useUserStore((s) => s.user?.notifications ?? EMPTY_NOTIFICATIONS);
export const useUnreadNotificationCount = () =>
  useUserStore(
    (s) =>
      s.user?.notifications.filter((n) => n.readStatus === 'unRead').length ??
      0,
  );
export const useUserActions = () => useUserStore((s) => s.actions);

export function getSubscriptionRemainingDays(endAt: string, now = Date.now()) {
  const diff = new Date(endAt).getTime() - now;
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

export function formatTimeAgo(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  const diff = now - then;
  if (diff < 60_000) return '방금';
  const min = Math.floor(diff / 60_000);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(diff / 3_600_000);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(diff / 86_400_000);
  if (day === 1) return '어제';
  if (day < 7) return `${day}일 전`;
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function isTodayIso(iso: string, now = new Date()): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
