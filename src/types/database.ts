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
      booking_tickets: {
        Row: {
          attendee_no: number
          booking_id: string
          cancelled_at: string | null
          cancelled_by: string | null
          checked_in: boolean
          checked_in_at: string | null
          checked_in_by: string | null
          id: string
          qr_token: string
          ticket_number: number
        }
        Insert: {
          /** booking_tickets_assign_attendee_no 트리거가 채운다 — 코드에서 지정하지 않는다.
           *  (자동생성 시 NOT NULL·기본값 없음이라 필수로 나오므로 매번 옵셔널로 되돌린다) */
          attendee_no?: number
          booking_id: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          checked_in?: boolean
          checked_in_at?: string | null
          checked_in_by?: string | null
          id?: string
          qr_token?: string
          ticket_number: number
        }
        Update: {
          attendee_no?: number
          booking_id?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          checked_in?: boolean
          checked_in_at?: string | null
          checked_in_by?: string | null
          id?: string
          qr_token?: string
          ticket_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_tickets_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_no: number
          cancelled_quantity: number
          checked_in: boolean | null
          checked_in_at: string | null
          created_at: string | null
          custom_answers: Json | null
          deposited_at: string
          depositor_name: string
          email: string | null
          event_id: string
          id: string
          name: string
          password_hash: string | null
          payment_confirmed: boolean | null
          payment_confirmed_at: string | null
          qr_token: string | null
          quantity: number
          status: string
          status_updated_by: string | null
          user_id: string | null
        }
        Insert: {
          /** bookings_assign_no 트리거가 채운다 — 코드에서 지정하지 않는다.
           *  (자동생성 시 NOT NULL·기본값 없음이라 필수로 나오므로 매번 옵셔널로 되돌린다) */
          booking_no?: number
          cancelled_quantity?: number
          checked_in?: boolean | null
          checked_in_at?: string | null
          created_at?: string | null
          custom_answers?: Json | null
          deposited_at: string
          depositor_name: string
          email?: string | null
          event_id: string
          id?: string
          name: string
          password_hash?: string | null
          payment_confirmed?: boolean | null
          payment_confirmed_at?: string | null
          qr_token?: string | null
          quantity?: number
          status?: string
          status_updated_by?: string | null
          user_id?: string | null
        }
        Update: {
          booking_no?: number
          cancelled_quantity?: number
          checked_in?: boolean | null
          checked_in_at?: string | null
          created_at?: string | null
          custom_answers?: Json | null
          deposited_at?: string
          depositor_name?: string
          email?: string | null
          event_id?: string
          id?: string
          name?: string
          password_hash?: string | null
          payment_confirmed?: boolean | null
          payment_confirmed_at?: string | null
          qr_token?: string | null
          quantity?: number
          status?: string
          status_updated_by?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_draws: {
        Row: {
          attendee_no: number
          booking_id: string | null
          booking_no: number | null
          created_at: string
          event_id: string
          id: string
          round: number
          ticket_id: string | null
        }
        Insert: {
          attendee_no: number
          booking_id?: string | null
          booking_no?: number | null
          created_at?: string
          event_id: string
          id?: string
          round: number
          ticket_id?: string | null
        }
        Update: {
          attendee_no?: number
          booking_id?: string | null
          booking_no?: number | null
          created_at?: string
          event_id?: string
          id?: string
          round?: number
          ticket_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_draws_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_draws_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_draws_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "booking_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      event_staff: {
        Row: {
          accepted_at: string | null
          event_id: string
          expires_at: string
          id: string
          invite_token: string
          invited_at: string
          invited_email: string
          status: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          event_id: string
          expires_at?: string
          id?: string
          invite_token?: string
          invited_at?: string
          invited_email: string
          status?: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          event_id?: string
          expires_at?: string
          id?: string
          invite_token?: string
          invited_at?: string
          invited_email?: string
          status?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_staff_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          bank_info: string
          booking_end: string | null
          booking_notice: string | null
          booking_seq: number
          booking_start: string | null
          cancel_policy: string | null
          capacity: number | null
          contact: string
          created_at: string | null
          custom_fields: Json | null
          description: string | null
          event_date: string
          event_end_date: string | null
          id: string
          onsite_price: number | null
          performer_id: string
          poster_url: string | null
          price: number
          slug: string
          status: string | null
          title: string
          venue: string
          venue_address: string | null
          venue_lat: number | null
          venue_lng: number | null
        }
        Insert: {
          bank_info: string
          booking_end?: string | null
          booking_notice?: string | null
          booking_seq?: number
          booking_start?: string | null
          cancel_policy?: string | null
          capacity?: number | null
          contact: string
          created_at?: string | null
          custom_fields?: Json | null
          description?: string | null
          event_date: string
          event_end_date?: string | null
          id?: string
          onsite_price?: number | null
          performer_id: string
          poster_url?: string | null
          price: number
          slug: string
          status?: string | null
          title: string
          venue: string
          venue_address?: string | null
          venue_lat?: number | null
          venue_lng?: number | null
        }
        Update: {
          bank_info?: string
          booking_end?: string | null
          booking_notice?: string | null
          booking_seq?: number
          booking_start?: string | null
          cancel_policy?: string | null
          capacity?: number | null
          contact?: string
          created_at?: string | null
          custom_fields?: Json | null
          description?: string | null
          event_date?: string
          event_end_date?: string | null
          id?: string
          onsite_price?: number | null
          performer_id?: string
          poster_url?: string | null
          price?: number
          slug?: string
          status?: string | null
          title?: string
          venue?: string
          venue_address?: string | null
          venue_lat?: number | null
          venue_lng?: number | null
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          count: number
          key: string
          window_start: string
        }
        Insert: {
          count: number
          key: string
          window_start: string
        }
        Update: {
          count?: number
          key?: string
          window_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_event: { Args: { p_event_id: string }; Returns: boolean }
      cancel_booking_tickets: {
        Args: { p_actor: string; p_booking_id: string; p_ticket_ids: string[] }
        Returns: Json
      }
      create_booking: {
        Args: {
          p_allow_duplicate: boolean
          p_custom_answers: Json
          p_deposited_at: string
          p_depositor_name: string
          p_email: string
          p_event_id: string
          p_name: string
          p_password_hash: string
          p_quantity: number
          p_status: string
          p_user_id: string
        }
        Returns: string
      }
      create_onsite_booking: {
        Args: {
          p_allow_duplicate: boolean
          p_email: string
          p_event_id: string
          p_name: string
          p_password_hash: string
          p_quantity: number
          p_status: string
        }
        Returns: string
      }
      event_booked_seats: { Args: { p_event_id: string }; Returns: number }
      hit_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
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
