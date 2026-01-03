import { EventsClient } from './ui'

export default function EventsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Events</h1>
        <p className="text-gray-300">Browse public events. Log in to create or RSVP.</p>
      </div>
      <EventsClient />
    </div>
  )
}
