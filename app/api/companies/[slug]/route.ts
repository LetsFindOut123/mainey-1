import { cookies } from 'next/headers'
import { jsonError, jsonOk, readJson } from '@/app/api/_utils'
import { getAuthTokenFromRequest, getSupabaseAnonClient, getUserIdFromAccessToken } from '@/app/api/_supabase'

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

  const companyRes = await supabase
    .from('companies')
    .select('id, owner_id, name, slug, bio, website_url, logo_url, theme, created_at')
    .eq('slug', s)
    .maybeSingle()

  if (companyRes.error) return jsonError('internal', companyRes.error.message, 500)
  if (!companyRes.data) return jsonError('not_found', 'Company not found', 404)

  const pagesRes = await supabase
    .from('company_pages')
    .select('id, company_id, type, title, content, sort_order, created_at')
    .eq('company_id', companyRes.data.id)
    .order('sort_order', { ascending: true })

  if (pagesRes.error) return jsonError('internal', pagesRes.error.message, 500)

  return jsonOk({
    company: {
      id: companyRes.data.id,
      ownerId: companyRes.data.owner_id,
      name: companyRes.data.name,
      slug: companyRes.data.slug,
      bio: companyRes.data.bio ?? null,
      websiteUrl: companyRes.data.website_url ?? null,
      logoUrl: companyRes.data.logo_url ?? null,
      theme: companyRes.data.theme ?? null,
      createdAt: companyRes.data.created_at,
    },
    pages: (pagesRes.data ?? []).map(p => ({
      id: p.id,
      companyId: p.company_id,
      type: p.type,
      title: p.title ?? null,
      content: p.content,
      sortOrder: p.sort_order,
      createdAt: p.created_at,
    })),
    related: { gigsCount: 0, eventsCount: 0 }
  })
}

type PatchCompanyBody = {
  name?: string
  bio?: string | null
  website_url?: string | null
  logo_url?: string | null
  theme?: any | null
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

  const existing = await supabase.from('companies').select('id, owner_id').eq('slug', s).maybeSingle()
  if (existing.error) return jsonError('internal', existing.error.message, 500)
  if (!existing.data) return jsonError('not_found', 'Company not found', 404)
  if (existing.data.owner_id !== userId) return jsonError('forbidden', 'Only the company owner can edit', 403)

  const body = await readJson<PatchCompanyBody>(req)
  const patch: Record<string, any> = {}
  if (typeof body?.name === 'string') patch.name = body.name.trim()
  if (body && 'bio' in body) patch.bio = body.bio
  if (body && 'website_url' in body) patch.website_url = body.website_url
  if (body && 'logo_url' in body) patch.logo_url = body.logo_url
  if (body && 'theme' in body) patch.theme = body.theme
  if (Object.keys(patch).length === 0) return jsonError('bad_request', 'No fields to update', 400)
  if (typeof patch.name === 'string' && !patch.name) return jsonError('bad_request', 'name cannot be empty', 400)

  const updated = await supabase
    .from('companies')
    .update(patch)
    .eq('id', existing.data.id)
    .select('id, owner_id, name, slug, bio, website_url, logo_url, theme, created_at')
    .single()

  if (updated.error) return jsonError('internal', updated.error.message, 500)

  return jsonOk({
    company: {
      id: updated.data.id,
      ownerId: updated.data.owner_id,
      name: updated.data.name,
      slug: updated.data.slug,
      bio: updated.data.bio ?? null,
      websiteUrl: updated.data.website_url ?? null,
      logoUrl: updated.data.logo_url ?? null,
      theme: updated.data.theme ?? null,
      createdAt: updated.data.created_at,
    },
  })
}

