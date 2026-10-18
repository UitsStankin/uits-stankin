import { useEffect } from 'react';

/**
 * Ставит фоновое движение (узор героя, луч у поиска) на паузу, пока окно
 * не в фокусе или вкладка скрыта. CSS-анимация идёт по часам, и без паузы
 * после возвращения узор перескакивает на угол, который набежал за время
 * отсутствия. С паузой он продолжает с того места, где остановился.
 *
 * Включается атрибутом `data-motion` на `<html>`: стили читают его сами.
 */
export function useAmbientMotion(): void {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      root.dataset.motion = document.hidden || !document.hasFocus() ? 'paused' : 'running';
    };

    window.addEventListener('blur', apply);
    window.addEventListener('focus', apply);
    document.addEventListener('visibilitychange', apply);
    apply();

    return () => {
      window.removeEventListener('blur', apply);
      window.removeEventListener('focus', apply);
      document.removeEventListener('visibilitychange', apply);
      delete root.dataset.motion;
    };
  }, []);
}
