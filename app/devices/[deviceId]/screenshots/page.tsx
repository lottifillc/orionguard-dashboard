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
  const lastLatestRef = useRef<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const resolvedParams = React.use(params)

  useEffect(() => {
    setDeviceId(resolvedParams.deviceId)
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

  useEffect(() => {
    if (!deviceId || !liveMode) return

    const poll = async () => {
      try {
        const r = await fetch(
          `/api/device/screenshot/latest?deviceId=${deviceId}`
        )
        if (!r.ok) return
        const data = await r.json()
        const url = data.data?.url
        const capturedAt = data.data?.capturedAt
        if (url && capturedAt && url !== lastLatestRef.current) {
          lastLatestRef.current = url
          const fileName = url.split('/').pop() ?? ''
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
            fileUrl: url,
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
    pollRef.current = setInterval(poll, 5000)
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
    <>
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
    </>
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
          src={item.fileUrl}
          alt={item.fileName}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
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
              src={item.fileUrl}
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
