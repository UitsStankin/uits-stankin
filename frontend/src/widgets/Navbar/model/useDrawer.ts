import { useEffect, useState } from 'react';
import { useAppStore } from '@shared/store';

/**
 * Выдвижная панель мобильного меню.
 *
 * Само «открыта или нет» лежит в общем сторе, потому что кнопка-бургер
 * живёт в другом виджете — в шапке. Здесь только поведение вокруг этого
 * флага: закрытие при смене адреса и по Escape, блокировка прокрутки фона.
 */
export function useDrawer(pathname: string) {
  const isOpen = useAppStore((s) => s.isMobileNavOpen);
  const close = useAppStore((s) => s.closeMobileNav);

  // Закрываем при переходе — иначе панель осталась бы поверх страницы,
  // на которую пользователь только что ушёл. Приём «правка состояния во
  // время рендера» из документации React: дешевле эффекта, промежуточный
  // кадр не показывается.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (isOpen) close();
  }

  // Панель перекрывает контент, выход с клавиатуры обязателен.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  // Пока панель поверх страницы, фон не должен прокручиваться под ней.
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  return { isOpen, close };
}
