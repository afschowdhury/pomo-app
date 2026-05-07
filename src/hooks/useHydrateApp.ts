import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';

export function useHydrateApp() {
  const hydrate = useAppStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);
}
