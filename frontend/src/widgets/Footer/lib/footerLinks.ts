import {
  ACHIEVEMENTS_ROUTE,
  ANNOUNCEMENTS_ROUTE,
  CONFERENCES_ROUTE,
  NEWS_ROUTE,
  POSTGRADUATE_ROUTE,
  TEACHERS_ROUTE,
} from '@shared/config/routes';

export interface FooterLink {
  title: string;
  to: string;
}

export interface FooterColumn {
  title: string;
  links: readonly FooterLink[];
}

export const FOOTER_COLUMNS: readonly FooterColumn[] = [
  {
    title: 'О кафедре',
    links: [
      { title: 'История кафедры', to: '/about/history-of-department' },
      { title: 'Новости', to: NEWS_ROUTE },
      { title: 'Объявления', to: ANNOUNCEMENTS_ROUTE },
      { title: 'Преподаватели', to: TEACHERS_ROUTE },
      { title: 'Контакты', to: '/about/contacts' },
    ],
  },
  {
    title: 'Обучение',
    links: [
      { title: 'Бакалавриат 09.03.03', to: '/educational-activities/bachelor/edu-plans' },
      { title: 'Магистратура 09.04.01', to: '/educational-activities/master/edu-plans' },
      {
        title: 'Расписание преподавателей',
        to: '/educational-activities/schedule/schedule-summary',
      },
      { title: 'Расписание экзаменов', to: '/educational-activities/schedule/schedule-exams' },
    ],
  },
  {
    title: 'Наука',
    links: [
      { title: 'Аспирантура', to: POSTGRADUATE_ROUTE },
      { title: 'Научные публикации', to: '/scientific-activities/publications/main-science-page' },
      { title: 'Достижения', to: ACHIEVEMENTS_ROUTE },
      { title: 'Конференции', to: CONFERENCES_ROUTE },
    ],
  },
];

export const FOOTER_BOTTOM_LINKS: readonly FooterLink[] = [
  { title: 'Нормативные документы', to: '/about/documents/department' },
  { title: 'Благодарности', to: '/about/contributors' },
];
