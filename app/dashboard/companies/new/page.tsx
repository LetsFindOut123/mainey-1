import { RequireAuth } from '@/components/RequireAuth'
import { NewCompanyClient } from './ui'

export default function NewCompanyPage() {
  return (
    <RequireAuth>
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold">Create Company</h1>
        <NewCompanyClient />
      </div>
    </RequireAuth>
  )
}

