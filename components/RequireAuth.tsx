'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let alive = true

    async function check() {
      const { data } = await supabase.auth.getSession()
      if (!alive) return

      if (!data.session) {
        const next = encodeURIComponent(pathname || '/dashboard')
        router.replace(`/login?next=${next}`)
        return
      }

      setReady(true)
    }

    check()

    const { data: sub } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (!session) {
        const next = encodeURIComponent(pathname || '/dashboard')
        router.replace(`/login?next=${next}`)
      }
    })

    return () => {
      alive = false
      sub.subscription.unsubscribe()
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

