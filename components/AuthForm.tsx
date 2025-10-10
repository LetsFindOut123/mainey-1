'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

export default function AuthForm({ type }: { type: 'login' | 'signup' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (type === 'login') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMessage(error.message)
      else {
        setMessage('Logged in!')
        router.push('/profile')
      }
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      setMessage(error ? error.message : 'Check your email for confirmation.')
    }
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
      <button type="submit" className="w-full bg-red-600 py-2 rounded text-white hover:bg-red-700">
        {type === 'login' ? 'Login' : 'Sign Up'}
      </button>
      {message && <p className="text-gray-400 text-sm">{message}</p>}
    </form>
  )
}
