import type { LayoutType } from '@/shared/types';

export interface SidebarProps {
  layoutType: LayoutType;
  isCollapsed: boolean;
  className?: string;
}

export interface SidebarItemData {
  id: string;
  label: string;
  icon: React.ReactNode;
  to: string;
  badge?: string | number;
  children?: SidebarItemData[];
}