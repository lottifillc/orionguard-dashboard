'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  MoreVertical,
  Camera,
  Lock,
  LockOpen,
  ImageIcon,
  ChevronDown,
  Loader2,
  Server,
  Monitor,
  Wifi,
  Activity,
  AlertTriangle,
  History,
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
  company: { name: string }
  totalSessionsCount: number
  totalActivitiesCount: number
  activeSessionsCount: number
  lastEmployee: { fullName: string; employeeCode: string } | null
  lastActivityTime: string | null
  lastScreenshotFilePath: string | null
  latestScreenshot?: { fileUrl: string; capturedAt: string } | null
}

type DeviceEvent = {
  id: string
  eventType: 'REMOTE_LOCK' | 'REMOTE_UNLOCK' | 'EMERGENCY_UNLOCK'
  createdAt: string
}

type Summary = {
  totalDevices: number
  onlineDevices: number
  lockedDevices: number
  activeSessionsNow: number
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

function ScreenshotPreview({
  fileUrl,
  capturedAt,
}: {
  fileUrl: string | null
  capturedAt: string | null
}) {
  const [error, setError] = useState(false)
  const safeUrl = fileUrl && !error ? fileUrl : null

  if (!safeUrl) {
    return (
      <div className="w-12 h-12 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center shrink-0">
        <ImageIcon size={20} className="text-slate-500" />
      </div>
    )
  }

  return (
    <div className="relative group">
      <Image
        src={safeUrl}
        alt="Preview"
        width={48}
        height={48}
        className="rounded-lg border border-white/10 object-cover shrink-0"
        loading="lazy"
        onError={() => setError(true)}
        unoptimized
      />
      <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div className="rounded-lg border border-white/10 bg-[#0B101E] p-2 shadow-xl overflow-hidden w-[200px]">
          <Image
            src={safeUrl}
            alt="Preview"
            width={200}
            height={112}
            className="rounded object-cover w-full h-auto"
            unoptimized
          />
          {capturedAt && (
            <p className="text-xs text-slate-400 mt-1 truncate">
              {formatRelativeTime(capturedAt)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function KPICard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string
  value: number
  icon: React.ComponentType<{ size?: number; className?: string }>
  color: string
}) {
  return (
    <div className="relative group rounded-2xl bg-linear-to-br from-white/10 to-transparent p-px overflow-hidden">
      <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500" />
      <div className="relative h-full bg-[#080B14] rounded-[15px] p-6 flex flex-col justify-between overflow-hidden backdrop-blur-md">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-lg bg-white/5 border border-white/10 ${color}`}>
            <Icon size={22} />
          </div>
        </div>
        <div>
          <div className="text-slate-400 text-sm font-medium mb-1">{title}</div>
          <div className="text-3xl font-bold text-white tracking-tight" dir="ltr">
            {typeof value === 'number' && !Number.isNaN(value) ? value.toLocaleString('ar') : '0'}
          </div>
        </div>
        <div className="absolute -inset-e-6 -bottom-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
          <Icon size={100} />
        </div>
      </div>
    </div>
  )
}

function ActionsDropdown({
  device,
  isLive,
  onAction,
  loadingKey,
}: {
  device: Device
  isLive: boolean
  onAction: (action: 'screenshot' | 'lock' | 'unlock' | 'viewScreenshot' | 'viewEvents') => void
  loadingKey: string | null
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const isLoading = (action: string) => loadingKey === `${device.id}:${action}`

  const itemClass =
    'flex items-center gap-3 px-4 py-2.5 text-sm text-white/85 hover:bg-white/5 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-start w-full'
  const iconClass = 'shrink-0 opacity-70'

  return (
    <div ref={containerRef} className={`relative ${open ? 'z-[100]' : 'z-50'}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="p-2 rounded-lg hover:bg-white/5 transition text-slate-400 hover:text-white"
        aria-label="الإجراءات"
      >
        <MoreVertical size={18} />
      </button>
      {open && (
        <div
          dir="rtl"
          className="absolute top-full mt-2 end-0 z-[9999] min-w-[220px] max-w-[90vw] bg-[#0f1b2d] bg-opacity-100 opacity-100 isolate border border-white/10 rounded-xl shadow-2xl py-2"
          role="menu"
        >
          <button
            type="button"
            onClick={() => {
              onAction('screenshot')
              setOpen(false)
            }}
            disabled={!isLive || !!isLoading('screenshot')}
            className={itemClass}
          >
            {isLoading('screenshot') ? (
              <Loader2 size={16} className={`${iconClass} animate-spin`} />
            ) : (
              <Camera size={16} className={iconClass} />
            )}
            التقاط لقطة شاشة فورية
          </button>
          <button
            type="button"
            onClick={() => {
              onAction('viewScreenshot')
              setOpen(false)
            }}
            disabled={!!isLoading('viewScreenshot')}
            className={itemClass}
          >
            {isLoading('viewScreenshot') ? (
              <Loader2 size={16} className={`${iconClass} animate-spin`} />
            ) : (
              <ImageIcon size={16} className={iconClass} />
            )}
            عرض آخر لقطة شاشة
          </button>
          <Link
            href={`/dashboard/devices/${device.id}/screenshots`}
            onClick={() => setOpen(false)}
            className={itemClass}
          >
            <ImageIcon size={16} className={iconClass} />
            استعراض سجل اللقطات
          </Link>
          <button
            type="button"
            onClick={() => {
              onAction('viewEvents')
              setOpen(false)
            }}
            className={itemClass}
          >
            <History size={16} className={iconClass} />
            أحداث الجهاز
          </button>
          <div className="my-2 border-t border-white/10" />
          {device.isDisabled ? (
            <button
              type="button"
              onClick={() => {
                onAction('unlock')
                setOpen(false)
              }}
              disabled={!isLive || !!isLoading('unlock')}
              className={itemClass}
            >
              {isLoading('unlock') ? (
                <Loader2 size={16} className={`${iconClass} animate-spin`} />
              ) : (
                <LockOpen size={16} className={iconClass} />
              )}
              تفعيل الجهاز
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onAction('lock')
                setOpen(false)
              }}
              disabled={!isLive || !!isLoading('lock')}
              className={`${itemClass} text-red-400 hover:bg-red-500/10`}
            >
              {isLoading('lock') ? (
                <Loader2 size={16} className={`${iconClass} animate-spin`} />
              ) : (
                <Lock size={16} className={iconClass} />
              )}
              تعطيل الجهاز
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function ConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  variant,
  loading,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  variant: 'danger' | 'success'
  loading?: boolean
}) {
  if (!open) return null
  const isDanger = variant === 'danger'
  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="relative w-full max-w-md rounded-2xl overflow-hidden bg-[#0B101E] border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className={`flex items-center gap-3 mb-4 ${isDanger ? 'text-rose-400' : 'text-emerald-400'}`}>
            <AlertTriangle size={24} className="shrink-0" />
            <h3 className="text-lg font-semibold text-white">{title}</h3>
          </div>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">{message}</p>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-slate-300 hover:bg-white/5 transition disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={loading}
              className={`px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2 ${
                isDanger
                  ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 border border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
              }`}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DeviceEventsModal({
  deviceId,
  deviceName,
  onClose,
}: {
  deviceId: string
  deviceName: string
  onClose: () => void
}) {
  const [events, setEvents] = useState<DeviceEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const r = await fetch(`/api/device/events?deviceId=${encodeURIComponent(deviceId)}`)
        if (!r.ok || cancelled) return
        const data = await r.json()
        setEvents(data?.events ?? [])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [deviceId])

  const eventLabel = (e: DeviceEvent) => {
    if (e.eventType === 'REMOTE_LOCK') return 'تعطيل عن بُعد'
    if (e.eventType === 'REMOTE_UNLOCK') return 'تفعيل عن بُعد'
    if (e.eventType === 'EMERGENCY_UNLOCK') return 'تم فتح الجهاز محليًا (وضع طوارئ)'
    return e.eventType
  }

  const eventIcon = (e: DeviceEvent) => {
    if (e.eventType === 'REMOTE_LOCK') return <Lock size={16} className="text-rose-400 shrink-0" />
    if (e.eventType === 'REMOTE_UNLOCK') return <LockOpen size={16} className="text-emerald-400 shrink-0" />
    if (e.eventType === 'EMERGENCY_UNLOCK') return <AlertTriangle size={16} className="text-amber-400 shrink-0" />
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="أحداث الجهاز"
    >
      <div
        className="relative w-full max-w-lg max-h-[85vh] rounded-2xl overflow-hidden bg-[#0B101E] border border-white/10 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <History size={20} className="text-slate-400" />
            <h3 className="text-lg font-semibold text-white">أحداث الجهاز</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            aria-label="إغلاق"
          >
            <ChevronDown size={20} className="rotate-180" />
          </button>
        </div>
        <div className="p-4 overflow-auto flex-1 min-h-0">
          <p className="text-slate-400 text-sm mb-4">{deviceName}</p>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 size={28} className="animate-spin text-blue-500" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <History size={40} className="mx-auto mb-3 opacity-30" />
              <p>لا توجد أحداث مسجلة</p>
            </div>
          ) : (
            <div className="space-y-0">
              {events.map((e, i) => (
                <div
                  key={e.id}
                  className={`flex items-start gap-3 py-3 ${i < events.length - 1 ? 'border-b border-white/5' : ''}`}
                >
                  <div className="mt-0.5">{eventIcon(e)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white/90 text-sm font-medium">{eventLabel(e)}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{formatRelativeTime(e.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ScreenshotModal({
  url,
  onClose,
}: {
  url: string | null
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="View Screenshot"
    >
      <div
        className="relative w-full max-w-6xl max-h-[95vh] rounded-2xl overflow-hidden bg-[#0B101E] border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">آخر لقطة شاشة</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
            aria-label="إغلاق"
          >
            <ChevronDown size={20} className="rotate-180" />
          </button>
        </div>
        <div className="p-4 overflow-auto max-h-[calc(95vh-60px)]">
          {url ? (
            <img
              src={url}
              alt="Screenshot"
              className="w-full h-auto rounded-lg border border-white/5"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
              <ImageIcon size={64} className="mb-4 opacity-30" />
              <p className="text-lg font-medium">لا توجد لقطة شاشة</p>
              <p className="text-sm mt-1">لم يتم التقاط أي لقطة شاشة لهذا الجهاز بعد</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([])
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [connectedIds, setConnectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [screenshotModal, setScreenshotModal] = useState<{ deviceId: string; url: string | null } | null>(null)
  const [eventsModal, setEventsModal] = useState<{ deviceId: string; deviceName: string } | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState<{ deviceId: string; action: 'lock' | 'unlock' } | null>(null)
  const companyRef = useRef<HTMLDivElement>(null)
  const [companyOpen, setCompanyOpen] = useState(false)

  const fetchDevices = useCallback(async (isInitial = false) => {
    if (isInitial) setLoading(true)
    try {
      const params = new URLSearchParams()
      if (companyId) params.set('companyId', companyId)
      const r = await fetch(`/api/v1/devices?${params}`)
      if (!r.ok) throw new Error('Failed to fetch')
      const data = await r.json()
      const devicesList = Array.isArray(data?.devices) ? data.devices : []
      const summaryData = data?.summary && typeof data.summary === 'object' ? data.summary : null
      setDevices(devicesList)
      setSummary(summaryData)
    } catch {
      setToast({ message: 'فشل تحميل الأجهزة', type: 'error' })
      setDevices([])
      setSummary(null)
    } finally {
      if (isInitial) setLoading(false)
    }
  }, [companyId])

  const fetchLiveStatus = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (companyId) params.set('companyId', companyId)
      const r = await fetch(`/api/device/live-status?${params}`)
      if (!r.ok) return
      const data = await r.json()
      const connected = Array.isArray(data?.connected) ? data.connected : []
      setConnectedIds(new Set(connected))
    } catch {
      // ignore
    }
  }, [companyId])

  const fetchCompanies = async () => {
    try {
      const r = await fetch('/api/v1/overview')
      if (r.ok) {
        const d = await r.json()
        setCompanies(d?.companies ?? [])
      }
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  useEffect(() => {
    fetchDevices(true)
  }, [fetchDevices])

  useEffect(() => {
    fetchLiveStatus()
    const interval = setInterval(fetchLiveStatus, 5000)
    return () => clearInterval(interval)
  }, [fetchLiveStatus])

  useEffect(() => {
    const interval = setInterval(() => fetchDevices(false), 5000)
    return () => clearInterval(interval)
  }, [fetchDevices])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) {
        setCompanyOpen(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const sendCommand = async (
    deviceId: string,
    command: 'LOCK' | 'UNLOCK' | 'CAPTURE_SCREEN'
  ) => {
    const r = await fetch('/api/device/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, command }),
    })
    const data = await r.json()
    if (!r.ok) throw new Error(data?.error ?? 'Failed')
    return data
  }

  const executeDisable = async (deviceId: string) => {
    const r = await fetch('/api/device/disable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    })
    const data = await r.json()
    if (!r.ok) throw new Error(data?.error ?? 'Failed')
    return data
  }

  const executeEnable = async (deviceId: string) => {
    const r = await fetch('/api/device/enable', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId }),
    })
    const data = await r.json()
    if (!r.ok) throw new Error(data?.error ?? 'Failed')
    return data
  }

  const handleConfirmLockUnlock = async () => {
    if (!pendingConfirm) return
    const { deviceId, action } = pendingConfirm
    setLoadingAction(`${deviceId}:${action}`)
    try {
      if (action === 'lock') {
        await executeDisable(deviceId)
        setToast({ message: 'تم تعطيل الجهاز', type: 'success' })
      } else {
        await executeEnable(deviceId)
        setToast({ message: 'تم تفعيل الجهاز', type: 'success' })
      }
      setPendingConfirm(null)
      fetchDevices(false)
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'حدث خطأ',
        type: 'error',
      })
    } finally {
      setLoadingAction(null)
    }
  }

  const handleAction = async (
    deviceId: string,
    action: 'screenshot' | 'lock' | 'unlock' | 'viewScreenshot' | 'viewEvents'
  ) => {
    if (action === 'lock') {
      setPendingConfirm({ deviceId, action: 'lock' })
      return
    }
    if (action === 'unlock') {
      setPendingConfirm({ deviceId, action: 'unlock' })
      return
    }
    if (action === 'viewEvents') {
      const device = devices.find((d) => d.id === deviceId)
      setEventsModal(device ? { deviceId, deviceName: device.deviceName } : { deviceId, deviceName: '' })
      return
    }
    setLoadingAction(`${deviceId}:${action}`)
    try {
      if (action === 'screenshot') {
        console.log('[Devices] User clicked التقاط لقطة شاشة, sending CAPTURE_SCREEN to deviceId:', deviceId)
        await sendCommand(deviceId, 'CAPTURE_SCREEN')
        console.log('[Devices] CAPTURE_SCREEN command sent successfully')
        setToast({ message: 'تم إرسال طلب اللقطة', type: 'success' })
        setTimeout(() => fetchDevices(false), 2000)
      } else if (action === 'viewScreenshot') {
        const r = await fetch(`/api/device/screenshot/latest?deviceId=${deviceId}`)
        const data = await r.json()
        if (!r.ok) throw new Error(data?.error ?? 'No screenshot')
        setScreenshotModal({ deviceId, url: data.data?.url ?? null })
      }
    } catch (err) {
      setToast({
        message: err instanceof Error ? err.message : 'حدث خطأ',
        type: 'error',
      })
    } finally {
      setLoadingAction(null)
    }
  }

  const selectedCompany = companies.find((c) => c.id === companyId)
  const s = summary ?? { totalDevices: 0, onlineDevices: 0, lockedDevices: 0, activeSessionsNow: 0 }

  return (
    <div dir="rtl" className="min-h-screen w-full overflow-hidden text-right flex flex-col">
      <header className="shrink-0 border-b border-white/5 bg-[#080B14]/50 backdrop-blur-md flex items-center justify-between px-4 md:px-8 z-20 h-20">
        <div className="flex items-center gap-4 md:gap-6">
          <h2 className="text-lg md:text-xl font-semibold text-white tracking-wide">
            إدارة الأجهزة
          </h2>
          <div className="h-6 w-px bg-white/10 hidden sm:block" />
          <div ref={companyRef} className="relative">
            <button
              type="button"
              onClick={() => setCompanyOpen((o) => !o)}
              className="flex items-center gap-2 text-sm text-slate-300 bg-[#0B101E] border border-white/10 hover:border-white/20 px-4 py-2 rounded-lg transition min-w-[160px] md:min-w-[180px] justify-between"
            >
              <span className="flex items-center gap-2 truncate">
                <Server size={16} className="text-blue-500 shrink-0" />
                <span className="truncate">
                  {selectedCompany?.name ?? 'جميع الشركات'}
                </span>
              </span>
              <ChevronDown
                size={14}
                className={`text-slate-500 shrink-0 transition-transform ${companyOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {companyOpen && (
              <div className="absolute top-full mt-1 start-0 end-0 min-w-full bg-[#0B101E] border border-white/10 rounded-lg shadow-xl shadow-black/50 py-1 z-50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => {
                    setCompanyId(null)
                    setCompanyOpen(false)
                  }}
                  className={`w-full text-start px-4 py-2.5 text-sm transition
                    ${!companyId ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                >
                  جميع الشركات
                </button>
                {companies.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCompanyId(c.id)
                      setCompanyOpen(false)
                    }}
                    className={`w-full text-start px-4 py-2.5 text-sm transition
                      ${c.id === companyId ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="w-full">
          <div className="max-w-[1600px] mx-auto px-6 lg:px-8 flex flex-col gap-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard
              title="إجمالي الأجهزة"
              value={s.totalDevices}
              icon={Monitor}
              color="text-blue-400"
            />
            <KPICard
              title="الأجهزة المتصلة"
              value={connectedIds.size}
              icon={Wifi}
              color="text-emerald-400"
            />
            <KPICard
              title="الأجهزة المقفلة"
              value={s.lockedDevices}
              icon={Lock}
              color="text-rose-400"
            />
            <KPICard
              title="الجلسات النشطة"
              value={s.activeSessionsNow}
              icon={Activity}
              color="text-amber-400"
            />
          </div>

          {/* Table */}
          <div className="bg-gradient-to-br from-[#0b1220] to-[#0f1b2d] border border-white/10 backdrop-blur-xl rounded-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.4)] overflow-visible">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 size={32} className="animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="overflow-visible w-full">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-right">
                      <th className="text-right px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        الجهاز
                      </th>
                      <th className="text-right px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        المعاينة
                      </th>
                      <th className="text-right px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        الشركة
                      </th>
                      <th className="text-right px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        الحالة
                      </th>
                      <th className="text-right px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        الجلسات النشطة
                      </th>
                      <th className="text-right px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        آخر ظهور
                      </th>
                      <th className="text-right px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-16 text-center text-slate-500"
                        >
                          لا توجد أجهزة
                        </td>
                      </tr>
                    ) : (
                      devices.map((device) => {
                        const isLive = connectedIds.has(device.id)
                        return (
                          <tr
                            key={device.id}
                            className="border-b border-white/5 hover:bg-white/2 transition text-right"
                          >
                            <td className="px-4 md:px-6 py-4 text-right">
                              <div className="flex flex-col items-start">
                                <span className="font-medium text-white">
                                  {device.deviceName}
                                </span>
                                <span
                                  className="text-slate-500 font-mono text-xs mt-0.5"
                                  dir="ltr"
                                >
                                  {device.deviceIdentifier}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 md:px-6 py-4 overflow-visible text-right">
                              <div className="flex justify-start w-full">
                                <ScreenshotPreview
                                  fileUrl={device.latestScreenshot?.fileUrl ?? null}
                                  capturedAt={device.latestScreenshot?.capturedAt ?? null}
                                />
                              </div>
                            </td>
                            <td className="px-4 md:px-6 py-4">
                              <span className="text-slate-300 block text-right">
                                {device.company.name}
                              </span>
                            </td>
                            <td className="px-4 md:px-6 py-4 text-right">
                              <div className="flex flex-col items-start gap-1.5">
                                <div className="flex justify-start">
                                {device.isDisabled ? (
                                  <span className="inline-flex flex-row-reverse items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/15 text-rose-400 border border-rose-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                                    مقفل
                                  </span>
                                ) : isLive ? (
                                  <span className="inline-flex flex-row-reverse items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    متصل
                                  </span>
                                ) : (
                                  <span className="inline-flex flex-row-reverse items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/15 text-slate-400 border border-slate-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                    غير متصل
                                  </span>
                                )}
                                </div>
                                {!device.isDisabled && device.lastEmergencyUnlockAt && (
                                  <span className="inline-flex flex-row-reverse items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                    <AlertTriangle size={12} className="shrink-0" />
                                    تم فتح الجهاز محليًا (وضع طوارئ)
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 md:px-6 py-4">
                              <span className="text-slate-300 font-medium text-right block" dir="ltr">
                                {device.activeSessionsCount}
                              </span>
                            </td>
                            <td className="px-4 md:px-6 py-4">
                              <span className="text-slate-400 text-sm block text-right">
                                {formatRelativeTime(device.lastSeenAt)}
                              </span>
                            </td>
                            <td className="px-4 md:px-6 py-4">
                              <div className="flex justify-end">
                              <ActionsDropdown
                                device={device}
                                isLive={isLive}
                                onAction={(a) => handleAction(device.id, a)}
                                loadingKey={loadingAction}
                              />
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>

      {screenshotModal && (
        <ScreenshotModal
          url={screenshotModal.url}
          onClose={() => setScreenshotModal(null)}
        />
      )}

      {eventsModal && (
        <DeviceEventsModal
          deviceId={eventsModal.deviceId}
          deviceName={eventsModal.deviceName}
          onClose={() => setEventsModal(null)}
        />
      )}

      <ConfirmModal
        open={!!pendingConfirm}
        title={pendingConfirm?.action === 'lock' ? 'تأكيد التعطيل' : 'تأكيد التفعيل'}
        message={
          pendingConfirm?.action === 'lock'
            ? 'هل أنت متأكد من تعطيل هذا الجهاز؟ لن يتمكن المستخدم من استخدام النظام حتى يتم إعادة التفعيل.'
            : 'سيتم إعادة تفعيل الجهاز فورًا.'
        }
        confirmLabel={pendingConfirm?.action === 'lock' ? 'تعطيل' : 'تفعيل'}
        cancelLabel="إلغاء"
        variant={pendingConfirm?.action === 'lock' ? 'danger' : 'success'}
        loading={!!(pendingConfirm && loadingAction === `${pendingConfirm.deviceId}:${pendingConfirm.action}`)}
        onConfirm={handleConfirmLockUnlock}
        onCancel={() => setPendingConfirm(null)}
      />

      <Toast
        message={toast?.message ?? ''}
        type={toast?.type ?? 'success'}
        visible={!!toast}
        onDismiss={() => setToast(null)}
      />
    </div>
  )
}
