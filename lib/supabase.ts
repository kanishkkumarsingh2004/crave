import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yjzlpqzegqxznmmfovjt.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_Nfn6ZnZguxNWOr0agA4edQ_OobiZNFz'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
