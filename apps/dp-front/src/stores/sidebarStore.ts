import { create } from 'zustand';

type SidebarState = {
  isDrawerOpen: boolean;
  isRailExpanded: boolean;
};

type SidebarActions = {
  closeDrawer: () => void;
  toggleDrawer: () => void;
  toggleRail: () => void;
};

type SidebarStore = SidebarState & { actions: SidebarActions };

const useSidebarStore = create<SidebarStore>((set) => ({
  isDrawerOpen: false,
  isRailExpanded: true,
  actions: {
    closeDrawer: () => set({ isDrawerOpen: false }),
    toggleDrawer: () => set((s) => ({ isDrawerOpen: !s.isDrawerOpen })),
    toggleRail: () => set((s) => ({ isRailExpanded: !s.isRailExpanded })),
  },
}));

export const useSidebarIsDrawerOpen = () =>
  useSidebarStore((s) => s.isDrawerOpen);

export const useSidebarIsRailExpanded = () =>
  useSidebarStore((s) => s.isRailExpanded);

export const useSidebarActions = () => useSidebarStore((s) => s.actions);
