import { jsonError } from '@/app/api/_utils'

export async function GET() {
  return jsonError('not_implemented', 'TODO: List message threads (authenticated) via internal API boundary', 501)
}

export async function POST() {
  return jsonError('not_implemented', 'TODO: Send message (authenticated) via internal API boundary', 501)
}

