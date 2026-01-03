'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const nav = [
  'Home','Feed','Discover','Community','Gigs','Events',
  'Calendar','Projects','Companies','Spaces','Fundraising','Marketplace'
]

export function Header() {
  const path = usePathname()
  const router = useRouter()
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    let alive = true

    async function load() {
      if (!alive) return
      const res = await fetch('/api/auth/me')
      if (!alive) return
      setAuthed(res.ok)
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
    <header className="border-b border-gray-800 sticky top-0 bg-black/80 backdrop-blur z-50">
      <nav className="flex items-center justify-between px-6 py-3 max-w-7xl mx-auto">
        <Link href="/" className="text-2xl font-bold text-red-500">Mainey</Link>
        <ul className="hidden md:flex flex-wrap gap-5">
          {nav.map(label => {
            const href = label === 'Home' ? '/' : `/${label.toLowerCase()}`
            const active = path === href
            return (
              <li key={label}>
                <Link
                  href={href}
                  className={`${active ? 'text-red-500 font-semibold' : 'text-gray-300 hover:text-red-400'}`}
                >
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
        <div className="flex items-center gap-4">
          {authed ? (
            <>
              <Link href="/dashboard" className="text-gray-300 hover:text-red-400">Dashboard</Link>
              <Link href="/profile" className="text-gray-300 hover:text-red-400">Profile</Link>
              <Link href="/messages" className="text-gray-300 hover:text-red-400">Messages</Link>
              <button
                onClick={logout}
                className="px-3 py-1 rounded bg-gray-800 border border-gray-700 hover:border-gray-500"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/signup" className="text-gray-300 hover:text-red-400">Sign up</Link>
              <Link href="/login" className="px-3 py-1 rounded bg-red-600 hover:bg-red-700">Login</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
