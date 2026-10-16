import {
  Award,
  Book,
  BookOpen,
  Calendar,
  Clipboard,
  ClipboardList,
  FileCode,
  FileText,
  Folder,
  GraduationCap,
  Home,
  Info,
  Landmark,
  Library,
  List,
  Megaphone,
  Microscope,
  Mic,
  Newspaper,
  Phone,
  ScrollText,
  Star,
  Superscript,
  User,
  Users,
} from 'lucide-react';

import type { NavItem } from '@shared/types/nav.types';

/**
 * Структура бокового меню — перенос `configs/nav.config.ts` со старого портала.
 *
 * Отличия от оригинала:
 *
 * 1. Подписи русские прямо здесь. В Angular они были ключами `translateKey`
 *    вида `NAV.EDUCATION_ACTIVITIES.BACHELOR.TITLE`, а тексты лежали в
 *    `i18n/ru/section/nav.ts`. Переключатель языков убран: английский перевод
 *    покрывал только меню и шапку, содержимое страниц всегда оставалось
 *    русским, и часть ключей в нём отсутствовала или не совпадала регистром.
 *
 * 2. Иконки — компоненты lucide-react вместо строк с классами двух иконочных
 *    шрифтов (Feather и Line Awesome, 3.5 МБ). lucide — прямое развитие
 *    Feather, поэтому пятнадцать пунктов с `icon-*` переносятся один в один.
 *    Девять пунктов с `la-*` — подбор по смыслу: Line Awesome происходит от
 *    Font Awesome, там другая геометрия, точного соответствия не существует.
 *
 *    Четыре иконки намеренно отличаются от оригинала:
 *      История кафедры     la-comment (речевое облачко) → ScrollText
 *                          облачко означает комментарий, к истории отношения
 *                          не имело — похоже, взяли первую попавшуюся
 *      Бакалавриат         la-school (здание) → BookOpen
 *                          рядом Магистратура с Landmark, два здания подряд
 *                          сливались на 18px
 *      Аспирантура         la-user-graduate (человек в мантии) → Microscope
 *                          в lucide человека в мантии нет, а GraduationCap
 *                          дублировал бы «Защиту ВКР»
 *      Научные публикации  la-book (закрытая книга) → Library
 *                          освобождает BookOpen для Бакалавриата
 *
 * 3. У групп нет `path`. В оригинале он был (`/about`, `/educational-activities`),
 *    но страниц по этим адресам не существует — группы только раскрываются.
 *
 * Не перенесены два пункта, закомментированных в оригинале: «Направления
 * научных исследований» и «Международный Научный Форум».
 */
export const NAVIGATION: readonly NavItem[] = [
  {
    key: 'home',
    title: 'Главная',
    // В Angular главная жила на /home; в новом роутере это индексный маршрут.
    path: '/',
    icon: Home,
  },

  // ─── О кафедре ────────────────────────────────────────────────────────────
  {
    key: 'about',
    title: 'О кафедре',
    icon: Info,
    children: [
      {
        key: 'about/history',
        title: 'История кафедры',
        path: '/about/history-of-department',
        icon: ScrollText,
      },
      {
        key: 'about/news',
        title: 'Новости кафедры',
        path: '/about/news',
        icon: Newspaper,
      },
      {
        key: 'about/announcements',
        title: 'Объявления кафедры',
        path: '/about/announcements',
        icon: Megaphone,
      },
      {
        key: 'about/employee',
        title: 'Сотрудники кафедры',
        icon: Users,
        children: [
          {
            key: 'about/employee/teachers',
            title: 'Профессорско-преподавательский состав',
            path: '/about/employee/teachers',
            icon: User,
          },
          {
            key: 'about/employee/uvp',
            title: 'Учебно-вспомогательный персонал',
            path: '/about/employee/uvp',
            icon: User,
          },
        ],
      },
      {
        key: 'about/fields-of-study',
        title: 'Направления подготовки',
        path: '/about/fields-of-study',
        icon: List,
      },
      {
        key: 'about/documents',
        title: 'Нормативные документы',
        icon: Folder,
        children: [
          {
            key: 'about/documents/department',
            title: 'Кафедры',
            path: '/about/documents/department',
            icon: FileText,
          },
          {
            key: 'about/documents/university',
            title: 'Университета',
            path: '/about/documents/university',
            icon: FileText,
          },
        ],
      },
      {
        key: 'about/contacts',
        title: 'Контакты',
        path: '/about/contacts',
        icon: Phone,
      },
      {
        key: 'about/contributors',
        title: 'Благодарности',
        path: '/about/contributors',
        icon: Star,
      },
    ],
  },

  // ─── Учебная деятельность ─────────────────────────────────────────────────
  {
    key: 'educational-activities',
    title: 'Учебная деятельность',
    icon: Book,
    children: [
      {
        key: 'educational-activities/bachelor',
        title: '09.03.03 Бакалавриат',
        icon: BookOpen,
        children: [
          {
            key: 'educational-activities/bachelor/edu-plans',
            title: 'Учебные планы',
            path: '/educational-activities/bachelor/edu-plans',
            icon: ClipboardList,
          },
          {
            key: 'educational-activities/bachelor/graduate',
            title: 'Защита ВКР',
            path: '/educational-activities/bachelor/graduate',
            icon: GraduationCap,
          },
          {
            key: 'educational-activities/bachelor/practices',
            title: 'Практики',
            path: '/educational-activities/bachelor/practices',
            icon: FileCode,
          },
        ],
      },
      {
        key: 'educational-activities/master',
        title: '09.04.01 Магистратура',
        icon: Landmark,
        children: [
          {
            key: 'educational-activities/master/edu-plans',
            title: 'Учебные планы',
            path: '/educational-activities/master/edu-plans',
            icon: ClipboardList,
          },
          {
            key: 'educational-activities/master/graduate',
            title: 'Защита ВКР',
            path: '/educational-activities/master/graduate',
            icon: GraduationCap,
          },
          {
            key: 'educational-activities/master/practices',
            title: 'Практики',
            path: '/educational-activities/master/practices',
            icon: FileCode,
          },
        ],
      },
      {
        key: 'educational-activities/schedule',
        title: 'Расписания',
        icon: Calendar,
        children: [
          {
            key: 'educational-activities/schedule/summary',
            title: 'Сводное расписание преподавателей',
            path: '/educational-activities/schedule/schedule-summary',
            icon: List,
          },
          {
            key: 'educational-activities/schedule/exams',
            title: 'Расписание экзаменов',
            path: '/educational-activities/schedule/schedule-exams',
            icon: Clipboard,
          },
        ],
      },
    ],
  },

  // ─── Научная деятельность ─────────────────────────────────────────────────
  {
    key: 'scientific-activities',
    title: 'Научная деятельность',
    icon: Superscript,
    children: [
      {
        key: 'scientific-activities/postgraduate',
        title: 'Аспирантура',
        path: '/scientific-activities/postgraduate',
        icon: Microscope,
      },
      {
        key: 'scientific-activities/publications',
        title: 'Научные публикации',
        path: '/scientific-activities/publications/main-science-page',
        icon: Library,
      },
      {
        key: 'scientific-activities/achievements',
        title: 'Достижения кафедры',
        path: '/scientific-activities/achievements',
        icon: Award,
      },
      {
        key: 'scientific-activities/conferences',
        title: 'Объявления о конференциях',
        path: '/scientific-activities/conferences',
        icon: Mic,
      },
    ],
  },
];
