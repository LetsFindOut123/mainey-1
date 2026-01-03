import { MapPinsClient } from './ui'

export default function MapPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Map</h1>
        <p className="text-gray-300">Unified pins feed (v1). Map UI coming soon.</p>
      </div>
      <MapPinsClient />
    </div>
  )
}

