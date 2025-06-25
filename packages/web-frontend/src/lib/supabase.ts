import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Type definitions for our database
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          github_username: string | null
          github_id: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          github_username?: string | null
          github_id?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          github_username?: string | null
          github_id?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      deployments: {
        Row: {
          id: string
          user_id: string
          name: string
          template_id: string
          status: 'pending' | 'deploying' | 'active' | 'failed' | 'stopped'
          config: any
          github_repo: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          template_id: string
          status?: 'pending' | 'deploying' | 'active' | 'failed' | 'stopped'
          config?: any
          github_repo?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          template_id?: string
          status?: 'pending' | 'deploying' | 'active' | 'failed' | 'stopped'
          config?: any
          github_repo?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type User = Database['public']['Tables']['users']['Row']
export type Deployment = Database['public']['Tables']['deployments']['Row'] 