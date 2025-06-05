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
      decision_options: {
        Row: {
          created_at: string
          decision_point_id: string
          feedback: string
          id: string
          is_correct: boolean
          next_step_id: string | null
          option_text: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          decision_point_id: string
          feedback: string
          id?: string
          is_correct?: boolean
          next_step_id?: string | null
          option_text: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          decision_point_id?: string
          feedback?: string
          id?: string
          is_correct?: boolean
          next_step_id?: string | null
          option_text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_options_decision_point_id_fkey"
            columns: ["decision_point_id"]
            isOneToOne: false
            referencedRelation: "decision_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "decision_options_next_step_id_fkey"
            columns: ["next_step_id"]
            isOneToOne: false
            referencedRelation: "procedure_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      decision_points: {
        Row: {
          created_at: string
          id: string
          question: string
          step_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          question: string
          step_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          question?: string
          step_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "decision_points_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "procedure_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_media: {
        Row: {
          created_at: string
          description: string | null
          id: string
          media_type: string
          media_url: string
          step_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          media_type: string
          media_url: string
          step_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          media_type?: string
          media_url?: string
          step_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_media_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "procedure_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      procedure_steps: {
        Row: {
          created_at: string
          description: string
          id: string
          media_url: string | null
          procedure_id: string
          step_number: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          media_url?: string | null
          procedure_id: string
          step_number: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          media_url?: string | null
          procedure_id?: string
          step_number?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "procedure_steps_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
      procedures: {
        Row: {
          created_at: string
          description: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      session_decisions: {
        Row: {
          created_at: string
          decision_point_id: string
          id: string
          response_time_ms: number
          selected_option_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          decision_point_id: string
          id?: string
          response_time_ms: number
          selected_option_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          decision_point_id?: string
          id?: string
          response_time_ms?: number
          selected_option_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_decisions_decision_point_id_fkey"
            columns: ["decision_point_id"]
            isOneToOne: false
            referencedRelation: "decision_points"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_decisions_selected_option_id_fkey"
            columns: ["selected_option_id"]
            isOneToOne: false
            referencedRelation: "decision_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_decisions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "user_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_sessions: {
        Row: {
          completed: boolean
          created_at: string
          end_time: string | null
          id: string
          procedure_id: string
          score: number | null
          start_time: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          end_time?: string | null
          id?: string
          procedure_id: string
          score?: number | null
          start_time?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          end_time?: string | null
          id?: string
          procedure_id?: string
          score?: number | null
          start_time?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "procedures"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
