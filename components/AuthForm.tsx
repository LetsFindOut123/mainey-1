'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function AuthForm({ type }: { type: 'login' | 'signup' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage('')
    setLoading(true)
    const endpoint = type === 'login' ? '/api/auth/login' : '/api/auth/signup'
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setMessage(json?.error?.message || 'Request failed.')
      } else {
        if (type === 'login') {
          const next = searchParams.get('next')
          let target = '/dashboard'
          if (next) {
            try {
              target = decodeURIComponent(next)
            } catch {
              target = next
            }
          }
          router.replace(target)
        } else {
          router.replace('/login?signup=1')
        }
      }
    } catch (err: any) {
      setMessage(err?.message || 'Network error.')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto text-center">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
      />
      <input
        type="password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded"
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-red-600 py-2 rounded text-white hover:bg-red-700 disabled:opacity-60"
      >
        {loading ? 'Please wait…' : type === 'login' ? 'Login' : 'Sign Up'}
      </button>
      {message && <p className="text-gray-400 text-sm">{message}</p>}
    </form>
  )
}
