export interface HeaderProps {
  onToggleSidebar?: () => void;
  isSidebarCollapsed?: boolean;
  className?: string;
  showUserMenu?: boolean;
}

export interface HeaderUser {
  name: string;
  avatar?: string;
  role?: string;
}