import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function missingEnvClient(): any {
  // Avoid hard-crashing during build/prerender when env vars aren’t present.
  // If code actually tries to use the client at runtime, fail loudly and clearly.
  return new Proxy(
    {},
    {
      get() {
        throw new Error(
          'Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
        )
      },
    }
  )
}

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : missingEnvClient()
