'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function RedirectIfAuthed({ to = '/dashboard' }: { to?: string }) {
  const router = useRouter()

  useEffect(() => {
    let alive = true

    async function check() {
      if (!alive) return
      const res = await fetch('/api/auth/me')
      if (!alive) return
      if (res.ok) router.replace(to)
    }

    check()

    return () => {
      alive = false
    }
  }, [router, to])

  return null
}

