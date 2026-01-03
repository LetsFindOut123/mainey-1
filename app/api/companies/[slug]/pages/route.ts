import { cookies } from 'next/headers'
import { jsonError, jsonOk, readJson } from '@/app/api/_utils'
import { getAuthTokenFromRequest, getSupabaseAnonClient, getUserIdFromAccessToken } from '@/app/api/_supabase'

type PageType = 'hero' | 'about' | 'links' | 'events' | 'gigs' | 'custom'

function isObject(v: unknown): v is Record<string, any> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const s = (slug || '').trim().toLowerCase()
  if (!s) return jsonError('bad_request', 'slug is required', 400)

  let supabase
  try {
    supabase = getSupabaseAnonClient()
  } catch (e: any) {
    return jsonError('internal', e?.message || 'Supabase is not configured', 500)
  }

  const companyRes = await supabase.from('companies').select('id').eq('slug', s).maybeSingle()
  if (companyRes.error) return jsonError('internal', companyRes.error.message, 500)
  if (!companyRes.data) return jsonError('not_found', 'Company not found', 404)

  const pagesRes = await supabase
    .from('company_pages')
    .select('id, company_id, type, title, content, sort_order, created_at')
    .eq('company_id', companyRes.data.id)
    .order('sort_order', { ascending: true })

  if (pagesRes.error) return jsonError('internal', pagesRes.error.message, 500)

  return jsonOk({
    pages: (pagesRes.data ?? []).map(p => ({
      id: p.id,
      companyId: p.company_id,
      type: p.type,
      title: p.title ?? null,
      content: p.content,
      sortOrder: p.sort_order,
      createdAt: p.created_at,
    })),
  })
}

type PatchPagesBody = {
  pages?: Array<{
    type: PageType
    title?: string | null
    content?: any
    sort_order?: number
  }>
}

export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params
  const s = (slug || '').trim().toLowerCase()
  if (!s) return jsonError('bad_request', 'slug is required', 400)

  const jar = await cookies()
  const token = jar.get('mainey_access_token')?.value || getAuthTokenFromRequest(req, 'mainey_access_token')
  if (!token) return jsonError('unauthorized', 'Not signed in', 401)

  const userId = await getUserIdFromAccessToken(token)
  if (!userId) return jsonError('unauthorized', 'Invalid session', 401)

  let supabase
  try {
    supabase = getSupabaseAnonClient(token)
  } catch (e: any) {
    return jsonError('internal', e?.message || 'Supabase is not configured', 500)
  }

  const companyRes = await supabase
    .from('companies')
    .select('id, owner_id')
    .eq('slug', s)
    .maybeSingle()

  if (companyRes.error) return jsonError('internal', companyRes.error.message, 500)
  if (!companyRes.data) return jsonError('not_found', 'Company not found', 404)
  if (companyRes.data.owner_id !== userId) return jsonError('forbidden', 'Only the company owner can edit pages', 403)

  const companyId = companyRes.data.id

  const body = await readJson<PatchPagesBody>(req)
  const pages = body?.pages ?? []
  if (!Array.isArray(pages) || pages.length === 0) return jsonError('bad_request', 'pages array is required', 400)

  const allowedTypes: PageType[] = ['hero', 'about', 'links']
  for (const p of pages) {
    if (!p?.type || !allowedTypes.includes(p.type)) {
      return jsonError('bad_request', 'Only hero/about/links pages are editable in v1', 400)
    }
    if (!isObject(p.content)) return jsonError('bad_request', 'content must be an object', 400)
  }

  const upserts = pages.map(p => ({
    company_id: companyId,
    type: p.type,
    title: typeof p.title === 'string' ? p.title : null,
    content: p.content ?? {},
    sort_order: typeof p.sort_order === 'number' ? p.sort_order : 0,
  }))

  const upsertRes = await supabase
    .from('company_pages')
    .upsert(upserts, { onConflict: 'company_id,type' })
    .select('id, company_id, type, title, content, sort_order, created_at')

  if (upsertRes.error) return jsonError('internal', upsertRes.error.message, 500)

  const pagesRes = await supabase
    .from('company_pages')
    .select('id, company_id, type, title, content, sort_order, created_at')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true })

  if (pagesRes.error) return jsonError('internal', pagesRes.error.message, 500)

  return jsonOk({
    pages: (pagesRes.data ?? []).map(p => ({
      id: p.id,
      companyId: p.company_id,
      type: p.type,
      title: p.title ?? null,
      content: p.content,
      sortOrder: p.sort_order,
      createdAt: p.created_at,
    })),
  })
}

