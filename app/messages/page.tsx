import { RequireAuth } from '@/components/RequireAuth'

export default function MessagesPage() {
  return (
    <RequireAuth>
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Messages</h1>
        <p className="text-gray-300">Coming soon. This area will be protected behind auth.</p>
      </div>
    </RequireAuth>
  )
}

