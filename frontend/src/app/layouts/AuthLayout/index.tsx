import { Outlet } from 'react-router-dom';
import { cn } from '@/shared/lib/cn';
import type { AuthLayoutProps, AuthLayoutInnerProps } from './AuthLayout.types';

export default function AuthLayout({ 
  className, 
  variant = 'centered' 
}: AuthLayoutProps) {
  if (variant === 'split') {
    return <AuthLayoutSplit className={className} />;
  }
  
  return <AuthLayoutCentered className={className} />;
}

function AuthLayoutCentered({ className }: AuthLayoutInnerProps) {
  return (
    <div className={cn(
      'min-h-screen w-full',
      'flex items-center justify-center',
      'bg-gradient-to-br from-blue via-indigo to-primary',
      'p-gutter-sm',
      className
    )}>
      <div className={cn(
        'w-full max-w-md',
        'bg-white rounded-lg shadow',
        'p-6 md:p-8',
        'animate-fade-in-up'
      )}>
        <Outlet />
      </div>
    </div>
  );
}

function AuthLayoutSplit({ className }: AuthLayoutInnerProps) {
  return (
    <div className={cn(
      'min-h-screen w-full',
      'flex flex-col md:flex-row',
      'bg-white',
      className
    )}>
      {/* Левая часть: брендинг/иллюстрация */}
      <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-blue to-indigo items-center justify-center p-8">
        <div className="text-white text-center">
          <h1 className="text-3xl font-bold mb-4">Welcome</h1>
          <p className="text-white/80">Your platform for success</p>
        </div>
      </div>
      
      {/* Правая часть: форма */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-8">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}