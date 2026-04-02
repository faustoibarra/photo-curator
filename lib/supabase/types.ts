export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      collections: {
        Row: {
          cover_photo_id: string | null
          created_at: string | null
          description: string | null
          id: string
          name: string
          type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cover_photo_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cover_photo_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_cover_photo_id_fkey"
            columns: ["cover_photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          ai_analyzed_at: string | null
          ai_bw_rating: number | null
          ai_bw_rationale: string | null
          ai_caption: string | null
          ai_composition_rating: number | null
          ai_critique: string | null
          ai_crop_suggestion: string | null
          ai_impact_rating: number | null
          ai_light_rating: number | null
          ai_overall_rating: number | null
          ai_print_rating: number | null
          ai_tags: string[] | null
          ai_technical_rating: number | null
          ai_tier: string | null
          ai_title: string | null
          collection_id: string
          file_size: number | null
          filename: string
          height: number | null
          id: string
          sort_order: number | null
          storage_path: string
          storage_url: string
          uploaded_at: string | null
          user_flagged: boolean | null
          user_id: string
          user_notes: string | null
          user_rating: number | null
          width: number | null
        }
        Insert: {
          ai_analyzed_at?: string | null
          ai_bw_rating?: number | null
          ai_bw_rationale?: string | null
          ai_caption?: string | null
          ai_composition_rating?: number | null
          ai_critique?: string | null
          ai_crop_suggestion?: string | null
          ai_impact_rating?: number | null
          ai_light_rating?: number | null
          ai_overall_rating?: number | null
          ai_print_rating?: number | null
          ai_tags?: string[] | null
          ai_technical_rating?: number | null
          ai_tier?: string | null
          ai_title?: string | null
          collection_id: string
          file_size?: number | null
          filename: string
          height?: number | null
          id?: string
          sort_order?: number | null
          storage_path: string
          storage_url: string
          uploaded_at?: string | null
          user_flagged?: boolean | null
          user_id: string
          user_notes?: string | null
          user_rating?: number | null
          width?: number | null
        }
        Update: {
          ai_analyzed_at?: string | null
          ai_bw_rating?: number | null
          ai_bw_rationale?: string | null
          ai_caption?: string | null
          ai_composition_rating?: number | null
          ai_critique?: string | null
          ai_crop_suggestion?: string | null
          ai_impact_rating?: number | null
          ai_light_rating?: number | null
          ai_overall_rating?: number | null
          ai_print_rating?: number | null
          ai_tags?: string[] | null
          ai_technical_rating?: number | null
          ai_tier?: string | null
          ai_title?: string | null
          collection_id?: string
          file_size?: number | null
          filename?: string
          height?: number | null
          id?: string
          sort_order?: number | null
          storage_path?: string
          storage_url?: string
          uploaded_at?: string | null
          user_flagged?: boolean | null
          user_id?: string
          user_notes?: string | null
          user_rating?: number | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "photos_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_collection_photos: {
        Row: {
          added_at: string | null
          photo_id: string
          score: number | null
          score_breakdown: Json | null
          sub_collection_id: string
        }
        Insert: {
          added_at?: string | null
          photo_id: string
          score?: number | null
          score_breakdown?: Json | null
          sub_collection_id: string
        }
        Update: {
          added_at?: string | null
          photo_id?: string
          score?: number | null
          score_breakdown?: Json | null
          sub_collection_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_collection_photos_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sub_collection_photos_sub_collection_id_fkey"
            columns: ["sub_collection_id"]
            isOneToOne: false
            referencedRelation: "sub_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      sub_collections: {
        Row: {
          best_of_config: Json | null
          best_of_generated_at: string | null
          collection_id: string
          color: string | null
          created_at: string | null
          description: string | null
          featured_photo_ids: string[] | null
          id: string
          is_best_of: boolean | null
          name: string
          share_allow_downloads: boolean | null
          share_created_at: string | null
          share_enabled: boolean | null
          share_token: string | null
          user_id: string
        }
        Insert: {
          best_of_config?: Json | null
          best_of_generated_at?: string | null
          collection_id: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          featured_photo_ids?: string[] | null
          id?: string
          is_best_of?: boolean | null
          name: string
          share_allow_downloads?: boolean | null
          share_created_at?: string | null
          share_enabled?: boolean | null
          share_token?: string | null
          user_id: string
        }
        Update: {
          best_of_config?: Json | null
          best_of_generated_at?: string | null
          collection_id?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          featured_photo_ids?: string[] | null
          id?: string
          is_best_of?: boolean | null
          name?: string
          share_allow_downloads?: boolean | null
          share_created_at?: string | null
          share_enabled?: boolean | null
          share_token?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sub_collections_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

