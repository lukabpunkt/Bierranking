// Generiert mit: npm run types  (supabase gen types typescript)
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      beer_history: {
        Row: {
          beer_id: string
          changed_at: string
          changed_by: string | null
          id: number
          new_data: Json
          old_data: Json
        }
        Insert: {
          beer_id: string
          changed_at?: string
          changed_by?: string | null
          id?: never
          new_data: Json
          old_data: Json
        }
        Update: {
          beer_id?: string
          changed_at?: string
          changed_by?: string | null
          id?: never
          new_data?: Json
          old_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "beer_history_beer_id_fkey"
            columns: ["beer_id"]
            isOneToOne: false
            referencedRelation: "beer_stats"
            referencedColumns: ["beer_id"]
          },
          {
            foreignKeyName: "beer_history_beer_id_fkey"
            columns: ["beer_id"]
            isOneToOne: false
            referencedRelation: "beers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beer_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      beers: {
        Row: {
          abv: number | null
          barcode: string | null
          brewery: string | null
          country: string | null
          created_at: string
          created_by: string
          deleted_at: string | null
          group_id: string
          id: string
          name: string
          photo_path: string | null
          style: string | null
          updated_at: string
        }
        Insert: {
          abv?: number | null
          barcode?: string | null
          brewery?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          group_id: string
          id?: string
          name: string
          photo_path?: string | null
          style?: string | null
          updated_at?: string
        }
        Update: {
          abv?: number | null
          barcode?: string | null
          brewery?: string | null
          country?: string | null
          created_at?: string
          created_by?: string
          deleted_at?: string | null
          group_id?: string
          id?: string
          name?: string
          photo_path?: string | null
          style?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          group_id: string
          joined_at?: string
          role?: string
          user_id: string
        }
        Update: {
          group_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          invite_code?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          color: string
          created_at: string
          display_name: string
          emoji: string
          hide_grades: boolean
          id: string
          onboarded: boolean
        }
        Insert: {
          color?: string
          created_at?: string
          display_name?: string
          emoji?: string
          hide_grades?: boolean
          id: string
          onboarded?: boolean
        }
        Update: {
          color?: string
          created_at?: string
          display_name?: string
          emoji?: string
          hide_grades?: boolean
          id?: string
          onboarded?: boolean
        }
        Relationships: []
      }
      ratings: {
        Row: {
          beer_id: string
          comment: string | null
          created_at: string
          deleted_at: string | null
          grade: number
          id: string
          location: string | null
          rated_on: string
          serving: Database["public"]["Enums"]["serving_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          beer_id: string
          comment?: string | null
          created_at?: string
          deleted_at?: string | null
          grade: number
          id?: string
          location?: string | null
          rated_on?: string
          serving: Database["public"]["Enums"]["serving_type"]
          updated_at?: string
          user_id?: string
        }
        Update: {
          beer_id?: string
          comment?: string | null
          created_at?: string
          deleted_at?: string | null
          grade?: number
          id?: string
          location?: string | null
          rated_on?: string
          serving?: Database["public"]["Enums"]["serving_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_beer_id_fkey"
            columns: ["beer_id"]
            isOneToOne: false
            referencedRelation: "beer_stats"
            referencedColumns: ["beer_id"]
          },
          {
            foreignKeyName: "ratings_beer_id_fkey"
            columns: ["beer_id"]
            isOneToOne: false
            referencedRelation: "beers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      beer_stats: {
        Row: {
          avg_bottle: number | null
          avg_can: number | null
          avg_grade: number | null
          avg_tap: number | null
          beer_id: string | null
          group_id: string | null
          last_rated_at: string | null
          rater_count: number | null
          rating_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "beers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      create_group: {
        Args: { p_name: string }
        Returns: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
          name: string
        }
        SetofOptions: {
          from: "*"
          to: "groups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      group_preview: {
        Args: { p_code: string }
        Returns: {
          id: string
          member_count: number
          name: string
        }[]
      }
      is_group_admin: { Args: { gid: string }; Returns: boolean }
      is_group_member: { Args: { gid: string }; Returns: boolean }
      join_group: { Args: { p_code: string }; Returns: string }
      leave_group: { Args: { p_group: string }; Returns: undefined }
      regenerate_invite_code: { Args: { p_group: string }; Returns: string }
      shares_group: { Args: { other: string }; Returns: boolean }
    }
    Enums: {
      serving_type: "can" | "bottle" | "tap"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      serving_type: ["can", "bottle", "tap"],
    },
  },
} as const
