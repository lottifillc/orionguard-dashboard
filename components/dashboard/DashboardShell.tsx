'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Monitor,
  ActivitySquare,
  Image as ImageIcon,
  Bell,
  Settings,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react'

type NavItem = {
  href: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
}

const mainNav: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'نظرة عامة' },
  { href: '/dashboard/employees', icon: Users, label: 'الموظفون' },
  { href: '/dashboard/devices', icon: Monitor, label: 'إدارة الأجهزة' },
  { href: '/dashboard/analytics', icon: ActivitySquare, label: 'التحليلات' },
]

const monitorNav: NavItem[] = [
  { href: '/dashboard/screenshots', icon: ImageIcon, label: 'لقطات الشاشة' },
  { href: '/dashboard/alerts', icon: Bell, label: 'التنبيهات' },
]

const systemNav: NavItem[] = [
  { href: '/dashboard/settings', icon: Settings, label: 'الإعدادات' },
]

function SidebarItem({
  icon: Icon,
  label,
  href,
  active,
}: NavItem & { active: boolean }) {
  return (
    <Link
      href={href}
      className={`w-full flex items-center gap-3 px-4 py-3 mb-2 rounded-xl transition-all duration-300 group
    ${active
        ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-[0_0_15px_rgba(0,102,255,0.15)]'
        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'}`}
    >
      <Icon
        size={20}
        className={`${active ? 'animate-pulse' : 'group-hover:scale-110 transition-transform'}`}
      />
      <span className="font-medium text-sm">{label}</span>
      {active && (
        <div className="ms-auto w-1 h-5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(0,102,255,0.8)]" />
      )}
    </Link>
  )
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href === '/dashboard/devices') return pathname.startsWith('/dashboard/devices')
    return pathname.startsWith(href)
  }

  return (
    <div className="h-screen w-full bg-[#050811] text-white flex overflow-hidden font-sans">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage:
            'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <aside className="w-72 border-e border-white/5 bg-[#080B14]/80 backdrop-blur-xl flex flex-col z-20">
        <div className="h-20 flex items-center px-8 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-linear-to-br from-blue-500/20 to-blue-900/20 border border-blue-500/30">
              <ShieldAlert className="text-blue-500" size={20} />
              <div className="absolute inset-0 blur-md bg-blue-500/20 rounded-lg" />
            </div>
            <div>
              <h1
                className="font-bold text-lg tracking-widest text-white leading-tight"
                dir="ltr"
              >
                ORION<span className="text-blue-500">GUARD</span>
              </h1>
              <p className="text-[9px] text-slate-500 font-medium tracking-widest uppercase mt-0.5">
                نظام ذكاء الإنتاجية
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-6 px-4 no-scrollbar">
          <div className="text-xs font-semibold text-slate-600 mb-4 px-4 tracking-wider uppercase">
            اللوحة الرئيسية
          </div>
          {mainNav.map((item) => (
            <SidebarItem
              key={item.href}
              {...item}
              active={isActive(item.href)}
            />
          ))}

          <div className="text-xs font-semibold text-slate-600 mb-4 mt-8 px-4 tracking-wider uppercase">
            المراقبة
          </div>
          {monitorNav.map((item) => (
            <SidebarItem
              key={item.href}
              {...item}
              active={isActive(item.href)}
            />
          ))}

          <div className="text-xs font-semibold text-slate-600 mb-4 mt-8 px-4 tracking-wider uppercase">
            النظام
          </div>
          {systemNav.map((item) => (
            <SidebarItem
              key={item.href}
              {...item}
              active={isActive(item.href)}
            />
          ))}
        </div>

        <div className="p-4 border-t border-white/5 bg-white/2">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10 transition">
            <div className="w-8 h-8 rounded-full bg-linear-to-tr from-blue-600 to-purple-600 flex items-center justify-center text-sm font-bold shadow-[0_0_10px_rgba(0,102,255,0.4)]">
              AD
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-medium truncate">بوابة الإدارة</div>
              <div className="text-xs text-slate-400 truncate">
                عقدة خادم المقر الرئيسي
              </div>
            </div>
            <ChevronDown size={16} className="text-slate-400" />
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-0 relative z-10 overflow-x-hidden overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
