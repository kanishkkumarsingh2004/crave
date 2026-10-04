export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string
          email: string
          role: 'customer' | 'vendor' | 'driver' | 'admin'
          phone: string | null
          address: string | null
          avatar: string | null
          restaurant_name: string | null
          cuisine: string | null
          vehicle_type: string | null
          license_plate: string | null
          created_at: string | null
        }
        Insert: {
          id: string
          name: string
          email: string
          role: 'customer' | 'vendor' | 'driver' | 'admin'
          phone?: string | null
          address?: string | null
          avatar?: string | null
          restaurant_name?: string | null
          cuisine?: string | null
          vehicle_type?: string | null
          license_plate?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string
          role?: 'customer' | 'vendor' | 'driver' | 'admin'
          phone?: string | null
          address?: string | null
          avatar?: string | null
          restaurant_name?: string | null
          cuisine?: string | null
          vehicle_type?: string | null
          license_plate?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      restaurants: {
        Row: {
          id: string
          name: string
          cuisine: string
          rating: number | null
          commission_rate: number | null
          payment_model: string | null
          address: string | null
          owner_id: string | null
          created_at: string | null
          image: string | null
          is_pure_veg: boolean | null
          is_dark_store: boolean
          is_open: boolean
          rating_count: number | null
          cost_for_two: number | null
          delivery_minutes: number | null
          offer: string | null
          latitude: number | null
          longitude: number | null
          phone: string | null
          bank_account_name: string | null
          bank_name: string | null
          bank_account_number: string | null
          bank_ifsc: string | null
          payout_vpa: string | null
          fssai_license: string | null
        }
        Insert: {
          id: string
          name: string
          cuisine: string
          rating?: number | null
          commission_rate?: number | null
          payment_model?: string | null
          address?: string | null
          owner_id?: string | null
          created_at?: string | null
          image?: string | null
          is_pure_veg?: boolean | null
          is_dark_store?: boolean
          is_open?: boolean
          rating_count?: number | null
          cost_for_two?: number | null
          delivery_minutes?: number | null
          offer?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          bank_account_name?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          payout_vpa?: string | null
          fssai_license?: string | null
        }
        Update: {
          id?: string
          name?: string
          cuisine?: string
          rating?: number | null
          commission_rate?: number | null
          payment_model?: string | null
          address?: string | null
          owner_id?: string | null
          created_at?: string | null
          image?: string | null
          is_pure_veg?: boolean | null
          is_dark_store?: boolean
          is_open?: boolean
          rating_count?: number | null
          cost_for_two?: number | null
          delivery_minutes?: number | null
          offer?: string | null
          latitude?: number | null
          longitude?: number | null
          phone?: string | null
          bank_account_name?: string | null
          bank_name?: string | null
          bank_account_number?: string | null
          bank_ifsc?: string | null
          payout_vpa?: string | null
          fssai_license?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'restaurants_owner_id_fkey'
            columns: ['owner_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
        ]
      }
      menu_items: {
        Row: {
          id: string
          restaurant_id: string | null
          name: string
          category: string
          price: number
          description: string | null
          in_stock: boolean | null
          image: string | null
          created_at: string | null
          is_veg: boolean | null
          unit: string | null
          mrp: number | null
          stock_count: number
          sku_code: string | null
          expiry_date: string | null
        }
        Insert: {
          id: string
          restaurant_id?: string | null
          name: string
          category: string
          price: number
          description?: string | null
          in_stock?: boolean | null
          image?: string | null
          created_at?: string | null
          is_veg?: boolean | null
          unit?: string | null
          mrp?: number | null
          stock_count?: number
          sku_code?: string | null
          expiry_date?: string | null
        }
        Update: {
          id?: string
          restaurant_id?: string | null
          name?: string
          category?: string
          price?: number
          description?: string | null
          in_stock?: boolean | null
          image?: string | null
          created_at?: string | null
          is_veg?: boolean | null
          unit?: string | null
          mrp?: number | null
          stock_count?: number
          sku_code?: string | null
          expiry_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'menu_items_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
        ]
      }
      orders: {
        Row: {
          id: string
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          customer_address: string | null
          restaurant_id: string | null
          restaurant_name: string
          items: Json
          subtotal: number
          packaging_fee: number | null
          gst: number | null
          total_amount: number
          status:
            'new' | 'preparing' | 'packing' | 'ready' | 'picked_up' | 'completed' | 'cancelled'
          driver_name: string | null
          driver_phone: string | null
          payment_method: string | null
          created_at: string | null
          delivery_otp: string | null
          picker_name: string | null
          tip: number
          discount_amount: number
          coupon_code: string | null
          delivery_latitude: number | null
          delivery_longitude: number | null
          delivered_at: string | null
        }
        Insert: {
          id: string
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          customer_address?: string | null
          restaurant_id?: string | null
          restaurant_name: string
          items: Json
          subtotal: number
          packaging_fee?: number | null
          gst?: number | null
          total_amount: number
          status:
            'new' | 'preparing' | 'packing' | 'ready' | 'picked_up' | 'completed' | 'cancelled'
          driver_name?: string | null
          driver_phone?: string | null
          payment_method?: string | null
          created_at?: string | null
          delivery_otp?: string | null
          picker_name?: string | null
          tip?: number
          discount_amount?: number
          coupon_code?: string | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          delivered_at?: string | null
        }
        Update: {
          id?: string
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          customer_address?: string | null
          restaurant_id?: string | null
          restaurant_name?: string
          items?: Json
          subtotal?: number
          packaging_fee?: number | null
          gst?: number | null
          total_amount?: number
          status?:
            'new' | 'preparing' | 'packing' | 'ready' | 'picked_up' | 'completed' | 'cancelled'
          driver_name?: string | null
          driver_phone?: string | null
          payment_method?: string | null
          created_at?: string | null
          delivery_otp?: string | null
          picker_name?: string | null
          tip?: number
          discount_amount?: number
          coupon_code?: string | null
          delivery_latitude?: number | null
          delivery_longitude?: number | null
          delivered_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'orders_customer_id_fkey'
            columns: ['customer_id']
            isOneToOne: false
            referencedRelation: 'users'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'orders_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
        ]
      }
      coupons: {
        Row: {
          id: string
          code: string
          description: string
          discount_type: 'percentage' | 'flat'
          discount_value: number
          min_order_amount: number
          max_discount: number | null
          usage_limit: number | null
          used_count: number | null
          is_active: boolean | null
          expiry_date: string | null
          created_at: string | null
          restaurant_id: string | null
        }
        Insert: {
          id: string
          code: string
          description: string
          discount_type: 'percentage' | 'flat'
          discount_value: number
          min_order_amount: number
          max_discount?: number | null
          usage_limit?: number | null
          used_count?: number | null
          is_active?: boolean | null
          expiry_date?: string | null
          created_at?: string | null
          restaurant_id?: string | null
        }
        Update: {
          id?: string
          code?: string
          description?: string
          discount_type?: 'percentage' | 'flat'
          discount_value?: number
          min_order_amount?: number
          max_discount?: number | null
          usage_limit?: number | null
          used_count?: number | null
          is_active?: boolean | null
          expiry_date?: string | null
          created_at?: string | null
          restaurant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'coupons_restaurant_id_fkey'
            columns: ['restaurant_id']
            isOneToOne: false
            referencedRelation: 'restaurants'
            referencedColumns: ['id']
          },
        ]
      }
      vendor_settlements: {
        Row: {
          id: string
          restaurant_name: string
          gross_sales: number
          commission_rate: number
          commission_amount: number
          net_payout: number
          status: string | null
          payout_date: string | null
          restaurant_id: string | null
          period_start: string | null
          period_end: string | null
          transaction_ref: string | null
        }
        Insert: {
          id: string
          restaurant_name: string
          gross_sales: number
          commission_rate: number
          commission_amount: number
          net_payout: number
          status?: string | null
          payout_date?: string | null
          restaurant_id?: string | null
          period_start?: string | null
          period_end?: string | null
          transaction_ref?: string | null
        }
        Update: {
          id?: string
          restaurant_name?: string
          gross_sales?: number
          commission_rate?: number
          commission_amount?: number
          net_payout?: number
          status?: string | null
          payout_date?: string | null
          restaurant_id?: string | null
          period_start?: string | null
          period_end?: string | null
          transaction_ref?: string | null
        }
        Relationships: []
      }
      payment_reviews: {
        Row: {
          id: string
          order_id: string
          utr_ref: string
          customer_vpa: string
          amount: number
          status: string | null
          created_at: string | null
        }
        Insert: {
          id: string
          order_id: string
          utr_ref: string
          customer_vpa: string
          amount: number
          status?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          order_id?: string
          utr_ref?: string
          customer_vpa?: string
          amount?: number
          status?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      customer_addresses: {
        Row: {
          id: string
          customer_id: string
          label: string
          address: string
          is_default: boolean
          created_at: string
          latitude: number | null
          longitude: number | null
        }
        Insert: {
          id: string
          customer_id: string
          label: string
          address: string
          is_default?: boolean
          created_at?: string
          latitude?: number | null
          longitude?: number | null
        }
        Update: {
          id?: string
          customer_id?: string
          label?: string
          address?: string
          is_default?: boolean
          created_at?: string
          latitude?: number | null
          longitude?: number | null
        }
        Relationships: []
      }
      payment_configs: {
        Row: {
          id: string
          name: string
          merchant_vpa: string
          merchant_name: string
          merchant_category_code: string | null
          is_active: boolean
          updated_at: string
          delivery_fee: number | null
          handling_fee: number | null
          free_delivery_threshold: number | null
          gst_rate: number | null
        }
        Insert: {
          id: string
          name: string
          merchant_vpa: string
          merchant_name: string
          merchant_category_code?: string | null
          is_active?: boolean
          updated_at?: string
          delivery_fee?: number | null
          handling_fee?: number | null
          free_delivery_threshold?: number | null
          gst_rate?: number | null
        }
        Update: {
          id?: string
          name?: string
          merchant_vpa?: string
          merchant_name?: string
          merchant_category_code?: string | null
          is_active?: boolean
          updated_at?: string
          delivery_fee?: number | null
          handling_fee?: number | null
          free_delivery_threshold?: number | null
          gst_rate?: number | null
        }
        Relationships: []
      }
      driver_upi_accounts: {
        Row: {
          id: string
          driver_id: string
          vpa: string
          bank_name: string | null
          is_primary: boolean
          is_verified: boolean
          created_at: string
        }
        Insert: {
          id: string
          driver_id: string
          vpa: string
          bank_name?: string | null
          is_primary?: boolean
          is_verified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          driver_id?: string
          vpa?: string
          bank_name?: string | null
          is_primary?: boolean
          is_verified?: boolean
          created_at?: string
        }
        Relationships: []
      }
      driver_payouts: {
        Row: {
          id: string
          driver_id: string
          amount: number
          status: string
          transaction_ref: string | null
          created_at: string
        }
        Insert: {
          id: string
          driver_id: string
          amount: number
          status?: string
          transaction_ref?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          driver_id?: string
          amount?: number
          status?: string
          transaction_ref?: string | null
          created_at?: string
        }
        Relationships: []
      }
      driver_incentives: {
        Row: {
          id: string
          driver_id: string | null
          title: string
          description: string
          reward_amount: number
          starts_at: string | null
          ends_at: string | null
          is_active: boolean
        }
        Insert: {
          id: string
          driver_id?: string | null
          title: string
          description: string
          reward_amount: number
          starts_at?: string | null
          ends_at?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          driver_id?: string | null
          title?: string
          description?: string
          reward_amount?: number
          starts_at?: string | null
          ends_at?: string | null
          is_active?: boolean
        }
        Relationships: []
      }
      cold_chain_sensors: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          temperature_c: number
          target_temperature_c: number | null
          status: string
          updated_at: string
        }
        Insert: {
          id: string
          restaurant_id: string
          name: string
          temperature_c: number
          target_temperature_c?: number | null
          status: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          name?: string
          temperature_c?: number
          target_temperature_c?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      picker_metrics: {
        Row: {
          id: string
          restaurant_id: string
          picker_name: string
          bay: string | null
          orders_packed: number
          average_pick_seconds: number | null
          accuracy_rate: number | null
          updated_at: string
        }
        Insert: {
          id: string
          restaurant_id: string
          picker_name: string
          bay?: string | null
          orders_packed?: number
          average_pick_seconds?: number | null
          accuracy_rate?: number | null
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          picker_name?: string
          bay?: string | null
          orders_packed?: number
          average_pick_seconds?: number | null
          accuracy_rate?: number | null
          updated_at?: string
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
