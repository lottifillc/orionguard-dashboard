'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import {
  MoreVertical,
  Camera,
  PowerOff,
  Power,
  ImageIcon,
  ChevronDown,
  Loader2,
  Server,
  Monitor,
  Wifi,
  Lock,
  Activity,
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
  company: { name: string }
  totalSessionsCount: number
  totalActivitiesCount: number
  activeSessionsCount: number
  lastEmployee: { fullName: string; employeeCode: string } | null
  lastActivityTime: string | null
  lastScreenshotFilePath: string | null
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
    <div className="relative group rounded-2xl bg-linear-to-br from-white/10 to-transparent p-px overflow-hidden transition-all duration-300">
      <div className="relative h-full bg-[#080B14] rounded-[15px] p-6 flex flex-col justify-between overflow-hidden backdrop-blur-md border border-white/5">
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
      </div>
    </div>
  )
}

function ActionsDropdown({
  device,
  onAction,
  loadingKey,
}: {
  device: Device
  onAction: (action: 'screenshot' | 'viewScreenshot' | 'disable' | 'enable') => void
  loadingKey: string | null
}) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, right: 0 })
  const buttonRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const menuWidth = 220
      const minLeft = 320
      const rightValue = window.innerWidth - rect.right
      const leftEdge = rect.right - menuWidth
      const right = leftEdge < minLeft
        ? window.innerWidth - minLeft - menuWidth
        : rightValue
      setPosition({
        top: rect.bottom + 4,
        right,
      })
    }
    setOpen((o) => !o)
  }

  const isLoading = (action: string) => loadingKey === `${device.id}:${action}`

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
        aria-label="الإجراءات"
      >
        <MoreVertical size={18} />
      </button>
      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed min-w-[220px] bg-[#0B101E] border border-white/10 rounded-lg shadow-xl shadow-black/50 py-1 z-[9999] overflow-hidden"
            style={{
              top: position.top,
              right: position.right,
            }}
          >
          <button
            type="button"
            onClick={() => {
              onAction('screenshot')
              setOpen(false)
            }}
            disabled={!device.isOnline || !!isLoading('screenshot')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed text-start"
          >
            {isLoading('screenshot') ? (
              <Loader2 size={16} className="animate-spin shrink-0" />
            ) : (
              <Camera size={16} className="shrink-0" />
            )}
            أخذ لقطة شاشة
          </button>
          <button
            type="button"
            onClick={() => {
              onAction('viewScreenshot')
              setOpen(false)
            }}
            disabled={!!isLoading('viewScreenshot')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed text-start"
          >
            {isLoading('viewScreenshot') ? (
              <Loader2 size={16} className="animate-spin shrink-0" />
            ) : (
              <ImageIcon size={16} className="shrink-0" />
            )}
            عرض آخر لقطة
          </button>
          <Link
            href={`/devices/${device.id}/screenshots`}
            onClick={() => setOpen(false)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition text-start"
          >
            <ImageIcon size={16} className="shrink-0" />
            معرض اللقطات
          </Link>
          <button
            type="button"
            onClick={() => {
              onAction('disable')
              setOpen(false)
            }}
            disabled={device.isDisabled || !!isLoading('disable')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed text-start"
          >
            {isLoading('disable') ? (
              <Loader2 size={16} className="animate-spin shrink-0" />
            ) : (
              <PowerOff size={16} className="shrink-0" />
            )}
            تعطيل الجهاز
          </button>
          <button
            type="button"
            onClick={() => {
              onAction('enable')
              setOpen(false)
            }}
            disabled={!device.isDisabled || !!isLoading('enable')}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed text-start"
          >
            {isLoading('enable') ? (
              <Loader2 size={16} className="animate-spin shrink-0" />
            ) : (
              <Power size={16} className="shrink-0" />
            )}
            تفعيل الجهاز
          </button>
        </div>,
          document.body
        )}
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
      aria-label="عرض لقطة الشاشة"
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
              alt="لقطة الشاشة"
              className="w-full h-auto rounded-lg border border-white/5"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
              <ImageIcon size={64} className="mb-4 opacity-30" />
              <p className="text-lg font-medium">لا توجد لقطة شاشة</p>
              <p className="text-sm mt-1">لم يتم التقاط أي لقطة لهذا الجهاز بعد</p>
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
  const [loading, setLoading] = useState(true)
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [screenshotModal, setScreenshotModal] = useState<{ deviceId: string; url: string | null } | null>(null)
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
    const interval = setInterval(() => fetchDevices(false), 10000)
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

  const handleAction = async (
    deviceId: string,
    action: 'screenshot' | 'viewScreenshot' | 'disable' | 'enable'
  ) => {
    setLoadingAction(`${deviceId}:${action}`)
    try {
      if (action === 'screenshot') {
        const r = await fetch(`/api/device/screenshot?deviceId=${deviceId}`)
        const data = await r.json()
        if (!r.ok) throw new Error(data?.error ?? 'Failed')
        setToast({ message: 'تم إرسال طلب لقطة الشاشة', type: 'success' })
      } else if (action === 'viewScreenshot') {
        const r = await fetch(`/api/device/screenshot/latest?deviceId=${deviceId}`)
        const data = await r.json()
        if (!r.ok) throw new Error(data?.error ?? 'No screenshot')
        setScreenshotModal({ deviceId, url: data.data?.url ?? null })
      } else if (action === 'disable') {
        const r = await fetch('/api/device/disable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId }),
        })
        const data = await r.json()
        if (!r.ok) throw new Error(data?.error ?? 'Failed')
        setToast({ message: 'تم تعطيل الجهاز', type: 'success' })
        fetchDevices(false)
      } else {
        const r = await fetch('/api/device/enable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deviceId }),
        })
        const data = await r.json()
        if (!r.ok) throw new Error(data?.error ?? 'Failed')
        setToast({ message: 'تم تفعيل الجهاز', type: 'success' })
        fetchDevices(false)
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
    <>
      <header className="h-20 border-b border-white/5 bg-[#080B14]/50 backdrop-blur-md flex items-center justify-between px-4 md:px-8 z-20 shrink-0">
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
              <div className="absolute top-full mt-1 inset-s-0 inset-e-0 min-w-full bg-[#0B101E] border border-white/10 rounded-lg shadow-xl shadow-black/50 py-1 z-50 overflow-hidden">
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

      <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth no-scrollbar">
        <div className="max-w-[1600px] mx-auto space-y-6">
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
              value={s.onlineDevices}
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
              title="الجلسات النشطة الآن"
              value={s.activeSessionsNow}
              icon={Activity}
              color="text-amber-400"
            />
          </div>

          {/* Table */}
          <div className="rounded-2xl bg-[#0B101E] border border-white/5 overflow-hidden transition-opacity duration-300">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 size={32} className="animate-spin text-blue-500" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px]">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-start px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        الجهاز
                      </th>
                      <th className="text-start px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        الشركة
                      </th>
                      <th className="text-start px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        الحالة
                      </th>
                      <th className="text-start px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        مقفل
                      </th>
                      <th className="text-start px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        الجلسات النشطة
                      </th>
                      <th className="text-start px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        آخر موظف
                      </th>
                      <th className="text-start px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        آخر نشاط
                      </th>
                      <th className="text-start px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        آخر ظهور
                      </th>
                      <th className="text-start px-4 md:px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        الإجراءات
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {devices.length === 0 ? (
                      <tr>
                        <td
                          colSpan={9}
                          className="px-6 py-16 text-center text-slate-500"
                        >
                          لا توجد أجهزة
                        </td>
                      </tr>
                    ) : (
                      devices.map((device) => (
                        <tr
                          key={device.id}
                          className="border-b border-white/5 hover:bg-white/2 transition"
                        >
                          <td className="px-4 md:px-6 py-4">
                            <div className="flex flex-col">
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
                          <td className="px-4 md:px-6 py-4">
                            <span className="text-slate-300">
                              {device.company.name}
                            </span>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            {device.isOnline ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                متصل
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-500/15 text-slate-400 border border-slate-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                غير متصل
                              </span>
                            )}
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            {device.isDisabled ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/15 text-rose-400 border border-rose-500/20">
                                مقفل
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <span className="text-slate-300 font-medium" dir="ltr">
                              {device.activeSessionsCount}
                            </span>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            {device.lastEmployee ? (
                              <div className="flex flex-col">
                                <span className="text-slate-300 text-sm">
                                  {device.lastEmployee.fullName}
                                </span>
                                <span className="text-slate-500 text-xs" dir="ltr">
                                  {device.lastEmployee.employeeCode}
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <span className="text-slate-400 text-sm">
                              {formatRelativeTime(device.lastActivityTime)}
                            </span>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <span className="text-slate-400 text-sm">
                              {formatRelativeTime(device.lastSeenAt)}
                            </span>
                          </td>
                          <td className="px-4 md:px-6 py-4">
                            <ActionsDropdown
                              device={device}
                              onAction={(a) => handleAction(device.id, a)}
                              loadingKey={loadingAction}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {screenshotModal && (
        <ScreenshotModal
          url={screenshotModal.url}
          onClose={() => setScreenshotModal(null)}
        />
      )}

      <Toast
        message={toast?.message ?? ''}
        type={toast?.type ?? 'success'}
        visible={!!toast}
        onDismiss={() => setToast(null)}
      />
    </>
  )
}
