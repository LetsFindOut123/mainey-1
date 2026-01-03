'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export function RedirectIfAuthed({ to = '/dashboard' }: { to?: string }) {
  const router = useRouter()

  useEffect(() => {
    let alive = true

    async function check() {
      const { data } = await supabase.auth.getSession()
      if (!alive) return
      if (data.session) router.replace(to)
    }

    check()

    return () => {
      alive = false
    }
  }, [router, to])

  return null
}

