import { CompaniesClient } from './ui'

export default function CompaniesPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Companies</h1>
        <p className="text-gray-300">Public company pages by slug.</p>
      </div>
      <CompaniesClient />
    </div>
  )
}
