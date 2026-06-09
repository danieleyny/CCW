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
      activity_log: {
        Row: {
          action: string
          actor: string | null
          case_id: string | null
          client_id: string | null
          created_at: string
          detail: Json
          entity: string | null
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor?: string | null
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          detail?: Json
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor?: string | null
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          detail?: Json
          entity?: string | null
          entity_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_log_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          case_id: string | null
          client_id: string | null
          created_at: string
          id: string
          location: string | null
          notes: string | null
          scheduled_at: string
          type: Database["public"]["Enums"]["appointment_type"]
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_at: string
          type: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_at?: string
          type?: Database["public"]["Enums"]["appointment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      case_stages: {
        Row: {
          case_id: string
          completed_at: string | null
          created_at: string
          entered_at: string | null
          id: string
          stage: Database["public"]["Enums"]["case_stage"]
          status: Database["public"]["Enums"]["stage_status"]
          updated_at: string
        }
        Insert: {
          case_id: string
          completed_at?: string | null
          created_at?: string
          entered_at?: string | null
          id?: string
          stage: Database["public"]["Enums"]["case_stage"]
          status?: Database["public"]["Enums"]["stage_status"]
          updated_at?: string
        }
        Update: {
          case_id?: string
          completed_at?: string | null
          created_at?: string
          entered_at?: string | null
          id?: string
          stage?: Database["public"]["Enums"]["case_stage"]
          status?: Database["public"]["Enums"]["stage_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_stages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          client_id: string
          closed_at: string | null
          created_at: string
          id: string
          is_renewal: boolean
          license_expires_on: string | null
          nypd_app_ref: string | null
          opened_at: string
          stage: Database["public"]["Enums"]["case_stage"]
          status: Database["public"]["Enums"]["case_status"]
          target_file_date: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          closed_at?: string | null
          created_at?: string
          id?: string
          is_renewal?: boolean
          license_expires_on?: string | null
          nypd_app_ref?: string | null
          opened_at?: string
          stage?: Database["public"]["Enums"]["case_stage"]
          status?: Database["public"]["Enums"]["case_status"]
          target_file_date?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          closed_at?: string | null
          created_at?: string
          id?: string
          is_renewal?: boolean
          license_expires_on?: string | null
          nypd_app_ref?: string | null
          opened_at?: string
          stage?: Database["public"]["Enums"]["case_stage"]
          status?: Database["public"]["Enums"]["case_status"]
          target_file_date?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      character_references: {
        Row: {
          case_id: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          id: string
          is_family: boolean
          name: string
          notarized: boolean
          received: boolean
          relationship: string | null
          updated_at: string
        }
        Insert: {
          case_id: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_family?: boolean
          name: string
          notarized?: boolean
          received?: boolean
          relationship?: string | null
          updated_at?: string
        }
        Update: {
          case_id?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_family?: boolean
          name?: string
          notarized?: boolean
          received?: boolean
          relationship?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "character_references_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_items: {
        Row: {
          case_id: string
          created_at: string
          description: string | null
          document_type: Database["public"]["Enums"]["document_type"] | null
          due_date: string | null
          id: string
          notes: string | null
          owner: Database["public"]["Enums"]["checklist_owner"]
          required: boolean
          stage: Database["public"]["Enums"]["case_stage"]
          status: Database["public"]["Enums"]["checklist_status"]
          template_key: string | null
          title: string
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          due_date?: string | null
          id?: string
          notes?: string | null
          owner?: Database["public"]["Enums"]["checklist_owner"]
          required?: boolean
          stage: Database["public"]["Enums"]["case_stage"]
          status?: Database["public"]["Enums"]["checklist_status"]
          template_key?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          due_date?: string | null
          id?: string
          notes?: string | null
          owner?: Database["public"]["Enums"]["checklist_owner"]
          required?: boolean
          stage?: Database["public"]["Enums"]["case_stage"]
          status?: Database["public"]["Enums"]["checklist_status"]
          template_key?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_items_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          assigned_staff: string | null
          borough: string | null
          created_at: string
          current_stage: Database["public"]["Enums"]["case_stage"]
          eligibility: Json
          email: string | null
          full_name: string
          id: string
          lead_source: string | null
          license_type: string | null
          phone: string | null
          profile_id: string | null
          track: Database["public"]["Enums"]["client_track"]
          updated_at: string
        }
        Insert: {
          assigned_staff?: string | null
          borough?: string | null
          created_at?: string
          current_stage?: Database["public"]["Enums"]["case_stage"]
          eligibility?: Json
          email?: string | null
          full_name: string
          id?: string
          lead_source?: string | null
          license_type?: string | null
          phone?: string | null
          profile_id?: string | null
          track?: Database["public"]["Enums"]["client_track"]
          updated_at?: string
        }
        Update: {
          assigned_staff?: string | null
          borough?: string | null
          created_at?: string
          current_stage?: Database["public"]["Enums"]["case_stage"]
          eligibility?: Json
          email?: string | null
          full_name?: string
          id?: string
          lead_source?: string | null
          license_type?: string | null
          phone?: string | null
          profile_id?: string | null
          track?: Database["public"]["Enums"]["client_track"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_assigned_staff_fkey"
            columns: ["assigned_staff"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cohabitants: {
        Row: {
          affidavit_status: Database["public"]["Enums"]["cohabitant_status"]
          case_id: string
          created_at: string
          id: string
          name: string
          relationship: string | null
          updated_at: string
        }
        Insert: {
          affidavit_status?: Database["public"]["Enums"]["cohabitant_status"]
          case_id: string
          created_at?: string
          id?: string
          name: string
          relationship?: string | null
          updated_at?: string
        }
        Update: {
          affidavit_status?: Database["public"]["Enums"]["cohabitant_status"]
          case_id?: string
          created_at?: string
          id?: string
          name?: string
          relationship?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cohabitants_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          case_id: string
          checklist_item_id: string | null
          client_id: string
          created_at: string
          file_name: string | null
          file_path: string | null
          id: string
          notarized: boolean
          review_notes: string | null
          reviewer: string | null
          status: Database["public"]["Enums"]["document_status"]
          type: Database["public"]["Enums"]["document_type"]
          updated_at: string
          version: number
        }
        Insert: {
          case_id: string
          checklist_item_id?: string | null
          client_id: string
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          notarized?: boolean
          review_notes?: string | null
          reviewer?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          type: Database["public"]["Enums"]["document_type"]
          updated_at?: string
          version?: number
        }
        Update: {
          case_id?: string
          checklist_item_id?: string | null
          client_id?: string
          created_at?: string
          file_name?: string | null
          file_path?: string | null
          id?: string
          notarized?: boolean
          review_notes?: string | null
          reviewer?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_checklist_item_id_fkey"
            columns: ["checklist_item_id"]
            isOneToOne: false
            referencedRelation: "checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_reviewer_fkey"
            columns: ["reviewer"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instructors: {
        Row: {
          active: boolean
          availability: Json
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          availability?: Json
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          availability?: Json
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          case_id: string
          created_at: string
          id: string
          read: boolean
          sender_id: string | null
        }
        Insert: {
          body: string
          case_id: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string | null
        }
        Update: {
          body?: string
          case_id?: string
          created_at?: string
          id?: string
          read?: boolean
          sender_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          case_id: string | null
          client_id: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          invoice_url: string | null
          paid_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent: string | null
          type: Database["public"]["Enums"]["payment_type"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          invoice_url?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent?: string | null
          type?: Database["public"]["Enums"]["payment_type"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          invoice_url?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_payment_intent?: string | null
          type?: Database["public"]["Enums"]["payment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          contact_pref: string
          created_at: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          contact_pref?: string
          created_at?: string
          full_name?: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          contact_pref?: string
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignee: string | null
          case_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: number
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee?: string | null
          case_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: number
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee?: string | null
          case_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: number
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assignee_fkey"
            columns: ["assignee"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          attended: boolean
          case_id: string
          class_date: string | null
          created_at: string
          id: string
          instructor_id: string | null
          location: string | null
          passed: boolean | null
          range_date: string | null
          test_score: number | null
          updated_at: string
        }
        Insert: {
          attended?: boolean
          case_id: string
          class_date?: string | null
          created_at?: string
          id?: string
          instructor_id?: string | null
          location?: string | null
          passed?: boolean | null
          range_date?: string | null
          test_score?: number | null
          updated_at?: string
        }
        Update: {
          attended?: boolean
          case_id?: string
          class_date?: string | null
          created_at?: string
          id?: string
          instructor_id?: string | null
          location?: string | null
          passed?: boolean | null
          range_date?: string | null
          test_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_sessions_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      case_visible: { Args: { p_case_id: string }; Returns: boolean }
      client_visible: { Args: { p_client_id: string }; Returns: boolean }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      is_admin: { Args: never; Returns: boolean }
      is_staff_or_admin: { Args: never; Returns: boolean }
      storage_doc_client_id: { Args: { path: string }; Returns: string }
    }
    Enums: {
      appointment_type:
        | "consult"
        | "training"
        | "fingerprinting"
        | "nypd_interview"
      case_stage:
        | "lead"
        | "eligibility_screened"
        | "signed_up_paid"
        | "training_scheduled"
        | "training_complete"
        | "document_collection"
        | "notarization"
        | "application_assembled"
        | "filed"
        | "fingerprinting_booked"
        | "under_investigation"
        | "decision"
        | "licensed"
      case_status:
        | "active"
        | "blocked"
        | "on_hold"
        | "closed"
        | "approved"
        | "denied"
      checklist_owner: "client" | "staff"
      checklist_status:
        | "not_started"
        | "in_progress"
        | "submitted"
        | "approved"
        | "rejected"
      client_track: "resident" | "business" | "non_resident"
      cohabitant_status: "not_started" | "received" | "notarized"
      document_status: "pending" | "approved" | "rejected"
      document_type:
        | "id"
        | "reference_letter"
        | "cohabitant_affidavit"
        | "social_media_list"
        | "safe_photo_open"
        | "safe_photo_closed"
        | "training_cert"
        | "proof_residence"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      payment_type: "deposit" | "full" | "installment"
      stage_status: "not_started" | "in_progress" | "complete"
      task_status: "open" | "in_progress" | "done"
      user_role: "client" | "staff" | "admin"
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
    Enums: {
      appointment_type: [
        "consult",
        "training",
        "fingerprinting",
        "nypd_interview",
      ],
      case_stage: [
        "lead",
        "eligibility_screened",
        "signed_up_paid",
        "training_scheduled",
        "training_complete",
        "document_collection",
        "notarization",
        "application_assembled",
        "filed",
        "fingerprinting_booked",
        "under_investigation",
        "decision",
        "licensed",
      ],
      case_status: [
        "active",
        "blocked",
        "on_hold",
        "closed",
        "approved",
        "denied",
      ],
      checklist_owner: ["client", "staff"],
      checklist_status: [
        "not_started",
        "in_progress",
        "submitted",
        "approved",
        "rejected",
      ],
      client_track: ["resident", "business", "non_resident"],
      cohabitant_status: ["not_started", "received", "notarized"],
      document_status: ["pending", "approved", "rejected"],
      document_type: [
        "id",
        "reference_letter",
        "cohabitant_affidavit",
        "social_media_list",
        "safe_photo_open",
        "safe_photo_closed",
        "training_cert",
        "proof_residence",
      ],
      payment_status: ["pending", "paid", "failed", "refunded"],
      payment_type: ["deposit", "full", "installment"],
      stage_status: ["not_started", "in_progress", "complete"],
      task_status: ["open", "in_progress", "done"],
      user_role: ["client", "staff", "admin"],
    },
  },
} as const

