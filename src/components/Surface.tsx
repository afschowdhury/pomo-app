import type { PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';

interface SurfaceProps extends PropsWithChildren {
  className?: string;
}

export function Surface({ children, className }: SurfaceProps) {
  return (
    <section
      className={cn(
        'rounded-[28px] border border-white/50 bg-[#fbf6ee]/90 p-5 shadow-editorial backdrop-blur',
        className,
      )}
    >
      {children}
    </section>
  );
}
