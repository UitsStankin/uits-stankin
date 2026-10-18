import type { Ref } from 'react';
import { Menu } from 'lucide-react';

interface MenuButtonProps {
  isOpen: boolean;
  onClick: () => void;
  buttonRef: Ref<HTMLButtonElement>;
}

export function MenuButton({ isOpen, onClick, buttonRef }: MenuButtonProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      className="u-icon-btn"
      aria-label="Открыть меню"
      aria-expanded={isOpen}
      aria-controls="site-menu"
      onClick={onClick}
    >
      <Menu size={22} aria-hidden />
    </button>
  );
}
