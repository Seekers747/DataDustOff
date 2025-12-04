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
}

function App() {
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedPath, setSelectedPath] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  
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
      setSuccessMessage(`✅ Found ${result.total_files} files!`);
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
      title: '🗑️ Move to DataDustOff Trash',
      message: `Move "${file.name}" to trash? You can restore it later from your user folder.`,
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
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-800 rounded-lg">
                <p className="text-gray-400 text-sm">Total Files</p>
                <p className="text-2xl font-bold">{scanResult.total_files.toLocaleString()}</p>
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

            {/* Files List */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-bold mb-4">
                📋 Oldest Files (showing first 50 of {scanResult.total_files})
              </h3>
              
              {scanResult.files.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No files found in this folder</p>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {scanResult.files
                    .sort((a, b) => a.accessed - b.accessed)
                    .slice(0, 50)
                    .map((file, index) => {
                      const daysOld = getDaysSinceAccess(file.accessed);
                      const ageColor = daysOld > 365 ? 'text-red-400' : daysOld > 180 ? 'text-orange-400' : 'text-yellow-400';
                      
                      return (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-900 rounded hover:bg-gray-850 transition">
                          <div className="flex-1 truncate mr-4">
                            <p className="font-medium truncate">{file.name}</p>
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