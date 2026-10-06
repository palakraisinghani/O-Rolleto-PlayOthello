// Hide the console window on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

//! Tauri shell. All game logic lives in `othello-api`; this file only forwards commands
//! and turns engine events into Tauri events (`"game-event"`).

use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use othello_api::{ApiError, Event, Mode, Session, Settings, Snapshot};
use tauri::{Emitter, Manager, State};

/// Name of the Tauri event carrying `othello_api::Event` payloads to the UI.
const EVENT_NAME: &str = "game-event";

struct App {
    session: Session,
    settings: Mutex<Settings>,
    settings_path: PathBuf,
}

#[tauri::command]
fn new_game(app: State<App>, mode: Mode) -> Result<Snapshot, ApiError> {
    app.session.new_game(mode)
}

#[tauri::command]
fn play(app: State<App>, square: u8) -> Result<Snapshot, ApiError> {
    app.session.play(square)
}

#[tauri::command]
fn undo(app: State<App>) -> Result<Snapshot, ApiError> {
    app.session.undo()
}

#[tauri::command]
fn resign(app: State<App>) -> Result<Snapshot, ApiError> {
    app.session.resign()
}

#[tauri::command]
fn snapshot(app: State<App>) -> Result<Snapshot, ApiError> {
    app.session.snapshot()
}

/// Hints can take a while with a strong engine, so run off the UI thread.
#[tauri::command]
async fn hint(app: State<'_, App>) -> Result<u8, ApiError> {
    let session = app.session.clone();
    tauri::async_runtime::spawn_blocking(move || session.hint())
        .await
        .unwrap_or(Err(ApiError::HintUnavailable))
}

#[tauri::command]
fn get_settings(app: State<App>) -> Settings {
    app.settings.lock().unwrap_or_else(|e| e.into_inner()).clone()
}

#[tauri::command]
fn set_settings(app: State<App>, settings: Settings) -> Result<(), String> {
    settings.save(&app.settings_path).map_err(|e| e.to_string())?;
    *app.settings.lock().unwrap_or_else(|e| e.into_inner()) = settings;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .setup(|tauri_app| {
            let handle = tauri_app.handle().clone();
            let sink = Arc::new(move |event: Event| {
                let _ = handle.emit(EVENT_NAME, event);
            });
            let settings_path = tauri_app.path().app_config_dir()?.join("settings.json");
            tauri_app.manage(App {
                session: Session::new(sink),
                settings: Mutex::new(Settings::load(&settings_path)),
                settings_path,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            new_game, play, undo, resign, snapshot, hint, get_settings, set_settings
        ])
        .run(tauri::generate_context!())
        .expect("error while running the Othello Player");
}
