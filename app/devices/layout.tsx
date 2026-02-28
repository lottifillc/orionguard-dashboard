import { DashboardShell } from '@/components/dashboard/DashboardShell'

export default function DevicesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <DashboardShell>{children}</DashboardShell>
}
