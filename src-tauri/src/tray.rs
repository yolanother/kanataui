use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};

const SETTINGS_WINDOW_LABEL: &str = "settings";

pub fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let start_item = MenuItem::with_id(app, "start_kanata", "Start Kanata", true, None::<&str>)?;
    let stop_item = MenuItem::with_id(app, "stop_kanata", "Stop Kanata", false, None::<&str>)?;
    let settings_item = MenuItem::with_id(app, "settings", "Settings", true, None::<&str>)?;
    let separator1 = PredefinedMenuItem::separator(app)?;
    let separator2 = PredefinedMenuItem::separator(app)?;
    let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(
        app,
        &[&start_item, &stop_item, &separator1, &settings_item, &separator2, &quit_item],
    )?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .show_menu_on_left_click(true)
        .tooltip("KanataUI")
        .on_menu_event(move |app, event| match event.id.as_ref() {
            "start_kanata" => {
                // TODO: invoke start with configured path
                eprintln!("Start kanata requested from tray");
            }
            "stop_kanata" => {
                eprintln!("Stop kanata requested from tray");
            }
            "settings" => {
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

fn open_settings_window(app: &AppHandle) {
    // If the settings window already exists, just show and focus it
    if let Some(window) = app.get_webview_window(SETTINGS_WINDOW_LABEL) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
        return;
    }

    // Create a new settings window
    let _window = tauri::WebviewWindowBuilder::new(
        app,
        SETTINGS_WINDOW_LABEL,
        tauri::WebviewUrl::App("index.html".into()),
    )
    .title("KanataUI Settings")
    .inner_size(900.0, 700.0)
    .center()
    .resizable(true)
    .decorations(true)
    .visible(true)
    .build();

    if let Err(e) = _window {
        eprintln!("Failed to create settings window: {}", e);
    }
}
