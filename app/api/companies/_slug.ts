export function normalizeAndValidateSlug(input: string): { ok: true; slug: string } | { ok: false; message: string } {
  const slug = (input || '').trim().toLowerCase()
  if (!slug) return { ok: false, message: 'slug is required' }
  if (slug.length < 3) return { ok: false, message: 'slug must be at least 3 characters' }
  if (slug.length > 50) return { ok: false, message: 'slug must be at most 50 characters' }
  if (!/^[a-z0-9-]+$/.test(slug)) return { ok: false, message: 'slug must match [a-z0-9-]' }
  if (slug.startsWith('-') || slug.endsWith('-')) return { ok: false, message: 'slug cannot start or end with -' }
  if (slug.includes('--')) return { ok: false, message: 'slug cannot contain consecutive hyphens' }
  return { ok: true, slug }
}

