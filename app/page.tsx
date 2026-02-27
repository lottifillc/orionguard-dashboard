'use client'

import { useEffect, useState } from 'react'
import {
  Activity,
  Users,
  Monitor,
  AlertTriangle,
  Clock,
  Image,
  LogIn,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface OverviewData {
  employees: number
  devices: number
  activeSessions: number
  totalActiveSecondsToday: number
  totalIdleSecondsToday: number
  productivity: number
  screenshotsToday: number
}

function secondsToHours(seconds: number): string {
  const hours = seconds / 3600
  return hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`
}

const chartData = [
  { name: 'Mon', productivity: 72 },
  { name: 'Tue', productivity: 80 },
  { name: 'Wed', productivity: 65 },
  { name: 'Thu', productivity: 90 },
  { name: 'Fri', productivity: 75 },
]

export default function Dashboard() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchOverview() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch('/api/v1/overview')
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status}`)
        }
        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    fetchOverview()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white p-8">
        <h1 className="text-3xl font-bold mb-8">OrionGuard Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="bg-[#121826] p-6 rounded-xl shadow-md animate-pulse"
            >
              <div className="h-4 bg-[#1e293b] rounded w-24 mb-4" />
              <div className="h-8 bg-[#1e293b] rounded w-16" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0F19] text-white p-8">
        <h1 className="text-3xl font-bold mb-8">OrionGuard Dashboard</h1>
        <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-6 py-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="shrink-0" />
          <p>{error}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  const cards = [
    { title: 'Employees', value: String(data.employees), icon: <Users /> },
    { title: 'Devices', value: String(data.devices), icon: <Monitor /> },
    {
      title: 'Active Sessions',
      value: String(data.activeSessions),
      icon: <LogIn />,
    },
    {
      title: 'Productivity',
      value: `${data.productivity}%`,
      icon: <Activity />,
    },
    {
      title: 'Active Hours Today',
      value: secondsToHours(data.totalActiveSecondsToday),
      icon: <Clock />,
    },
    {
      title: 'Idle Hours Today',
      value: secondsToHours(data.totalIdleSecondsToday),
      icon: <Clock />,
    },
    {
      title: 'Screenshots Today',
      value: String(data.screenshotsToday),
      icon: <Image />,
    },
  ]

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-8">
      <h1 className="text-3xl font-bold mb-8">OrionGuard Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {cards.map((card) => (
          <Card
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
          />
        ))}
      </div>

      {/* Productivity Chart */}
      <div className="bg-[#121826] p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Weekly Productivity</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="name" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip />
              <Bar
                dataKey="productivity"
                fill="#2563EB"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function Card({
  title,
  value,
  icon,
}: {
  title: string
  value: string
  icon: React.ReactNode
}) {
  return (
    <div className="bg-[#121826] p-6 rounded-xl shadow-md flex items-center justify-between">
      <div>
        <p className="text-gray-400 text-sm">{title}</p>
        <h3 className="text-2xl font-bold mt-2">{value}</h3>
      </div>
      <div className="text-blue-500">{icon}</div>
    </div>
  )
}
