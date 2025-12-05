use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;
use std::time::SystemTime;

#[derive(Debug, Serialize, Deserialize)]
pub struct FileInfo {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub modified: u64,      // Unix timestamp
    pub accessed: u64,      // Unix timestamp
    pub is_directory: bool,
    pub extension: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScanResult {
    pub total_files: usize,
    pub total_size: u64,
    pub files: Vec<FileInfo>,
    pub scan_path: String,
    pub limited: bool,  // Whether scan was stopped due to file limit
    pub max_files: usize,  // The limit that was applied
}

impl FileInfo {
    pub fn from_path(path: &Path) -> Result<Self, String> {
        let metadata = fs::metadata(path)
            .map_err(|e| format!("Failed to read metadata: {}", e))?;

        let modified = metadata.modified()
            .map_err(|e| format!("Failed to read modified time: {}", e))?
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let accessed = metadata.accessed()
            .map_err(|e| format!("Failed to read accessed time: {}", e))?
            .duration_since(SystemTime::UNIX_EPOCH)
            .unwrap()
            .as_secs();

        let name = path.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("Unknown")
            .to_string();

        let extension = path.extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_string();

        Ok(FileInfo {
            path: path.to_string_lossy().to_string(),
            name,
            size: metadata.len(),
            modified,
            accessed,
            is_directory: metadata.is_dir(),
            extension,
        })
    }
}

pub fn scan_directory(path: &str) -> Result<ScanResult, String> {
    let scan_path = Path::new(path);
    
    if !scan_path.exists() {
        return Err(format!("Path does not exist: {}", path));
    }

    if !scan_path.is_dir() {
        return Err(format!("Path is not a directory: {}", path));
    }

    let mut files = Vec::new();
    let mut total_size: u64 = 0;
    let max_files: usize = 50000;  // Limit to 50k files to prevent lag
    let mut limited = false;

    // Recursively walk the directory with file limit
    walk_directory(scan_path, &mut files, &mut total_size, max_files, &mut limited)?;

    Ok(ScanResult {
        total_files: files.len(),
        total_size,
        files,
        scan_path: path.to_string(),
        limited,
        max_files,
    })
}

fn walk_directory(
    dir: &Path, 
    files: &mut Vec<FileInfo>, 
    total_size: &mut u64,
    max_files: usize,
    limited: &mut bool
) -> Result<(), String> {
    // Stop if we've hit the file limit
    if files.len() >= max_files {
        *limited = true;
        return Ok(());
    }

    let entries = fs::read_dir(dir)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in entries {
        // Check limit on each iteration
        if files.len() >= max_files {
            *limited = true;
            return Ok(());
        }

        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue, // Skip files we can't access
        };

        let path = entry.path();

        // Try to get file info
        match FileInfo::from_path(&path) {
            Ok(file_info) => {
                if !file_info.is_directory {
                    *total_size += file_info.size;
                    files.push(file_info);
                } else {
                    // Recursively scan subdirectories
                    let _ = walk_directory(&path, files, total_size, max_files, limited);
                }
            }
            Err(_) => continue, // Skip files we can't read
        }
    }

    Ok(())
}

// ... (keep all your existing code above)

// New file operation functions
pub fn delete_file(path: &str) -> Result<(), String> {
    let file_path = Path::new(path);
    
    if !file_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }

    if file_path.is_dir() {
        return Err("Cannot delete directories yet".to_string());
    }

    fs::remove_file(file_path)
        .map_err(|e| format!("Failed to delete file: {}", e))?;

    Ok(())
}

pub fn move_file(from: &str, to: &str) -> Result<(), String> {
    let from_path = Path::new(from);
    let to_path = Path::new(to);

    if !from_path.exists() {
        return Err(format!("Source file does not exist: {}", from));
    }

    if from_path.is_dir() {
        return Err("Cannot move directories yet".to_string());
    }

    // Create destination directory if it doesn't exist
    if let Some(parent) = to_path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create destination directory: {}", e))?;
    }

    fs::rename(from_path, to_path)
        .map_err(|e| format!("Failed to move file: {}", e))?;

    Ok(())
}

// Move file to Recycle Bin (Windows)
pub fn move_to_trash(path: &str) -> Result<(), String> {
    let file_path = Path::new(path);
    
    if !file_path.exists() {
        return Err(format!("File does not exist: {}", path));
    }

    // Use the trash crate to move file to Windows Recycle Bin
    trash::delete(file_path)
        .map_err(|e| format!("Failed to move to recycle bin: {}", e))?;

    Ok(())
}

pub fn sort_by_largest(files: &mut Vec<FileInfo>) {
    files.sort_by(|a, b| b.size.cmp(&a.size));
}