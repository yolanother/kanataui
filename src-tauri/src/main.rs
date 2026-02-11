// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod tray;

use std::path::PathBuf;
use std::sync::Mutex;
use tauri_plugin_autostart::MacosLauncher;
use tokio::process::Child;

pub struct KanataState {
    process: Mutex<Option<Child>>,
}

#[tauri::command]
async fn start_kanata(
    config_path: String,
    state: tauri::State<'_, KanataState>,
) -> Result<(), String> {
    let mut proc = state.process.lock().map_err(|e| e.to_string())?;

    if proc.is_some() {
        return Err("Kanata is already running".into());
    }

    let child = tokio::process::Command::new("kanata")
        .args(["-c", &config_path])
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Failed to start kanata: {}", e))?;

    *proc = Some(child);

    Ok(())
}

#[tauri::command]
async fn stop_kanata(state: tauri::State<'_, KanataState>) -> Result<(), String> {
    let child = {
        let mut proc = state.process.lock().map_err(|e| e.to_string())?;
        proc.take()
    };

    if let Some(mut child) = child {
        child.kill().await.map_err(|e| format!("Failed to stop kanata: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
async fn get_kanata_status(state: tauri::State<'_, KanataState>) -> Result<String, String> {
    let mut proc = state.process.lock().map_err(|e| e.to_string())?;

    if let Some(ref mut child) = *proc {
        match child.try_wait() {
            Ok(Some(_)) => {
                // Process has exited
                *proc = None;
                Ok("stopped".into())
            }
            Ok(None) => Ok("running".into()),
            Err(e) => Err(format!("Failed to check status: {}", e)),
        }
    } else {
        Ok("stopped".into())
    }
}

#[tauri::command]
async fn save_config(path: String, content: String) -> Result<(), String> {
    tokio::fs::write(&path, &content)
        .await
        .map_err(|e| format!("Failed to save config: {}", e))
}

#[tauri::command]
async fn load_config(path: String) -> Result<String, String> {
    tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| format!("Failed to load config: {}", e))
}

fn get_config_dir_path() -> Result<PathBuf, String> {
    let base = dirs::config_dir().ok_or("Could not determine config directory")?;
    Ok(base.join("kanataui"))
}

#[tauri::command]
fn get_config_dir() -> Result<String, String> {
    get_config_dir_path()
        .map(|p| p.to_string_lossy().to_string())
}

#[tauri::command]
fn ensure_config_dir() -> Result<String, String> {
    let dir = get_config_dir_path()?;
    std::fs::create_dir_all(&dir)
        .map_err(|e| format!("Failed to create config directory: {}", e))?;
    Ok(dir.to_string_lossy().to_string())
}

#[tauri::command]
fn get_kanata_binary_path() -> Result<String, String> {
    // Check if kanata is in PATH
    let cmd = if cfg!(target_os = "windows") {
        "where"
    } else {
        "which"
    };
    if let Ok(output) = std::process::Command::new(cmd).arg("kanata").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                return Ok(path);
            }
        }
    }

    // Check common bundled locations
    if let Ok(exe_dir) = std::env::current_exe() {
        if let Some(dir) = exe_dir.parent() {
            let bundled = dir.join(if cfg!(target_os = "windows") {
                "kanata.exe"
            } else {
                "kanata"
            });
            if bundled.exists() {
                return Ok(bundled.to_string_lossy().to_string());
            }
        }
    }

    Err("kanata binary not found in PATH or bundled location".into())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(KanataState {
            process: Mutex::new(None),
        })
        .setup(|app| {
            tray::setup_tray(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_kanata,
            stop_kanata,
            get_kanata_status,
            save_config,
            load_config,
            get_config_dir,
            ensure_config_dir,
            get_kanata_binary_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running KanataUI");
}
