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
      game_results: {
        Row: {
          created_at: string
          game: string
          id: string
          name: string
          points: number
          position: number
          room_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          game: string
          id?: string
          name: string
          points?: number
          position: number
          room_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          game?: string
          id?: string
          name?: string
          points?: number
          position?: number
          room_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_results_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_decisions: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          reason: string
          report_id: string
          until_at: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          reason: string
          report_id: string
          until_at?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          reason?: string
          report_id?: string
          until_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_decisions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "player_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_suspensions: {
        Row: {
          id: string
          player_id: string | null
          report_id: string
          until_at: string
          user_id: string | null
        }
        Insert: {
          id?: string
          player_id?: string | null
          report_id: string
          until_at: string
          user_id?: string | null
        }
        Update: {
          id?: string
          player_id?: string | null
          report_id?: string
          until_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_suspensions_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "player_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      player_reports: {
        Row: {
          comment: string
          created_at: string
          id: string
          reason: string
          reporter_player_id: string
          reporter_user_id: string | null
          resolved_at: string | null
          room_code: string
          status: string
          target_name: string
          target_player_id: string
          target_user_id: string | null
        }
        Insert: {
          comment?: string
          created_at?: string
          id?: string
          reason: string
          reporter_player_id: string
          reporter_user_id?: string | null
          resolved_at?: string | null
          room_code: string
          status?: string
          target_name: string
          target_player_id: string
          target_user_id?: string | null
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          reason?: string
          reporter_player_id?: string
          reporter_user_id?: string | null
          resolved_at?: string | null
          room_code?: string
          status?: string
          target_name?: string
          target_player_id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      point_penalties: {
        Row: {
          created_at: string
          id: string
          points: number
          reason: string
          room_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          points: number
          reason: string
          room_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          points?: number
          reason?: string
          room_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_penalties_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_penalties_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_seed: string | null
          created_at: string
          games_played: number
          id: string
          points: number
          privacy_accepted_at: string | null
          username: string
          wins: number
        }
        Insert: {
          avatar_seed?: string | null
          created_at?: string
          games_played?: number
          id: string
          points?: number
          privacy_accepted_at?: string | null
          username: string
          wins?: number
        }
        Update: {
          avatar_seed?: string | null
          created_at?: string
          games_played?: number
          id?: string
          points?: number
          privacy_accepted_at?: string | null
          username?: string
          wins?: number
        }
        Relationships: []
      }
      room_creation_usage: {
        Row: {
          created_at: string
          day: string
          environment: string
          id: string
          kind: string
          purchase_id: string | null
          room_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          day: string
          environment: string
          id?: string
          kind: string
          purchase_id?: string | null
          room_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          day?: string
          environment?: string
          id?: string
          kind?: string
          purchase_id?: string | null
          room_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_creation_usage_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "room_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_creation_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      room_players: {
        Row: {
          gif_reaction: Json | null
          gif_search_at: string | null
          gif_sent_at: string | null
          id: string
          joined_at: string
          left_at: string | null
          name: string
          room_id: string
          seat: number
          token: string
          user_id: string | null
        }
        Insert: {
          gif_reaction?: Json | null
          gif_search_at?: string | null
          gif_sent_at?: string | null
          id?: string
          joined_at?: string
          left_at?: string | null
          name: string
          room_id: string
          seat: number
          token: string
          user_id?: string | null
        }
        Update: {
          gif_reaction?: Json | null
          gif_search_at?: string | null
          gif_sent_at?: string | null
          id?: string
          joined_at?: string
          left_at?: string | null
          name?: string
          room_id?: string
          seat?: number
          token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "room_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      room_purchases: {
        Row: {
          amount_cents: number
          consumed_at: string | null
          created_at: string
          environment: string
          id: string
          session_id: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount_cents?: number
          consumed_at?: string | null
          created_at?: string
          environment: string
          id?: string
          session_id?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          consumed_at?: string | null
          created_at?: string
          environment?: string
          id?: string
          session_id?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          code: string
          created_at: string
          creator_player_id: string | null
          game: string
          host_player_id: string | null
          id: string
          state: Json | null
          status: string
          turn_seconds: number | null
          updated_at: string
          version: number
        }
        Insert: {
          code: string
          created_at?: string
          creator_player_id?: string | null
          game: string
          host_player_id?: string | null
          id?: string
          state?: Json | null
          status?: string
          turn_seconds?: number | null
          updated_at?: string
          version?: number
        }
        Update: {
          code?: string
          created_at?: string
          creator_player_id?: string | null
          game?: string
          host_player_id?: string | null
          id?: string
          state?: Json | null
          status?: string
          turn_seconds?: number | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_game_results: {
        Args: { _game: string; _room: string; _rows: Json }
        Returns: undefined
      }
      claim_giphy_search: { Args: { _player: string }; Returns: boolean }
      cleanup_abandoned_rooms: { Args: never; Returns: undefined }
      cleanup_moderation: { Args: never; Returns: undefined }
      confirm_room_purchase: {
        Args: {
          _environment: string
          _order: string
          _session: string
          _user: string
        }
        Returns: undefined
      }
      create_metered_room: {
        Args: {
          _environment: string
          _game: string
          _name: string
          _token: string
          _user: string
        }
        Returns: Json
      }
      exit_room: {
        Args: {
          _delete: boolean
          _player: string
          _room: string
          _rows?: Json
          _state?: Json
          _token: string
          _version: number
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      resolve_player_report: {
        Args: {
          _action: string
          _actor: string
          _hours: number
          _reason: string
          _report: string
        }
        Returns: undefined
      }
      send_room_gif: {
        Args: { _player: string; _reaction: Json }
        Returns: boolean
      }
      submit_player_report: {
        Args: {
          _comment: string
          _reason: string
          _room: string
          _target: string
          _token: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
