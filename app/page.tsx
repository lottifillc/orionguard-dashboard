'use client'

import { Activity, Users, Monitor, AlertTriangle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const data = [
  { name: 'Mon', productivity: 72 },
  { name: 'Tue', productivity: 80 },
  { name: 'Wed', productivity: 65 },
  { name: 'Thu', productivity: 90 },
  { name: 'Fri', productivity: 75 },
]

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#0B0F19] text-white p-8">
      <h1 className="text-3xl font-bold mb-8">OrionGuard Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <Card title="Active Employees" value="24" icon={<Users />} />
        <Card title="Online Devices" value="18" icon={<Monitor />} />
        <Card title="Avg Productivity" value="78%" icon={<Activity />} />
        <Card title="Alerts Today" value="3" icon={<AlertTriangle />} />
      </div>

      {/* Productivity Chart */}
      <div className="bg-[#121826] p-6 rounded-xl shadow-lg">
        <h2 className="text-xl font-semibold mb-4">Weekly Productivity</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip />
              <Bar dataKey="productivity" fill="#2563EB" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function Card({ title, value, icon }: any) {
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