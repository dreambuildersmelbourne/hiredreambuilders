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
      admin_users: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      booking_extras: {
        Row: {
          booking_id: string
          created_at: string
          extra_id: string
          id: string
          line_total: number
          quantity: number
        }
        Insert: {
          booking_id: string
          created_at?: string
          extra_id: string
          id?: string
          line_total: number
          quantity?: number
        }
        Update: {
          booking_id?: string
          created_at?: string
          extra_id?: string
          id?: string
          line_total?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "booking_extras_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_extras_extra_id_fkey"
            columns: ["extra_id"]
            isOneToOne: false
            referencedRelation: "extras"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_rooms: {
        Row: {
          booking_id: string
          created_at: string
          hours: number
          id: string
          line_total: number
          room_id: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          hours: number
          id?: string
          line_total: number
          room_id: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          hours?: number
          id?: string
          line_total?: number
          room_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_rooms_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_rooms_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_staff: {
        Row: {
          booking_id: string
          count: number
          created_at: string
          hours: number
          id: string
          line_total: number
          staff_role_id: string
        }
        Insert: {
          booking_id: string
          count?: number
          created_at?: string
          hours: number
          id?: string
          line_total: number
          staff_role_id: string
        }
        Update: {
          booking_id?: string
          count?: number
          created_at?: string
          hours?: number
          id?: string
          line_total?: number
          staff_role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "booking_staff_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "booking_staff_staff_role_id_fkey"
            columns: ["staff_role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          admin_notes: string | null
          av_screens: boolean
          bond: number
          bump_in_time: string
          bump_out_time: string
          cleaning_subtotal: number
          created_at: string
          customer_id: string
          deposit_amount: number
          estimated_attendance: number | null
          event_date: string
          event_name: string
          extra_staff_count: number
          extras_subtotal: number
          food_served: boolean
          hours: number
          id: string
          kitchen: boolean
          notes: string | null
          reference: string
          remove_drums: boolean
          room_subtotal: number
          seating_changes: boolean
          sound_system: boolean
          staff_subtotal: number
          status: Database["public"]["Enums"]["booking_status"]
          subtotal_ex_bond: number
          theatre_lighting: boolean
          total_amount: number
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          av_screens?: boolean
          bond?: number
          bump_in_time: string
          bump_out_time: string
          cleaning_subtotal?: number
          created_at?: string
          customer_id: string
          deposit_amount?: number
          estimated_attendance?: number | null
          event_date: string
          event_name: string
          extra_staff_count?: number
          extras_subtotal?: number
          food_served?: boolean
          hours?: number
          id?: string
          kitchen?: boolean
          notes?: string | null
          reference?: string
          remove_drums?: boolean
          room_subtotal?: number
          seating_changes?: boolean
          sound_system?: boolean
          staff_subtotal?: number
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal_ex_bond?: number
          theatre_lighting?: boolean
          total_amount?: number
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          av_screens?: boolean
          bond?: number
          bump_in_time?: string
          bump_out_time?: string
          cleaning_subtotal?: number
          created_at?: string
          customer_id?: string
          deposit_amount?: number
          estimated_attendance?: number | null
          event_date?: string
          event_name?: string
          extra_staff_count?: number
          extras_subtotal?: number
          food_served?: boolean
          hours?: number
          id?: string
          kitchen?: boolean
          notes?: string | null
          reference?: string
          remove_drums?: boolean
          room_subtotal?: number
          seating_changes?: boolean
          sound_system?: boolean
          staff_subtotal?: number
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal_ex_bond?: number
          theatre_lighting?: boolean
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          booking_id: string
          created_at: string
          file_path: string | null
          id: string
          signed_at: string | null
          signed_name: string | null
          version: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          file_path?: string | null
          id?: string
          signed_at?: string | null
          signed_name?: string | null
          version?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          file_path?: string | null
          id?: string
          signed_at?: string | null
          signed_name?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "contracts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          contact_name: string
          created_at: string
          email: string
          id: string
          organisation: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          contact_name: string
          created_at?: string
          email: string
          id?: string
          organisation?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          organisation?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          booking_id: string | null
          created_at: string
          file_path: string
          id: string
          kind: string
          original_name: string | null
          uploaded_by: string | null
        }
        Insert: {
          booking_id?: string | null
          created_at?: string
          file_path: string
          id?: string
          kind: string
          original_name?: string | null
          uploaded_by?: string | null
        }
        Update: {
          booking_id?: string | null
          created_at?: string
          file_path?: string
          id?: string
          kind?: string
          original_name?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      event_day_checklists: {
        Row: {
          booking_id: string
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          item: string
          sort_order: number
        }
        Insert: {
          booking_id: string
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          item: string
          sort_order?: number
        }
        Update: {
          booking_id?: string
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          item?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_day_checklists_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      extras: {
        Row: {
          active: boolean
          amount: number
          created_at: string
          description: string | null
          id: string
          min_hours: number
          name: string
          pricing_type: Database["public"]["Enums"]["extra_pricing"]
          requires_room: boolean
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          min_hours?: number
          name: string
          pricing_type: Database["public"]["Enums"]["extra_pricing"]
          requires_room?: boolean
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          min_hours?: number
          name?: string
          pricing_type?: Database["public"]["Enums"]["extra_pricing"]
          requires_room?: boolean
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["payment_kind"]
          notes: string | null
          paid_at: string | null
          reference: string | null
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["payment_kind"]
          notes?: string | null
          paid_at?: string | null
          reference?: string | null
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["payment_kind"]
          notes?: string | null
          paid_at?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          active: boolean
          bond: number
          capacity: number | null
          created_at: string
          description: string | null
          hourly_rate: number
          id: string
          includes_cleaning: boolean
          includes_staff: boolean
          min_hours: number
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          bond?: number
          capacity?: number | null
          created_at?: string
          description?: string | null
          hourly_rate: number
          id?: string
          includes_cleaning?: boolean
          includes_staff?: boolean
          min_hours?: number
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          bond?: number
          capacity?: number | null
          created_at?: string
          description?: string | null
          hourly_rate?: number
          id?: string
          includes_cleaning?: boolean
          includes_staff?: boolean
          min_hours?: number
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      staff_assignments: {
        Row: {
          booking_id: string
          confirmed: boolean
          created_at: string
          end_time: string | null
          id: string
          name: string | null
          staff_role_id: string | null
          start_time: string | null
          user_id: string | null
        }
        Insert: {
          booking_id: string
          confirmed?: boolean
          created_at?: string
          end_time?: string | null
          id?: string
          name?: string | null
          staff_role_id?: string | null
          start_time?: string | null
          user_id?: string | null
        }
        Update: {
          booking_id?: string
          confirmed?: boolean
          created_at?: string
          end_time?: string | null
          id?: string
          name?: string | null
          staff_role_id?: string | null
          start_time?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "staff_assignments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_assignments_staff_role_id_fkey"
            columns: ["staff_role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_roles: {
        Row: {
          active: boolean
          created_at: string
          hourly_rate: number
          id: string
          min_hours: number
          name: string
          slug: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          hourly_rate?: number
          id?: string
          min_hours?: number
          name: string
          slug: string
        }
        Update: {
          active?: boolean
          created_at?: string
          hourly_rate?: number
          id?: string
          min_hours?: number
          name?: string
          slug?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          booking_id: string | null
          completed: boolean
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          booking_id?: string | null
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          booking_id?: string | null
          completed?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      [_ in never]: never
    }
    Enums: {
      app_role: "admin" | "staff"
      booking_status:
        | "enquiry"
        | "reviewing"
        | "staffing_confirmed"
        | "invoiced"
        | "deposit_paid"
        | "confirmed"
        | "completed"
        | "cancelled"
      extra_pricing: "flat" | "per_hour" | "per_hour_per_person"
      payment_kind: "deposit" | "balance" | "bond" | "refund" | "other"
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
      app_role: ["admin", "staff"],
      booking_status: [
        "enquiry",
        "reviewing",
        "staffing_confirmed",
        "invoiced",
        "deposit_paid",
        "confirmed",
        "completed",
        "cancelled",
      ],
      extra_pricing: ["flat", "per_hour", "per_hour_per_person"],
      payment_kind: ["deposit", "balance", "bond", "refund", "other"],
    },
  },
} as const
