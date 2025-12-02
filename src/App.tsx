import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import Layout from './components/Layout';

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

  const selectFolder = async () => {
    try {
      console.log('Opening folder picker...');
      const selected = await open({
        directory: true,
        multiple: false,
        title: 'Select a folder to scan',
      });
      
      console.log('Selected:', selected);
  
      if (selected && typeof selected === 'string') {
        setSelectedPath(selected);
        console.log('Path set to:', selected);
      } else {
        console.log('No folder selected or cancelled');
      }
    } catch (err) {
      console.error('Error opening folder picker:', err);
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
    setScanResult(null);
    
    try {
      const result = await invoke<ScanResult>('scan_folder', { 
        path: selectedPath 
      });
      setScanResult(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setScanning(false);
    }
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
            <p className="text-red-200">❌ {error}</p>
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
                  {Math.round(
                    scanResult.files.reduce((sum, f) => sum + getDaysSinceAccess(f.accessed), 0) / 
                    scanResult.files.length
                  )} days
                </p>
              </div>
            </div>

            {/* Files List */}
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="font-bold mb-4">
                📋 Oldest Files (showing first 50 of {scanResult.total_files})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {scanResult.files
                  .sort((a, b) => a.accessed - b.accessed)
                  .slice(0, 50)
                  .map((file, index) => {
                    const daysOld = getDaysSinceAccess(file.accessed);
                    const ageColor = daysOld > 365 ? 'text-red-400' : daysOld > 180 ? 'text-orange-400' : 'text-yellow-400';
                    
                    return (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-900 rounded hover:bg-gray-850 transition">
                        <div className="flex-1 truncate">
                          <p className="font-medium truncate">{file.name}</p>
                          <p className="text-xs text-gray-500 truncate">{file.path}</p>
                        </div>
                        <div className="text-right ml-4 flex-shrink-0">
                          <p className="text-sm font-medium">{formatBytes(file.size)}</p>
                          <p className="text-xs text-gray-500">Last accessed: {formatDate(file.accessed)}</p>
                          <p className={`text-xs font-bold ${ageColor}`}>
                            ⏱️ {daysOld} days ago
                          </p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default App;