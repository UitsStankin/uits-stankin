import { Building2, FlaskConical, GraduationCap, Landmark, type LucideIcon } from 'lucide-react';

import type { NavItem } from '@shared/types';

export type MenuEntry =
  | { kind: 'link'; key: string; title: string; path: string }
  | { kind: 'heading'; key: string; title: string };

export interface MenuGroup {
  key: string;
  title: string;
  icon: LucideIcon;
  entries: MenuEntry[];
}

/** Значки разделов меню; незнакомому разделу достаётся нейтральный. */
const GROUP_ICONS: Record<string, LucideIcon> = {
  about: Building2,
  'educational-activities': GraduationCap,
  'scientific-activities': FlaskConical,
};

function flatten(nodes: readonly NavItem[], into: MenuEntry[]): void {
  for (const node of nodes) {
    if (node.children !== undefined) {
      into.push({ kind: 'heading', key: node.key, title: node.title });
      flatten(node.children, into);
    } else if (node.path !== undefined) {
      into.push({ kind: 'link', key: node.key, title: node.title, path: node.path });
    }
  }
}

export function buildMenuGroups(items: readonly NavItem[]): MenuGroup[] {
  return items
    .filter((item) => item.children !== undefined)
    .map((item) => {
      const entries: MenuEntry[] = [];
      flatten(item.children ?? [], entries);
      return { key: item.key, title: item.title, icon: GROUP_ICONS[item.key] ?? Landmark, entries };
    });
}
