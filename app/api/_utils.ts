import { NextResponse } from 'next/server'

export type ApiErrorCode =
  | 'bad_request'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'method_not_allowed'
  | 'internal'
  | 'not_implemented'

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, { status: init?.status ?? 200, headers: init?.headers })
}

export function jsonError(code: ApiErrorCode, message: string, status = 400, details: unknown = null) {
  return NextResponse.json(
    { ok: false, error: { code, message, details } },
    {
      status,
    }
  )
}

export async function readJson<T>(req: Request): Promise<T | null> {
  try {
    const text = await req.text()
    if (!text) return null
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

