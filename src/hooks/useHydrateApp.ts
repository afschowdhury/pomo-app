import { useEffect } from 'react';
import { getNotificationPermissionForRuntime, isTauriRuntime } from '@/lib/audio';
import { useAppStore } from '@/store/useAppStore';

export function useHydrateApp() {
  const hydrate = useAppStore((state) => state.hydrate);
  const hydrated = useAppStore((state) => state.hydrated);
  const setNotificationPermission = useAppStore((state) => state.setNotificationPermission);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated || !isTauriRuntime()) {
      return;
    }

    void (async () => {
      const permission = await getNotificationPermissionForRuntime();
      await setNotificationPermission(permission);
    })();
  }, [hydrated, setNotificationPermission]);
}
