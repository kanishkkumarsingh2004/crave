/**
 * Temporary local-database compatibility surface.
 *
 * Supabase is intentionally disabled while the application is migrated to the
 * local PostgreSQL/Prisma backend. Existing legacy screens still import this
 * symbol, so they receive explicit failures instead of opening a remote
 * connection or silently pretending that a write succeeded.
 */

const disabledError = {
  message: 'Supabase is disabled. Use the local PostgreSQL API.',
  code: 'SUPABASE_DISABLED',
}

const disabledQuery = (): any => ({
  select: () => disabledQuery(),
  insert: () => disabledQuery(),
  update: () => disabledQuery(),
  delete: () => disabledQuery(),
  upsert: () => disabledQuery(),
  eq: () => disabledQuery(),
  ilike: () => disabledQuery(),
  or: () => disabledQuery(),
  order: () => disabledQuery(),
  limit: () => disabledQuery(),
  maybeSingle: async () => ({ data: null, error: disabledError }),
  single: async () => ({ data: null, error: disabledError }),
  then: (resolve: (value: { data: null; error: typeof disabledError }) => unknown) =>
    Promise.resolve(resolve({ data: null, error: disabledError })),
})

export const supabase: any = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: disabledError }),
    getUser: async () => ({ data: { user: null }, error: disabledError }),
    signInWithPassword: async () => ({
      data: { user: null, session: null },
      error: disabledError,
    }),
    signUp: async () => ({
      data: { user: null, session: null },
      error: disabledError,
    }),
    signOut: async () => ({ error: disabledError }),
    setSession: async () => ({ error: disabledError }),
  },
  from: (_table: string) => disabledQuery(),
} as const
