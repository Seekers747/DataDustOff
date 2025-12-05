mod scanner;

use scanner::{scan_directory, ScanResult, delete_file, move_file, move_to_trash, sort_by_largest};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn get_app_version() -> String {
    "0.2.0".to_string()
}

#[tauri::command]
fn scan_folder(path: String) -> Result<ScanResult, String> {
    scan_directory(&path)
}

#[tauri::command]
fn delete_file_cmd(path: String) -> Result<(), String> {
    delete_file(&path)
}

#[tauri::command]
fn move_file_cmd(from: String, to: String) -> Result<(), String> {
    move_file(&from, &to)
}

#[tauri::command]
fn move_to_trash_cmd(path: String) -> Result<(), String> {
    move_to_trash(&path)
}

#[tauri::command]
fn sort_files_by_largest(mut scan_result: ScanResult) -> ScanResult {
    sort_by_largest(&mut scan_result.files);
    scan_result
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            get_app_version,
            scan_folder,
            delete_file_cmd,
            move_file_cmd,
            move_to_trash_cmd,
            sort_files_by_largest
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}