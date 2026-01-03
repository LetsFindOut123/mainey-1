import { RequireAuth } from '@/components/RequireAuth'
import { DashboardCompaniesClient } from './ui'

export default function DashboardCompaniesPage() {
  return (
    <RequireAuth>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">My Companies</h1>
        <DashboardCompaniesClient />
      </div>
    </RequireAuth>
  )
}

