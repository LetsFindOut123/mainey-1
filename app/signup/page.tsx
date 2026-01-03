import AuthForm from '@/components/AuthForm'
import { RedirectIfAuthed } from '@/components/RedirectIfAuthed'
import { Suspense } from 'react'

export default function SignupPage() {
  return (
    <div className="max-w-xl mx-auto py-10">
      <h1 className="text-3xl font-semibold mb-6">Signup</h1>
      <RedirectIfAuthed to="/dashboard" />
      <Suspense fallback={null}>
        <AuthForm type="signup" />
      </Suspense>
    </div>
  )
}
