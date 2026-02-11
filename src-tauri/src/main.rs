// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod tray;

use std::collections::VecDeque;
use std::path::PathBuf;
use std::process::Stdio;
use std::sync::Mutex;
use tauri_plugin_autostart::MacosLauncher;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Child;

pub struct KanataState {
    process: Mutex<Option<Child>>,
}

pub struct LogState {
    lines: std::sync::Arc<Mutex<VecDeque<String>>>,
}

const MAX_LOG_LINES: usize = 1000;

/// Core start logic, callable from both the command and the tray handler.
pub async fn do_start_kanata(
    config_path: &str,
    process: &Mutex<Option<Child>>,
    log_lines: &std::sync::Arc<Mutex<VecDeque<String>>>,
) -> Result<(), String> {
    let mut proc = process.lock().map_err(|e| e.to_string())?;

    if proc.is_some() {
        return Err("Kanata is already running".into());
    }

    let mut child = tokio::process::Command::new("kanata")
        .args(["-c", config_path])
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true)
        .spawn()
        .map_err(|e| format!("Failed to start kanata: {}", e))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let lines_arc = std::sync::Arc::clone(log_lines);

    if let Some(stdout) = stdout {
        let lines = std::sync::Arc::clone(&lines_arc);
        tokio::spawn(async move {
            let reader = BufReader::new(stdout);
            let mut line_reader = reader.lines();
            while let Ok(Some(line)) = line_reader.next_line().await {
                let entry = format!("{} [OUT] {}", format_timestamp(), line);
                if let Ok(mut buf) = lines.lock() {
                    buf.push_back(entry);
                    while buf.len() > MAX_LOG_LINES {
                        buf.pop_front();
                    }
                }
            }
        });
    }

    if let Some(stderr) = stderr {
        let lines = std::sync::Arc::clone(&lines_arc);
        tokio::spawn(async move {
            let reader = BufReader::new(stderr);
            let mut line_reader = reader.lines();
            while let Ok(Some(line)) = line_reader.next_line().await {
                let entry = format!("{} [ERR] {}", format_timestamp(), line);
                if let Ok(mut buf) = lines.lock() {
                    buf.push_back(entry);
                    while buf.len() > MAX_LOG_LINES {
                        buf.pop_front();
                    }
                }
            }
        });
    }

    *proc = Some(child);

    Ok(())
}

/// Core stop logic, callable from both the command and the tray handler.
pub async fn do_stop_kanata(
    process: &Mutex<Option<Child>>,
) -> Result<(), String> {
    let child = {
        let mut proc = process.lock().map_err(|e| e.to_string())?;
        proc.take()
    };

    if let Some(mut child) = child {
        child.kill().await.map_err(|e| format!("Failed to stop kanata: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
async fn start_kanata(
    config_path: String,
    state: tauri::State<'_, KanataState>,
    log_state: tauri::State<'_, LogState>,
) -> Result<(), String> {
    do_start_kanata(&config_path, &state.process, &log_state.lines).await
}

fn format_timestamp() -> String {
    use std::time::SystemTime;
    let now = SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .unwrap_or_default();
    let secs = now.as_secs();
    let hours = (secs / 3600) % 24;
    let minutes = (secs / 60) % 60;
    let seconds = secs % 60;
    format!("{:02}:{:02}:{:02}", hours, minutes, seconds)
}

#[tauri::command]
async fn stop_kanata(state: tauri::State<'_, KanataState>) -> Result<(), String> {
    do_stop_kanata(&state.process).await
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
fn get_kanata_logs(state: tauri::State<'_, LogState>) -> Vec<String> {
    let lines = state.lines.lock().unwrap();
    lines.iter().cloned().collect()
}

#[tauri::command]
fn clear_kanata_logs(state: tauri::State<'_, LogState>) {
    let mut lines = state.lines.lock().unwrap();
    lines.clear();
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

#[tauri::command]
async fn run_simulation(config_text: String, sim_input: String) -> Result<String, String> {
    let temp_dir = std::env::temp_dir();
    let config_path = temp_dir.join("kanataui_sim_config.kbd");
    let sim_path = temp_dir.join("kanataui_sim_input.txt");

    tokio::fs::write(&config_path, &config_text)
        .await
        .map_err(|e| format!("Failed to write temp config: {}", e))?;
    tokio::fs::write(&sim_path, &sim_input)
        .await
        .map_err(|e| format!("Failed to write temp sim input: {}", e))?;

    let binary = get_sim_binary_path().map_err(|e| format!("{}", e))?;

    let output = tokio::process::Command::new(&binary)
        .args([
            "-c",
            &config_path.to_string_lossy(),
            "-s",
            &sim_path.to_string_lossy(),
        ])
        .output()
        .await
        .map_err(|e| format!("Failed to run simulation: {}", e))?;

    // Clean up temp files (best-effort)
    let _ = tokio::fs::remove_file(&config_path).await;
    let _ = tokio::fs::remove_file(&sim_path).await;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        Err(format!(
            "Simulation failed:\n{}{}",
            stderr,
            if stdout.is_empty() {
                String::new()
            } else {
                format!("\n{}", stdout)
            }
        ))
    }
}

fn get_sim_binary_path() -> Result<String, String> {
    let binary_name = if cfg!(target_os = "windows") {
        "kanata_simulated_input.exe"
    } else {
        "kanata_simulated_input"
    };

    // Check if in PATH
    let cmd = if cfg!(target_os = "windows") {
        "where"
    } else {
        "which"
    };
    if let Ok(output) = std::process::Command::new(cmd).arg("kanata_simulated_input").output() {
        if output.status.success() {
            let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
            if !path.is_empty() {
                // On Windows, `where` may return multiple lines; use the first
                let first_line = path.lines().next().unwrap_or(&path);
                return Ok(first_line.to_string());
            }
        }
    }

    // Check bundled location
    if let Ok(exe_dir) = std::env::current_exe() {
        if let Some(dir) = exe_dir.parent() {
            let bundled = dir.join(binary_name);
            if bundled.exists() {
                return Ok(bundled.to_string_lossy().to_string());
            }
        }
    }

    Err("kanata_simulated_input binary not found in PATH or bundled location".into())
}

#[tauri::command]
async fn validate_config(config_text: String) -> Result<(), String> {
    let temp_dir = std::env::temp_dir();
    let config_path = temp_dir.join("kanataui_validate_config.kbd");

    tokio::fs::write(&config_path, &config_text)
        .await
        .map_err(|e| format!("Failed to write temp config: {}", e))?;

    let binary = get_kanata_binary_path().map_err(|e| format!("{}", e))?;

    let output = tokio::process::Command::new(&binary)
        .args(["--check", "-c", &config_path.to_string_lossy()])
        .output()
        .await
        .map_err(|e| format!("Failed to validate config: {}", e))?;

    let _ = tokio::fs::remove_file(&config_path).await;

    if output.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr);
        Err(stderr.to_string())
    }
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
        .manage(LogState {
            lines: std::sync::Arc::new(Mutex::new(VecDeque::new())),
        })
        .setup(|app| {
            tray::setup_tray(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            start_kanata,
            stop_kanata,
            get_kanata_status,
            get_kanata_logs,
            clear_kanata_logs,
            save_config,
            load_config,
            get_config_dir,
            ensure_config_dir,
            get_kanata_binary_path,
            run_simulation,
            validate_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running KanataUI");
}
