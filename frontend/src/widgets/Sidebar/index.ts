// // src/widgets/Sidebar/index.tsx
// import { cn } from '@/shared/lib/cn';
// import { SidebarLogo } from './components/SidebarLogo';
// import { SidebarItem } from './components/SidebarItem';
// import { MENU_ITEMS } from './Sidebar.constants';
// import type { SidebarProps } from './Sidebar.types';

// export default function Sidebar({ 
//   layoutType, 
//   isCollapsed, 
//   className 
// }: SidebarProps) {
//   return (
//     <nav className={cn('h-full py-4 flex flex-col', className)}>
//       {/* Логотип */}
//       <SidebarLogo collapsed={isCollapsed} />

//       {/* Навигация */}
//       <ul className="flex-1 overflow-y-auto px-2 space-y-1">
//         {MENU_ITEMS.map((item) => (
//           <SidebarItem
//             key={item.id}
//             {...item}
//             collapsed={isCollapsed}
//           />
//         ))}
//       </ul>

//       {/* Футер сайдбара: версия, настройки */}
//       {!isCollapsed && <SidebarFooter />}
//     </nav>
//   );
// }

// function SidebarFooter() {
//   return (
//     <div className="px-4 py-3 border-t border-default text-xs text-text-muted">
//       v1.0.0
//     </div>
//   );
// }