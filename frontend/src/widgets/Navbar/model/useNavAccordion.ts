import { useCallback, useMemo, useState } from 'react';
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
  // Пересчитывается только при смене пути — обход дерева на каждый рендер
  // не нужен.
  const routeOpenKeys = useMemo(
    () => collectOpenKeys(items, pathname),
    [items, pathname]
  );

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

  const isOpen = useCallback((key: string) => openKeys.has(key), [openKeys]);

  // Пустой массив зависимостей: идентичность колбэка не меняется никогда,
  // иначе мемоизация у элементов поддерева обесценилась бы.
  const toggle = useCallback((key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  return { isOpen, toggle };
}
