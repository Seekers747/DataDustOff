import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import Layout from './components/Layout';

function App() {
  const [version, setVersion] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('');

  const checkVersion = async () => {
    const ver = await invoke<string>('get_app_version');
    setVersion(ver);
  };

  const testGreet = async () => {
    const greet = await invoke<string>('greet', { name: 'DataDustOff User' });
    setGreeting(greet);
  };

  return (
    <Layout>
      <div className="p-8">
        <h2 className="text-3xl font-bold mb-4">Welcome to DataDustOff</h2>
        <p className="text-gray-400 mb-8">
          Your smart file cleanup tool. Let's find those untouched files!
        </p>

        {/* Test Rust Communication */}
        <div className="space-y-4">
          <div>
            <button
              onClick={checkVersion}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              Check Version (Rust)
            </button>
            {version && (
              <p className="mt-2 text-green-400">Version from Rust: {version}</p>
            )}
          </div>

          <div>
            <button
              onClick={testGreet}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition"
            >
              Test Greet (Rust)
            </button>
            {greeting && (
              <p className="mt-2 text-green-400">{greeting}</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default App;