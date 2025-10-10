import { CategoryGrid } from '@/components/CategoryGrid'

export default function HomePage() {
  return (
    <div className="space-y-12">
      <section className="text-center py-12">
        <h1 className="text-5xl font-bold text-red-500 mb-4">Welcome to Mainey</h1>
        <p className="text-lg text-gray-300">
          The all-in-one creative hub for artists, filmmakers, musicians, and dreamers.
        </p>
      </section>

      <CategoryGrid />

      <section className="text-center">
        <h2 className="text-3xl font-semibold mb-4">Join the Movement</h2>
        <p className="text-gray-400 max-w-2xl mx-auto mb-6">
          Build your profile, collaborate with creators, and bring your projects to life.
        </p>
        <a
          href="/signup"
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Get Started
        </a>
      </section>
    </div>
  )
}
