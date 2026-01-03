'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export function DashboardClient() {
  const router = useRouter()
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    let alive = true

    async function load() {
      const res = await fetch('/api/auth/me')
      const json = await res.json().catch(() => null)
      if (!alive) return
      setEmail(json?.data?.user?.email ?? null)
    }

    load()

    return () => {
      alive = false
    }
  }, [])

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <p className="text-gray-300">
        You’re signed in{email ? ` as ${email}` : ''}.
      </p>
      <button
        onClick={logout}
        className="px-4 py-2 rounded bg-gray-800 border border-gray-700 hover:border-gray-500"
      >
        Log out
      </button>
    </div>
  )
}

