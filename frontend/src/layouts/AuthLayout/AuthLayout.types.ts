export interface AuthLayoutProps {
  className?: string;
  variant?: 'centered' | 'split';
}

// Внутренние компоненты не должны требовать variant, им нужен только className
export interface AuthLayoutInnerProps {
  className?: string;
}