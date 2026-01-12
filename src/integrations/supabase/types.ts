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
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          id: string
          reason: string | null
          target_content_id: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          id?: string
          reason?: string | null
          target_content_id?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          target_content_id?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      artists: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          image_url: string | null
          is_featured: boolean
          name: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean
          name: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean
          name?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          body: string
          created_at: string
          id: string
          thread_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          thread_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          id: string
          release_id: string
          status: Database["public"]["Enums"]["donation_status"]
          stripe_session_id: string | null
          user_id: string | null
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          id?: string
          release_id: string
          status?: Database["public"]["Enums"]["donation_status"]
          stripe_session_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          id?: string
          release_id?: string
          status?: Database["public"]["Enums"]["donation_status"]
          stripe_session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
      }
      download_tokens: {
        Row: {
          created_at: string
          donation_id: string
          downloads_used: number
          expires_at: string
          id: string
          max_downloads: number
          token: string
        }
        Insert: {
          created_at?: string
          donation_id: string
          downloads_used?: number
          expires_at: string
          id?: string
          max_downloads?: number
          token: string
        }
        Update: {
          created_at?: string
          donation_id?: string
          downloads_used?: number
          expires_at?: string
          id?: string
          max_downloads?: number
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "download_tokens_donation_id_fkey"
            columns: ["donation_id"]
            isOneToOne: false
            referencedRelation: "donations"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          metadata: Json | null
          release_id: string | null
          track_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          metadata?: Json | null
          release_id?: string | null
          track_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          metadata?: Json | null
          release_id?: string | null
          track_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      forums: {
        Row: {
          created_at: string
          description: string | null
          id: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          artist_id: string | null
          created_at: string
          display_name: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["profile_status"]
          user_id: string
        }
        Insert: {
          artist_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["profile_status"]
          user_id: string
        }
        Update: {
          artist_id?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["profile_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_playlist_tracks: {
        Row: {
          added_at: string
          id: string
          playlist_id: string
          position: number
          track_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          playlist_id: string
          position?: number
          track_id: string
        }
        Update: {
          added_at?: string
          id?: string
          playlist_id?: string
          position?: number
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_playlist_tracks_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "radio_playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radio_playlist_tracks_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_playlists: {
        Row: {
          cover_image_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          station_mood: string | null
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          station_mood?: string | null
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          station_mood?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      radio_schedule: {
        Row: {
          created_at: string
          created_by: string | null
          ends_at: string
          id: string
          priority: number
          starts_at: string
          station_mood: string | null
          track_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          ends_at: string
          id?: string
          priority?: number
          starts_at: string
          station_mood?: string | null
          track_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          ends_at?: string
          id?: string
          priority?: number
          starts_at?: string
          station_mood?: string | null
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_schedule_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      radio_stats: {
        Row: {
          id: string
          listener_count: number | null
          played_at: string
          station_mood: string | null
          track_id: string
        }
        Insert: {
          id?: string
          listener_count?: number | null
          played_at?: string
          station_mood?: string | null
          track_id: string
        }
        Update: {
          id?: string
          listener_count?: number | null
          played_at?: string
          station_mood?: string | null
          track_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "radio_stats_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      releases: {
        Row: {
          artist_id: string
          cover_art_url: string | null
          created_at: string
          description: string | null
          id: string
          is_published: boolean
          published_at: string | null
          streaming_requires_donation: boolean
          suggested_price_cents: number | null
          title: string
          type: Database["public"]["Enums"]["release_type"]
        }
        Insert: {
          artist_id: string
          cover_art_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          streaming_requires_donation?: boolean
          suggested_price_cents?: number | null
          title: string
          type?: Database["public"]["Enums"]["release_type"]
        }
        Update: {
          artist_id?: string
          cover_art_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_published?: boolean
          published_at?: string | null
          streaming_requires_donation?: boolean
          suggested_price_cents?: number | null
          title?: string
          type?: Database["public"]["Enums"]["release_type"]
        }
        Relationships: [
          {
            foreignKeyName: "releases_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
            referencedColumns: ["id"]
          },
        ]
      }
      threads: {
        Row: {
          body: string
          created_at: string
          forum_id: string
          id: string
          pinned: boolean
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          forum_id: string
          id?: string
          pinned?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          forum_id?: string
          id?: string
          pinned?: boolean
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_forum_id_fkey"
            columns: ["forum_id"]
            isOneToOne: false
            referencedRelation: "forums"
            referencedColumns: ["id"]
          },
        ]
      }
      track_commentary: {
        Row: {
          commentary_audio_path: string | null
          commentary_text: string
          created_at: string
          id: string
          timestamp_notes_json: Json | null
          track_id: string
          updated_at: string
        }
        Insert: {
          commentary_audio_path?: string | null
          commentary_text: string
          created_at?: string
          id?: string
          timestamp_notes_json?: Json | null
          track_id: string
          updated_at?: string
        }
        Update: {
          commentary_audio_path?: string | null
          commentary_text?: string
          created_at?: string
          id?: string
          timestamp_notes_json?: Json | null
          track_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "track_commentary_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: true
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      tracks: {
        Row: {
          audio_path: string
          created_at: string
          duration_seconds: number | null
          id: string
          last_played_at: string | null
          mood: string | null
          radio_enabled: boolean
          radio_priority: number
          release_id: string
          title: string
          track_number: number
        }
        Insert: {
          audio_path: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          last_played_at?: string | null
          mood?: string | null
          radio_enabled?: boolean
          radio_priority?: number
          release_id: string
          title: string
          track_number?: number
        }
        Update: {
          audio_path?: string
          created_at?: string
          duration_seconds?: number | null
          id?: string
          last_played_at?: string | null
          mood?: string | null
          radio_enabled?: boolean
          radio_priority?: number
          release_id?: string
          title?: string
          track_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "tracks_release_id_fkey"
            columns: ["release_id"]
            isOneToOne: false
            referencedRelation: "releases"
            referencedColumns: ["id"]
          },
        ]
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
      votes: {
        Row: {
          comment_id: string | null
          created_at: string
          id: string
          thread_id: string | null
          user_id: string
          vote_type: number
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          id?: string
          thread_id?: string | null
          user_id: string
          vote_type: number
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          id?: string
          thread_id?: string | null
          user_id?: string
          vote_type?: number
        }
        Relationships: [
          {
            foreignKeyName: "votes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "votes_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_artist_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_user_active: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "artist" | "moderator" | "user"
      donation_status: "pending" | "paid" | "failed" | "refunded"
      event_type:
        | "play_start"
        | "play_complete"
        | "download"
        | "donation_start"
        | "donation_paid"
        | "thread_post"
        | "comment_post"
      profile_status: "active" | "suspended"
      release_type: "album" | "single" | "ep"
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
    Enums: {
      app_role: ["admin", "artist", "moderator", "user"],
      donation_status: ["pending", "paid", "failed", "refunded"],
      event_type: [
        "play_start",
        "play_complete",
        "download",
        "donation_start",
        "donation_paid",
        "thread_post",
        "comment_post",
      ],
      profile_status: ["active", "suspended"],
      release_type: ["album", "single", "ep"],
    },
  },
} as const
