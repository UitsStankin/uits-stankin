import { useEffect } from 'react';
import { useBlocker } from 'react-router';

import { PUBLICATION_NEW_ROUTE } from '@shared/config/routes';
import { hasUnsavedChanges, useHasUnsavedChanges } from '@shared/lib';

/**
 * Сторож ухода с несохранённой правкой: переходы внутри портала
 * и закрытие или перезагрузка вкладки.
 *
 * **Внутри портала** — `useBlocker` роутера. Переход задерживается,
 * если хоть одна форма держит несохранённое (`useUnsavedChanges`)
 * и меняется путь. Для новой публикации смена параметров открывает
 * другую заготовку из Scholar, поэтому её тоже нужно подтвердить.
 *
 * **Вкладка** — `beforeunload`. Браузер показывает своё окно со своим
 * текстом; свой показать нельзя, и это правильно: иначе страница могла бы
 * удерживать посетителя чем угодно. Слушатель вешается только пока есть
 * несохранённое: просто висящий `beforeunload` выключает в части браузеров
 * кэш страницы для «назад» и «вперёд» на всём портале.
 */
export function useLeaveGuard() {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) => {
      const changesDraft = currentLocation.pathname === PUBLICATION_NEW_ROUTE &&
        currentLocation.search !== nextLocation.search;
      return hasUnsavedChanges() &&
        (currentLocation.pathname !== nextLocation.pathname || changesDraft);
    },
  );

  const isDirty = useHasUnsavedChanges();

  useEffect(() => {
    if (!isDirty) return;

    const warn = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges()) return;
      event.preventDefault();
      // Устаревший способ, но без него окно не покажут браузеры постарше.
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  return {
    isAsking: blocker.state === 'blocked',
    stay: () => blocker.reset?.(),
    leave: () => blocker.proceed?.(),
  };
}
