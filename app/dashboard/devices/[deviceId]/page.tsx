'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ChevronRight,
  Loader2,
  Server,
  Monitor,
  Wifi,
  Lock,
  LockOpen,
  Camera,
  ImageIcon,
  MousePointer2,
  KeyRound,
  AlertTriangle,
} from 'lucide-react'
import { Toast, type ToastType } from '@/components/ui/Toast'

type Device = {
  id: string
  deviceIdentifier: string
  deviceName: string
  isOnline: boolean
  lastSeenAt: string | null
  createdAt: string
  isDisabled: boolean
  lastEmergencyUnlockAt: string | null
  inputBlocked: boolean
  emergencyPinConfigured: boolean
  company: { name: string }
  totalSessionsCount: number
  activeSessionsCount: number
  lastEmployee: { fullName: string; employeeCode: string } | null
  latestScreenshot?: { fileUrl: string; capturedAt: string } | null
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffMins < 1) return 'الآن'
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`
  if (diffHours < 24) return `منذ ${diffHours} ساعة`
  if (diffDays < 7) return `منذ ${diffDays} يوم`
  return d.toLocaleDateString('ar-SA')
}

function EmergencyPinModal({
  deviceId,
  deviceName,
  onClose,
  onSuccess,
}: {
  deviceId: string
  deviceName: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!pin || !confirmPin) {
      setError('يرجى إدخال الرمز وتأكيده')
      return
    }
    if (pin !== confirmPin) {
      setError('الرمز وتأكيد الرمز غير متطابقين')
      return
    }
    if (pin.length < 4 || pin.length > 8) {
      setError('الرمز يجب أن يكون من 4 إلى 8 أرقام')
      return
    }
    if (!/^\d+$/.test(pin)) {
      setError('الرمز يجب أن يحتوي على أرقام فقط')
      return
    }
    setLoading(true)
    try {
      const r = await fetch(`/api/device/emergency-pin/${deviceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, confirmPin }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error ?? 'Failed')
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="رمز الطوارئ"
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden bg-[#0B101E] border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <KeyRound size={20} className="text-slate-400" />
            <h3 className="text-lg font-semibold text-white">رمز الطوارئ</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            aria-label="إغلاق"
          >
            <ChevronRight size={20} className="rotate-180" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-slate-400 text-sm">{deviceName}</p>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              الرمز (4–8 أرقام)
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              className="w-full bg-[#080B14] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none"
              maxLength={8}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              تأكيد الرمز
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              placeholder="••••"
              className="w-full bg-[#080B14] border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none"
              maxLength={8}
            />
          </div>
          {error && <p className="text-rose-400 text-sm">{error}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-slate-300 hover:bg-white/5 transition disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 disabled:opacity-50 flex items-center gap-2 transition"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              حفظ
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function DeviceDetailPage({
  params,
}: {
  params: Promise<{ deviceId: string }>
}) {
  const resolvedParams = React.use(params)
  const [device, setDevice] = useState<Device | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [emergencyPinModal, setEmergencyPinModal] = useState(false)
  const [inputBlockLoading, setInputBlockLoading] = useState(false)
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set())

  const fetchDevice = useCallback(async () => {
    try {
      const r = await fetch(`/api/v1/devices/${resolvedParams.deviceId}`)
      if (!r.ok) throw new Error('Failed to fetch')
      const data = await r.json()
      setDevice(data)
    } catch {
      setToast({ message: 'فشل تحميل الجهاز', type: 'error' })
      setDevice(null)
    } finally {
      setLoading(false)
    }
  }, [resolvedParams.deviceId])

  const fetchLiveStatus = useCallback(async () => {
    try {
      const r = await fetch('/api/device/live-status')
      if (!r.ok) return
      const data = await r.json()
      setConnectedIds(new Set(data?.connected ?? []))
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchDevice()
  }, [fetchDevice])

  useEffect(() => {
    fetchLiveStatus()
    const interval = setInterval(fetchLiveStatus, 5000)
    return () => clearInterval(interval)
  }, [fetchLiveStatus])

  useEffect(() => {
    const interval = setInterval(fetchDevice, 5000)
    return () => clearInterval(interval)
  }, [fetchDevice])

  const isLive = device ? connectedIds.has(device.id) : false

  const handleBlockInput = async () => {
    if (!device) return
    setInputBlockLoading(true)
    try {
      const r = await fetch('/api/device/block-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: device.id }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error ?? 'Failed')
      setToast({ message: 'تم تعطيل الإدخال', type: 'success' })
      fetchDevice()
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'حدث خطأ',
        type: 'error',
      })
    } finally {
      setInputBlockLoading(false)
    }
  }

  const handleUnblockInput = async () => {
    if (!device) return
    setInputBlockLoading(true)
    try {
      const r = await fetch('/api/device/unblock-input', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: device.id }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error ?? 'Failed')
      setToast({ message: 'تم تفعيل الإدخال', type: 'success' })
      fetchDevice()
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'حدث خطأ',
        type: 'error',
      })
    } finally {
      setInputBlockLoading(false)
    }
  }

  const handleCaptureScreenshot = async () => {
    if (!device) return
    try {
      const r = await fetch('/api/device/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId: device.id, command: 'CAPTURE_SCREEN' }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error ?? 'Failed')
      setToast({ message: 'تم إرسال طلب اللقطة', type: 'success' })
      setTimeout(fetchDevice, 2000)
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'حدث خطأ',
        type: 'error',
      })
    }
  }

  if (loading && !device) {
    return (
      <div dir="rtl" className="min-h-screen flex items-center justify-center">
        <Loader2 size={40} className="animate-spin text-blue-500" />
      </div>
    )
  }

  if (!device) {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400">الجهاز غير موجود</p>
        <Link
          href="/dashboard/devices"
          className="text-blue-400 hover:text-blue-300 transition"
        >
          العودة إلى قائمة الأجهزة
        </Link>
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen w-full overflow-hidden text-right flex flex-col">
      <header className="h-20 border-b border-white/5 bg-[#080B14]/50 backdrop-blur-md flex items-center justify-between px-4 md:px-8 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/devices"
            className="text-slate-400 hover:text-white transition flex items-center gap-2"
          >
            <ChevronRight className="rotate-180" size={20} />
            <span className="text-sm">الأجهزة</span>
          </Link>
          <div className="h-6 w-px bg-white/10" />
          <h2 className="text-lg md:text-xl font-semibold text-white tracking-wide">
            {device.deviceName}
          </h2>
          <span className="text-slate-500 font-mono text-sm" dir="ltr">
            {device.deviceIdentifier}
          </span>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-[1200px] mx-auto space-y-6">
          {/* Device info card */}
          <div className="rounded-2xl bg-[#0B101E] border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Monitor size={20} className="text-slate-400" />
              معلومات الجهاز
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500 block mb-1">الشركة</span>
                <span className="text-white flex items-center gap-2">
                  <Server size={14} className="text-slate-500" />
                  {device.company.name}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">الحالة</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    device.isDisabled
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                      : isLive
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                        : 'bg-slate-500/15 text-slate-400 border border-slate-500/20'
                  }`}
                >
                  <Wifi size={12} />
                  {device.isDisabled ? 'مقفل' : isLive ? 'متصل' : 'غير متصل'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">آخر ظهور</span>
                <span className="text-white">{formatRelativeTime(device.lastSeenAt)}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-1">الجلسات النشطة</span>
                <span className="text-white" dir="ltr">
                  {device.activeSessionsCount}
                </span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="rounded-2xl bg-[#0B101E] border border-white/10 p-6">
            <h3 className="text-lg font-semibold text-white mb-4">الإجراءات</h3>
            <div className="flex flex-wrap gap-4">
              {/* Input Block toggle */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[#080B14] border border-white/10 min-w-[200px]">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <MousePointer2 size={20} className="text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">
                    {device.inputBlocked ? 'الإدخال معطل' : 'الإدخال نشط'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {device.inputBlocked ? 'تعطيل الإدخال' : 'تفعيل الإدخال'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={device.inputBlocked ? handleUnblockInput : handleBlockInput}
                  disabled={!isLive || inputBlockLoading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    device.inputBlocked
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30'
                  }`}
                >
                  {inputBlockLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : device.inputBlocked ? (
                    'تفعيل'
                  ) : (
                    'تعطيل'
                  )}
                </button>
              </div>

              {/* Emergency PIN */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[#080B14] border border-white/10 min-w-[200px]">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <KeyRound size={20} className="text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">
                    {device.emergencyPinConfigured ? 'مُكوّن' : 'غير مُكوّن'}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">رمز الطوارئ</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEmergencyPinModal(true)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition"
                >
                  {device.emergencyPinConfigured ? 'تغيير' : 'إعداد'}
                </button>
              </div>

              {/* Screenshot */}
              <div className="flex items-center gap-3 p-4 rounded-xl bg-[#080B14] border border-white/10 min-w-[200px]">
                <div className="p-2 rounded-lg bg-slate-500/10">
                  <Camera size={20} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white">لقطة شاشة</p>
                  <p className="text-xs text-slate-500 mt-0.5">التقاط فوري</p>
                </div>
                <button
                  type="button"
                  onClick={handleCaptureScreenshot}
                  disabled={!isLive}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 text-slate-300 border border-white/10 hover:bg-white/15 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  التقاط
                </button>
              </div>
            </div>
          </div>

          {/* Screenshot preview & link */}
          <div className="rounded-2xl bg-[#0B101E] border border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <span className="text-sm font-medium text-white">آخر لقطة شاشة</span>
              <Link
                href={`/dashboard/devices/${device.id}/screenshots`}
                className="text-sm text-blue-400 hover:text-blue-300 transition flex items-center gap-2"
              >
                استعراض سجل اللقطات
                <ChevronRight size={16} className="rotate-180" />
              </Link>
            </div>
            <div className="p-4 aspect-video bg-[#080B14] flex items-center justify-center min-h-[200px]">
              {device.latestScreenshot?.fileUrl ? (
                <Image
                  src={device.latestScreenshot.fileUrl}
                  alt="Preview"
                  width={400}
                  height={225}
                  className="rounded-lg object-contain max-w-full max-h-full"
                  unoptimized
                />
              ) : (
                <div className="text-center text-slate-500">
                  <ImageIcon size={48} className="mx-auto mb-2 opacity-30" />
                  <p>لا توجد لقطة شاشة</p>
                </div>
              )}
            </div>
          </div>

          {device.lastEmergencyUnlockAt && (
            <div className="flex items-center gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <AlertTriangle size={20} className="shrink-0" />
              <span>
                تم فتح الجهاز محليًا (وضع طوارئ) — {formatRelativeTime(device.lastEmergencyUnlockAt)}
              </span>
            </div>
          )}
        </div>
      </div>

      {emergencyPinModal && (
        <EmergencyPinModal
          deviceId={device.id}
          deviceName={device.deviceName}
          onClose={() => setEmergencyPinModal(false)}
          onSuccess={() => {
            setToast({ message: 'تم حفظ رمز الطوارئ', type: 'success' })
            fetchDevice()
          }}
        />
      )}

      <Toast
        message={toast?.message ?? ''}
        type={toast?.type ?? 'success'}
        visible={!!toast}
        onDismiss={() => setToast(null)}
      />
    </div>
  )
}
