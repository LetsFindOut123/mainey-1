'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true

    async function check() {
      const res = await fetch('/api/auth/me')
      if (!alive) return

      if (!res.ok) {
        const next = encodeURIComponent(pathname || '/dashboard')
        router.replace(`/login?next=${next}`)
        return
      }

      setReady(true)
    }

    check()

    return () => {
      alive = false
    }
  }, [router, pathname])

  if (!ready) {
    return (
      <div className="py-10 text-center text-gray-400">
        Checking session…
      </div>
    )
  }

  return <>{children}</>
}

