import { useEffect, useState } from 'react';

/**
 * Выдвижная панель: открыта или нет.
 *
 * Закрывается сама при смене адреса — иначе после перехода по ссылке панель
 * осталась бы поверх страницы, на которую пользователь только что ушёл.
 * Отдельно обрабатывается Escape: панель перекрывает контент, и выход
 * с клавиатуры обязателен.
 */
export function useDrawer(pathname: string) {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  // Приём «правка состояния во время рендера» из документации React —
  // дешевле эффекта, промежуточный кадр не показывается.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (isOpen) setIsOpen(false);
  }

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Пока панель поверх страницы, фон не должен прокручиваться под ней.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  return { isOpen, open, close };
}
