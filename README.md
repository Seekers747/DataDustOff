# DataDustOff 🧹

A smart desktop file cleanup tool that helps you find and remove files you haven't touched in months or years. Perfect for decluttering Downloads, Documents, or any messy folder.

## Features

- 🔍 **Smart Scanning** - Quickly scan folders to find untouched files (up to 10k files)
- ⏱️ **Age Tracking** - See exactly how long it's been since you last accessed each file
- 🗑️ **Windows Recycle Bin** - Safely move files to Windows Recycle Bin (recoverable)
- ❌ **Permanent Delete** - Remove files permanently when you're sure
- 📊 **Statistics** - View total files, sizes, and average file age
- 🔍 **Advanced Filters** - Search by name, filter by file type, size (1MB-1GB+), and age
- ✅ **Bulk Operations** - Select multiple files and trash/delete them all at once
- 🎨 **Clean UI** - Modern, easy-to-use dark-themed interface

## Installation

### For Users

**Download the latest release from [GitHub Releases](https://github.com/Seekers747/DataDustOff/releases)**

Choose this installer:
- **DataDustOff_x.x.x_x64_en-US.msi** (MSI installer)

Run the installer and follow the prompts. That's it!

### System Requirements
- Windows 10/11 x64
- ~10 MB disk space

## Tech Stack

- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
- **Backend:** Rust + Tauri 2
- **Platform:** Windows 10/11 x64

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Rust](https://www.rust-lang.org/tools/install)
- [Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/downloads/) (for Windows)

### Installation

```bash
# Clone the repository
git clone https://github.com/Seekers747/DataDustOff.git
cd DataDustOff

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

The built installers will be in `src-tauri/target/release/bundle/`

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## Usage

1. **Select a folder** to scan (Downloads, Documents, etc.)
2. **Click "Start Scan"** to analyze files
3. **Use filters** to narrow down results:
   - Search by filename
   - Filter by file type
   - Set minimum file size (great for finding large files!)
   - Filter by age (30 days, 6 months, 1 year, etc.)
4. **Select files** individually or use "Select All Visible"
5. **Choose action:**
   - 🗑️ **Trash** - Move to Windows Recycle Bin (can restore later)
   - ❌ **Delete** - Permanently remove files

## Project Status

**Version:** 0.1.0

Active development. New features and improvements coming soon!

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## License

Created by Seekers747
