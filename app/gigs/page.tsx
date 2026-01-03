import { GigsClient } from './ui'

export default function GigsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Gigs</h1>
        <p className="text-gray-300">Browse public gigs. Log in to create or apply.</p>
      </div>
      <GigsClient />
    </div>
  )
}
