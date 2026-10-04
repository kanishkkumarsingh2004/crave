import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY

const hasSupabaseEnv = !!(supabaseUrl && supabaseAnonKey)

function createStubSupabase() {
  const emptyResult = { data: [], error: null as any }
  const chainable = {
    select: () => chainable,
    eq: () => chainable,
    neq: () => chainable,
    in: () => chainable,
    order: () => chainable,
    limit: () => chainable,
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
    then: async (resolve: any) => resolve(emptyResult),
  }

  const queryBuilder = {
    select: () => chainable,
    insert: () => ({ select: () => Promise.resolve({ data: null, error: null }) }),
    update: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
    upsert: () => Promise.resolve({ data: null, error: null }),
    delete: () => ({ eq: () => Promise.resolve({ data: null, error: null }) }),
  }

  return {
    from: () => queryBuilder,
    auth: {
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      signInWithPassword: () =>
        Promise.resolve({
          data: { user: null, session: null },
          error: { message: 'Supabase not configured' },
        }),
      signUp: () =>
        Promise.resolve({
          data: { user: null, session: null },
          error: { message: 'Supabase not configured' },
        }),
      signOut: () => Promise.resolve({ error: null }),
      setSession: () => Promise.resolve({ error: null }),
    },
  } as any
}

export const supabase = hasSupabaseEnv
  ? createClient<Database>(supabaseUrl!, supabaseAnonKey!)
  : createStubSupabase()
