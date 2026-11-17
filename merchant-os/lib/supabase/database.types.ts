// Generated from the live database schema by scripts/supabase-types.sh — do not edit by hand.
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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      assistant_tokens: {
        Row: {
          created_at: string
          id: string
          last_used_at: string | null
          name: string
          organization_id: string
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          name: string
          organization_id: string
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_used_at?: string | null
          name?: string
          organization_id?: string
          token_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          new_data: Json | null
          old_data: Json | null
          organization_id: string
          record_id: string
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          organization_id: string
          record_id: string
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: never
          new_data?: Json | null
          old_data?: Json | null
          organization_id?: string
          record_id?: string
          table_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      carrier_events: {
        Row: {
          carrier_status: string
          dedupe_key: string
          id: number
          organization_id: string
          outcome: string
          payload: Json
          provider_id: string
          received_at: string
          shipment_id: string | null
          tracking_number: string
        }
        Insert: {
          carrier_status: string
          dedupe_key: string
          id?: never
          organization_id: string
          outcome: string
          payload: Json
          provider_id: string
          received_at?: string
          shipment_id?: string | null
          tracking_number: string
        }
        Update: {
          carrier_status?: string
          dedupe_key?: string
          id?: never
          organization_id?: string
          outcome?: string
          payload?: Json
          provider_id?: string
          received_at?: string
          shipment_id?: string | null
          tracking_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "carrier_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carrier_events_provider_id_organization_id_fkey"
            columns: ["provider_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_providers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "carrier_events_shipment_id_organization_id_fkey"
            columns: ["shipment_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      cash_entries: {
        Row: {
          amount_cents: number
          created_at: string
          created_by: string | null
          entry_date: string
          id: string
          kind: Database["public"]["Enums"]["cash_entry_kind"]
          note: string
          organization_id: string
          over_limit: boolean
        }
        Insert: {
          amount_cents: number
          created_at?: string
          created_by?: string | null
          entry_date: string
          id?: string
          kind: Database["public"]["Enums"]["cash_entry_kind"]
          note?: string
          organization_id: string
          over_limit?: boolean
        }
        Update: {
          amount_cents?: number
          created_at?: string
          created_by?: string | null
          entry_date?: string
          id?: string
          kind?: Database["public"]["Enums"]["cash_entry_kind"]
          note?: string
          organization_id?: string
          over_limit?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "cash_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_settings: {
        Row: {
          opening_date: string
          organization_id: string
          owner_fund_name: string
          reserve_floor_cents: number
          updated_at: string
        }
        Insert: {
          opening_date?: string
          organization_id: string
          owner_fund_name?: string
          reserve_floor_cents?: number
          updated_at?: string
        }
        Update: {
          opening_date?: string
          organization_id?: string
          owner_fund_name?: string
          reserve_floor_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          aliases: string[]
          created_at: string
          id: number
          is_active: boolean
          name_ar: string
          name_fr: string
          organization_id: string | null
          region: string
        }
        Insert: {
          aliases?: string[]
          created_at?: string
          id?: never
          is_active?: boolean
          name_ar: string
          name_fr: string
          organization_id?: string | null
          region?: string
        }
        Update: {
          aliases?: string[]
          created_at?: string
          id?: never
          is_active?: boolean
          name_ar?: string
          name_fr?: string
          organization_id?: string | null
          region?: string
        }
        Relationships: [
          {
            foreignKeyName: "cities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cod_remittance_items: {
        Row: {
          collected_cents: number
          fee_cents: number
          id: string
          order_id: string
          organization_id: string
          remittance_id: string
        }
        Insert: {
          collected_cents: number
          fee_cents?: number
          id?: string
          order_id: string
          organization_id: string
          remittance_id: string
        }
        Update: {
          collected_cents?: number
          fee_cents?: number
          id?: string
          order_id?: string
          organization_id?: string
          remittance_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cod_remittance_items_order_id_organization_id_fkey"
            columns: ["order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "cod_remittance_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cod_remittance_items_remittance_id_organization_id_fkey"
            columns: ["remittance_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "cod_remittances"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      cod_remittances: {
        Row: {
          created_at: string
          created_by: string | null
          fees_cents: number
          gross_collected_cents: number
          id: string
          net_received_cents: number
          note: string
          organization_id: string
          other_charges_cents: number
          provider_id: string | null
          received_on: string
          reference: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          fees_cents?: number
          gross_collected_cents: number
          id?: string
          net_received_cents: number
          note?: string
          organization_id: string
          other_charges_cents?: number
          provider_id?: string | null
          received_on: string
          reference?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          fees_cents?: number
          gross_collected_cents?: number
          id?: string
          net_received_cents?: number
          note?: string
          organization_id?: string
          other_charges_cents?: number
          provider_id?: string | null
          received_on?: string
          reference?: string
        }
        Relationships: [
          {
            foreignKeyName: "cod_remittances_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cod_remittances_provider_id_organization_id_fkey"
            columns: ["provider_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_providers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      customer_blocklist: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          phone: string
          reason: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          phone: string
          reason: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          phone?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_blocklist_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string
          city: string
          created_at: string
          full_name: string
          id: string
          notes: string
          organization_id: string
          phone: string
          tags: string[]
          updated_at: string
        }
        Insert: {
          address?: string
          city?: string
          created_at?: string
          full_name: string
          id?: string
          notes?: string
          organization_id: string
          phone: string
          tags?: string[]
          updated_at?: string
        }
        Update: {
          address?: string
          city?: string
          created_at?: string
          full_name?: string
          id?: string
          notes?: string
          organization_id?: string
          phone?: string
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount_cents: number
          campaign_id: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string
          created_by: string | null
          data_source: Database["public"]["Enums"]["data_source"]
          description: string
          id: string
          incurred_on: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          campaign_id?: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          data_source?: Database["public"]["Enums"]["data_source"]
          description?: string
          id?: string
          incurred_on: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          campaign_id?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string
          created_by?: string | null
          data_source?: Database["public"]["Enums"]["data_source"]
          description?: string
          id?: string
          incurred_on?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_campaign_id_organization_id_fkey"
            columns: ["campaign_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fund_plan: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          percent: number
          position: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          percent: number
          position?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          percent?: number
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "fund_plan_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_levels: {
        Row: {
          available: number | null
          damaged: number
          inspection: number
          location_id: string
          on_hand: number
          organization_id: string
          reserved: number
          updated_at: string
          variant_id: string
        }
        Insert: {
          available?: number | null
          damaged?: number
          inspection?: number
          location_id: string
          on_hand?: number
          organization_id: string
          reserved?: number
          updated_at?: string
          variant_id: string
        }
        Update: {
          available?: number | null
          damaged?: number
          inspection?: number
          location_id?: string
          on_hand?: number
          organization_id?: string
          reserved?: number
          updated_at?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_levels_location_id_organization_id_fkey"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "inventory_levels_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_levels_variant_id_organization_id_fkey"
            columns: ["variant_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      inventory_locations: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_locations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          delta_damaged: number
          delta_inspection: number
          delta_on_hand: number
          delta_reserved: number
          id: number
          location_id: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          note: string | null
          organization_id: string
          reference_id: string | null
          reference_type: string | null
          variant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          delta_damaged?: number
          delta_inspection?: number
          delta_on_hand?: number
          delta_reserved?: number
          id?: never
          location_id: string
          movement_type: Database["public"]["Enums"]["inventory_movement_type"]
          note?: string | null
          organization_id: string
          reference_id?: string | null
          reference_type?: string | null
          variant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          delta_damaged?: number
          delta_inspection?: number
          delta_on_hand?: number
          delta_reserved?: number
          id?: never
          location_id?: string
          movement_type?: Database["public"]["Enums"]["inventory_movement_type"]
          note?: string | null
          organization_id?: string
          reference_id?: string | null
          reference_type?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_location_id_organization_id_fkey"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "inventory_movements_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_variant_id_organization_id_fkey"
            columns: ["variant_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      marketing_campaigns: {
        Row: {
          created_at: string
          data_source: Database["public"]["Enums"]["data_source"]
          ends_on: string | null
          external_id: string | null
          id: string
          name: string
          organization_id: string
          platform: Database["public"]["Enums"]["marketing_platform"]
          starts_on: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_source?: Database["public"]["Enums"]["data_source"]
          ends_on?: string | null
          external_id?: string | null
          id?: string
          name: string
          organization_id: string
          platform: Database["public"]["Enums"]["marketing_platform"]
          starts_on?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_source?: Database["public"]["Enums"]["data_source"]
          ends_on?: string | null
          external_id?: string | null
          id?: string
          name?: string
          organization_id?: string
          platform?: Database["public"]["Enums"]["marketing_platform"]
          starts_on?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      monthly_closes: {
        Row: {
          allocations: Json
          closed_at: string
          closed_by: string | null
          id: string
          month: string
          net_profit_cents: number
          note: string
          organization_id: string
        }
        Insert: {
          allocations?: Json
          closed_at?: string
          closed_by?: string | null
          id?: string
          month: string
          net_profit_cents: number
          note?: string
          organization_id: string
        }
        Update: {
          allocations?: Json
          closed_at?: string
          closed_by?: string | null
          id?: string
          month?: string
          net_profit_cents?: number
          note?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_closes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_call_attempts: {
        Row: {
          actor_id: string | null
          call_back_at: string | null
          created_at: string
          id: number
          note: string | null
          order_id: string
          organization_id: string
          outcome: Database["public"]["Enums"]["call_outcome"]
        }
        Insert: {
          actor_id?: string | null
          call_back_at?: string | null
          created_at?: string
          id?: never
          note?: string | null
          order_id: string
          organization_id: string
          outcome: Database["public"]["Enums"]["call_outcome"]
        }
        Update: {
          actor_id?: string | null
          call_back_at?: string | null
          created_at?: string
          id?: never
          note?: string | null
          order_id?: string
          organization_id?: string
          outcome?: Database["public"]["Enums"]["call_outcome"]
        }
        Relationships: [
          {
            foreignKeyName: "order_call_attempts_order_id_organization_id_fkey"
            columns: ["order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "order_call_attempts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_contacts: {
        Row: {
          address: string
          full_name: string
          order_id: string
          organization_id: string
          phone: string
        }
        Insert: {
          address?: string
          full_name: string
          order_id: string
          organization_id: string
          phone: string
        }
        Update: {
          address?: string
          full_name?: string
          order_id?: string
          organization_id?: string
          phone?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_contacts_order_id_organization_id_fkey"
            columns: ["order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "order_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_events: {
        Row: {
          actor_id: string | null
          created_at: string
          event_type: string
          from_status: Database["public"]["Enums"]["order_status"] | null
          id: number
          note: string | null
          order_id: string
          organization_id: string
          to_status: Database["public"]["Enums"]["order_status"] | null
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          event_type: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: never
          note?: string | null
          order_id: string
          organization_id: string
          to_status?: Database["public"]["Enums"]["order_status"] | null
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          event_type?: string
          from_status?: Database["public"]["Enums"]["order_status"] | null
          id?: never
          note?: string | null
          order_id?: string
          organization_id?: string
          to_status?: Database["public"]["Enums"]["order_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "order_events_order_id_organization_id_fkey"
            columns: ["order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "order_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          id: string
          line_total_cents: number | null
          order_id: string
          organization_id: string
          product_name: string
          quantity: number
          sku: string
          unit_cost_cents: number | null
          unit_price_cents: number
          variant_id: string
          variant_title: string
        }
        Insert: {
          id?: string
          line_total_cents?: number | null
          order_id: string
          organization_id: string
          product_name: string
          quantity: number
          sku: string
          unit_cost_cents?: number | null
          unit_price_cents: number
          variant_id: string
          variant_title?: string
        }
        Update: {
          id?: string
          line_total_cents?: number | null
          order_id?: string
          organization_id?: string
          product_name?: string
          quantity?: number
          sku?: string
          unit_cost_cents?: number | null
          unit_price_cents?: number
          variant_id?: string
          variant_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_organization_id_fkey"
            columns: ["order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "order_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_organization_id_fkey"
            columns: ["variant_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      orders: {
        Row: {
          call_attempts: number
          campaign_id: string | null
          cancelled_at: string | null
          city: string
          city_id: number | null
          cod_amount_cents: number
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          delivered_at: string | null
          discount_cents: number
          exchange_of_order_id: string | null
          id: string
          internal_notes: string
          last_call_outcome: Database["public"]["Enums"]["call_outcome"] | null
          location_id: string
          next_call_at: string | null
          notes: string
          order_number: string
          organization_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipped_at: string | null
          shipping_fee_cents: number
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          stock_state: Database["public"]["Enums"]["stock_state"]
          store_id: string | null
          subtotal_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          call_attempts?: number
          campaign_id?: string | null
          cancelled_at?: string | null
          city?: string
          city_id?: number | null
          cod_amount_cents?: number
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          delivered_at?: string | null
          discount_cents?: number
          exchange_of_order_id?: string | null
          id?: string
          internal_notes?: string
          last_call_outcome?: Database["public"]["Enums"]["call_outcome"] | null
          location_id: string
          next_call_at?: string | null
          notes?: string
          order_number: string
          organization_id: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipped_at?: string | null
          shipping_fee_cents?: number
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          stock_state?: Database["public"]["Enums"]["stock_state"]
          store_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Update: {
          call_attempts?: number
          campaign_id?: string | null
          cancelled_at?: string | null
          city?: string
          city_id?: number | null
          cod_amount_cents?: number
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          delivered_at?: string | null
          discount_cents?: number
          exchange_of_order_id?: string | null
          id?: string
          internal_notes?: string
          last_call_outcome?: Database["public"]["Enums"]["call_outcome"] | null
          location_id?: string
          next_call_at?: string | null
          notes?: string
          order_number?: string
          organization_id?: string
          payment_status?: Database["public"]["Enums"]["payment_status"]
          shipped_at?: string | null
          shipping_fee_cents?: number
          source?: Database["public"]["Enums"]["order_source"]
          status?: Database["public"]["Enums"]["order_status"]
          stock_state?: Database["public"]["Enums"]["stock_state"]
          store_id?: string | null
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_campaign_id_organization_id_fkey"
            columns: ["campaign_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "marketing_campaigns"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "orders_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_organization_id_fkey"
            columns: ["customer_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "orders_exchange_of_order_id_organization_id_fkey"
            columns: ["exchange_of_order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "orders_location_id_organization_id_fkey"
            columns: ["location_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "inventory_locations"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "orders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_organization_id_fkey"
            columns: ["store_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      organization_counters: {
        Row: {
          name: string
          organization_id: string
          value: number
        }
        Insert: {
          name: string
          organization_id: string
          value?: number
        }
        Update: {
          name?: string
          organization_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "organization_counters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          organization_id: string
          role: Database["public"]["Enums"]["member_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          role?: Database["public"]["Enums"]["member_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["member_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          country: string
          created_at: string
          currency: string
          id: string
          name: string
          order_prefix: string
          slug: string
          timezone: string
          updated_at: string
        }
        Insert: {
          country?: string
          created_at?: string
          currency?: string
          id?: string
          name: string
          order_prefix?: string
          slug: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          country?: string
          created_at?: string
          currency?: string
          id?: string
          name?: string
          order_prefix?: string
          slug?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      owner_decisions: {
        Row: {
          created_at: string
          created_by: string | null
          decision: string
          id: string
          metric: string
          organization_id: string
          outcome: string | null
          reason: string
          updated_at: string
          week_start: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          decision: string
          id?: string
          metric?: string
          organization_id: string
          outcome?: string | null
          reason?: string
          updated_at?: string
          week_start: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          decision?: string
          id?: string
          metric?: string
          organization_id?: string
          outcome?: string | null
          reason?: string
          updated_at?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_decisions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payables: {
        Row: {
          amount_cents: number
          category: Database["public"]["Enums"]["expense_category"]
          counterparty: string
          created_at: string
          created_by: string | null
          description: string
          due_on: string
          expense_id: string | null
          id: string
          organization_id: string
          paid_on: string | null
        }
        Insert: {
          amount_cents: number
          category?: Database["public"]["Enums"]["expense_category"]
          counterparty: string
          created_at?: string
          created_by?: string | null
          description?: string
          due_on: string
          expense_id?: string | null
          id?: string
          organization_id: string
          paid_on?: string | null
        }
        Update: {
          amount_cents?: number
          category?: Database["public"]["Enums"]["expense_category"]
          counterparty?: string
          created_at?: string
          created_by?: string | null
          description?: string
          due_on?: string
          expense_id?: string | null
          id?: string
          organization_id?: string
          paid_on?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payables_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          barcode: string | null
          cost_cents: number | null
          created_at: string
          id: string
          min_stock_level: number
          option_values: Json
          organization_id: string
          price_cents: number
          product_id: string
          sku: string
          status: Database["public"]["Enums"]["product_status"]
          title: string
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          cost_cents?: number | null
          created_at?: string
          id?: string
          min_stock_level?: number
          option_values?: Json
          organization_id: string
          price_cents: number
          product_id: string
          sku: string
          status?: Database["public"]["Enums"]["product_status"]
          title?: string
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          cost_cents?: number | null
          created_at?: string
          id?: string
          min_stock_level?: number
          option_values?: Json
          organization_id?: string
          price_cents?: number
          product_id?: string
          sku?: string
          status?: Database["public"]["Enums"]["product_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_organization_id_fkey"
            columns: ["product_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string
          id: string
          image_path: string | null
          image_paths: string[]
          name: string
          options: Json
          organization_id: string
          status: Database["public"]["Enums"]["product_status"]
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          image_path?: string | null
          image_paths?: string[]
          name: string
          options?: Json
          organization_id: string
          status?: Database["public"]["Enums"]["product_status"]
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          image_path?: string | null
          image_paths?: string[]
          name?: string
          options?: Json
          organization_id?: string
          status?: Database["public"]["Enums"]["product_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_organization_id_fkey"
            columns: ["category_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "products_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          condition: Database["public"]["Enums"]["item_condition"]
          decided_at: string | null
          decided_by: string | null
          id: string
          order_item_id: string
          organization_id: string
          quantity: number
          return_id: string
          variant_id: string
        }
        Insert: {
          condition?: Database["public"]["Enums"]["item_condition"]
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          order_item_id: string
          organization_id: string
          quantity: number
          return_id: string
          variant_id: string
        }
        Update: {
          condition?: Database["public"]["Enums"]["item_condition"]
          decided_at?: string | null
          decided_by?: string | null
          id?: string
          order_item_id?: string
          organization_id?: string
          quantity?: number
          return_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_items_order_item_id_organization_id_fkey"
            columns: ["order_item_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "return_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_return_id_organization_id_fkey"
            columns: ["return_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "returns"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "return_items_variant_id_organization_id_fkey"
            columns: ["variant_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      returns: {
        Row: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["return_kind"]
          order_id: string
          organization_id: string
          reason: string
          received_at: string | null
          refund_amount_cents: number
          refunded_at: string | null
          return_shipping_fee_cents: number
          status: Database["public"]["Enums"]["return_status"]
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind: Database["public"]["Enums"]["return_kind"]
          order_id: string
          organization_id: string
          reason?: string
          received_at?: string | null
          refund_amount_cents?: number
          refunded_at?: string | null
          return_shipping_fee_cents?: number
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["return_kind"]
          order_id?: string
          organization_id?: string
          reason?: string
          received_at?: string | null
          refund_amount_cents?: number
          refunded_at?: string | null
          return_shipping_fee_cents?: number
          status?: Database["public"]["Enums"]["return_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "returns_order_id_organization_id_fkey"
            columns: ["order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "returns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shipment_events: {
        Row: {
          actor_id: string | null
          created_at: string
          data_source: Database["public"]["Enums"]["data_source"]
          id: number
          note: string | null
          organization_id: string
          shipment_id: string
          status: Database["public"]["Enums"]["shipment_status"]
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          data_source?: Database["public"]["Enums"]["data_source"]
          id?: never
          note?: string | null
          organization_id: string
          shipment_id: string
          status: Database["public"]["Enums"]["shipment_status"]
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          data_source?: Database["public"]["Enums"]["data_source"]
          id?: never
          note?: string | null
          organization_id?: string
          shipment_id?: string
          status?: Database["public"]["Enums"]["shipment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "shipment_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipment_events_shipment_id_organization_id_fkey"
            columns: ["shipment_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "shipments"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      shipments: {
        Row: {
          carrier_district_id: string | null
          carrier_district_name: string | null
          carrier_message: string | null
          carrier_status: string | null
          carrier_updated_at: string | null
          cod_amount_cents: number
          created_at: string
          created_by: string | null
          deliver_by: string | null
          delivered_at: string | null
          delivery_attempts: number
          id: string
          order_id: string
          organization_id: string
          proof_url: string | null
          provider_id: string
          returned_at: string | null
          shipped_at: string | null
          shipping_cost_cents: number
          status: Database["public"]["Enums"]["shipment_status"]
          tracking_number: string | null
          unreachable_count: number
          updated_at: string
        }
        Insert: {
          carrier_district_id?: string | null
          carrier_district_name?: string | null
          carrier_message?: string | null
          carrier_status?: string | null
          carrier_updated_at?: string | null
          cod_amount_cents?: number
          created_at?: string
          created_by?: string | null
          deliver_by?: string | null
          delivered_at?: string | null
          delivery_attempts?: number
          id?: string
          order_id: string
          organization_id: string
          proof_url?: string | null
          provider_id: string
          returned_at?: string | null
          shipped_at?: string | null
          shipping_cost_cents?: number
          status?: Database["public"]["Enums"]["shipment_status"]
          tracking_number?: string | null
          unreachable_count?: number
          updated_at?: string
        }
        Update: {
          carrier_district_id?: string | null
          carrier_district_name?: string | null
          carrier_message?: string | null
          carrier_status?: string | null
          carrier_updated_at?: string | null
          cod_amount_cents?: number
          created_at?: string
          created_by?: string | null
          deliver_by?: string | null
          delivered_at?: string | null
          delivery_attempts?: number
          id?: string
          order_id?: string
          organization_id?: string
          proof_url?: string | null
          provider_id?: string
          returned_at?: string | null
          shipped_at?: string | null
          shipping_cost_cents?: number
          status?: Database["public"]["Enums"]["shipment_status"]
          tracking_number?: string | null
          unreachable_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipments_order_id_organization_id_fkey"
            columns: ["order_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id", "organization_id"]
          },
          {
            foreignKeyName: "shipments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipments_provider_id_organization_id_fkey"
            columns: ["provider_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_providers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      shipping_providers: {
        Row: {
          adapter_key: string | null
          created_at: string
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["shipping_provider_kind"]
          name: string
          notes: string
          organization_id: string
          settings: Json
          updated_at: string
        }
        Insert: {
          adapter_key?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["shipping_provider_kind"]
          name: string
          notes?: string
          organization_id: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          adapter_key?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["shipping_provider_kind"]
          name?: string
          notes?: string
          organization_id?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_providers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_rates: {
        Row: {
          carrier_cost_cents: number | null
          city_id: number
          created_at: string
          customer_fee_cents: number
          id: string
          organization_id: string
          provider_id: string | null
          return_fee_cents: number | null
          updated_at: string
        }
        Insert: {
          carrier_cost_cents?: number | null
          city_id: number
          created_at?: string
          customer_fee_cents?: number
          id?: string
          organization_id: string
          provider_id?: string | null
          return_fee_cents?: number | null
          updated_at?: string
        }
        Update: {
          carrier_cost_cents?: number | null
          city_id?: number
          created_at?: string
          customer_fee_cents?: number
          id?: string
          organization_id?: string
          provider_id?: string | null
          return_fee_cents?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_rates_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_rates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shipping_rates_provider_id_organization_id_fkey"
            columns: ["provider_id", "organization_id"]
            isOneToOne: false
            referencedRelation: "shipping_providers"
            referencedColumns: ["id", "organization_id"]
          },
        ]
      }
      stores: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stores_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_order_note: {
        Args: { p_note: string; p_order_id: string }
        Returns: undefined
      }
      adjust_inventory: {
        Args: {
          p_location_id: string
          p_note: string
          p_quantity: number
          p_type: Database["public"]["Enums"]["inventory_movement_type"]
          p_variant_id: string
        }
        Returns: {
          available: number | null
          damaged: number
          inspection: number
          location_id: string
          on_hand: number
          organization_id: string
          reserved: number
          updated_at: string
          variant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "inventory_levels"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_carrier_event: {
        Args: {
          p_carrier_status: string
          p_payload: Json
          p_provider_id: string
          p_status: Database["public"]["Enums"]["shipment_status"]
          p_tracking_number: string
        }
        Returns: string
      }
      assistant_call: {
        Args: { p_args?: Json; p_token_hash: string; p_tool: string }
        Returns: Json
      }
      campaign_report: {
        Args: { p_from: string; p_organization_id: string; p_to: string }
        Returns: {
          campaign_id: string
          confirmed: number
          delivered: number
          delivered_revenue_cents: number
          name: string
          orders: number
          platform: Database["public"]["Enums"]["marketing_platform"]
          refused: number
          spend_cents: number
        }[]
      }
      close_return: {
        Args: { p_return_id: string }
        Returns: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["return_kind"]
          order_id: string
          organization_id: string
          reason: string
          received_at: string | null
          refund_amount_cents: number
          refunded_at: string | null
          return_shipping_fee_cents: number
          status: Database["public"]["Enums"]["return_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "returns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_assistant_token: {
        Args: {
          p_name: string
          p_organization_id: string
          p_token_hash: string
        }
        Returns: string
      }
      create_exchange_order: {
        Args: { p_order_id: string; p_payload: Json }
        Returns: {
          call_attempts: number
          campaign_id: string | null
          cancelled_at: string | null
          city: string
          city_id: number | null
          cod_amount_cents: number
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          delivered_at: string | null
          discount_cents: number
          exchange_of_order_id: string | null
          id: string
          internal_notes: string
          last_call_outcome: Database["public"]["Enums"]["call_outcome"] | null
          location_id: string
          next_call_at: string | null
          notes: string
          order_number: string
          organization_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipped_at: string | null
          shipping_fee_cents: number
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          stock_state: Database["public"]["Enums"]["stock_state"]
          store_id: string | null
          subtotal_cents: number
          total_cents: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_order: {
        Args: { p_organization_id: string; p_payload: Json }
        Returns: {
          call_attempts: number
          campaign_id: string | null
          cancelled_at: string | null
          city: string
          city_id: number | null
          cod_amount_cents: number
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          delivered_at: string | null
          discount_cents: number
          exchange_of_order_id: string | null
          id: string
          internal_notes: string
          last_call_outcome: Database["public"]["Enums"]["call_outcome"] | null
          location_id: string
          next_call_at: string | null
          notes: string
          order_number: string
          organization_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipped_at: string | null
          shipping_fee_cents: number
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          stock_state: Database["public"]["Enums"]["stock_state"]
          store_id: string | null
          subtotal_cents: number
          total_cents: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_organization: {
        Args: { p_name: string; p_slug: string }
        Returns: {
          country: string
          created_at: string
          currency: string
          id: string
          name: string
          order_prefix: string
          slug: string
          timezone: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_shipment: {
        Args: {
          p_order_id: string
          p_provider_id: string
          p_shipping_cost_cents: number
          p_tracking_number: string
        }
        Returns: {
          carrier_district_id: string | null
          carrier_district_name: string | null
          carrier_message: string | null
          carrier_status: string | null
          carrier_updated_at: string | null
          cod_amount_cents: number
          created_at: string
          created_by: string | null
          deliver_by: string | null
          delivered_at: string | null
          delivery_attempts: number
          id: string
          order_id: string
          organization_id: string
          proof_url: string | null
          provider_id: string
          returned_at: string | null
          shipped_at: string | null
          shipping_cost_cents: number
          status: Database["public"]["Enums"]["shipment_status"]
          tracking_number: string | null
          unreachable_count: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "shipments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      customer_history: {
        Args: { p_organization_id: string; p_phone: string }
        Returns: {
          block_reason: string
          blocked: boolean
          cancelled: number
          delivered: number
          orders_total: number
          refused: number
          returned: number
        }[]
      }
      inspect_return_item: {
        Args: {
          p_condition: Database["public"]["Enums"]["item_condition"]
          p_return_item_id: string
        }
        Returns: {
          condition: Database["public"]["Enums"]["item_condition"]
          decided_at: string | null
          decided_by: string | null
          id: string
          order_item_id: string
          organization_id: string
          quantity: number
          return_id: string
          variant_id: string
        }
        SetofOptions: {
          from: "*"
          to: "return_items"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      log_call_attempt: {
        Args: {
          p_call_back_at?: string
          p_note?: string
          p_order_id: string
          p_outcome: Database["public"]["Enums"]["call_outcome"]
        }
        Returns: {
          call_attempts: number
          campaign_id: string | null
          cancelled_at: string | null
          city: string
          city_id: number | null
          cod_amount_cents: number
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          delivered_at: string | null
          discount_cents: number
          exchange_of_order_id: string | null
          id: string
          internal_notes: string
          last_call_outcome: Database["public"]["Enums"]["call_outcome"] | null
          location_id: string
          next_call_at: string | null
          notes: string
          order_number: string
          organization_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipped_at: string | null
          shipping_fee_cents: number
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          stock_state: Database["public"]["Enums"]["stock_state"]
          store_id: string | null
          subtotal_cents: number
          total_cents: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      pay_payable: {
        Args: { p_paid_on: string; p_payable_id: string }
        Returns: {
          amount_cents: number
          category: Database["public"]["Enums"]["expense_category"]
          counterparty: string
          created_at: string
          created_by: string | null
          description: string
          due_on: string
          expense_id: string | null
          id: string
          organization_id: string
          paid_on: string | null
        }
        SetofOptions: {
          from: "*"
          to: "payables"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      receive_return: {
        Args: { p_return_id: string; p_return_shipping_fee_cents?: number }
        Returns: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["return_kind"]
          order_id: string
          organization_id: string
          reason: string
          received_at: string | null
          refund_amount_cents: number
          refunded_at: string | null
          return_shipping_fee_cents: number
          status: Database["public"]["Enums"]["return_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "returns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_carrier_invoice: {
        Args: {
          p_invoice_amount_cents: number
          p_items: Json
          p_note?: string
          p_organization_id: string
          p_provider_id: string
          p_received_on: string
          p_reference: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          fees_cents: number
          gross_collected_cents: number
          id: string
          net_received_cents: number
          note: string
          organization_id: string
          other_charges_cents: number
          provider_id: string | null
          received_on: string
          reference: string
        }
        SetofOptions: {
          from: "*"
          to: "cod_remittances"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_cod_remittance: {
        Args: {
          p_items: Json
          p_note?: string
          p_organization_id: string
          p_provider_id: string
          p_received_on: string
          p_reference: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          fees_cents: number
          gross_collected_cents: number
          id: string
          net_received_cents: number
          note: string
          organization_id: string
          other_charges_cents: number
          provider_id: string | null
          received_on: string
          reference: string
        }
        SetofOptions: {
          from: "*"
          to: "cod_remittances"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_owner_withdrawal: {
        Args: {
          p_amount_cents: number
          p_date: string
          p_note: string
          p_organization_id: string
        }
        Returns: {
          amount_cents: number
          created_at: string
          created_by: string | null
          entry_date: string
          id: string
          kind: Database["public"]["Enums"]["cash_entry_kind"]
          note: string
          organization_id: string
          over_limit: boolean
        }
        SetofOptions: {
          from: "*"
          to: "cash_entries"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      record_refund: {
        Args: { p_amount_cents: number; p_return_id: string }
        Returns: {
          closed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["return_kind"]
          order_id: string
          organization_id: string
          reason: string
          received_at: string | null
          refund_amount_cents: number
          refunded_at: string | null
          return_shipping_fee_cents: number
          status: Database["public"]["Enums"]["return_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "returns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      register_carrier_shipment: {
        Args: {
          p_carrier?: Json
          p_order_id: string
          p_provider_id: string
          p_shipping_cost_cents: number
          p_tracking_number: string
        }
        Returns: {
          carrier_district_id: string | null
          carrier_district_name: string | null
          carrier_message: string | null
          carrier_status: string | null
          carrier_updated_at: string | null
          cod_amount_cents: number
          created_at: string
          created_by: string | null
          deliver_by: string | null
          delivered_at: string | null
          delivery_attempts: number
          id: string
          order_id: string
          organization_id: string
          proof_url: string | null
          provider_id: string
          returned_at: string | null
          shipped_at: string | null
          shipping_cost_cents: number
          status: Database["public"]["Enums"]["shipment_status"]
          tracking_number: string | null
          unreachable_count: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "shipments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      report_summary: {
        Args: { p_from: string; p_organization_id: string; p_to: string }
        Returns: Json
      }
      safe_withdrawal: { Args: { p_organization_id: string }; Returns: Json }
      save_product: {
        Args: { p_organization_id: string; p_payload: Json }
        Returns: string
      }
      stock_health: {
        Args: { p_organization_id: string }
        Returns: {
          cost_cents: number
          first_receipt_at: string
          last_outbound_at: string
          on_hand: number
          product_name: string
          sku: string
          value_cents: number
          variant_id: string
          variant_title: string
        }[]
      }
      transition_order: {
        Args: {
          p_note?: string
          p_order_id: string
          p_to: Database["public"]["Enums"]["order_status"]
        }
        Returns: {
          call_attempts: number
          campaign_id: string | null
          cancelled_at: string | null
          city: string
          city_id: number | null
          cod_amount_cents: number
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          delivered_at: string | null
          discount_cents: number
          exchange_of_order_id: string | null
          id: string
          internal_notes: string
          last_call_outcome: Database["public"]["Enums"]["call_outcome"] | null
          location_id: string
          next_call_at: string | null
          notes: string
          order_number: string
          organization_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipped_at: string | null
          shipping_fee_cents: number
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          stock_state: Database["public"]["Enums"]["stock_state"]
          store_id: string | null
          subtotal_cents: number
          total_cents: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_order_details: {
        Args: { p_order_id: string; p_payload: Json }
        Returns: {
          call_attempts: number
          campaign_id: string | null
          cancelled_at: string | null
          city: string
          city_id: number | null
          cod_amount_cents: number
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          delivered_at: string | null
          discount_cents: number
          exchange_of_order_id: string | null
          id: string
          internal_notes: string
          last_call_outcome: Database["public"]["Enums"]["call_outcome"] | null
          location_id: string
          next_call_at: string | null
          notes: string
          order_number: string
          organization_id: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          shipped_at: string | null
          shipping_fee_cents: number
          source: Database["public"]["Enums"]["order_source"]
          status: Database["public"]["Enums"]["order_status"]
          stock_state: Database["public"]["Enums"]["stock_state"]
          store_id: string | null
          subtotal_cents: number
          total_cents: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      update_shipment_status: {
        Args: {
          p_note?: string
          p_shipment_id: string
          p_source?: Database["public"]["Enums"]["data_source"]
          p_status: Database["public"]["Enums"]["shipment_status"]
        }
        Returns: {
          carrier_district_id: string | null
          carrier_district_name: string | null
          carrier_message: string | null
          carrier_status: string | null
          carrier_updated_at: string | null
          cod_amount_cents: number
          created_at: string
          created_by: string | null
          deliver_by: string | null
          delivered_at: string | null
          delivery_attempts: number
          id: string
          order_id: string
          organization_id: string
          proof_url: string | null
          provider_id: string
          returned_at: string | null
          shipped_at: string | null
          shipping_cost_cents: number
          status: Database["public"]["Enums"]["shipment_status"]
          tracking_number: string | null
          unreachable_count: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "shipments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      call_outcome:
        | "confirmed"
        | "cancelled"
        | "no_answer"
        | "busy"
        | "unreachable"
        | "wrong_number"
        | "call_back_requested"
        | "other"
      cash_entry_kind:
        | "opening"
        | "capital_in"
        | "adjustment"
        | "owner_withdrawal"
      data_source: "manual" | "import" | "api"
      expense_category:
        | "inventory_purchase"
        | "production"
        | "packaging"
        | "shipping"
        | "advertising"
        | "salaries"
        | "rent"
        | "software"
        | "other"
      inventory_movement_type:
        | "receipt"
        | "adjustment"
        | "reservation"
        | "reservation_release"
        | "shipment"
        | "return_receipt"
        | "restock"
        | "mark_damaged"
        | "write_off"
      item_condition: "pending" | "resellable" | "damaged" | "missing"
      marketing_platform:
        | "meta"
        | "instagram"
        | "tiktok"
        | "whatsapp"
        | "google"
        | "website"
        | "other"
      member_role:
        | "owner"
        | "admin"
        | "operator"
        | "warehouse"
        | "finance"
        | "viewer"
      order_source:
        | "website"
        | "whatsapp"
        | "instagram"
        | "facebook"
        | "tiktok"
        | "phone"
        | "store"
        | "other"
      order_status:
        | "new"
        | "confirmation_pending"
        | "confirmed"
        | "preparing"
        | "ready_to_ship"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refused"
        | "returned"
        | "exchange_requested"
      payment_status: "unpaid" | "awaiting_remittance" | "settled"
      product_status: "draft" | "active" | "archived"
      return_kind: "refusal" | "return" | "exchange"
      return_status: "awaiting_receipt" | "received" | "inspected" | "closed"
      shipment_status:
        | "pending"
        | "picked_up"
        | "in_transit"
        | "out_for_delivery"
        | "delivered"
        | "failed_attempt"
        | "returned_to_sender"
        | "cancelled"
      shipping_provider_kind: "manual" | "csv" | "api"
      stock_state: "none" | "reserved" | "released" | "shipped"
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
      call_outcome: [
        "confirmed",
        "cancelled",
        "no_answer",
        "busy",
        "unreachable",
        "wrong_number",
        "call_back_requested",
        "other",
      ],
      cash_entry_kind: [
        "opening",
        "capital_in",
        "adjustment",
        "owner_withdrawal",
      ],
      data_source: ["manual", "import", "api"],
      expense_category: [
        "inventory_purchase",
        "production",
        "packaging",
        "shipping",
        "advertising",
        "salaries",
        "rent",
        "software",
        "other",
      ],
      inventory_movement_type: [
        "receipt",
        "adjustment",
        "reservation",
        "reservation_release",
        "shipment",
        "return_receipt",
        "restock",
        "mark_damaged",
        "write_off",
      ],
      item_condition: ["pending", "resellable", "damaged", "missing"],
      marketing_platform: [
        "meta",
        "instagram",
        "tiktok",
        "whatsapp",
        "google",
        "website",
        "other",
      ],
      member_role: [
        "owner",
        "admin",
        "operator",
        "warehouse",
        "finance",
        "viewer",
      ],
      order_source: [
        "website",
        "whatsapp",
        "instagram",
        "facebook",
        "tiktok",
        "phone",
        "store",
        "other",
      ],
      order_status: [
        "new",
        "confirmation_pending",
        "confirmed",
        "preparing",
        "ready_to_ship",
        "shipped",
        "delivered",
        "cancelled",
        "refused",
        "returned",
        "exchange_requested",
      ],
      payment_status: ["unpaid", "awaiting_remittance", "settled"],
      product_status: ["draft", "active", "archived"],
      return_kind: ["refusal", "return", "exchange"],
      return_status: ["awaiting_receipt", "received", "inspected", "closed"],
      shipment_status: [
        "pending",
        "picked_up",
        "in_transit",
        "out_for_delivery",
        "delivered",
        "failed_attempt",
        "returned_to_sender",
        "cancelled",
      ],
      shipping_provider_kind: ["manual", "csv", "api"],
      stock_state: ["none", "reserved", "released", "shipped"],
    },
  },
} as const

