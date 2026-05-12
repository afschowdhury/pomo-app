use std::sync::{Arc, Mutex};
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager, State, UserAttentionType};

#[derive(Clone, Default)]
pub struct AlarmState(pub Arc<Mutex<Option<AlarmHandle>>>);

pub struct AlarmHandle {
  pub id: String,
  #[allow(dead_code)]
  pub cancel: tokio::sync::oneshot::Sender<()>,
}

pub async fn force_focus_window_impl(app: &AppHandle) -> Result<(), String> {
  let window = app
    .get_webview_window("main")
    .ok_or_else(|| "main window not found".to_string())?;

  let _ = window.unminimize();
  let _ = window.set_skip_taskbar(false);
  let _ = window.show();
  let _ = window.set_focus();
  let _ = window.set_always_on_top(true);
  let _ = window.request_user_attention(Some(UserAttentionType::Critical));

  tokio::time::sleep(Duration::from_millis(220)).await;

  let _ = window.set_fullscreen(true);
  let _ = window.set_focus();

  Ok(())
}

#[tauri::command]
pub async fn force_focus_window(app: AppHandle) -> Result<(), String> {
  force_focus_window_impl(&app).await
}

#[tauri::command]
pub fn schedule_session_alarm(
  app: AppHandle,
  state: State<'_, AlarmState>,
  duration_ms: u64,
  alarm_id: String,
) -> Result<(), String> {
  if let Ok(mut guard) = state.0.lock() {
    *guard = None;
  }

  let (cancel_tx, cancel_rx) = tokio::sync::oneshot::channel();
  {
    let mut guard = state
      .0
      .lock()
      .map_err(|e| format!("alarm state lock poisoned: {e}"))?;
    *guard = Some(AlarmHandle {
      id: alarm_id.clone(),
      cancel: cancel_tx,
    });
  }

  let app_handle = app.clone();
  let scheduled_id = alarm_id;

  tauri::async_runtime::spawn(async move {
    tokio::select! {
      _ = tokio::time::sleep(Duration::from_millis(duration_ms)) => {
        if let Err(e) = force_focus_window_impl(&app_handle).await {
          log::warn!("[session-alarm] force_focus_window_impl: {e:?}");
        }
        let _ = app_handle.emit("session-alarm-fired", serde_json::Value::Null);
        if let Some(alarm_state) = app_handle.try_state::<AlarmState>() {
          if let Ok(mut g) = alarm_state.0.lock() {
            if g.as_ref().is_some_and(|h| h.id == scheduled_id) {
              *g = None;
            }
          }
        }
      }
      _ = cancel_rx => {
        if let Some(alarm_state) = app_handle.try_state::<AlarmState>() {
          if let Ok(mut g) = alarm_state.0.lock() {
            if g.as_ref().is_some_and(|h| h.id == scheduled_id) {
              *g = None;
            }
          }
        }
      }
    }
  });

  Ok(())
}

#[tauri::command]
pub fn cancel_session_alarm(state: State<'_, AlarmState>) {
  if let Ok(mut guard) = state.0.lock() {
    *guard = None;
  }
}
