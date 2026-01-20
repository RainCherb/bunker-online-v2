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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      games: {
        Row: {
          bunker_description: string
          bunker_name: string
          bunker_slots: number
          bunker_supplies: string[]
          catastrophe_description: string
          catastrophe_name: string
          catastrophe_survival_time: string
          created_at: string
          current_player_index: number
          current_round: number
          id: string
          is_revote: boolean | null
          max_rounds: number
          phase: string
          phase_ends_at: string | null
          tied_players: string[] | null
          time_remaining: number
          turn_has_revealed: boolean
          updated_at: string
          votes: Json
          voting_phase: string
        }
        Insert: {
          bunker_description: string
          bunker_name: string
          bunker_slots?: number
          bunker_supplies?: string[]
          catastrophe_description: string
          catastrophe_name: string
          catastrophe_survival_time: string
          created_at?: string
          current_player_index?: number
          current_round?: number
          id: string
          is_revote?: boolean | null
          max_rounds?: number
          phase?: string
          phase_ends_at?: string | null
          tied_players?: string[] | null
          time_remaining?: number
          turn_has_revealed?: boolean
          updated_at?: string
          votes?: Json
          voting_phase?: string
        }
        Update: {
          bunker_description?: string
          bunker_name?: string
          bunker_slots?: number
          bunker_supplies?: string[]
          catastrophe_description?: string
          catastrophe_name?: string
          catastrophe_survival_time?: string
          created_at?: string
          current_player_index?: number
          current_round?: number
          id?: string
          is_revote?: boolean | null
          max_rounds?: number
          phase?: string
          phase_ends_at?: string | null
          tied_players?: string[] | null
          time_remaining?: number
          turn_has_revealed?: boolean
          updated_at?: string
          votes?: Json
          voting_phase?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          characteristics: Json
          created_at: string
          game_id: string
          has_voted: boolean
          id: string
          is_eliminated: boolean
          is_host: boolean
          name: string
          revealed_characteristics: string[]
          votes_against: number
        }
        Insert: {
          characteristics: Json
          created_at?: string
          game_id: string
          has_voted?: boolean
          id: string
          is_eliminated?: boolean
          is_host?: boolean
          name: string
          revealed_characteristics?: string[]
          votes_against?: number
        }
        Update: {
          characteristics?: Json
          created_at?: string
          game_id?: string
          has_voted?: boolean
          id?: string
          is_eliminated?: boolean
          is_host?: boolean
          name?: string
          revealed_characteristics?: string[]
          votes_against?: number
        }
        Relationships: [
          {
            foreignKeyName: "players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cast_vote_atomic: {
        Args: { p_game_id: string; p_target_id: string; p_voter_id: string }
        Returns: boolean
      }
      eliminate_player_atomic: {
        Args: { p_player_id: string }
        Returns: boolean
      }
      get_user_game_id: { Args: never; Returns: string }
      is_game_host: { Args: { _game_id: string }; Returns: boolean }
      is_player_in_game: { Args: { _game_id: string }; Returns: boolean }
      mark_turn_revealed: {
        Args: { p_game_id: string; p_phase_ends_at: string }
        Returns: boolean
      }
      reset_votes_atomic: { Args: { p_game_id: string }; Returns: boolean }
      reveal_characteristic_atomic: {
        Args: { p_characteristic: string; p_player_id: string }
        Returns: boolean
      }
      update_game_state: {
        Args: {
          p_current_player_index?: number
          p_current_round?: number
          p_game_id: string
          p_is_revote?: boolean
          p_phase?: string
          p_phase_ends_at?: string
          p_tied_players?: string[]
          p_turn_has_revealed?: boolean
        }
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
