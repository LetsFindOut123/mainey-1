import { jsonError } from '@/app/api/_utils'

export async function POST() {
  return jsonError('not_implemented', 'Deprecated: use POST /api/gigs/apply', 501)
}

