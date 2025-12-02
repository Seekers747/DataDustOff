import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
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

    const testScan = async () => {
        setScanning(true);
        setError('');
        
        try {
        // Test with a small folder - change this to a real path on your system
        const result = await invoke<ScanResult>('scan_folder', { 
            path: 'C:\\Users\\Imraan\\Downloads' 
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

    return (
        <Layout>
        <div className="p-8">
            <h2 className="text-3xl font-bold mb-4">File Scanner Test</h2>
            
            <button
            onClick={testScan}
            disabled={scanning}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg transition font-medium"
            >
            {scanning ? 'Scanning...' : 'Scan Downloads Folder'}
            </button>

            {error && (
            <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg">
                <p className="text-red-200">Error: {error}</p>
            </div>
            )}

            {scanResult && (
            <div className="mt-6 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-gray-800 rounded-lg">
                    <p className="text-gray-400 text-sm">Total Files</p>
                    <p className="text-2xl font-bold">{scanResult.total_files}</p>
                </div>
                <div className="p-4 bg-gray-800 rounded-lg">
                    <p className="text-gray-400 text-sm">Total Size</p>
                    <p className="text-2xl font-bold">{formatBytes(scanResult.total_size)}</p>
                </div>
                <div className="p-4 bg-gray-800 rounded-lg">
                    <p className="text-gray-400 text-sm">Scan Path</p>
                    <p className="text-sm truncate">{scanResult.scan_path}</p>
                </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-bold mb-4">Files (showing first 50)</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                {scanResult.files
                        .sort((a, b) => a.accessed - b.accessed) // Sort by oldest accessed first
                        .slice(0, 50)
                        .map((file, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-gray-900 rounded">
                            <div className="flex-1 truncate">
                                <p className="font-medium truncate">{file.name}</p>
                                <p className="text-xs text-gray-500 truncate">{file.path}</p>
                            </div>
                            <div className="text-right ml-4">
                                <p className="text-sm">{formatBytes(file.size)}</p>
                                <p className="text-xs text-gray-500">Last accessed: {formatDate(file.accessed)}</p>
                                <p className="text-xs text-orange-400">
                                    {Math.floor((Date.now() / 1000 - file.accessed) / 86400)} days ago
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
                </div>
            </div>
            )}
        </div>
        </Layout>
    );
}

export default App;