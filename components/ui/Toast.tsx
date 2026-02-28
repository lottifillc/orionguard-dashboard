'use client'

import React, { useEffect } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'

export type ToastType = 'success' | 'error'

export function Toast({
  message,
  type,
  onDismiss,
  visible,
}: {
  message: string
  type: ToastType
  onDismiss: () => void
  visible: boolean
}) {
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [visible, onDismiss])

  if (!visible) return null

  const isSuccess = type === 'success'
  return (
    <div
      role="alert"
      className={`fixed bottom-6 start-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300
        ${isSuccess
          ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
          : 'bg-rose-500/15 border-rose-500/30 text-rose-400'
        }`}
    >
      {isSuccess ? (
        <CheckCircle2 size={20} className="shrink-0" />
      ) : (
        <XCircle size={20} className="shrink-0" />
      )}
      <span className="text-sm font-medium">{message}</span>
    </div>
  )
}
