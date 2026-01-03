import { RequireAuth } from '@/components/RequireAuth'
import { DashboardClient } from './ui'

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardClient />
    </RequireAuth>
  )
}

