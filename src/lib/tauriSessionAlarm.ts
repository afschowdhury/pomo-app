import { isTauriRuntime } from '@/lib/audio';
import { generateId } from '@/lib/utils';

export async function cancelSessionAlarmRust(): Promise<void> {
  if (!isTauriRuntime() || typeof window === 'undefined') {
    return;
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('cancel_session_alarm');
  } catch (error) {
    console.warn('[tauri-session-alarm] cancel_session_alarm failed', error);
  }
}

export async function scheduleSessionAlarmRust(durationMs: number, alarmId?: string): Promise<void> {
  if (!isTauriRuntime() || typeof window === 'undefined') {
    return;
  }

  const id = alarmId ?? generateId('alarm');
  const ms = Math.max(0, Math.min(Number(durationMs), Number.MAX_SAFE_INTEGER));

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('schedule_session_alarm', { durationMs: ms, alarmId: id });
  } catch (error) {
    console.warn('[tauri-session-alarm] schedule_session_alarm failed', error);
  }
}

export async function forceFocusWindowRust(): Promise<void> {
  if (!isTauriRuntime() || typeof window === 'undefined') {
    return;
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('force_focus_window');
  } catch (error) {
    console.warn('[tauri-session-alarm] force_focus_window failed', error);
  }
}
