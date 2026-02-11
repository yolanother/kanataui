use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager,
};

const SETTINGS_WINDOW_LABEL: &str = "settings";

pub fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let start_item = MenuItem::with_id(app, "start_kanata", "Start Kanata", true, None::<&str>)?;
    let stop_item = MenuItem::with_id(app, "stop_kanata", "Stop Kanata", false, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let logs_item = MenuItem::with_id(app, "show_logs", "Show Logs", true, None::<&str>)?;
    let separator1 = PredefinedMenuItem::separator(app)?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[&start_item, &stop_item, &separator1, &settings_item, &logs_item, &separator2, &quit_item],
    )?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(true)
        .tooltip("KanataUI")
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "start_kanata" => {
                let app = app.clone();
                tauri::async_runtime::spawn(async move {
                    let binary = match crate::get_kanata_binary_path() {
                        Ok(b) => b,
                        Err(e) => {
                            let _ = app.emit("kanata-error", format!("Binary not found: {}", e));
                            return;
                        }
                    };
                    let config_dir = match crate::get_config_dir_path() {
                        Ok(dir) => dir,
                        Err(e) => {
                            let _ = app.emit("kanata-error", format!("Config dir error: {}", e));
                            return;
                        }
                    };
                    let config_path = config_dir.join("kanata.kbd");
                    if !config_path.exists() {
                        let _ = app.emit("kanata-error", format!("No config file found at {:?}", config_path));
                        return;
                    }
                    let config_str = config_path.to_string_lossy().to_string();
                    let kanata_state = app.state::<crate::KanataState>();
                    let log_state = app.state::<crate::LogState>();
                    match crate::do_start_kanata(&binary, &config_str, &kanata_state.process, &log_state.lines).await {
                        Ok(()) => {
                            let _ = app.emit("kanata-started", ());
                        }
                        Err(e) => {
                            let _ = app.emit("kanata-error", e);
                        }
                    }
                });
            }
            "stop_kanata" => {
                let app = app.clone();
                tauri::async_runtime::spawn(async move {
                    let state = app.state::<crate::KanataState>();
                    match crate::do_stop_kanata(&state.process).await {
                        Ok(()) => {
                            let _ = app.emit("kanata-stopped", ());
                        }
                        Err(e) => {
                            let _ = app.emit("kanata-error", e);
                        }
                    }
                });
            }
            "settings" => {
                open_settings_window(app);
            }
            "show_logs" => {
                open_settings_window(app);
            }
            "quit" => {
                app.exit(0);
            }
            _ => {}
        })
        .build(app)?;

    Ok(())
}

fn compute_window_size(app: &AppHandle) -> (f64, f64) {
    if let Some(monitor) = app.primary_monitor().ok().flatten() {
        let size = monitor.size();
        let scale = monitor.scale_factor();
        let screen_w = size.width as f64 / scale;
        let screen_h = size.height as f64 / scale;
        let w = (screen_w * 0.80).min(1200.0);
        let h = (screen_h * 0.85).min(900.0);
        (w, h)
    } else {
        (1100.0, 800.0)
    }
}

fn open_settings_window(app: &AppHandle) {
    // If the settings window already exists, just show and focus it
    if let Some(window) = app.get_webview_window(SETTINGS_WINDOW_LABEL) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }

    let (width, height) = compute_window_size(app);

    // Create a new settings window
    match tauri::WebviewWindowBuilder::new(
        app,
        SETTINGS_WINDOW_LABEL,
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title("KanataUI Settings")
    .inner_size(width, height)
    .center()
    .resizable(true)
    .decorations(true)
    .visible(true)
    .build()
    {
        Ok(window) => {
            // Intercept close: hide the window instead of destroying it
            let win = window.clone();
            window.on_window_event(move |event| {
                if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                    api.prevent_close();
                    let _ = win.hide();
                }
            });
        }
        Err(e) => {
            eprintln!("Failed to create settings window: {}", e);
        }
    }
}
