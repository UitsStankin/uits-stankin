import { useEffect } from 'react';

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
