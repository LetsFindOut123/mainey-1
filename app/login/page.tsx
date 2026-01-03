import AuthForm from '@/components/AuthForm'
import { RedirectIfAuthed } from '@/components/RedirectIfAuthed'
import { LoginNotice } from './notice'
import { Suspense } from 'react'

export default function LoginPage() {
  return (
    <div className="max-w-xl mx-auto py-10">
      <h1 className="text-3xl font-semibold mb-6">Login</h1>
      <RedirectIfAuthed to="/dashboard" />
      <Suspense fallback={null}>
        <LoginNotice />
        <AuthForm type="login" />
      </Suspense>
    </div>
  )
}
