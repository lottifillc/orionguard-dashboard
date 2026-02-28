'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Dashboard error:', error)
  }, [error])

  return (
    <div className="min-h-[400px] flex items-center justify-center p-8">
      <div className="max-w-md w-full rounded-2xl bg-rose-500/10 border border-rose-500/20 p-8 text-center">
        <AlertTriangle className="mx-auto mb-4 text-rose-400" size={48} />
        <h2 className="text-xl font-semibold text-white mb-2">حدث خطأ</h2>
        <p className="text-slate-400 text-sm mb-6">{error.message}</p>
        <button
          type="button"
          onClick={reset}
          className="px-6 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  )
}
