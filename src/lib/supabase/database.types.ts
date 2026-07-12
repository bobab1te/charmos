// Hand-written to match supabase/migrations/20260706000000_init_schema.sql.
// Regenerate with `supabase gen types typescript` once a live project exists
// if these ever drift from the actual schema.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          theme: 'light' | 'dark'
          currency: string | null
          country: string | null
          platforms: string[]
          audience_tier: 'nano' | 'micro' | 'mid' | 'macro' | null
          niche: string | null
          onboarding_completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          theme?: 'light' | 'dark'
          currency?: string | null
          country?: string | null
          platforms?: Array<string>
          audience_tier?: 'nano' | 'micro' | 'mid' | 'macro' | null
          niche?: string | null
          onboarding_completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: []
      }
      brands: {
        Row: {
          id: string
          user_id: string
          name: string
          contact_name: string | null
          contact_email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          contact_name?: string | null
          contact_email?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['brands']['Insert']>
        Relationships: []
      }
      deals: {
        Row: {
          id: string
          user_id: string
          brand_id: string
          stage: 'negotiating' | 'confirmed' | 'live' | 'completed'
          deliverables: Json
          compensation_amount: number
          compensation_currency: string
          usage_rights: string | null
          shipment: Json | null
          content_requirements: Json | null
          paid: boolean
          paid_date: string | null
          created_at: string
          stage_updated_at: string
          color: string | null
          compensation_type: 'paid' | 'gifted' | 'commission'
          expected_payout_date: string | null
          archived: boolean
        }
        Insert: {
          id?: string
          user_id: string
          brand_id: string
          stage: 'negotiating' | 'confirmed' | 'live' | 'completed'
          deliverables?: Json
          compensation_amount?: number
          compensation_currency?: string
          usage_rights?: string | null
          shipment?: Json | null
          content_requirements?: Json | null
          paid?: boolean
          paid_date?: string | null
          created_at?: string
          stage_updated_at?: string
          color?: string | null
          compensation_type?: 'paid' | 'gifted' | 'commission'
          expected_payout_date?: string | null
          archived?: boolean
        }
        Update: Partial<Database['public']['Tables']['deals']['Insert']>
        Relationships: []
      }
      ideas: {
        Row: {
          id: string
          user_id: string
          title: string
          hook: string | null
          description: string | null
          platforms: string[]
          status: 'idea' | 'scheduled' | 'filming' | 'editing' | 'posted'
          scheduled_date: string | null
          reference_links: string[]
          created_at: string
          series: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          hook?: string | null
          description?: string | null
          platforms?: Array<string>
          status?: 'idea' | 'scheduled' | 'filming' | 'editing' | 'posted'
          scheduled_date?: string | null
          reference_links?: Array<string>
          created_at?: string
          series?: string | null
        }
        Update: Partial<Database['public']['Tables']['ideas']['Insert']>
        Relationships: []
      }
      ledger: {
        Row: {
          id: string
          user_id: string
          type: 'income' | 'expense'
          amount: number
          currency: string
          date: string
          description: string
          deal_id: string | null
          brand_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'income' | 'expense'
          amount: number
          currency?: string
          date: string
          description: string
          deal_id?: string | null
          brand_id?: string | null
          created_at?: string
        }
        Update: Partial<Database['public']['Tables']['ledger']['Insert']>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
  }
}
