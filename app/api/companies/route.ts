import { cookies } from 'next/headers'
import { jsonError, jsonOk, readJson } from '@/app/api/_utils'
import { getAuthTokenFromRequest, getSupabaseAnonClient, getUserIdFromAccessToken } from '@/app/api/_supabase'
import { normalizeAndValidateSlug } from './_slug'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const limitRaw = url.searchParams.get('limit')
  const cursor = url.searchParams.get('cursor')
  const limit = clamp(Number(limitRaw || 10), 1, 50)

  let supabase
  try {
    supabase = getSupabaseAnonClient()
  } catch (e: any) {
    return jsonError('internal', e?.message || 'Supabase is not configured', 500)
  }

  let q = supabase
    .from('companies')
    .select('id, owner_id, name, slug, bio, website_url, logo_url, theme, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) q = q.lt('created_at', cursor)

  const { data, error } = await q
  if (error) return jsonError('internal', error.message, 500)

  const rows = data ?? []
  const nextCursor = rows.length ? rows[rows.length - 1].created_at : null

  return jsonOk({
    items: rows.map(r => ({
      id: r.id,
      ownerId: r.owner_id,
      name: r.name,
      slug: r.slug,
      bio: r.bio ?? null,
      websiteUrl: r.website_url ?? null,
      logoUrl: r.logo_url ?? null,
      theme: r.theme ?? null,
      createdAt: r.created_at,
    })),
    pageInfo: {
      nextCursor,
      hasMore: rows.length === limit,
    },
  })
}

type CreateCompanyBody = {
  name?: string
  slug?: string
  bio?: string | null
  website_url?: string | null
  logo_url?: string | null
}

export async function POST(req: Request) {
  const jar = await cookies()
  const token = jar.get('mainey_access_token')?.value || getAuthTokenFromRequest(req, 'mainey_access_token')
  if (!token) return jsonError('unauthorized', 'Not signed in', 401)

  const userId = await getUserIdFromAccessToken(token)
  if (!userId) return jsonError('unauthorized', 'Invalid session', 401)

  const body = await readJson<CreateCompanyBody>(req)
  const name = (body?.name || '').trim()
  const slugRaw = body?.slug || ''
  const bio = typeof body?.bio === 'string' ? body.bio.trim() : null
  const websiteUrl = typeof body?.website_url === 'string' ? body.website_url.trim() : null
  const logoUrl = typeof body?.logo_url === 'string' ? body.logo_url.trim() : null

  if (!name) return jsonError('bad_request', 'name is required', 400)
  const norm = normalizeAndValidateSlug(slugRaw)
  if (!norm.ok) return jsonError('bad_request', norm.message, 400)

  let supabase
  try {
    supabase = getSupabaseAnonClient(token)
  } catch (e: any) {
    return jsonError('internal', e?.message || 'Supabase is not configured', 500)
  }

  const { data: company, error } = await supabase
    .from('companies')
    .insert({
      owner_id: userId,
      name,
      slug: norm.slug,
      bio,
      website_url: websiteUrl,
      logo_url: logoUrl,
    })
    .select('id, owner_id, name, slug, bio, website_url, logo_url, theme, created_at')
    .single()

  if (error) {
    if ((error as any).code === '23505') return jsonError('bad_request', 'slug is already taken', 400)
    return jsonError('internal', error.message, 500)
  }

  // Default pages (hero/about/links)
  const defaultPages = [
    { company_id: company.id, type: 'hero', title: 'Hero', sort_order: 0, content: { headline: company.name, subheadline: '' } },
    { company_id: company.id, type: 'about', title: 'About', sort_order: 10, content: { text: company.bio ?? '' } },
    { company_id: company.id, type: 'links', title: 'Links', sort_order: 20, content: { links: websiteUrl ? [{ label: 'Website', url: websiteUrl }] : [] } },
  ]
  const pagesInsert = await supabase
    .from('company_pages')
    .insert(defaultPages)
    .select('id, company_id, type, title, content, sort_order, created_at')

  if (pagesInsert.error) return jsonError('internal', pagesInsert.error.message, 500)

  const pages = (pagesInsert.data ?? []).sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))

  return jsonOk({
    company: {
      id: company.id,
      ownerId: company.owner_id,
      name: company.name,
      slug: company.slug,
      bio: company.bio ?? null,
      websiteUrl: company.website_url ?? null,
      logoUrl: company.logo_url ?? null,
      theme: company.theme ?? null,
      createdAt: company.created_at,
    },
    pages: pages.map(p => ({
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

