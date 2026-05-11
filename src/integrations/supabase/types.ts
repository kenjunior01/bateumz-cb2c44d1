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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string
        }
        Relationships: []
      }
      blockchain_verifications: {
        Row: {
          block_number: number
          id: string
          network: string
          raffle_id: string
          seed_data: Json | null
          tx_hash: string
          verified_at: string
          winner_ticket_number: number | null
        }
        Insert: {
          block_number: number
          id?: string
          network?: string
          raffle_id: string
          seed_data?: Json | null
          tx_hash: string
          verified_at?: string
          winner_ticket_number?: number | null
        }
        Update: {
          block_number?: number
          id?: string
          network?: string
          raffle_id?: string
          seed_data?: Json | null
          tx_hash?: string
          verified_at?: string
          winner_ticket_number?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blockchain_verifications_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: true
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      bolao_members: {
        Row: {
          bolao_id: string
          id: string
          joined_at: string
          tickets_contributed: number
          user_id: string
        }
        Insert: {
          bolao_id: string
          id?: string
          joined_at?: string
          tickets_contributed?: number
          user_id: string
        }
        Update: {
          bolao_id?: string
          id?: string
          joined_at?: string
          tickets_contributed?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bolao_members_bolao_id_fkey"
            columns: ["bolao_id"]
            isOneToOne: false
            referencedRelation: "boloes"
            referencedColumns: ["id"]
          },
        ]
      }
      boloes: {
        Row: {
          created_at: string
          creator_id: string
          id: string
          invite_code: string
          max_members: number
          name: string
          raffle_id: string
          status: string
        }
        Insert: {
          created_at?: string
          creator_id: string
          id?: string
          invite_code?: string
          max_members?: number
          name?: string
          raffle_id: string
          status?: string
        }
        Update: {
          created_at?: string
          creator_id?: string
          id?: string
          invite_code?: string
          max_members?: number
          name?: string
          raffle_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "boloes_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          likes_count: number
          message_type: string
          parent_id: string | null
          raffle_id: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          likes_count?: number
          message_type?: string
          parent_id?: string | null
          raffle_id?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          likes_count?: number
          message_type?: string
          parent_id?: string | null
          raffle_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_messages_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "community_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_messages_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_submissions: {
        Row: {
          contest_id: string
          created_at: string
          description: string | null
          extra_fields: Json
          id: string
          is_winner: boolean
          participant_name: string
          photo_url: string | null
          status: string
          updated_at: string
          user_id: string
          video_url: string | null
          views_count: number
          votes_count: number
        }
        Insert: {
          contest_id: string
          created_at?: string
          description?: string | null
          extra_fields?: Json
          id?: string
          is_winner?: boolean
          participant_name: string
          photo_url?: string | null
          status?: string
          updated_at?: string
          user_id: string
          video_url?: string | null
          views_count?: number
          votes_count?: number
        }
        Update: {
          contest_id?: string
          created_at?: string
          description?: string | null
          extra_fields?: Json
          id?: string
          is_winner?: boolean
          participant_name?: string
          photo_url?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
          views_count?: number
          votes_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "contest_submissions_contest_id_fkey"
            columns: ["contest_id"]
            isOneToOne: false
            referencedRelation: "contests"
            referencedColumns: ["id"]
          },
        ]
      }
      contest_votes: {
        Row: {
          created_at: string
          id: string
          submission_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          submission_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          submission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contest_votes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "contest_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      contests: {
        Row: {
          category: string
          contest_mode: string
          country: string | null
          created_at: string
          created_by: string
          current_phase: number
          description: string | null
          end_date: string | null
          entry_fee: number
          evaluation_type: string
          featured: boolean
          hashtag: string | null
          id: string
          image_url: string | null
          max_participants: number | null
          max_submissions_per_user: number
          min_age: number | null
          phases: Json
          prize_description: string | null
          requires_photo: boolean
          requires_video: boolean
          rules: Json
          sponsor_logo_url: string | null
          sponsor_name: string | null
          start_date: string | null
          status: string
          submission_fields: Json
          title: string
          updated_at: string
          winner_submission_id: string | null
        }
        Insert: {
          category?: string
          contest_mode?: string
          country?: string | null
          created_at?: string
          created_by: string
          current_phase?: number
          description?: string | null
          end_date?: string | null
          entry_fee?: number
          evaluation_type?: string
          featured?: boolean
          hashtag?: string | null
          id?: string
          image_url?: string | null
          max_participants?: number | null
          max_submissions_per_user?: number
          min_age?: number | null
          phases?: Json
          prize_description?: string | null
          requires_photo?: boolean
          requires_video?: boolean
          rules?: Json
          sponsor_logo_url?: string | null
          sponsor_name?: string | null
          start_date?: string | null
          status?: string
          submission_fields?: Json
          title: string
          updated_at?: string
          winner_submission_id?: string | null
        }
        Update: {
          category?: string
          contest_mode?: string
          country?: string | null
          created_at?: string
          created_by?: string
          current_phase?: number
          description?: string | null
          end_date?: string | null
          entry_fee?: number
          evaluation_type?: string
          featured?: boolean
          hashtag?: string | null
          id?: string
          image_url?: string | null
          max_participants?: number | null
          max_submissions_per_user?: number
          min_age?: number | null
          phases?: Json
          prize_description?: string | null
          requires_photo?: boolean
          requires_video?: boolean
          rules?: Json
          sponsor_logo_url?: string | null
          sponsor_name?: string | null
          start_date?: string | null
          status?: string
          submission_fields?: Json
          title?: string
          updated_at?: string
          winner_submission_id?: string | null
        }
        Relationships: []
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
      live_ambassador_prizes: {
        Row: {
          award_mode: string | null
          awarded_at: string | null
          business_user_id: string
          created_at: string
          description: string | null
          id: string
          live_code: string | null
          notified_at: string | null
          position: number
          scheduled_live_id: string | null
          scope: string
          title: string
          updated_at: string
          winner_user_id: string | null
        }
        Insert: {
          award_mode?: string | null
          awarded_at?: string | null
          business_user_id: string
          created_at?: string
          description?: string | null
          id?: string
          live_code?: string | null
          notified_at?: string | null
          position?: number
          scheduled_live_id?: string | null
          scope?: string
          title: string
          updated_at?: string
          winner_user_id?: string | null
        }
        Update: {
          award_mode?: string | null
          awarded_at?: string | null
          business_user_id?: string
          created_at?: string
          description?: string | null
          id?: string
          live_code?: string | null
          notified_at?: string | null
          position?: number
          scheduled_live_id?: string | null
          scope?: string
          title?: string
          updated_at?: string
          winner_user_id?: string | null
        }
        Relationships: []
      }
      live_ambassador_visits: {
        Row: {
          ambassador_id: string
          attended_at: string | null
          business_user_id: string
          created_at: string
          id: string
          live_code: string
          referrer: string | null
          scheduled_live_id: string | null
          user_agent: string | null
          visitor_hash: string
        }
        Insert: {
          ambassador_id: string
          attended_at?: string | null
          business_user_id: string
          created_at?: string
          id?: string
          live_code?: string
          referrer?: string | null
          scheduled_live_id?: string | null
          user_agent?: string | null
          visitor_hash: string
        }
        Update: {
          ambassador_id?: string
          attended_at?: string | null
          business_user_id?: string
          created_at?: string
          id?: string
          live_code?: string
          referrer?: string | null
          scheduled_live_id?: string | null
          user_agent?: string | null
          visitor_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_ambassador_visits_ambassador_id_fkey"
            columns: ["ambassador_id"]
            isOneToOne: false
            referencedRelation: "live_ambassadors"
            referencedColumns: ["id"]
          },
        ]
      }
      live_ambassadors: {
        Row: {
          business_user_id: string
          created_at: string
          display_name: string | null
          id: string
          is_active: boolean
          ref_code: string
          total_visits: number
          updated_at: string
          user_id: string
        }
        Insert: {
          business_user_id: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          ref_code: string
          total_visits?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          business_user_id?: string
          created_at?: string
          display_name?: string | null
          id?: string
          is_active?: boolean
          ref_code?: string
          total_visits?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      luck_points: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          points: number
          raffle_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          raffle_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          points?: number
          raffle_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "luck_points_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_likes: {
        Row: {
          created_at: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_likes_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "community_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          metadata: Json | null
          raffle_id: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          raffle_id?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          raffle_id?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          created_at: string
          id: string
          payment_method: string | null
          payment_status: string
          raffle_id: string
          receipt_url: string | null
          status: string
          ticket_number: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          payment_method?: string | null
          payment_status?: string
          raffle_id: string
          receipt_url?: string | null
          status?: string
          ticket_number: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          payment_method?: string | null
          payment_status?: string
          raffle_id?: string
          receipt_url?: string | null
          status?: string
          ticket_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      prestacao_product_leads: {
        Row: {
          business_user_id: string | null
          category: string | null
          created_at: string
          down_payment: number
          id: string
          monthly_estimate: number
          months: number
          notes: string | null
          product_id: string | null
          source: string
          status: string
          total_price: number
          user_agent: string | null
          visitor_name: string | null
          visitor_user_id: string | null
          visitor_whatsapp: string | null
        }
        Insert: {
          business_user_id?: string | null
          category?: string | null
          created_at?: string
          down_payment?: number
          id?: string
          monthly_estimate?: number
          months?: number
          notes?: string | null
          product_id?: string | null
          source?: string
          status?: string
          total_price?: number
          user_agent?: string | null
          visitor_name?: string | null
          visitor_user_id?: string | null
          visitor_whatsapp?: string | null
        }
        Update: {
          business_user_id?: string | null
          category?: string | null
          created_at?: string
          down_payment?: number
          id?: string
          monthly_estimate?: number
          months?: number
          notes?: string | null
          product_id?: string | null
          source?: string
          status?: string
          total_price?: number
          user_agent?: string | null
          visitor_name?: string | null
          visitor_user_id?: string | null
          visitor_whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prestacao_product_leads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "prestacao_products"
            referencedColumns: ["id"]
          },
        ]
      }
      prestacao_products: {
        Row: {
          annual_rate: number
          brand: string | null
          business_user_id: string
          category: string
          city: string | null
          created_at: string
          description: string | null
          featured: boolean
          id: string
          images: Json
          max_months: number
          min_down_payment: number
          model: string | null
          province: string | null
          status: string
          stock: number
          title: string
          total_price: number
          updated_at: string
          views_count: number
          whatsapp: string
          year: number | null
        }
        Insert: {
          annual_rate?: number
          brand?: string | null
          business_user_id: string
          category?: string
          city?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          images?: Json
          max_months?: number
          min_down_payment?: number
          model?: string | null
          province?: string | null
          status?: string
          stock?: number
          title: string
          total_price?: number
          updated_at?: string
          views_count?: number
          whatsapp: string
          year?: number | null
        }
        Update: {
          annual_rate?: number
          brand?: string | null
          business_user_id?: string
          category?: string
          city?: string | null
          created_at?: string
          description?: string | null
          featured?: boolean
          id?: string
          images?: Json
          max_months?: number
          min_down_payment?: number
          model?: string | null
          province?: string | null
          status?: string
          stock?: number
          title?: string
          total_price?: number
          updated_at?: string
          views_count?: number
          whatsapp?: string
          year?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          company_name: string | null
          created_at: string
          display_name: string | null
          id: string
          interests: string[] | null
          is_verified: boolean | null
          phone: string | null
          province: string | null
          referral_code: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          interests?: string[] | null
          is_verified?: boolean | null
          phone?: string | null
          province?: string | null
          referral_code?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          interests?: string[] | null
          is_verified?: boolean | null
          phone?: string | null
          province?: string | null
          referral_code?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      raffles: {
        Row: {
          activation_fee_paid: boolean | null
          activation_fee_percentage: number | null
          auto_draw_days: number | null
          auto_draw_scheduled_at: string | null
          business_user_id: string
          category: string | null
          city: string | null
          created_at: string
          description: string | null
          draw_mode: string
          end_date: string | null
          hide_prize_value: boolean
          id: string
          image_url: string | null
          max_tickets_per_user: number | null
          max_winners: number
          points_cost: number
          prize_title: string
          prize_value: number
          province: string | null
          raffle_type: string
          rejection_reason: string | null
          slug: string | null
          social_actions: Json | null
          sold_tickets: number
          start_date: string | null
          status: string
          ticket_price: number
          tickets_threshold: number | null
          title: string
          total_tickets: number
          updated_at: string
        }
        Insert: {
          activation_fee_paid?: boolean | null
          activation_fee_percentage?: number | null
          auto_draw_days?: number | null
          auto_draw_scheduled_at?: string | null
          business_user_id: string
          category?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          draw_mode?: string
          end_date?: string | null
          hide_prize_value?: boolean
          id?: string
          image_url?: string | null
          max_tickets_per_user?: number | null
          max_winners?: number
          points_cost?: number
          prize_title: string
          prize_value?: number
          province?: string | null
          raffle_type?: string
          rejection_reason?: string | null
          slug?: string | null
          social_actions?: Json | null
          sold_tickets?: number
          start_date?: string | null
          status?: string
          ticket_price?: number
          tickets_threshold?: number | null
          title: string
          total_tickets?: number
          updated_at?: string
        }
        Update: {
          activation_fee_paid?: boolean | null
          activation_fee_percentage?: number | null
          auto_draw_days?: number | null
          auto_draw_scheduled_at?: string | null
          business_user_id?: string
          category?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          draw_mode?: string
          end_date?: string | null
          hide_prize_value?: boolean
          id?: string
          image_url?: string | null
          max_tickets_per_user?: number | null
          max_winners?: number
          points_cost?: number
          prize_title?: string
          prize_value?: number
          province?: string | null
          raffle_type?: string
          rejection_reason?: string | null
          slug?: string | null
          social_actions?: Json | null
          sold_tickets?: number
          start_date?: string | null
          status?: string
          ticket_price?: number
          tickets_threshold?: number | null
          title?: string
          total_tickets?: number
          updated_at?: string
        }
        Relationships: []
      }
      redeemed_rewards: {
        Row: {
          id: string
          points_spent: number
          redeemed_at: string
          reward_id: string
          status: string
          user_id: string
        }
        Insert: {
          id?: string
          points_spent: number
          redeemed_at?: string
          reward_id: string
          status?: string
          user_id: string
        }
        Update: {
          id?: string
          points_spent?: number
          redeemed_at?: string
          reward_id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redeemed_rewards_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          points_awarded: number
          referral_code: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          points_awarded?: number
          referral_code: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          points_awarded?: number
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      rewards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          points_cost: number
          reward_type: string
          title: string
          value: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          points_cost: number
          reward_type?: string
          title: string
          value?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          points_cost?: number
          reward_type?: string
          title?: string
          value?: number
        }
        Relationships: []
      }
      scheduled_live_attendance: {
        Row: {
          ambassador_id: string
          confirmed_at: string
          id: string
          scheduled_live_id: string
          user_id: string | null
          visitor_hash: string
        }
        Insert: {
          ambassador_id: string
          confirmed_at?: string
          id?: string
          scheduled_live_id: string
          user_id?: string | null
          visitor_hash: string
        }
        Update: {
          ambassador_id?: string
          confirmed_at?: string
          id?: string
          scheduled_live_id?: string
          user_id?: string | null
          visitor_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_live_attendance_scheduled_live_id_fkey"
            columns: ["scheduled_live_id"]
            isOneToOne: false
            referencedRelation: "scheduled_lives"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_lives: {
        Row: {
          business_user_id: string
          cover_url: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          external_platform: string | null
          external_url: string | null
          id: string
          live_code: string | null
          scheduled_at: string
          slug: string
          source_type: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          business_user_id: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          external_platform?: string | null
          external_url?: string | null
          id?: string
          live_code?: string | null
          scheduled_at: string
          slug: string
          source_type?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          business_user_id?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          external_platform?: string | null
          external_url?: string | null
          id?: string
          live_code?: string | null
          scheduled_at?: string
          slug?: string
          source_type?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_participations: {
        Row: {
          actions_completed: Json | null
          created_at: string
          id: string
          raffle_id: string
          social_username: string | null
          user_id: string
          verified: boolean | null
        }
        Insert: {
          actions_completed?: Json | null
          created_at?: string
          id?: string
          raffle_id: string
          social_username?: string | null
          user_id: string
          verified?: boolean | null
        }
        Update: {
          actions_completed?: Json | null
          created_at?: string
          id?: string
          raffle_id?: string
          social_username?: string | null
          user_id?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "social_participations_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
      }
      social_raffle_entries: {
        Row: {
          created_at: string
          id: string
          missions_completed: Json
          proofs: Json
          raffle_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          social_username: string | null
          status: string
          ticket_number: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          missions_completed?: Json
          proofs?: Json
          raffle_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_username?: string | null
          status?: string
          ticket_number?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          missions_completed?: Json
          proofs?: Json
          raffle_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          social_username?: string | null
          status?: string
          ticket_number?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_raffle_entries_raffle_id_fkey"
            columns: ["raffle_id"]
            isOneToOne: false
            referencedRelation: "raffles"
            referencedColumns: ["id"]
          },
        ]
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
      user_stories: {
        Row: {
          background: string
          content: string | null
          created_at: string
          expires_at: string
          id: string
          image_url: string | null
          user_id: string
        }
        Insert: {
          background?: string
          content?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string | null
          user_id: string
        }
        Update: {
          background?: string
          content?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          image_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      white_label_configs: {
        Row: {
          brand_name: string
          business_user_id: string
          created_at: string
          custom_domain: string | null
          description: string | null
          emola_number: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          mpesa_number: string | null
          primary_color: string
          secondary_color: string
          updated_at: string
        }
        Insert: {
          brand_name: string
          business_user_id: string
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          emola_number?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          mpesa_number?: string | null
          primary_color?: string
          secondary_color?: string
          updated_at?: string
        }
        Update: {
          brand_name?: string
          business_user_id?: string
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          emola_number?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          mpesa_number?: string | null
          primary_color?: string
          secondary_color?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string | null
          display_name: string | null
          is_verified: boolean | null
          referral_code: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          display_name?: string | null
          is_verified?: boolean | null
          referral_code?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          display_name?: string | null
          is_verified?: boolean | null
          referral_code?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      white_label_configs_public: {
        Row: {
          brand_name: string | null
          business_user_id: string | null
          created_at: string | null
          custom_domain: string | null
          description: string | null
          id: string | null
          is_active: boolean | null
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          updated_at: string | null
        }
        Insert: {
          brand_name?: string | null
          business_user_id?: string | null
          created_at?: string | null
          custom_domain?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_name?: string | null
          business_user_id?: string | null
          created_at?: string | null
          custom_domain?: string | null
          description?: string | null
          id?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      award_ambassador_prize:
        | { Args: { p_prize_id: string }; Returns: Json }
        | { Args: { p_mode?: string; p_prize_id: string }; Returns: Json }
      confirm_live_attendance: { Args: { p_visit_id: string }; Returns: Json }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_live_ambassador_ranking: {
        Args: {
          p_business_user_id?: string
          p_limit?: number
          p_live_code: string
          p_offset?: number
        }
        Returns: {
          ambassador_id: string
          business_user_id: string
          display_name: string
          ref_code: string
          user_id: string
          visits: number
        }[]
      }
      get_scheduled_live_ranking: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_scheduled_live_id: string
        }
        Returns: {
          ambassador_id: string
          display_name: string
          ref_code: string
          user_id: string
          visits: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_prestacao_product_views: {
        Args: { _product_id: string }
        Returns: undefined
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
      app_role: "admin" | "business" | "user"
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
      app_role: ["admin", "business", "user"],
    },
  },
} as const
