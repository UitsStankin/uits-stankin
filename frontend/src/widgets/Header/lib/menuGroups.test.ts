import { describe, expect, it } from 'vitest';

import { NAVIGATION } from '@shared/config/navigation';
import type { NavItem } from '@shared/types';

import { buildMenuGroups } from './menuGroups';

const TREE: readonly NavItem[] = [
  { key: 'home', title: 'Главная', path: '/' },
  {
    key: 'about',
    title: 'О кафедре',
    children: [
      { key: 'about/news', title: 'Новости', path: '/about/news' },
      {
        key: 'about/staff',
        title: 'Сотрудники',
        children: [{ key: 'about/staff/teachers', title: 'ППС', path: '/about/staff/teachers' }],
      },
    ],
  },
];

describe('buildMenuGroups', () => {
  it('пропускает одиночные пункты верхнего уровня', () => {
    expect(buildMenuGroups(TREE).map((group) => group.key)).toEqual(['about']);
  });

  it('разворачивает вложенную группу в заголовок и её ссылки', () => {
    const [about] = buildMenuGroups(TREE);

    expect(about.entries).toEqual([
      { kind: 'link', key: 'about/news', title: 'Новости', path: '/about/news' },
      { kind: 'heading', key: 'about/staff', title: 'Сотрудники' },
      { kind: 'link', key: 'about/staff/teachers', title: 'ППС', path: '/about/staff/teachers' },
    ]);
  });

  it('не теряет ни одной ссылки меню портала', () => {
    const paths = (nodes: readonly NavItem[]): string[] =>
      nodes.flatMap((node) => [...(node.path && !node.children ? [node.path] : []), ...paths(node.children ?? [])]);

    const inMenu = buildMenuGroups(NAVIGATION).flatMap((group) =>
      group.entries.flatMap((entry) => (entry.kind === 'link' ? [entry.path] : [])),
    );
    const expected = paths(NAVIGATION).filter((path) => path !== '/');

    expect(inMenu).toEqual(expected);
  });
});
