export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          author: string
          content: string
          created_at: string
          id: string
        }
        Insert: {
          author: string
          content: string
          created_at?: string
          id?: string
        }
        Update: {
          author?: string
          content?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      bookmarklets: {
        Row: {
          author: string
          code: string
          created_at: string
          id: string
          title: string
        }
        Insert: {
          author: string
          code: string
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          author?: string
          code?: string
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: []
      }
      dm_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          language: string
          recipient_name: string
          sender_device: string
          sender_name: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          language?: string
          recipient_name: string
          sender_device: string
          sender_name: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          language?: string
          recipient_name?: string
          sender_device?: string
          sender_name?: string
        }
        Relationships: []
      }
      html_games: {
        Row: {
          author: string
          code: string
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          title: string
        }
        Insert: {
          author: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          title: string
        }
        Update: {
          author?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          title?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          language: string
          name: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          language: string
          name: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          language?: string
          name?: string
        }
        Relationships: []
      }
      prank_events: {
        Row: {
          created_at: string
          created_by: string
          duration_seconds: number
          id: string
          song_query: string
          tab_count: number
          tab_url: string
          target_name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          duration_seconds?: number
          id?: string
          song_query?: string
          tab_count?: number
          tab_url?: string
          target_name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          duration_seconds?: number
          id?: string
          song_query?: string
          tab_count?: number
          tab_url?: string
          target_name?: string
        }
        Relationships: []
      }
      server_channels: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          read_role: string
          server_id: string
          write_role: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          read_role?: string
          server_id: string
          write_role?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          read_role?: string
          server_id?: string
          write_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_channels_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_members: {
        Row: {
          id: string
          joined_at: string
          member_name: string
          role: string
          server_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          member_name: string
          role?: string
          server_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          member_name?: string
          role?: string
          server_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_members_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "servers"
            referencedColumns: ["id"]
          },
        ]
      }
      server_messages: {
        Row: {
          author_name: string
          channel_id: string
          content: string
          created_at: string
          id: string
        }
        Insert: {
          author_name: string
          channel_id: string
          content: string
          created_at?: string
          id?: string
        }
        Update: {
          author_name?: string
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "server_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "server_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      servers: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          name: string
          owner_name: string
          visibility: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string
          name: string
          owner_name: string
          visibility?: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          name?: string
          owner_name?: string
          visibility?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          id: string
          level: number
          messages_sent: number
          name: string
          updated_at: string
        }
        Insert: {
          id?: string
          level?: number
          messages_sent?: number
          name: string
          updated_at?: string
        }
        Update: {
          id?: string
          level?: number
          messages_sent?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      verified_users: {
        Row: {
          created_at: string
          name: string
          password: string
        }
        Insert: {
          created_at?: string
          name: string
          password: string
        }
        Update: {
          created_at?: string
          name?: string
          password?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      reset_leaderboard: {
        Args: { _name: string; _password: string }
        Returns: boolean
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
