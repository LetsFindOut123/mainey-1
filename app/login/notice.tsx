'use client'

import { useSearchParams } from 'next/navigation'

export function LoginNotice() {
  const sp = useSearchParams()
  const signup = sp.get('signup')

  if (signup !== '1') return null

  return (
    <div className="mb-6 rounded border border-green-800 bg-green-900/20 px-4 py-3 text-sm text-green-200">
      Signup successful. Please log in to continue.
    </div>
  )
}

