'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Application error:', error)
  }, [error])

  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-screen bg-[#050811] text-white flex items-center justify-center p-8">
        <div className="max-w-md w-full rounded-2xl bg-rose-500/10 border border-rose-500/20 p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">حدث خطأ في التطبيق</h2>
          <p className="text-slate-400 text-sm mb-6">{error.message}</p>
          <button
            type="button"
            onClick={reset}
            className="px-6 py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition"
          >
            إعادة المحاولة
          </button>
        </div>
      </body>
    </html>
  )
}
