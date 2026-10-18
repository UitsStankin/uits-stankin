import { ACHIEVEMENTS_ROUTE, CONFERENCES_ROUTE, POSTGRADUATE_ROUTE } from '@shared/config/routes';

export type ProgramKey = 'bac' | 'mag' | 'phd';

export interface ProgramLink {
  title: string;
  note: string;
  href: string;
}

export interface Program {
  key: ProgramKey;
  tab: string;
  name: string;
  code: string | null;
  links: readonly ProgramLink[];
}

const LEVEL_NOTES = {
  plans: 'Планы направления по курсам',
  graduate: 'Порядок, сроки и темы выпускных работ',
  practices: 'Виды практик и документы',
} as const;

function levelLinks(level: 'bachelor' | 'master'): readonly ProgramLink[] {
  return [
    {
      title: 'Учебные планы',
      note: LEVEL_NOTES.plans,
      href: `/educational-activities/${level}/edu-plans`,
    },
    {
      title: 'Защита ВКР',
      note: LEVEL_NOTES.graduate,
      href: `/educational-activities/${level}/graduate`,
    },
    {
      title: 'Практики',
      note: LEVEL_NOTES.practices,
      href: `/educational-activities/${level}/practices`,
    },
  ];
}

export const PROGRAMS: readonly Program[] = [
  { key: 'bac', tab: 'Бакалавриат', name: 'Бакалавриат', code: '09.03.03', links: levelLinks('bachelor') },
  { key: 'mag', tab: 'Магистратура', name: 'Магистратура', code: '09.04.01', links: levelLinks('master') },
  {
    key: 'phd',
    tab: 'Аспирантура',
    name: 'Аспирантура и наука',
    code: null,
    links: [
      { title: 'Аспирантура', note: 'Аспиранты и научные руководители', href: POSTGRADUATE_ROUTE },
      {
        title: 'Научные публикации',
        note: 'Статьи преподавателей кафедры',
        href: '/scientific-activities/publications/main-science-page',
      },
      { title: 'Достижения кафедры', note: 'Награды и результаты', href: ACHIEVEMENTS_ROUTE },
      { title: 'Конференции', note: 'Объявления о конференциях', href: CONFERENCES_ROUTE },
    ],
  },
];
