import { RequireAuth } from '@/components/RequireAuth'
import { EditCompanyClient } from './ui'

export default function EditCompanyPage() {
  return (
    <RequireAuth>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Edit Company</h1>
        <EditCompanyClient />
      </div>
    </RequireAuth>
  )
}

