import {
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { TEACHERS_ROUTE } from '@shared/config/routes';

export interface QuickTile {
  key: string;
  title: string;
  icon: LucideIcon;
  to?: string;
  anchor?: string;
}

export const QUICK_TILES: readonly QuickTile[] = [
  {
    key: 'schedule',
    title: 'Расписание',
    icon: CalendarDays,
    to: '/educational-activities/schedule/schedule-summary',
  },
  {
    key: 'exams',
    title: 'Экзамены',
    icon: ClipboardCheck,
    to: '/educational-activities/schedule/schedule-exams',
  },
  {
    key: 'plans',
    title: 'Учебные планы',
    icon: ClipboardList,
    anchor: 'programs',
  },
  {
    key: 'teachers',
    title: 'Преподаватели',
    icon: Users,
    to: TEACHERS_ROUTE,
  },
  {
    key: 'documents',
    title: 'Документы',
    icon: FileText,
    to: '/about/documents/department',
  },
];
