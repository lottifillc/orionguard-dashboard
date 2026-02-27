import './globals.css'
import { ReactNode } from 'react'

export const metadata = {
  title: 'OrionGuard',
  description: 'Enterprise Productivity Intelligence Platform',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0B0F19] text-white">
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-64 bg-[#121826] p-6 hidden md:block">
            <h2 className="text-xl font-bold mb-8">OrionGuard</h2>
            <nav className="space-y-4 text-gray-400">
              <a href="#" className="block hover:text-white">Overview</a>
              <a href="#" className="block hover:text-white">Employees</a>
              <a href="#" className="block hover:text-white">Analytics</a>
              <a href="#" className="block hover:text-white">Screenshots</a>
              <a href="#" className="block hover:text-white">Alerts</a>
              <a href="#" className="block hover:text-white">Settings</a>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}