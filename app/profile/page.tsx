import { RequireAuth } from '@/components/RequireAuth'

export default function ProfilePage() {
  return (
    <RequireAuth>
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold">Profile</h1>
        <p className="text-gray-300">This is the profile page. Data will load from Supabase here.</p>
      </div>
    </RequireAuth>
  )
}
