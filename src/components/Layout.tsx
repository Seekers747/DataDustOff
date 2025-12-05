import { ReactNode } from 'react'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-gray-950">
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold text-white">DataDustOff</h1>
          <p className="text-sm text-gray-400 mt-1">Clean your digital clutter</p>
        </div>
        
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            <li>
              <button className="w-full text-left px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 transition">
                Dashboard
              </button>
            </li>
            <li>
              <button className="w-full text-left px-4 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition">
                Scan Files
              </button>
            </li>
            <li>
              <button className="w-full text-left px-4 py-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition">
                Settings
              </button>
            </li>
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <p className="text-xs text-gray-500">Version 0.2.0</p>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}