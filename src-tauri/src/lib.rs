mod scanner;

use scanner::{scan_directory, ScanResult};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_app_version() -> String {
    "0.1.0".to_string()
}

#[tauri::command]
fn scan_folder(path: String) -> Result<ScanResult, String> {
    scan_directory(&path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            get_app_version,
            scan_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}