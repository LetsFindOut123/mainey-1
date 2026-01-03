import { FeedClient } from './ui'

export default function FeedPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Feed</h1>
        <p className="text-gray-300">Public posts from the community. Log in to post.</p>
      </div>
      <FeedClient />
    </div>
  )
}
