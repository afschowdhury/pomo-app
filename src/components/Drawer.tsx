import type { PropsWithChildren } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrawerProps extends PropsWithChildren {
  open: boolean;
  title: string;
  onClose: () => void;
}

export function Drawer({ open, title, onClose, children }: DrawerProps) {
  return (
    <div
      className={cn(
        'pointer-events-none fixed inset-0 z-50 transition',
        open ? 'opacity-100' : 'opacity-0',
      )}
      aria-hidden={!open}
    >
      <button
        className={cn(
          'absolute inset-0 bg-[#1d261f]/25 backdrop-blur-sm transition',
          open ? 'pointer-events-auto opacity-100' : 'opacity-0',
        )}
        onClick={onClose}
        aria-label="Close drawer"
      />
      <aside
        className={cn(
          'absolute right-0 top-0 h-full w-full max-w-xl transform border-l border-white/40 bg-[#f7f1e7]/95 p-6 shadow-editorial transition duration-300',
          open ? 'translate-x-0 pointer-events-auto' : 'translate-x-full',
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-dusk/70">Workspace panel</p>
            <h2 className="font-display text-3xl text-ink">{title}</h2>
          </div>
          <button
            className="rounded-full border border-ink/10 bg-white/60 p-2 text-ink transition hover:border-blush/40 hover:text-blush"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="h-[calc(100%-4rem)] overflow-y-auto pr-1">{children}</div>
      </aside>
    </div>
  );
}
