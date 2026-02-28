'use client'

import React, { useEffect, useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ChevronRight,
  Calendar,
  User,
  ZoomIn,
  ZoomOut,
  Download,
  Trash2,
  X,
  ImageIcon,
  Loader2,
  Radio,
} from 'lucide-react'
import { Toast, type ToastType } from '@/components/ui/Toast'

type ScreenshotItem = {
  id: string
  deviceId: string
  deviceName: string
  deviceIdentifier: string
  employeeId: string | null
  employeeCode: string | null
  employeeName: string | null
  sessionId: string
  fileName: string
  fileUrl: string
  fileSize: number | null
  width: number | null
  height: number | null
  createdAt: string
}

type Pagination = {
  page: number
  totalPages: number
  totalCount: number
}

type EmployeeOption = {
  id: string
  employeeCode: string
  fullName: string
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function formatFileSize(bytes: number | null): string {
  if (bytes == null || bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DeviceScreenshotsPage({
  params,
}: {
  params: Promise<{ deviceId: string }>
}) {
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [screenshots, setScreenshots] = useState<ScreenshotItem[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [liveMode, setLiveMode] = useState(false)
  const [newItems, setNewItems] = useState<ScreenshotItem[]>([])
  const [page, setPage] = useState(1)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [modalItem, setModalItem] = useState<ScreenshotItem | null>(null)
  const [zoom, setZoom] = useState(1)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null)
  const [livePreviewUrl, setLivePreviewUrl] = useState<string | null>(null)
  const [liveImage, setLiveImage] = useState<string | null>(null)
  const [previewCapturedAt, setPreviewCapturedAt] = useState<string | null>(null)
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0)
  const [previewTimestamp, setPreviewTimestamp] = useState<number>(() => Date.now())
  const [previewError, setPreviewError] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [livePreviewOn, setLivePreviewOn] = useState(false)
  const lastLatestRef = useRef<string | null>(null)
  const lastScreenshotIdRef = useRef<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const livePreviewIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const resolvedParams = React.use(params)

  function getWsUrl(): string {
    if (typeof window === 'undefined') return ''
    const env = process.env.NEXT_PUBLIC_WS_BASE
    if (env) return env
    const { protocol, hostname } = window.location
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:'
    const port = protocol === 'https:' ? '' : ':3000'
    return `${wsProtocol}//${hostname}${port}/ws`
  }

  useEffect(() => {
    setDeviceId(resolvedParams.deviceId)
    setLivePreviewUrl(null)
    setLiveImage(null)
    setPreviewCapturedAt(null)
    setLivePreviewOn(false)
    lastScreenshotIdRef.current = null
    setPreviewError(false)
  }, [resolvedParams.deviceId])

  const fetchList = useCallback(
    async (p = page) => {
      if (!deviceId) return
      setLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('deviceId', deviceId)
        params.set('page', String(p))
        params.set('limit', '20')
        if (from) params.set('from', from)
        if (to) params.set('to', to)
        if (employeeId) params.set('employeeId', employeeId)

        const r = await fetch(`/api/device/screenshot/list?${params}`)
        if (!r.ok) throw new Error('Failed to fetch')
        const data = await r.json()

        setScreenshots(data.data ?? [])
        setPagination(data.pagination ?? null)
      } catch {
        setToast({ message: 'فشل تحميل اللقطات', type: 'error' })
        setScreenshots([])
        setPagination(null)
      } finally {
        setLoading(false)
      }
    },
    [deviceId, page, from, to, employeeId]
  )

  const fetchEmployees = useCallback(async () => {
    if (!deviceId) return
    try {
      const r = await fetch(`/api/device/screenshot/employees?deviceId=${deviceId}`)
      if (r.ok) {
        const data = await r.json()
        setEmployees(data.data ?? [])
      }
    } catch {
      // ignore
    }
  }, [deviceId])

  useEffect(() => {
    if (!deviceId) return
    fetchList(page)
    fetchEmployees()
  }, [deviceId, page, from, to, employeeId, fetchList])

  const fetchLatestPreview = useCallback(async () => {
    if (!deviceId) return
    try {
      const r = await fetch(
        `/api/device/screenshot/latest?deviceId=${deviceId}&t=${Date.now()}`,
        { headers: { Accept: 'application/json' }, cache: 'no-store' }
      )
      if (!r.ok) return
      const data = await r.json()
      const payload = data.data
      const url = payload?.imageUrl ?? payload?.url
      const capturedAt = payload?.capturedAt ?? null
      const screenshotId = payload?.id ?? null
      const basePath = url?.split('?')[0] ?? ''
      const isNewScreenshot = url && (screenshotId !== lastScreenshotIdRef.current || basePath !== lastLatestRef.current)
      if (isNewScreenshot) {
        lastScreenshotIdRef.current = screenshotId
        lastLatestRef.current = basePath
        setLivePreviewUrl(url)
        setPreviewCapturedAt(capturedAt)
        setPreviewRefreshKey((k) => k + 1)
        setPreviewTimestamp(Date.now())
        setPreviewError(false)
      } else if (!url) {
        setLivePreviewUrl(null)
        setPreviewCapturedAt(null)
        setPreviewError(true)
      }
    } catch {
      setLivePreviewUrl(null)
      setPreviewCapturedAt(null)
      setPreviewError(true)
    }
  }, [deviceId])

  const handleCaptureScreenshot = useCallback(async () => {
    if (!deviceId) return
    setCapturing(true)
    try {
      const r = await fetch('/api/device/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId, command: 'CAPTURE_SCREEN' }),
      })
      const data = await r.json()
      if (!r.ok) throw new Error(data?.error ?? 'Failed')
      setToast({ message: 'تم إرسال طلب اللقطة', type: 'success' })
      setTimeout(fetchLatestPreview, 1500)
    } catch {
      setToast({ message: 'فشل إرسال طلب اللقطة', type: 'error' })
    } finally {
      setCapturing(false)
    }
  }, [deviceId, fetchLatestPreview])

  // Initial fetch when device loads
  useEffect(() => {
    if (!deviceId) return
    fetchLatestPreview()
  }, [deviceId, fetchLatestPreview])

  // Live Preview: WebSocket + 1000ms interval, REQUEST_LIVE_FRAME each tick, fetch on LIVE_FRAME_READY
  useEffect(() => {
    if (!deviceId || !livePreviewOn) {
      setLiveImage(null)
      if (livePreviewIntervalRef.current) {
        clearInterval(livePreviewIntervalRef.current)
        livePreviewIntervalRef.current = null
      }
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      return
    }

    const wsUrl = getWsUrl()
    if (!wsUrl) {
      setPreviewError(true)
      return
    }

    const ws = new WebSocket(wsUrl)
    ws.binaryType = 'arraybuffer'
    wsRef.current = ws

    ws.onopen = () => {
      livePreviewIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'REQUEST_LIVE_FRAME', deviceId }))
        }
      }, 1000)
    }

    ws.onmessage = (event) => {
      console.log('WS RAW:', event.data)
      try {
        const raw = typeof event.data === 'string' ? event.data : new TextDecoder().decode(event.data as ArrayBuffer)
        const msg = JSON.parse(raw) as {
          type?: string
          deviceId?: string
          deviceIdentifier?: string
          image?: string
          timestamp?: string
        }
        if (msg.type === 'LIVE_FRAME') {
          if (msg.deviceId === deviceId || msg.deviceIdentifier === deviceId) {
            const imageSrc = `data:image/jpeg;base64,${msg.image}`
            const cacheBustedSrc = imageSrc + `#${Date.now()}`
            setLiveImage(cacheBustedSrc)
            setPreviewError(false)
            console.log('LIVE FRAME UPDATED')
          }
        }
      } catch {
        // ignore
      }
    }

    ws.onerror = () => setPreviewError(true)
    ws.onclose = () => {
      if (livePreviewIntervalRef.current) {
        clearInterval(livePreviewIntervalRef.current)
        livePreviewIntervalRef.current = null
      }
    }

    return () => {
      if (livePreviewIntervalRef.current) {
        clearInterval(livePreviewIntervalRef.current)
        livePreviewIntervalRef.current = null
      }
      ws.close()
      wsRef.current = null
    }
  }, [deviceId, livePreviewOn])

  useEffect(() => {
    if (!deviceId || !liveMode) return

    const poll = async () => {
      try {
        const r = await fetch(
          `/api/device/screenshot/latest?deviceId=${deviceId}&t=${Date.now()}`,
          { headers: { Accept: 'application/json' } }
        )
        if (!r.ok) return
        const data = await r.json()
        const url = data.data?.imageUrl ?? data.data?.url
        const capturedAt = data.data?.capturedAt
        const baseUrl = url?.split('?')[0] ?? ''
        if (url && capturedAt && baseUrl !== lastLatestRef.current) {
          lastLatestRef.current = baseUrl
          const fileName = baseUrl.split('/').pop() ?? ''
          const newItem: ScreenshotItem = {
            id: `live-${Date.now()}`,
            deviceId,
            deviceName: '',
            deviceIdentifier: '',
            employeeId: null,
            employeeCode: null,
            employeeName: null,
            sessionId: '',
            fileName,
            fileUrl: baseUrl,
            fileSize: null,
            width: null,
            height: null,
            createdAt: capturedAt,
          }
          setNewItems((prev) => [newItem, ...prev].slice(0, 5))
        }
      } catch {
        // ignore
      }
    }

    poll()
    pollRef.current = setInterval(poll, 3000)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [deviceId, liveMode])

  const handleDelete = async () => {
    if (!modalItem) return
    setDeleting(true)
    try {
      const r = await fetch(`/api/device/screenshot/${modalItem.id}`, {
        method: 'DELETE',
      })
      if (!r.ok) throw new Error('Failed to delete')
      setToast({ message: 'تم حذف اللقطة', type: 'success' })
      setModalItem(null)
      setScreenshots((prev) => prev.filter((s) => s.id !== modalItem.id))
      setNewItems((prev) => prev.filter((s) => s.id !== modalItem.id))
    } catch {
      setToast({ message: 'فشل حذف اللقطة', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  const handleDownload = () => {
    if (!modalItem) return
    const a = document.createElement('a')
    a.href = modalItem.fileUrl
    a.download = modalItem.fileName
    a.click()
  }

  const displayItems = [...newItems, ...screenshots].filter(
    (s, i, arr) => arr.findIndex((x) => x.fileUrl === s.fileUrl) === i
  )

  const pag = pagination ?? { page: 1, totalPages: 1, totalCount: 0 }

  return (
    <div dir="rtl">
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
            معرض لقطات الشاشة
          </h2>
          {deviceId && (
            <span className="text-slate-500 font-mono text-sm" dir="ltr">
              {deviceId}
            </span>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth no-scrollbar">
        <div className="max-w-[1600px] mx-auto space-y-6">
          {/* Filters */}
          <div className="rounded-2xl bg-[#0B101E] border border-white/5 p-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-slate-500" />
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="bg-[#080B14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white scheme-dark"
              />
              <span className="text-slate-500">—</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="bg-[#080B14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white scheme-dark"
              />
            </div>
            <div className="flex items-center gap-2">
              <User size={18} className="text-slate-500" />
              <select
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="bg-[#080B14] border border-white/10 rounded-lg px-3 py-2 text-sm text-white min-w-[160px]"
              >
                <option value="">جميع الموظفين</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.fullName} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setFrom('')
                setTo('')
                setEmployeeId('')
                setPage(1)
              }}
              className="text-sm text-slate-400 hover:text-white transition"
            >
              مسح الفلاتر
            </button>
            <div className="ms-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLiveMode((m) => !m)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition border
                  ${liveMode
                    ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                  }`}
              >
                <Radio size={16} className={liveMode ? 'animate-pulse' : ''} />
                {liveMode ? 'وضع مباشر' : 'وضع مباشر'}
              </button>
            </div>
          </div>

          {/* Live Preview - requests new screenshot every 2s when ON */}
          {deviceId && (
            <div className="rounded-2xl bg-[#0B101E] border border-white/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">معاينة مباشرة</span>
                  {livePreviewOn && (
                    <span className="flex items-center gap-1.5 text-xs font-medium text-red-400">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
                      </span>
                      مباشر
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setLivePreviewOn((on) => !on)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition border
                      ${livePreviewOn
                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
                      }`}
                  >
                    {livePreviewOn ? 'إيقاف المعاينة' : 'بدء المعاينة المباشرة'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCaptureScreenshot}
                    disabled={capturing}
                    className="px-3 py-1.5 rounded-lg text-sm bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 disabled:opacity-50 transition flex items-center gap-2"
                  >
                    {capturing ? <Loader2 size={14} className="animate-spin" /> : null}
                    التقاط لقطة شاشة
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPreviewError(false)
                      setPreviewRefreshKey((k) => k + 1)
                      setPreviewTimestamp(Date.now())
                      fetchLatestPreview()
                    }}
                    className="px-3 py-1.5 rounded-lg text-sm bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition"
                  >
                    تحديث المعاينة
                  </button>
                </div>
              </div>
              <div className="aspect-video bg-[#080B14] flex items-center justify-center min-h-[240px] relative">
                {(livePreviewOn ? liveImage : livePreviewUrl) ? (
                  <img
                    src={livePreviewOn ? liveImage! : livePreviewUrl!}
                    alt="المعاينة المباشرة"
                    className="w-full h-auto rounded-xl shadow-lg"
                    style={{ objectFit: 'contain' }}
                  />
                ) : (
                  <div className="text-center text-gray-400 py-20">
                    لا توجد صورة حالياً
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Grid */}
          {loading && displayItems.length === 0 ? (
            <div className="flex justify-center py-24">
              <Loader2 size={40} className="animate-spin text-blue-500" />
            </div>
          ) : displayItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
              <ImageIcon size={64} className="mb-4 opacity-30" />
              <p className="text-lg font-medium">لا توجد لقطات شاشة</p>
              <p className="text-sm mt-1">
                لم يتم التقاط أي لقطة لهذا الجهاز في الفترة المحددة
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayItems.map((item, idx) => (
                <GalleryCard
                  key={item.id}
                  item={item}
                  isNew={newItems.some((n) => n.id === item.id)}
                  onClick={() => {
                    setModalItem(item)
                    setZoom(1)
                  }}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {pag.totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-6">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                السابق
              </button>
              <span className="flex items-center px-4 text-slate-400 text-sm">
                {page} / {pag.totalPages} ({pag.totalCount} لقطة)
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(pag.totalPages, p + 1))}
                disabled={page >= pag.totalPages || loading}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                التالي
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalItem && (
        <ScreenshotModal
          item={modalItem}
          zoom={zoom}
          onZoomChange={setZoom}
          onClose={() => setModalItem(null)}
          onDownload={handleDownload}
          onDelete={handleDelete}
          deleting={deleting}
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

function GalleryCard({
  item,
  isNew,
  onClick,
}: {
  item: ScreenshotItem
  isNew: boolean
  onClick: () => void
}) {
  return (
    <div
      className={`group relative aspect-video rounded-xl overflow-hidden bg-[#080B14] border border-white/10 hover:border-blue-500/30 transition-all duration-300 cursor-pointer
        ${isNew ? 'animate-[fadeIn_0.5s_ease-out_forwards]' : ''}`}
      onClick={onClick}
    >
      <div className="absolute inset-0">
        <Image
          src={`${item.fileUrl}${item.fileUrl.includes('?') ? '&' : '?'}t=${new Date(item.createdAt).getTime()}`}
          alt={item.fileName}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          unoptimized
        />
      </div>
      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
        <div className="text-white text-sm font-medium truncate">
          {formatDate(item.createdAt)}
        </div>
        <div className="text-slate-300 text-xs mt-0.5">
          {item.employeeCode ?? item.employeeName ?? '—'}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onClick()
          }}
          className="mt-2 self-start px-3 py-1.5 rounded-lg bg-blue-500/80 hover:bg-blue-500 text-white text-xs font-medium transition"
        >
          عرض
        </button>
      </div>
      {isNew && (
        <div className="absolute top-2 inset-e-2 px-2 py-0.5 rounded-full bg-blue-500/90 text-white text-[10px] font-medium">
          جديد
        </div>
      )}
    </div>
  )
}

function ScreenshotModal({
  item,
  zoom,
  onZoomChange,
  onClose,
  onDownload,
  onDelete,
  deleting,
}: {
  item: ScreenshotItem
  zoom: number
  onZoomChange: (z: number) => void
  onClose: () => void
  onDownload: () => void
  onDelete: () => void
  deleting: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-90 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-7xl h-[90vh] flex rounded-2xl overflow-hidden bg-[#0B101E] border border-white/10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image area */}
        <div className="flex-1 flex items-center justify-center overflow-auto p-4 min-w-0">
          <div
            className="relative transition-transform duration-200"
            style={{ transform: `scale(${zoom})` }}
          >
            <Image
              src={`${item.fileUrl}${item.fileUrl.includes('?') ? '&' : '?'}t=${new Date(item.createdAt).getTime()}`}
              alt={item.fileName}
              width={1200}
              height={800}
              className="max-w-full h-auto rounded-lg"
              unoptimized
            />
          </div>
        </div>

        {/* Metadata panel */}
        <div className="w-72 shrink-0 border-s border-white/10 bg-[#080B14] p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">تفاصيل اللقطة</h3>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition"
              aria-label="إغلاق"
            >
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4 text-sm">
            <div>
              <div className="text-slate-500 mb-1">الجهاز</div>
              <div className="text-white font-medium">
                {item.deviceName || item.deviceIdentifier || '—'}
              </div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">الموظف</div>
              <div className="text-white">
                {item.employeeName ?? item.employeeCode ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">التاريخ والوقت</div>
              <div className="text-white" dir="ltr">
                {formatDate(item.createdAt)}
              </div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">الدقة</div>
              <div className="text-white">
                {item.width && item.height
                  ? `${item.width} × ${item.height}`
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">حجم الملف</div>
              <div className="text-white">
                {formatFileSize(item.fileSize)}
              </div>
            </div>
          </div>

          <div className="mt-auto pt-6 space-y-2 border-t border-white/10">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onZoomChange(Math.max(0.5, zoom - 0.25))}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition"
              >
                <ZoomOut size={16} />
                تصغير
              </button>
              <button
                type="button"
                onClick={() => onZoomChange(Math.min(3, zoom + 0.25))}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition"
              >
                <ZoomIn size={16} />
                تكبير
              </button>
            </div>
            <button
              type="button"
              onClick={onDownload}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30 transition"
            >
              <Download size={16} />
              تحميل
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 disabled:opacity-50 transition"
            >
              {deleting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              حذف
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
