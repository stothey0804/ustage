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
          id: string
          attendee_no: number
          booking_id: string
          ticket_number: number
          qr_token: string
          checked_in: boolean
          checked_in_at: string | null
          checked_in_by: string | null
          cancelled_at: string | null
          cancelled_by: string | null
        }
        Insert: {
          id?: string
          /** booking_tickets_assign_attendee_no 트리거가 채운다 — 코드에서 지정하지 않는다 */
          attendee_no?: number
          booking_id: string
          ticket_number: number
          qr_token?: string
          checked_in?: boolean
          checked_in_at?: string | null
          checked_in_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
        }
        Update: {
          id?: string
          attendee_no?: number
          booking_id?: string
          ticket_number?: number
          qr_token?: string
          checked_in?: boolean
          checked_in_at?: string | null
          checked_in_by?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
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
          /** 부분 취소된 매수 — booking_tickets_sync_cancelled 트리거가 채운다 */
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
          password_hash: string
          payment_confirmed: boolean | null
          payment_confirmed_at: string | null
          quantity: number
          qr_token: string | null
          status: string
          status_updated_by: string | null
          user_id: string | null
        }
        Insert: {
          /** bookings_assign_no 트리거가 채운다 — 코드에서 지정하지 않는다 */
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
          password_hash: string
          payment_confirmed?: boolean | null
          payment_confirmed_at?: string | null
          quantity?: number
          qr_token?: string | null
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
          password_hash?: string
          payment_confirmed?: boolean | null
          payment_confirmed_at?: string | null
          quantity?: number
          qr_token?: string | null
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
      event_draws: {
        Row: {
          attendee_no: number
          booking_id: string | null
          /** @deprecated 예매 단위 추첨 시절 컬럼 — attendee_no를 쓴다 */
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
            foreignKeyName: "event_draws_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "booking_tickets"
            referencedColumns: ["id"]
          },
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
  public: {
    Enums: {},
  },
} as const
