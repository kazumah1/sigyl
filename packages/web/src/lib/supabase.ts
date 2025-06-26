
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zcudhsyvfrlfgqqhjrqv.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpjdWRoc3l2ZnJsZmdxcWhqcnF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4MjkzMDMsImV4cCI6MjA2NjQwNTMwM30.Ta6FaWtEVw28AwVN06EUT-dBHGgRYribqwdqWK7H49A'

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: localStorage
  }
})
