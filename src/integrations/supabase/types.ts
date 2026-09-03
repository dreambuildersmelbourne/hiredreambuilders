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
      app_settings: {
        Row: {
          created_at: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          updated_at?: string
          value?: string
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
          approved_at: string | null
          av_screens: boolean
          balance_paid_at: string | null
          bond: number
          bond_release_notes: string | null
          bond_released_at: string | null
          bump_in_time: string
          bump_out_time: string
          cleaning_subtotal: number
          created_at: string
          created_by: string | null
          customer_id: string | null
          deposit_amount: number
          deposit_paid_at: string | null
          discount_amount: number
          discount_reason: string | null
          entry_type: string
          estimated_attendance: number | null
          event_date: string
          event_name: string
          extra_staff_count: number
          extras_subtotal: number
          food_served: boolean
          hours: number
          id: string
          info_request_message: string | null
          kitchen: boolean
          notes: string | null
          reference: string
          rejected_at: string | null
          rejection_reason: string | null
          remove_drums: boolean
          room_subtotal: number
          seating_changes: boolean
          security_required: boolean
          sound_system: boolean
          staff_can_view_tentative: boolean
          staff_subtotal: number
          staffing_confirmed_at: string | null
          status: Database["public"]["Enums"]["booking_status"]
          subtotal_ex_bond: number
          tentative_hold_requested: boolean
          theatre_lighting: boolean
          total_amount: number
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          av_screens?: boolean
          balance_paid_at?: string | null
          bond?: number
          bond_release_notes?: string | null
          bond_released_at?: string | null
          bump_in_time: string
          bump_out_time: string
          cleaning_subtotal?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deposit_amount?: number
          deposit_paid_at?: string | null
          discount_amount?: number
          discount_reason?: string | null
          entry_type?: string
          estimated_attendance?: number | null
          event_date: string
          event_name: string
          extra_staff_count?: number
          extras_subtotal?: number
          food_served?: boolean
          hours?: number
          id?: string
          info_request_message?: string | null
          kitchen?: boolean
          notes?: string | null
          reference?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          remove_drums?: boolean
          room_subtotal?: number
          seating_changes?: boolean
          security_required?: boolean
          sound_system?: boolean
          staff_can_view_tentative?: boolean
          staff_subtotal?: number
          staffing_confirmed_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal_ex_bond?: number
          tentative_hold_requested?: boolean
          theatre_lighting?: boolean
          total_amount?: number
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          av_screens?: boolean
          balance_paid_at?: string | null
          bond?: number
          bond_release_notes?: string | null
          bond_released_at?: string | null
          bump_in_time?: string
          bump_out_time?: string
          cleaning_subtotal?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          deposit_amount?: number
          deposit_paid_at?: string | null
          discount_amount?: number
          discount_reason?: string | null
          entry_type?: string
          estimated_attendance?: number | null
          event_date?: string
          event_name?: string
          extra_staff_count?: number
          extras_subtotal?: number
          food_served?: boolean
          hours?: number
          id?: string
          info_request_message?: string | null
          kitchen?: boolean
          notes?: string | null
          reference?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          remove_drums?: boolean
          room_subtotal?: number
          seating_changes?: boolean
          security_required?: boolean
          sound_system?: boolean
          staff_can_view_tentative?: boolean
          staff_subtotal?: number
          staffing_confirmed_at?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          subtotal_ex_bond?: number
          tentative_hold_requested?: boolean
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
      calendar_sync_settings: {
        Row: {
          created_at: string
          feed_token: string
          id: string
          include_cancelled: boolean
          include_contact_details: boolean
          include_internal_notes: boolean
          include_statuses: string[]
          include_tentative: boolean
          singleton: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          feed_token?: string
          id?: string
          include_cancelled?: boolean
          include_contact_details?: boolean
          include_internal_notes?: boolean
          include_statuses?: string[]
          include_tentative?: boolean
          singleton?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          feed_token?: string
          id?: string
          include_cancelled?: boolean
          include_contact_details?: boolean
          include_internal_notes?: boolean
          include_statuses?: string[]
          include_tentative?: boolean
          singleton?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      checklist_templates: {
        Row: {
          active: boolean
          category: string
          condition: string | null
          created_at: string
          id: string
          sort_order: number
          staff_role_id: string | null
          title: string
        }
        Insert: {
          active?: boolean
          category?: string
          condition?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          staff_role_id?: string | null
          title: string
        }
        Update: {
          active?: boolean
          category?: string
          condition?: string | null
          created_at?: string
          id?: string
          sort_order?: number
          staff_role_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_staff_role_id_fkey"
            columns: ["staff_role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
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
          sent_at: string | null
          sent_to: string | null
          signed_at: string | null
          signed_email: string | null
          signed_method: string | null
          signed_name: string | null
          signing_token: string | null
          uploaded_at: string | null
          uploaded_file_path: string | null
          version: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          file_path?: string | null
          id?: string
          sent_at?: string | null
          sent_to?: string | null
          signed_at?: string | null
          signed_email?: string | null
          signed_method?: string | null
          signed_name?: string | null
          signing_token?: string | null
          uploaded_at?: string | null
          uploaded_file_path?: string | null
          version?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          file_path?: string | null
          id?: string
          sent_at?: string | null
          sent_to?: string | null
          signed_at?: string | null
          signed_email?: string | null
          signed_method?: string | null
          signed_name?: string | null
          signing_token?: string | null
          uploaded_at?: string | null
          uploaded_file_path?: string | null
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
          user_id: string | null
        }
        Insert: {
          contact_name: string
          created_at?: string
          email: string
          id?: string
          organisation?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          contact_name?: string
          created_at?: string
          email?: string
          id?: string
          organisation?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      damage_reports: {
        Row: {
          booking_id: string
          created_at: string
          description: string
          id: string
          location: string | null
          photo_paths: string[]
          reported_by: string | null
          reporter_name: string | null
          severity: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          description: string
          id?: string
          location?: string | null
          photo_paths?: string[]
          reported_by?: string | null
          reporter_name?: string | null
          severity?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          description?: string
          id?: string
          location?: string | null
          photo_paths?: string[]
          reported_by?: string | null
          reporter_name?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "damage_reports_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
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
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      event_day_checklists: {
        Row: {
          booking_id: string
          category: string
          completed: boolean
          completed_at: string | null
          completed_by: string | null
          created_at: string
          id: string
          item: string
          note: string | null
          sort_order: number
          staff_role_id: string | null
        }
        Insert: {
          booking_id: string
          category?: string
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          item: string
          note?: string | null
          sort_order?: number
          staff_role_id?: string | null
        }
        Update: {
          booking_id?: string
          category?: string
          completed?: boolean
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          id?: string
          item?: string
          note?: string | null
          sort_order?: number
          staff_role_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_day_checklists_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_day_checklists_staff_role_id_fkey"
            columns: ["staff_role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
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
      room_media: {
        Row: {
          caption: string | null
          created_at: string
          display_order: number
          id: string
          is_featured: boolean
          is_public: boolean
          media_type: string
          media_url: string
          room_id: string
          storage_path: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_featured?: boolean
          is_public?: boolean
          media_type: string
          media_url: string
          room_id: string
          storage_path?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          display_order?: number
          id?: string
          is_featured?: boolean
          is_public?: boolean
          media_type?: string
          media_url?: string
          room_id?: string
          storage_path?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_media_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          active: boolean
          best_for: string[]
          bond: number
          capacity: number | null
          created_at: string
          description: string | null
          hero_url: string | null
          hourly_rate: number
          id: string
          included_equipment: string[]
          includes_cleaning: boolean
          includes_staff: boolean
          min_hours: number
          name: string
          optional_extras: string[]
          slug: string
          sort_order: number
          summary: string | null
          updated_at: string
          video_url: string | null
        }
        Insert: {
          active?: boolean
          best_for?: string[]
          bond?: number
          capacity?: number | null
          created_at?: string
          description?: string | null
          hero_url?: string | null
          hourly_rate: number
          id?: string
          included_equipment?: string[]
          includes_cleaning?: boolean
          includes_staff?: boolean
          min_hours?: number
          name: string
          optional_extras?: string[]
          slug: string
          sort_order?: number
          summary?: string | null
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          active?: boolean
          best_for?: string[]
          bond?: number
          capacity?: number | null
          created_at?: string
          description?: string | null
          hero_url?: string | null
          hourly_rate?: number
          id?: string
          included_equipment?: string[]
          includes_cleaning?: boolean
          includes_staff?: boolean
          min_hours?: number
          name?: string
          optional_extras?: string[]
          slug?: string
          sort_order?: number
          summary?: string | null
          updated_at?: string
          video_url?: string | null
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
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
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
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_event_checklist: {
        Args: { _booking_id: string }
        Returns: number
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "staff"
      booking_status:
        | "enquiry"
        | "reviewing"
        | "approved"
        | "rejected"
        | "info_requested"
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
      app_role: ["admin", "staff"],
      booking_status: [
        "enquiry",
        "reviewing",
        "approved",
        "rejected",
        "info_requested",
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
