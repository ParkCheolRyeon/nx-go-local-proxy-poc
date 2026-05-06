import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type SubscriptionPlan = 'monthlySubscribe' | 'yearlySubscribe' | 'pro';

export type NotificationReadStatus = 'read' | 'unRead';
export type NotificationCategory = 'contest' | 'social' | 'coin' | 'system';

export type UserNotification = {
  id: string;
  category: NotificationCategory;
  title: string;
  description: string;
  icon?: string;
  cta?: string;
  readStatus: NotificationReadStatus;
  createdAt: string;
};

export type ChildProfileEmoji = 'lion' | 'bear' | 'rabbit' | 'panda' | 'fox' | 'dog' | 'cat' | 'unikorn';

export type ChildDrawingLevel = 'beginner' | 'intermediate' | 'expert';

export type ChildProfile = {
  id: string;
  name: string;
  birthDate: string;
  profileEmoji: ChildProfileEmoji;
  drawingLevel: ChildDrawingLevel;
  createdAt: string;
  updatedAt: string;
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

const EMPTY_NOTIFICATIONS: UserNotification[] = [];

type UserState = {
  user: User | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  selectedChildId: string | null;
};

type UserActions = {
  signIn: (user: User) => void;
  signOut: () => void;
  setHoldingCoins: (count: number) => void;
  setNotifications: (n: UserNotification[]) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  setHasHydrated: (v: boolean) => void;
  setChildren: (children: ChildProfile[]) => void;
  addChild: (child: ChildProfile) => void;
  removeChild: (id: string) => void;
  upsertChild: (child: ChildProfile) => void;
  setSelectedChildId: (id: string | null) => void;
};

type UserStore = UserState & { actions: UserActions };

const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      selectedChildId: null,
      actions: {
        signIn: (user) => set({ user, isAuthenticated: true }),
        signOut: () => set({ user: null, isAuthenticated: false, selectedChildId: null }),
        setHoldingCoins: (count) => set((s) => (s.user ? { user: { ...s.user, holdingCoins: count } } : s)),
        setNotifications: (n) =>
          set((s) => (s.user ? { user: { ...s.user, notifications: n } } : s)),
        setHasHydrated: (v) => set({ hasHydrated: v }),
        markNotificationRead: (id) =>
          set((s) =>
            s.user
              ? {
                  user: {
                    ...s.user,
                    notifications: s.user.notifications.map((n) => (n.id === id ? { ...n, readStatus: 'read' } : n)),
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
        setChildren: (children) =>
          set((s) => (s.user ? { user: { ...s.user, children } } : s)),
        addChild: (child) =>
          set((s) => (s.user ? { user: { ...s.user, children: [...s.user.children, child] } } : s)),
        removeChild: (id) =>
          set((s) =>
            s.user ? { user: { ...s.user, children: s.user.children.filter((c) => c.id !== id) } } : s,
          ),
        upsertChild: (child) =>
          set((s) => {
            if (!s.user) return s;
            const idx = s.user.children.findIndex((c) => c.id === child.id);
            const next = idx >= 0 ? s.user.children.with(idx, child) : [...s.user.children, child];
            return { user: { ...s.user, children: next } };
          }),
        setSelectedChildId: (id) => set({ selectedChildId: id }),
      },
    }),
    {
      name: 'igallery:user',
      version: 7,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        selectedChildId: state.selectedChildId,
      }),
      migrate: (persistedState, version) => {
        // 스키마 변경 또는 stale mock 데이터 무효화를 위해 이전 버전은 로그아웃 상태로 리셋.
        if (version < 5) {
          return { user: null, isAuthenticated: false, hasHydrated: false, selectedChildId: null };
        }
        if (version < 6) {
          const prev = (persistedState ?? {}) as Partial<UserState>;
          return {
            user: prev.user ?? null,
            isAuthenticated: prev.isAuthenticated ?? false,
            hasHydrated: false,
            selectedChildId: null,
          };
        }
        if (version < 7) {
          // v6 → v7: UserNotification 필드명 변경 (time→createdAt, notificationStatus→category).
          // 기존 알림은 폐기하고 빈 배열로. bootstrap 시 API 에서 다시 채워짐.
          const prev = (persistedState ?? {}) as Partial<UserState>;
          if (prev.user) {
            return {
              user: { ...prev.user, notifications: [] },
              isAuthenticated: prev.isAuthenticated ?? false,
              hasHydrated: false,
              selectedChildId: prev.selectedChildId ?? null,
            } as UserState;
          }
        }
        return persistedState as UserState;
      },
      onRehydrateStorage: () => (state) => {
        // localStorage 읽기 끝난 직후 호출됨 → 깜빡임 방지용 플래그 set
        state?.actions.setHasHydrated(true);
      },
    },
  ),
);

const EMPTY_CHILDREN: ChildProfile[] = [];

export const useUser = () => useUserStore((s) => s.user);
export const useIsAuthenticated = () => useUserStore((s) => s.isAuthenticated);
export const useHoldingCoins = () => useUserStore((s) => s.user?.holdingCoins ?? 0);
export const useMonthlyCoinAllowance = () => useUserStore((s) => s.user?.monthlyCoinAllowance ?? 0);
export const useNotifications = () => useUserStore((s) => s.user?.notifications ?? EMPTY_NOTIFICATIONS);
export const useUnreadNotificationCount = () =>
  useUserStore((s) => s.user?.notifications.filter((n) => n.readStatus === 'unRead').length ?? 0);
export const useChildren = () => useUserStore((s) => s.user?.children ?? EMPTY_CHILDREN);
export const useSelectedChildId = () => useUserStore((s) => s.selectedChildId);
export const useUserActions = () => useUserStore((s) => s.actions);
export const useHasHydrated = () => useUserStore((s) => s.hasHydrated);

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
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

