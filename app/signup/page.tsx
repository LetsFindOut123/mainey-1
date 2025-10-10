import AuthForm from '@/components/AuthForm'

export default function SignupPage() {
  return (
    <div className="max-w-xl mx-auto py-10">
      <h1 className="text-3xl font-semibold mb-6">Signup</h1>
      <AuthForm type="signup" />
    </div>
  )
}
