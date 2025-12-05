import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import Layout from './components/Layout';
import ConfirmDialog from './components/ConfirmDialog';

interface FileInfo {
  path: string;
  name: string;
  size: number;
  modified: number;
  accessed: number;
  is_directory: boolean;
  extension: string;
}

interface ScanResult {
  total_files: number;
  total_size: number;
  files: FileInfo[];
  scan_path: string;
  limited: boolean;
  max_files: number;
}

function App() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  // Filter and search state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedExtension, setSelectedExtension] = useState<string>('all');
  const [minAge, setMinAge] = useState<number>(0);
  const [minSize, setMinSize] = useState<number>(0);
  const [sortBy, setSortBy] = useState<string>('modified_desc');
  
  // Bulk selection state
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning'
  });

  const selectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select a folder to scan',
      });

      if (selected && typeof selected === 'string') {
        setSelectedPath(selected);
      }
    } catch (err) {
      setError(`Failed to open folder picker: ${err}`);
    }
  };

  const startScan = async () => {
    if (!selectedPath) {
      setError('Please select a folder first');
      return;
    }

    setScanning(true);
    setError('');
    setSuccessMessage('');
    setScanResult(null);
    
    try {
      const result = await invoke<ScanResult>('scan_folder', { 
        path: selectedPath 
      });
      setScanResult(result);
      
      if (result.limited) {
        setSuccessMessage(`⚠️ Scanned ${result.total_files} files (limit reached for performance). Choose a smaller folder or use filters.`);
      } else {
        setSuccessMessage(`✅ Found ${result.total_files} files!`);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setScanning(false);
    }
  };

  const handleDeleteFile = (file: FileInfo) => {
    setConfirmDialog({
      isOpen: true,
      title: '⚠️ Permanent Delete',
      message: `Are you sure you want to permanently delete "${file.name}"? This cannot be undone!`,
      onConfirm: async () => {
        try {
          await invoke('delete_file_cmd', { path: file.path });
          
          // Remove from results
          if (scanResult) {
            setScanResult({
              ...scanResult,
              files: scanResult.files.filter(f => f.path !== file.path),
              total_files: scanResult.total_files - 1,
              total_size: scanResult.total_size - file.size
            });
          }
          
          setSuccessMessage(`✅ Deleted: ${file.name}`);
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (err) {
          setError(`Failed to delete file: ${err}`);
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }
      },
      type: 'danger'
    });
  };

  const handleMoveToTrash = (file: FileInfo) => {
    setConfirmDialog({
      isOpen: true,
      title: '🗑️ Move to Recycle Bin',
      message: `Move "${file.name}" to Recycle Bin?`,
      onConfirm: async () => {
        try {
          await invoke('move_to_trash_cmd', { path: file.path });
          
          // Remove from results
          if (scanResult) {
            setScanResult({
              ...scanResult,
              files: scanResult.files.filter(f => f.path !== file.path),
              total_files: scanResult.total_files - 1,
              total_size: scanResult.total_size - file.size
            });
          }
          
          setSuccessMessage(`✅ Moved to trash: ${file.name}`);
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        } catch (err) {
          setError(`Failed to move to trash: ${err}`);
          setConfirmDialog({ ...confirmDialog, isOpen: false });
        }
      },
      type: 'warning'
    });
  };

  // Bulk delete files
  const handleBulkDelete = () => {
    const count = selectedFiles.size;
    setConfirmDialog({
      isOpen: true,
      title: '⚠️ Bulk Permanent Delete',
      message: `Are you sure you want to permanently delete ${count} file(s)? This cannot be undone!`,
      onConfirm: async () => {
        const filesToDelete = Array.from(selectedFiles);
        let successCount = 0;
        let errorCount = 0;
        
        for (const filePath of filesToDelete) {
          try {
            await invoke('delete_file_cmd', { path: filePath });
            successCount++;
          } catch (err) {
            errorCount++;
            console.error(`Failed to delete ${filePath}:`, err);
          }
        }
        
        // Update results
        if (scanResult) {
          const remainingFiles = scanResult.files.filter(f => !selectedFiles.has(f.path));
          const deletedSize = scanResult.files
            .filter(f => selectedFiles.has(f.path))
            .reduce((sum, f) => sum + f.size, 0);
          
          setScanResult({
            ...scanResult,
            files: remainingFiles,
            total_files: remainingFiles.length,
            total_size: scanResult.total_size - deletedSize
          });
        }
        
        setSelectedFiles(new Set());
        setSuccessMessage(`✅ Deleted ${successCount} file(s)${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
      type: 'danger'
    });
  };

  // Bulk move to trash
  const handleBulkTrash = () => {
    const count = selectedFiles.size;
    setConfirmDialog({
      isOpen: true,
      title: '🗑️ Bulk Move to Recycle Bin',
      message: `Move ${count} file(s) to Recycle Bin?`,
      onConfirm: async () => {
        const filesToTrash = Array.from(selectedFiles);
        let successCount = 0;
        let errorCount = 0;
        
        for (const filePath of filesToTrash) {
          try {
            await invoke('move_to_trash_cmd', { path: filePath });
            successCount++;
          } catch (err) {
            errorCount++;
            console.error(`Failed to trash ${filePath}:`, err);
          }
        }
        
        // Update results
        if (scanResult) {
          const remainingFiles = scanResult.files.filter(f => !selectedFiles.has(f.path));
          const trashedSize = scanResult.files
            .filter(f => selectedFiles.has(f.path))
            .reduce((sum, f) => sum + f.size, 0);
          
          setScanResult({
            ...scanResult,
            files: remainingFiles,
            total_files: remainingFiles.length,
            total_size: scanResult.total_size - trashedSize
          });
        }
        
        setSelectedFiles(new Set());
        setSuccessMessage(`✅ Moved ${successCount} file(s) to trash${errorCount > 0 ? `, ${errorCount} failed` : ''}`);
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
      type: 'warning'
    });
  };

  // Toggle file selection
  const toggleFileSelection = (filePath: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(filePath)) {
      newSelected.delete(filePath);
    } else {
      newSelected.add(filePath);
    }
    setSelectedFiles(newSelected);
  };

  // Select all visible files
  const selectAllVisible = () => {
    const visiblePaths = filteredFiles.slice(0, 50).map(f => f.path);
    setSelectedFiles(new Set(visiblePaths));
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedFiles(new Set());
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const getDaysSinceAccess = (timestamp: number) => {
    return Math.floor((Date.now() / 1000 - timestamp) / 86400);
  };

  // Get unique extensions from scan results
  const getUniqueExtensions = () => {
    if (!scanResult) return [];
    const extensions = new Set(scanResult.files.map(f => f.extension.toLowerCase()));
    return Array.from(extensions).filter(ext => ext !== '').sort();
  };

  // Filter and sort files
  const getFilteredFiles = () => {
    if (!scanResult) return [];
    
    let filtered = scanResult.files.filter(file => {
      // Search term filter (case insensitive)
      const matchesSearch = searchTerm === '' || 
        file.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Extension filter
      const matchesExtension = selectedExtension === 'all' || 
        file.extension.toLowerCase() === selectedExtension.toLowerCase();
      
      // Age filter (in days)
      const fileAge = getDaysSinceAccess(file.accessed);
      const matchesAge = fileAge >= minAge;
      
      // Size filter (in bytes)
      const matchesSize = file.size >= minSize;
      
      return matchesSearch && matchesExtension && matchesAge && matchesSize;
    });

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'size_desc': // Largest to smallest
          return b.size - a.size;
        case 'size_asc': // Smallest to largest
          return a.size - b.size;
        case 'modified_desc': // Latest to earliest (default)
          return b.modified - a.modified;
        case 'modified_asc': // Earliest to latest
          return a.modified - b.modified;
        case 'accessed_desc': // Recently accessed first
          return b.accessed - a.accessed;
        case 'accessed_asc': // Least recently accessed first
          return a.accessed - b.accessed;
        case 'name_asc': // A to Z
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        case 'name_desc': // Z to A
          return b.name.toLowerCase().localeCompare(a.name.toLowerCase());
        default:
          return b.accessed - a.accessed;
      }
    });
  };

  const filteredFiles = getFilteredFiles();

  return (
    <Layout>
      <div className="p-8">
        <h2 className="text-3xl font-bold mb-2">Scan for Untouched Files</h2>
        <p className="text-gray-400 mb-6">
          Select a folder and find files you haven't touched in months
        </p>

        {/* Folder Selection */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={selectFolder}
            className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition font-medium"
          >
            📁 Select Folder
          </button>
          
          <button
            onClick={startScan}
            disabled={!selectedPath || scanning}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition font-medium"
          >
            {scanning ? '🔍 Scanning...' : '🚀 Start Scan'}
          </button>
        </div>

        {selectedPath && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg">
            <p className="text-sm text-gray-400">Selected folder:</p>
            <p className="font-mono text-sm">{selectedPath}</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-900/50 border border-green-700 rounded-lg">
            <p className="text-green-200">{successMessage}</p>
          </div>
        )}

        {scanResult && (
          <div className="space-y-4">
            {/* Warning if scan was limited */}
            {scanResult.limited && (
              <div className="p-4 bg-yellow-900/50 border border-yellow-700 rounded-lg">
                <p className="text-yellow-200 font-bold">⚠️ Large Folder Detected!</p>
                <p className="text-yellow-200 text-sm mt-1">
                  Scan stopped at {scanResult.max_files.toLocaleString()} files to prevent lag. 
                  There may be more files not shown. Try scanning a smaller subfolder for better results.
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-800 rounded-lg">
                <p className="text-gray-400 text-sm">Total Files{scanResult.limited && ' (Limited)'}</p>
                <p className="text-2xl font-bold">{scanResult.total_files.toLocaleString()}{scanResult.limited && '+'}</p>
              </div>
              <div className="p-4 bg-gray-800 rounded-lg">
                <p className="text-gray-400 text-sm">Total Size</p>
                <p className="text-2xl font-bold">{formatBytes(scanResult.total_size)}</p>
              </div>
              <div className="p-4 bg-gray-800 rounded-lg">
                <p className="text-gray-400 text-sm">Average File Age</p>
                <p className="text-2xl font-bold">
                  {scanResult.files.length > 0 
                    ? Math.round(
                        scanResult.files.reduce((sum, f) => sum + getDaysSinceAccess(f.accessed), 0) / 
                        scanResult.files.length
                      )
                    : 0} days
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-bold mb-4">🔍 Filters & Search</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Search by name</label>
                  <input
                    type="text"
                    placeholder="Type to search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition"
                  />
                </div>

                {/* Extension Filter */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">File type</label>
                  <select
                    value={selectedExtension}
                    onChange={(e) => setSelectedExtension(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="all">All types</option>
                    {getUniqueExtensions().map(ext => (
                      <option key={ext} value={ext}>
                        .{ext}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Size Filter */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">💪 Min file size</label>
                  <select
                    value={minSize}
                    onChange={(e) => setMinSize(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-900 border border-blue-700 rounded-lg focus:outline-none focus:border-blue-400 transition font-bold"
                  >
                    <option value="0">Any size</option>
                    <option value="1048576">1 MB+</option>
                    <option value="10485760">10 MB+</option>
                    <option value="52428800">50 MB+</option>
                    <option value="104857600">100 MB+</option>
                    <option value="524288000">500 MB+</option>
                    <option value="1073741824">1 GB+</option>
                  </select>
                </div>

                {/* Age Filter */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Older than (days)</label>
                  <select
                    value={minAge}
                    onChange={(e) => setMinAge(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition"
                  >
                    <option value="0">All files</option>
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="180">6 months</option>
                    <option value="365">1 year</option>
                    <option value="730">2 years</option>
                  </select>
                </div>

                {/* Sort Options */}
                <div>
                    <label className="block text-sm text-gray-400 mb-2">Sort by</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 transition"
                    >
                      <option value="modified_desc">📅 Latest Modified First</option>
                      <option value="modified_asc">📅 Earliest Modified First</option>
                      <option value="accessed_asc">⏰ Oldest Access First</option>
                      <option value="accessed_desc">⏰ Recent Access First</option>
                      <option value="size_desc">📊 Largest First</option>
                      <option value="size_asc">📊 Smallest First</option>
                      <option value="name_asc">🔤 Name (A-Z)</option>
                      <option value="name_desc">🔤 Name (Z-A)</option>
                    </select>
                </div>
              </div>

              {/* Filter summary */}
              <div className="mt-3 text-sm text-gray-400">
                Showing <span className="text-blue-400 font-bold">{filteredFiles.length}</span> of {scanResult.total_files} files
                {(searchTerm || selectedExtension !== 'all' || minAge > 0 || minSize > 0 || sortBy !== 'modified_desc') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedExtension('all');
                      setMinAge(0);
                      setMinSize(0);
                      setSortBy('modified_desc');
                    }}
                    className="ml-3 text-orange-400 hover:text-orange-300 underline"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            </div>

            {/* Files List */}
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">
                  📋 Files (showing first 50)
                </h3>
                
                {/* Bulk Actions */}
                <div className="flex items-center gap-3">
                  {selectedFiles.size > 0 && (
                    <>
                      <span className="text-sm text-gray-400">
                        {selectedFiles.size} selected
                      </span>
                      <button
                        onClick={handleBulkTrash}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded text-sm font-bold transition"
                      >
                        🗑️ Trash Selected
                      </button>
                      <button
                        onClick={handleBulkDelete}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-bold transition"
                      >
                        ❌ Delete Selected
                      </button>
                      <button
                        onClick={clearSelection}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm transition"
                      >
                        Clear
                      </button>
                    </>
                  )}
                  {selectedFiles.size === 0 && filteredFiles.length > 0 && (
                    <button
                      onClick={selectAllVisible}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-sm transition"
                    >
                      ✅ Select All Visible
                    </button>
                  )}
                </div>
              </div>
              
              {filteredFiles.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  {scanResult.files.length === 0 
                    ? 'No files found in this folder' 
                    : 'No files match your filters'}
                </p>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredFiles
                    .slice(0, 50)
                    .map((file, index) => {
                      const daysOld = getDaysSinceAccess(file.accessed);
                      const ageColor = daysOld > 365 ? 'text-red-400' : daysOld > 180 ? 'text-orange-400' : 'text-yellow-400';
                      const isSelected = selectedFiles.has(file.path);
                      
                      return (
                        <div 
                          key={index} 
                          className={`flex justify-between items-center p-3 rounded transition ${
                            isSelected ? 'bg-blue-900/50 border border-blue-500' : 'bg-gray-900 hover:bg-gray-850'
                          }`}
                        >
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleFileSelection(file.path)}
                            className="mr-3 w-5 h-5 cursor-pointer"
                          />
                          
                          <div className="flex-1 truncate mr-4">
                            <p className="font-medium truncate">
                              {file.name}
                              {file.extension && (
                                <span className="ml-2 text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                                  .{file.extension}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{file.path}</p>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right flex-shrink-0">
                              <p className="text-sm font-medium">{formatBytes(file.size)}</p>
                              <p className="text-xs text-gray-500">Last: {formatDate(file.accessed)}</p>
                              <p className={`text-xs font-bold ${ageColor}`}>
                                ⏱️ {daysOld} days ago
                              </p>
                            </div>
                            
                            <div className="flex gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleMoveToTrash(file)}
                                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 rounded text-sm transition"
                                title="Move to trash"
                              >
                                🗑️ Trash
                              </button>
                              <button
                                onClick={() => handleDeleteFile(file)}
                                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded text-sm transition"
                                title="Permanently delete"
                              >
                                ❌ Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
        type={confirmDialog.type}
        confirmText="Yes, proceed"
        cancelText="Cancel"
      />
    </Layout>
  );
}

export default App;