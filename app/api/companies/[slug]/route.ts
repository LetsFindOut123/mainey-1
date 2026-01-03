import { jsonError } from '@/app/api/_utils'

export async function GET() {
  return jsonError('not_implemented', 'TODO: Public company by slug via internal API boundary', 501)
}

