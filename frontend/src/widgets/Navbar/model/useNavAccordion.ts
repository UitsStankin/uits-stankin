import { useState } from 'react';
import type { NavItem } from '@shared/types';
import { collectOpenKeys } from '../lib/navTree';

/**
 * Какие группы раскрыты в мобильном аккордеоне.
 *
 * Множество, а не цепочка как у десктопных выпадающих: в аккордеоне
 * пользователь может держать открытыми сразу несколько разделов и
 * сравнивать их, ничто не мешает.
 */
export function useNavAccordion(items: readonly NavItem[], pathname: string) {
  const routeOpenKeys = collectOpenKeys(items, pathname);

  const [openKeys, setOpenKeys] = useState<ReadonlySet<string>>(routeOpenKeys);

  // Раскрытие — состояние пользователя, но при переходе нужно дораскрыть
  // цепочку до активного пункта. Приём «правка состояния во время рендера»
  // из документации React: дешевле эффекта, React перезапускает рендер
  // сразу, не показывая промежуточный кадр.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpenKeys((prev) => new Set([...prev, ...routeOpenKeys]));
  }

  const isOpen = (key: string) => openKeys.has(key);

  const toggle = (key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return { isOpen, toggle };
}
