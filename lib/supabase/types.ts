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
      availability_slots: {
        Row: {
          booked_count: number
          capacity: number
          created_at: string
          ends_at: string
          id: string
          instructor_id: string
          location_id: string | null
          starts_at: string
          type: Database["public"]["Enums"]["slot_type"]
          updated_at: string
        }
        Insert: {
          booked_count?: number
          capacity?: number
          created_at?: string
          ends_at: string
          id?: string
          instructor_id: string
          location_id?: string | null
          starts_at: string
          type: Database["public"]["Enums"]["slot_type"]
          updated_at?: string
        }
        Update: {
          booked_count?: number
          capacity?: number
          created_at?: string
          ends_at?: string
          id?: string
          instructor_id?: string
          location_id?: string | null
          starts_at?: string
          type?: Database["public"]["Enums"]["slot_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "availability_slots_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "availability_slots_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "training_locations"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          case_id: string
          client_id: string
          created_at: string
          ends_at: string
          engagement_id: string | null
          ics_uid: string | null
          id: string
          instructor_id: string
          location_id: string | null
          slot_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["booking_status"]
          type: Database["public"]["Enums"]["slot_type"]
          updated_at: string
        }
        Insert: {
          case_id: string
          client_id: string
          created_at?: string
          ends_at: string
          engagement_id?: string | null
          ics_uid?: string | null
          id?: string
          instructor_id: string
          location_id?: string | null
          slot_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["booking_status"]
          type: Database["public"]["Enums"]["slot_type"]
          updated_at?: string
        }
        Update: {
          case_id?: string
          client_id?: string
          created_at?: string
          ends_at?: string
          engagement_id?: string | null
          ics_uid?: string | null
          id?: string
          instructor_id?: string
          location_id?: string | null
          slot_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["booking_status"]
          type?: Database["public"]["Enums"]["slot_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "training_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "availability_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_connections: {
        Row: {
          access_token: string | null
          calendar_id: string | null
          created_at: string
          expires_at: string | null
          id: string
          profile_id: string
          provider: Database["public"]["Enums"]["calendar_provider"]
          refresh_token: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          calendar_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          profile_id: string
          provider?: Database["public"]["Enums"]["calendar_provider"]
          refresh_token?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          calendar_id?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          profile_id?: string
          provider?: Database["public"]["Enums"]["calendar_provider"]
          refresh_token?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_connections_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      case_notes: {
        Row: {
          author: string | null
          body: string
          case_id: string
          created_at: string
          id: string
          pinned: boolean
          updated_at: string
        }
        Insert: {
          author?: string | null
          body: string
          case_id: string
          created_at?: string
          id?: string
          pinned?: boolean
          updated_at?: string
        }
        Update: {
          author?: string | null
          body?: string
          case_id?: string
          created_at?: string
          id?: string
          pinned?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_notes_author_fkey"
            columns: ["author"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_offers: {
        Row: {
          accepted_engagement_id: string | null
          area_label: string | null
          case_id: string
          client_geog: unknown
          created_at: string
          expires_at: string | null
          id: string
          jurisdiction: Database["public"]["Enums"]["jurisdiction_key"]
          lat: number | null
          lng: number | null
          needs_note: string | null
          radius_mi: number
          status: Database["public"]["Enums"]["offer_status"]
          type: Database["public"]["Enums"]["offer_type"]
          updated_at: string
        }
        Insert: {
          accepted_engagement_id?: string | null
          area_label?: string | null
          case_id: string
          client_geog?: unknown
          created_at?: string
          expires_at?: string | null
          id?: string
          jurisdiction: Database["public"]["Enums"]["jurisdiction_key"]
          lat?: number | null
          lng?: number | null
          needs_note?: string | null
          radius_mi?: number
          status?: Database["public"]["Enums"]["offer_status"]
          type: Database["public"]["Enums"]["offer_type"]
          updated_at?: string
        }
        Update: {
          accepted_engagement_id?: string | null
          area_label?: string | null
          case_id?: string
          client_geog?: unknown
          created_at?: string
          expires_at?: string | null
          id?: string
          jurisdiction?: Database["public"]["Enums"]["jurisdiction_key"]
          lat?: number | null
          lng?: number | null
          needs_note?: string | null
          radius_mi?: number
          status?: Database["public"]["Enums"]["offer_status"]
          type?: Database["public"]["Enums"]["offer_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_offers_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      case_requirements: {
        Row: {
          case_id: string
          cohabitant_id: string | null
          created_at: string
          disclosure_id: string | null
          document_id: string | null
          id: string
          notes: string | null
          reference_id: string | null
          req_code: string
          requirement_id: string
          reviewer: string | null
          status: Database["public"]["Enums"]["case_req_status"]
          updated_at: string
        }
        Insert: {
          case_id: string
          cohabitant_id?: string | null
          created_at?: string
          disclosure_id?: string | null
          document_id?: string | null
          id?: string
          notes?: string | null
          reference_id?: string | null
          req_code: string
          requirement_id: string
          reviewer?: string | null
          status?: Database["public"]["Enums"]["case_req_status"]
          updated_at?: string
        }
        Update: {
          case_id?: string
          cohabitant_id?: string | null
          created_at?: string
          disclosure_id?: string | null
          document_id?: string | null
          id?: string
          notes?: string | null
          reference_id?: string | null
          req_code?: string
          requirement_id?: string
          reviewer?: string | null
          status?: Database["public"]["Enums"]["case_req_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_requirements_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_requirements_cohabitant_id_fkey"
            columns: ["cohabitant_id"]
            isOneToOne: false
            referencedRelation: "cohabitants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_requirements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_requirements_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "character_references"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_requirements_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_requirements_reviewer_fkey"
            columns: ["reviewer"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_case_req_disclosure"
            columns: ["disclosure_id"]
            isOneToOne: false
            referencedRelation: "disclosures"
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
          county_license_expires_on: string | null
          created_at: string
          id: string
          is_renewal: boolean
          license_expires_on: string | null
          license_issued_on: string | null
          nypd_app_ref: string | null
          opened_at: string
          qa_signed_off_at: string | null
          qa_signed_off_by: string | null
          stage: Database["public"]["Enums"]["case_stage"]
          stage_entered_at: string
          status: Database["public"]["Enums"]["case_status"]
          target_file_date: string | null
          training_completed_on: string | null
          training_expires_on: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          closed_at?: string | null
          county_license_expires_on?: string | null
          created_at?: string
          id?: string
          is_renewal?: boolean
          license_expires_on?: string | null
          license_issued_on?: string | null
          nypd_app_ref?: string | null
          opened_at?: string
          qa_signed_off_at?: string | null
          qa_signed_off_by?: string | null
          stage?: Database["public"]["Enums"]["case_stage"]
          stage_entered_at?: string
          status?: Database["public"]["Enums"]["case_status"]
          target_file_date?: string | null
          training_completed_on?: string | null
          training_expires_on?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          closed_at?: string | null
          county_license_expires_on?: string | null
          created_at?: string
          id?: string
          is_renewal?: boolean
          license_expires_on?: string | null
          license_issued_on?: string | null
          nypd_app_ref?: string | null
          opened_at?: string
          qa_signed_off_at?: string | null
          qa_signed_off_by?: string | null
          stage?: Database["public"]["Enums"]["case_stage"]
          stage_entered_at?: string
          status?: Database["public"]["Enums"]["case_status"]
          target_file_date?: string | null
          training_completed_on?: string | null
          training_expires_on?: string | null
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
          {
            foreignKeyName: "cases_qa_signed_off_by_fkey"
            columns: ["qa_signed_off_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          home_geog: unknown
          id: string
          lat: number | null
          lead_source: string | null
          license_type: string | null
          lng: number | null
          phone: string | null
          profile_id: string | null
          track: Database["public"]["Enums"]["client_track"]
          updated_at: string
          zip: string | null
        }
        Insert: {
          assigned_staff?: string | null
          borough?: string | null
          created_at?: string
          current_stage?: Database["public"]["Enums"]["case_stage"]
          eligibility?: Json
          email?: string | null
          full_name: string
          home_geog?: unknown
          id?: string
          lat?: number | null
          lead_source?: string | null
          license_type?: string | null
          lng?: number | null
          phone?: string | null
          profile_id?: string | null
          track?: Database["public"]["Enums"]["client_track"]
          updated_at?: string
          zip?: string | null
        }
        Update: {
          assigned_staff?: string | null
          borough?: string | null
          created_at?: string
          current_stage?: Database["public"]["Enums"]["case_stage"]
          eligibility?: Json
          email?: string | null
          full_name?: string
          home_geog?: unknown
          id?: string
          lat?: number | null
          lead_source?: string | null
          license_type?: string | null
          lng?: number | null
          phone?: string | null
          profile_id?: string | null
          track?: Database["public"]["Enums"]["client_track"]
          updated_at?: string
          zip?: string | null
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
          answers: Json
          case_id: string
          contact_email: string | null
          created_at: string
          document_id: string | null
          id: string
          name: string
          notarized_at: string | null
          notary_area: string | null
          relationship: string | null
          token: string | null
          token_expires_at: string | null
          token_revoked_at: string | null
          updated_at: string
        }
        Insert: {
          affidavit_status?: Database["public"]["Enums"]["cohabitant_status"]
          answers?: Json
          case_id: string
          contact_email?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
          name: string
          notarized_at?: string | null
          notary_area?: string | null
          relationship?: string | null
          token?: string | null
          token_expires_at?: string | null
          token_revoked_at?: string | null
          updated_at?: string
        }
        Update: {
          affidavit_status?: Database["public"]["Enums"]["cohabitant_status"]
          answers?: Json
          case_id?: string
          contact_email?: string | null
          created_at?: string
          document_id?: string | null
          id?: string
          name?: string
          notarized_at?: string | null
          notary_area?: string | null
          relationship?: string | null
          token?: string | null
          token_expires_at?: string | null
          token_revoked_at?: string | null
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
          {
            foreignKeyName: "cohabitants_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      disclosures: {
        Row: {
          case_id: string
          created_at: string
          disposition: string | null
          id: string
          jurisdiction_text: string | null
          narrative: string
          occurred_on: string | null
          parties: string | null
          question_no: number | null
          spawned_req_code: string | null
          type: Database["public"]["Enums"]["disclosure_type"]
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          disposition?: string | null
          id?: string
          jurisdiction_text?: string | null
          narrative?: string
          occurred_on?: string | null
          parties?: string | null
          question_no?: number | null
          spawned_req_code?: string | null
          type: Database["public"]["Enums"]["disclosure_type"]
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          disposition?: string | null
          id?: string
          jurisdiction_text?: string | null
          narrative?: string
          occurred_on?: string | null
          parties?: string | null
          question_no?: number | null
          spawned_req_code?: string | null
          type?: Database["public"]["Enums"]["disclosure_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disclosures_case_id_fkey"
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
      engagements: {
        Row: {
          case_id: string
          client_consented_at: string | null
          created_at: string
          id: string
          instructor_id: string
          offer_id: string | null
          scope_full_assist: boolean
          status: Database["public"]["Enums"]["engagement_status"]
          type: Database["public"]["Enums"]["offer_type"]
          updated_at: string
        }
        Insert: {
          case_id: string
          client_consented_at?: string | null
          created_at?: string
          id?: string
          instructor_id: string
          offer_id?: string | null
          scope_full_assist?: boolean
          status?: Database["public"]["Enums"]["engagement_status"]
          type: Database["public"]["Enums"]["offer_type"]
          updated_at?: string
        }
        Update: {
          case_id?: string
          client_consented_at?: string | null
          created_at?: string
          id?: string
          instructor_id?: string
          offer_id?: string | null
          scope_full_assist?: boolean
          status?: Database["public"]["Enums"]["engagement_status"]
          type?: Database["public"]["Enums"]["offer_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "engagements_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "applicant_interest_feed"
            referencedColumns: ["offer_id"]
          },
          {
            foreignKeyName: "engagements_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "case_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "engagements_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "instructor_offer_feed"
            referencedColumns: ["offer_id"]
          },
        ]
      }
      fees: {
        Row: {
          active: boolean
          amount_cents: number
          authority: string | null
          created_at: string
          id: string
          key: string
          label: string
          notes: string | null
          payee: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount_cents: number
          authority?: string | null
          created_at?: string
          id?: string
          key: string
          label: string
          notes?: string | null
          payee: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount_cents?: number
          authority?: string | null
          created_at?: string
          id?: string
          key?: string
          label?: string
          notes?: string | null
          payee?: string
          updated_at?: string
        }
        Relationships: []
      }
      instructors: {
        Row: {
          active: boolean
          availability: Json
          base_geog: unknown
          bio: string | null
          created_at: string
          dcjs_id: string | null
          email: string | null
          id: string
          jurisdictions: Database["public"]["Enums"]["jurisdiction_key"][]
          lat: number | null
          lng: number | null
          name: string
          payouts_enabled: boolean
          phone: string | null
          price_18h_cents: number | null
          profile_id: string | null
          rating_avg: number | null
          rating_count: number
          service_radius_mi: number
          stripe_connect_account_id: string | null
          updated_at: string
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          active?: boolean
          availability?: Json
          base_geog?: unknown
          bio?: string | null
          created_at?: string
          dcjs_id?: string | null
          email?: string | null
          id?: string
          jurisdictions?: Database["public"]["Enums"]["jurisdiction_key"][]
          lat?: number | null
          lng?: number | null
          name: string
          payouts_enabled?: boolean
          phone?: string | null
          price_18h_cents?: number | null
          profile_id?: string | null
          rating_avg?: number | null
          rating_count?: number
          service_radius_mi?: number
          stripe_connect_account_id?: string | null
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          active?: boolean
          availability?: Json
          base_geog?: unknown
          bio?: string | null
          created_at?: string
          dcjs_id?: string | null
          email?: string | null
          id?: string
          jurisdictions?: Database["public"]["Enums"]["jurisdiction_key"][]
          lat?: number | null
          lng?: number | null
          name?: string
          payouts_enabled?: boolean
          phone?: string | null
          price_18h_cents?: number | null
          profile_id?: string | null
          rating_avg?: number | null
          rating_count?: number
          service_radius_mi?: number
          stripe_connect_account_id?: string | null
          updated_at?: string
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "instructors_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      intake_sessions: {
        Row: {
          answers: Json
          case_id: string
          completed_at: string | null
          created_at: string
          current_step: number
          id: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          case_id: string
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          case_id?: string
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "intake_sessions_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      jurisdiction_profiles: {
        Row: {
          active: boolean
          created_at: string
          id: string
          issuing_authority: string | null
          key: Database["public"]["Enums"]["jurisdiction_key"]
          label: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          issuing_authority?: string | null
          key: Database["public"]["Enums"]["jurisdiction_key"]
          label: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          issuing_authority?: string | null
          key?: Database["public"]["Enums"]["jurisdiction_key"]
          label?: string
          updated_at?: string
        }
        Relationships: []
      }
      license_reports: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          case_id: string
          client_id: string
          created_at: string
          details: string
          id: string
          kind: string
          reported_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          case_id: string
          client_id: string
          created_at?: string
          details: string
          id?: string
          kind: string
          reported_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          case_id?: string
          client_id?: string
          created_at?: string
          details?: string
          id?: string
          kind?: string
          reported_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "license_reports_acknowledged_by_fkey"
            columns: ["acknowledged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_reports_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "license_reports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
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
      notifications: {
        Row: {
          body: string | null
          case_id: string | null
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["notification_kind"]
          link: string | null
          read: boolean
          recipient: string
          title: string
        }
        Insert: {
          body?: string | null
          case_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          link?: string | null
          read?: boolean
          recipient: string
          title: string
        }
        Update: {
          body?: string | null
          case_id?: string | null
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["notification_kind"]
          link?: string | null
          read?: boolean
          recipient?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_fkey"
            columns: ["recipient"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_matches: {
        Row: {
          created_at: string
          distance_mi: number | null
          id: string
          instructor_id: string
          note: string | null
          offer_id: string
          quoted_price_cents: number | null
          responded: string | null
          responded_at: string | null
        }
        Insert: {
          created_at?: string
          distance_mi?: number | null
          id?: string
          instructor_id: string
          note?: string | null
          offer_id: string
          quoted_price_cents?: number | null
          responded?: string | null
          responded_at?: string | null
        }
        Update: {
          created_at?: string
          distance_mi?: number | null
          id?: string
          instructor_id?: string
          note?: string | null
          offer_id?: string
          quoted_price_cents?: number | null
          responded?: string | null
          responded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_matches_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_matches_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "applicant_interest_feed"
            referencedColumns: ["offer_id"]
          },
          {
            foreignKeyName: "offer_matches_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "case_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_matches_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "instructor_offer_feed"
            referencedColumns: ["offer_id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          application_fee_cents: number | null
          booking_id: string | null
          case_id: string | null
          client_id: string | null
          created_at: string
          currency: string
          description: string | null
          engagement_id: string | null
          id: string
          invoice_url: string | null
          package_key: string | null
          paid_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          stripe_connect_account: string | null
          stripe_payment_intent: string | null
          stripe_session_id: string | null
          type: Database["public"]["Enums"]["payment_type"]
          updated_at: string
        }
        Insert: {
          amount_cents: number
          application_fee_cents?: number | null
          booking_id?: string | null
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          engagement_id?: string | null
          id?: string
          invoice_url?: string | null
          package_key?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_connect_account?: string | null
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          type?: Database["public"]["Enums"]["payment_type"]
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          application_fee_cents?: number | null
          booking_id?: string | null
          case_id?: string | null
          client_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          engagement_id?: string | null
          id?: string
          invoice_url?: string | null
          package_key?: string | null
          paid_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          stripe_connect_account?: string | null
          stripe_payment_intent?: string | null
          stripe_session_id?: string | null
          type?: Database["public"]["Enums"]["payment_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
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
          {
            foreignKeyName: "payments_engagement_id_fkey"
            columns: ["engagement_id"]
            isOneToOne: false
            referencedRelation: "engagements"
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
      purchase_authorizations: {
        Row: {
          acquired_on: string | null
          authorized_on: string
          case_id: string
          client_id: string
          created_at: string
          expires_on: string
          handgun_desc: string | null
          id: string
          inspected_on: string | null
          inspection_due: string | null
          updated_at: string
        }
        Insert: {
          acquired_on?: string | null
          authorized_on: string
          case_id: string
          client_id: string
          created_at?: string
          expires_on: string
          handgun_desc?: string | null
          id?: string
          inspected_on?: string | null
          inspection_due?: string | null
          updated_at?: string
        }
        Update: {
          acquired_on?: string | null
          authorized_on?: string
          case_id?: string
          client_id?: string
          created_at?: string
          expires_on?: string
          handgun_desc?: string | null
          id?: string
          inspected_on?: string | null
          inspection_due?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_authorizations_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_authorizations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_requests: {
        Row: {
          answered_at: string | null
          answers: Json
          case_id: string
          created_at: string
          document_id: string | null
          expires_at: string
          id: string
          notarized_at: string | null
          notary_area: string | null
          opened_at: string | null
          reference_id: string
          revoked_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["reference_req_status"]
          submitted_at: string | null
          token: string
          updated_at: string
        }
        Insert: {
          answered_at?: string | null
          answers?: Json
          case_id: string
          created_at?: string
          document_id?: string | null
          expires_at?: string
          id?: string
          notarized_at?: string | null
          notary_area?: string | null
          opened_at?: string | null
          reference_id: string
          revoked_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reference_req_status"]
          submitted_at?: string | null
          token: string
          updated_at?: string
        }
        Update: {
          answered_at?: string | null
          answers?: Json
          case_id?: string
          created_at?: string
          document_id?: string | null
          expires_at?: string
          id?: string
          notarized_at?: string | null
          notary_area?: string | null
          opened_at?: string | null
          reference_id?: string
          revoked_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reference_req_status"]
          submitted_at?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_requests_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reference_requests_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reference_requests_reference_id_fkey"
            columns: ["reference_id"]
            isOneToOne: false
            referencedRelation: "character_references"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_log: {
        Row: {
          case_id: string | null
          id: string
          rule_key: string
          sent_at: string
          target: string
          window_key: string
        }
        Insert: {
          case_id?: string | null
          id?: string
          rule_key: string
          sent_at?: string
          target: string
          window_key: string
        }
        Update: {
          case_id?: string | null
          id?: string
          rule_key?: string
          sent_at?: string
          target?: string
          window_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_log_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      requirements: {
        Row: {
          authority: string | null
          blocking: boolean
          created_at: string
          description: string | null
          document_type: Database["public"]["Enums"]["document_type"] | null
          effective_from: string
          effective_to: string | null
          id: string
          jurisdiction_id: string
          needs_legal_review: boolean
          req_code: string
          severity: Database["public"]["Enums"]["requirement_sev"]
          source_url: string | null
          title: string
          trigger_cond: string
          updated_at: string
          validation_rule: Json
          verified_by: string | null
          verified_on: string | null
        }
        Insert: {
          authority?: string | null
          blocking?: boolean
          created_at?: string
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          jurisdiction_id: string
          needs_legal_review?: boolean
          req_code: string
          severity?: Database["public"]["Enums"]["requirement_sev"]
          source_url?: string | null
          title: string
          trigger_cond?: string
          updated_at?: string
          validation_rule?: Json
          verified_by?: string | null
          verified_on?: string | null
        }
        Update: {
          authority?: string | null
          blocking?: boolean
          created_at?: string
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          jurisdiction_id?: string
          needs_legal_review?: boolean
          req_code?: string
          severity?: Database["public"]["Enums"]["requirement_sev"]
          source_url?: string | null
          title?: string
          trigger_cond?: string
          updated_at?: string
          validation_rule?: Json
          verified_by?: string | null
          verified_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "requirements_jurisdiction_id_fkey"
            columns: ["jurisdiction_id"]
            isOneToOne: false
            referencedRelation: "jurisdiction_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirements_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      service_packages: {
        Row: {
          active: boolean
          blurb: string
          created_at: string
          deposit_cents: number
          featured: boolean
          id: string
          key: string
          name: string
          price_cents: number
          price_label: string | null
          refile_promise: boolean
          sort: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          blurb: string
          created_at?: string
          deposit_cents?: number
          featured?: boolean
          id?: string
          key: string
          name: string
          price_cents?: number
          price_label?: string | null
          refile_promise?: boolean
          sort?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          blurb?: string
          created_at?: string
          deposit_cents?: number
          featured?: boolean
          id?: string
          key?: string
          name?: string
          price_cents?: number
          price_label?: string | null
          refile_promise?: boolean
          sort?: number
          updated_at?: string
        }
        Relationships: []
      }
      signatures: {
        Row: {
          case_id: string
          created_at: string
          id: string
          png_base64: string
          signer_key: string
          updated_at: string
        }
        Insert: {
          case_id: string
          created_at?: string
          id?: string
          png_base64: string
          signer_key: string
          updated_at?: string
        }
        Update: {
          case_id?: string
          created_at?: string
          id?: string
          png_base64?: string
          signer_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "signatures_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          confirmed_at: string | null
          created_at: string
          email: string
          id: string
          jurisdiction: string | null
          offer: string
          payload: Json
          source: string
          unsubscribed_at: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          email: string
          id?: string
          jurisdiction?: string | null
          offer: string
          payload?: Json
          source: string
          unsubscribed_at?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          email?: string
          id?: string
          jurisdiction?: string | null
          offer?: string
          payload?: Json
          source?: string
          unsubscribed_at?: string | null
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
      training_locations: {
        Row: {
          address: string | null
          created_at: string
          geog: unknown
          id: string
          instructor_id: string
          is_range: boolean
          label: string
          lat: number | null
          lng: number | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          geog?: unknown
          id?: string
          instructor_id: string
          is_range?: boolean
          label: string
          lat?: number | null
          lng?: number | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          geog?: unknown
          id?: string
          instructor_id?: string
          is_range?: boolean
          label?: string
          lat?: number | null
          lng?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_locations_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
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
      applicant_interest_feed: {
        Row: {
          bio: string | null
          case_id: string | null
          dcjs_id: string | null
          distance_mi: number | null
          instructor_id: string | null
          name: string | null
          note: string | null
          offer_id: string | null
          price_18h_cents: number | null
          quoted_price_cents: number | null
          rating_avg: number | null
          rating_count: number | null
          responded_at: string | null
          service_radius_mi: number | null
          type: Database["public"]["Enums"]["offer_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "case_offers_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_matches_instructor_id_fkey"
            columns: ["instructor_id"]
            isOneToOne: false
            referencedRelation: "instructors"
            referencedColumns: ["id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      instructor_offer_feed: {
        Row: {
          area_label: string | null
          created_at: string | null
          distance_mi: number | null
          expires_at: string | null
          jurisdiction: Database["public"]["Enums"]["jurisdiction_key"] | null
          needs_note: string | null
          offer_id: string | null
          responded: string | null
          stage: Database["public"]["Enums"]["case_stage"] | null
          type: Database["public"]["Enums"]["offer_type"] | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      accept_offer: { Args: { p_offer_id: string }; Returns: string }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      case_visible: { Args: { p_case_id: string }; Returns: boolean }
      choose_instructor: {
        Args: { p_instructor_id: string; p_offer_id: string }
        Returns: string
      }
      client_visible: { Args: { p_client_id: string }; Returns: boolean }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      disablelongtransactions: { Args: never; Returns: string }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      express_interest: {
        Args: { p_note?: string; p_offer_id: string; p_price_cents?: number }
        Returns: undefined
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      gettransactionid: { Args: never; Returns: unknown }
      instructor_engaged: { Args: { p_case_id: string }; Returns: boolean }
      instructors_within_radius: {
        Args: {
          p_jurisdiction?: Database["public"]["Enums"]["jurisdiction_key"]
          p_lat: number
          p_lng: number
          p_radius_mi?: number
        }
        Returns: {
          bio: string
          dcjs_id: string
          distance_mi: number
          id: string
          jurisdictions: Database["public"]["Enums"]["jurisdiction_key"][]
          name: string
          price_18h_cents: number
          rating_avg: number
          rating_count: number
          service_radius_mi: number
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_instructor: { Args: never; Returns: boolean }
      is_staff_or_admin: { Args: never; Returns: boolean }
      longtransactionsenabled: { Args: never; Returns: boolean }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      storage_doc_client_id: { Args: { path: string }; Returns: string }
      unlockrows: { Args: { "": string }; Returns: number }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
    }
    Enums: {
      appointment_type:
        | "consult"
        | "training"
        | "fingerprinting"
        | "nypd_interview"
      booking_status:
        | "requested"
        | "confirmed"
        | "cancelled"
        | "completed"
        | "no_show"
      calendar_provider: "google"
      case_req_status: "na" | "pending" | "satisfied" | "rejected"
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
      client_track:
        | "resident"
        | "business"
        | "non_resident"
        | "retired_leo"
        | "premises_business"
      cohabitant_status: "not_started" | "received" | "notarized"
      disclosure_type:
        | "arrest"
        | "summons"
        | "order_of_protection"
        | "domestic_incident"
        | "question_yes"
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
        | "certificate_of_disposition"
        | "cert_relief_disabilities"
        | "cert_good_conduct"
        | "order_of_protection_copy"
        | "dd214"
        | "name_change_proof"
        | "other_license"
        | "affirmation_understanding"
        | "safeguard_ack"
        | "leo_good_guy_letter"
        | "leo_property_receipt"
        | "leo_cert_of_service"
        | "oos_background_form"
        | "applicant_photo"
      engagement_status: "active" | "completed" | "cancelled" | "declined"
      jurisdiction_key:
        | "nyc"
        | "nassau"
        | "suffolk"
        | "westchester"
        | "special_carry"
      notification_kind:
        | "info"
        | "action_required"
        | "reminder"
        | "offer"
        | "booking"
        | "payment"
      offer_status: "open" | "matched" | "accepted" | "expired" | "cancelled"
      offer_type: "training" | "full_assist"
      payment_status: "pending" | "paid" | "failed" | "refunded"
      payment_type: "deposit" | "full" | "installment"
      reference_req_status:
        | "pending"
        | "sent"
        | "opened"
        | "submitted"
        | "notarized"
      requirement_sev: "critical" | "high" | "watch" | "long_lead"
      slot_type: "classroom_16h" | "live_fire_2h" | "combined_18h" | "consult"
      stage_status: "not_started" | "in_progress" | "complete"
      task_status: "open" | "in_progress" | "done"
      user_role: "client" | "staff" | "admin" | "instructor"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      booking_status: [
        "requested",
        "confirmed",
        "cancelled",
        "completed",
        "no_show",
      ],
      calendar_provider: ["google"],
      case_req_status: ["na", "pending", "satisfied", "rejected"],
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
      client_track: [
        "resident",
        "business",
        "non_resident",
        "retired_leo",
        "premises_business",
      ],
      cohabitant_status: ["not_started", "received", "notarized"],
      disclosure_type: [
        "arrest",
        "summons",
        "order_of_protection",
        "domestic_incident",
        "question_yes",
      ],
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
        "certificate_of_disposition",
        "cert_relief_disabilities",
        "cert_good_conduct",
        "order_of_protection_copy",
        "dd214",
        "name_change_proof",
        "other_license",
        "affirmation_understanding",
        "safeguard_ack",
        "leo_good_guy_letter",
        "leo_property_receipt",
        "leo_cert_of_service",
        "oos_background_form",
        "applicant_photo",
      ],
      engagement_status: ["active", "completed", "cancelled", "declined"],
      jurisdiction_key: [
        "nyc",
        "nassau",
        "suffolk",
        "westchester",
        "special_carry",
      ],
      notification_kind: [
        "info",
        "action_required",
        "reminder",
        "offer",
        "booking",
        "payment",
      ],
      offer_status: ["open", "matched", "accepted", "expired", "cancelled"],
      offer_type: ["training", "full_assist"],
      payment_status: ["pending", "paid", "failed", "refunded"],
      payment_type: ["deposit", "full", "installment"],
      reference_req_status: [
        "pending",
        "sent",
        "opened",
        "submitted",
        "notarized",
      ],
      requirement_sev: ["critical", "high", "watch", "long_lead"],
      slot_type: ["classroom_16h", "live_fire_2h", "combined_18h", "consult"],
      stage_status: ["not_started", "in_progress", "complete"],
      task_status: ["open", "in_progress", "done"],
      user_role: ["client", "staff", "admin", "instructor"],
    },
  },
} as const

