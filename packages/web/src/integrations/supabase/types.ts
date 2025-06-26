export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          password_hash: string
          username: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          password_hash: string
          username: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          password_hash?: string
          username?: string
        }
        Relationships: []
      }
      api_key_usage: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          ip_address: unknown | null
          key_id: string
          method: string
          response_time_ms: number | null
          status_code: number
          user_agent: string | null
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          ip_address?: unknown | null
          key_id: string
          method: string
          response_time_ms?: number | null
          status_code: number
          user_agent?: string | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          ip_address?: unknown | null
          key_id?: string
          method?: string
          response_time_ms?: number | null
          status_code?: number
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_key_usage_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      api_keys: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_hash: string
          key_prefix: string
          last_used: string | null
          name: string
          permissions: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash: string
          key_prefix: string
          last_used?: string | null
          name: string
          permissions?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_hash?: string
          key_prefix?: string
          last_used?: string | null
          name?: string
          permissions?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "api_users"
            referencedColumns: ["id"]
          },
        ]
      }
      api_users: {
        Row: {
          created_at: string | null
          email: string
          github_id: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          github_id?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          github_id?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      github_installations: {
        Row: {
          account_login: string
          account_type: string
          created_at: string | null
          id: string
          installation_id: number
          repositories: string[] | null
          updated_at: string | null
        }
        Insert: {
          account_login: string
          account_type: string
          created_at?: string | null
          id?: string
          installation_id: number
          repositories?: string[] | null
          updated_at?: string | null
        }
        Update: {
          account_login?: string
          account_type?: string
          created_at?: string | null
          id?: string
          installation_id?: number
          repositories?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      github_repositories: {
        Row: {
          created_at: string | null
          full_name: string
          has_mcp: boolean | null
          id: string
          installation_id: number
          last_checked: string | null
          mcp_files: string[] | null
          name: string
          owner: string
          private: boolean | null
          repo_id: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          has_mcp?: boolean | null
          id?: string
          installation_id: number
          last_checked?: string | null
          mcp_files?: string[] | null
          name: string
          owner: string
          private?: boolean | null
          repo_id: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          has_mcp?: boolean | null
          id?: string
          installation_id?: number
          last_checked?: string | null
          mcp_files?: string[] | null
          name?: string
          owner?: string
          private?: boolean | null
          repo_id?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "github_repositories_installation_id_fkey"
            columns: ["installation_id"]
            isOneToOne: false
            referencedRelation: "github_installations"
            referencedColumns: ["installation_id"]
          },
        ]
      }
      mcp_deployments: {
        Row: {
          created_at: string | null
          deployment_url: string
          health_check_url: string | null
          id: string
          last_health_check: string | null
          package_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          deployment_url: string
          health_check_url?: string | null
          id?: string
          last_health_check?: string | null
          package_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          deployment_url?: string
          health_check_url?: string | null
          id?: string
          last_health_check?: string | null
          package_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_deployments_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "mcp_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_metrics: {
        Row: {
          id: string
          mcp_server_id: string
          metadata: Json | null
          metric_type: string
          timestamp: string | null
          tool_name: string | null
          user_agent: string | null
          visitor_ip: string | null
        }
        Insert: {
          id?: string
          mcp_server_id: string
          metadata?: Json | null
          metric_type: string
          timestamp?: string | null
          tool_name?: string | null
          user_agent?: string | null
          visitor_ip?: string | null
        }
        Update: {
          id?: string
          mcp_server_id?: string
          metadata?: Json | null
          metric_type?: string
          timestamp?: string | null
          tool_name?: string | null
          user_agent?: string | null
          visitor_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_metrics_mcp_server_id_fkey"
            columns: ["mcp_server_id"]
            isOneToOne: false
            referencedRelation: "mcp_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_package_downloads: {
        Row: {
          downloaded_at: string
          id: string
          ip_address: unknown | null
          package_id: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          downloaded_at?: string
          id?: string
          ip_address?: unknown | null
          package_id: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          downloaded_at?: string
          id?: string
          ip_address?: unknown | null
          package_id?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_package_downloads_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "mcp_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_package_ratings: {
        Row: {
          created_at: string
          id: string
          package_id: string
          rating: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          package_id: string
          rating: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          package_id?: string
          rating?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_package_ratings_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "mcp_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_packages: {
        Row: {
          author_id: string | null
          category: string | null
          created_at: string | null
          description: string | null
          downloads_count: number | null
          id: string
          last_updated: string | null
          logo_url: string | null
          name: string
          rating: number | null
          screenshots: Json | null
          source_api_url: string | null
          tags: string[] | null
          tools: Json | null
          updated_at: string | null
          verified: boolean | null
          version: string | null
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          downloads_count?: number | null
          id?: string
          last_updated?: string | null
          logo_url?: string | null
          name: string
          rating?: number | null
          screenshots?: Json | null
          source_api_url?: string | null
          tags?: string[] | null
          tools?: Json | null
          updated_at?: string | null
          verified?: boolean | null
          version?: string | null
        }
        Update: {
          author_id?: string | null
          category?: string | null
          created_at?: string | null
          description?: string | null
          downloads_count?: number | null
          id?: string
          last_updated?: string | null
          logo_url?: string | null
          name?: string
          rating?: number | null
          screenshots?: Json | null
          source_api_url?: string | null
          tags?: string[] | null
          tools?: Json | null
          updated_at?: string | null
          verified?: boolean | null
          version?: string | null
        }
        Relationships: []
      }
      mcp_secrets: {
        Row: {
          created_at: string | null
          id: string
          key: string
          user_id: string
          value: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          user_id: string
          value: string
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          user_id?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_secrets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "api_users"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_servers: {
        Row: {
          created_at: string | null
          deployment_status: string | null
          description: string | null
          endpoint_url: string | null
          github_repo: string | null
          id: string
          name: string
          status: string | null
          updated_at: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          deployment_status?: string | null
          description?: string | null
          endpoint_url?: string | null
          github_repo?: string | null
          id?: string
          name: string
          status?: string | null
          updated_at?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          deployment_status?: string | null
          description?: string | null
          endpoint_url?: string | null
          github_repo?: string | null
          id?: string
          name?: string
          status?: string | null
          updated_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mcp_servers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      mcp_tools: {
        Row: {
          description: string | null
          id: string
          input_schema: Json | null
          output_schema: Json | null
          package_id: string | null
          tool_name: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          input_schema?: Json | null
          output_schema?: Json | null
          package_id?: string | null
          tool_name?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          input_schema?: Json | null
          output_schema?: Json | null
          package_id?: string | null
          tool_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_tools_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "mcp_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          github_id: string | null
          github_username: string | null
          id: string
          updated_at: string | null
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          github_id?: string | null
          github_username?: string | null
          id: string
          updated_at?: string | null
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          github_id?: string | null
          github_username?: string | null
          id?: string
          updated_at?: string | null
          username?: string | null
        }
        Relationships: []
      }
      workspace_members: {
        Row: {
          created_at: string | null
          id: string
          role: string | null
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: string | null
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string | null
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          owner_id: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          owner_id: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_api_key_hash: {
        Args: { api_key: string }
        Returns: string
      }
      increment_downloads: {
        Args: { package_uuid: string }
        Returns: undefined
      }
      log_api_key_usage: {
        Args: {
          p_key_id: string
          p_endpoint: string
          p_method: string
          p_status_code: number
          p_response_time_ms?: number
          p_ip_address?: unknown
          p_user_agent?: string
        }
        Returns: undefined
      }
      validate_api_key: {
        Args: { api_key: string }
        Returns: {
          key_id: string
          user_id: string
          permissions: string[]
          is_active: boolean
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
