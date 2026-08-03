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
      admin_regions: {
        Row: {
          assigned_by: string | null
          country_code: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          country_code: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          country_code?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_regions_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["country_code"]
          },
        ]
      }
      analytics_snapshots: {
        Row: {
          avg_session_duration: number | null
          business_user_id: string
          created_at: string | null
          date: string
          id: string
          metadata: Json | null
          top_game_name: string | null
          top_game_type: string | null
          total_players: number | null
          total_prize_value: number | null
          total_sessions: number | null
          total_winners: number | null
          unique_players: number | null
        }
        Insert: {
          avg_session_duration?: number | null
          business_user_id: string
          created_at?: string | null
          date?: string
          id?: string
          metadata?: Json | null
          top_game_name?: string | null
          top_game_type?: string | null
          total_players?: number | null
          total_prize_value?: number | null
          total_sessions?: number | null
          total_winners?: number | null
          unique_players?: number | null
        }
        Update: {
          avg_session_duration?: number | null
          business_user_id?: string
          created_at?: string | null
          date?: string
          id?: string
          metadata?: Json | null
          top_game_name?: string | null
          top_game_type?: string | null
          total_players?: number | null
          total_prize_value?: number | null
          total_sessions?: number | null
          total_winners?: number | null
          unique_players?: number | null
        }
        Relationships: []
      }
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
      blog_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          name: string
          post_count: number | null
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          post_count?: number | null
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          post_count?: number | null
          slug?: string
        }
        Relationships: []
      }
      blog_likes: {
        Row: {
          created_at: string
          post_slug: string
          user_id: string
        }
        Insert: {
          created_at?: string
          post_slug: string
          user_id: string
        }
        Update: {
          created_at?: string
          post_slug?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author_id: string | null
          author_name: string | null
          category_id: string | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_trending: boolean | null
          like_count: number | null
          published: boolean | null
          published_at: string | null
          reading_time_min: number | null
          region_id: string | null
          seo_description: string | null
          seo_keywords: string[] | null
          seo_title: string | null
          share_count: number | null
          slug: string
          source_url: string | null
          summary: string | null
          title: string
          trending_score: number | null
          updated_at: string
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          category_id?: string | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_trending?: boolean | null
          like_count?: number | null
          published?: boolean | null
          published_at?: string | null
          reading_time_min?: number | null
          region_id?: string | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          share_count?: number | null
          slug: string
          source_url?: string | null
          summary?: string | null
          title: string
          trending_score?: number | null
          updated_at?: string
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          category_id?: string | null
          content?: string
          created_at?: string
          id?: string
          image_url?: string | null
          is_featured?: boolean | null
          is_trending?: boolean | null
          like_count?: number | null
          published?: boolean | null
          published_at?: string | null
          reading_time_min?: number | null
          region_id?: string | null
          seo_description?: string | null
          seo_keywords?: string[] | null
          seo_title?: string | null
          share_count?: number | null
          slug?: string
          source_url?: string | null
          summary?: string | null
          title?: string
          trending_score?: number | null
          updated_at?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "blog_categories"
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
          scheduled_live_id: string | null
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
          scheduled_live_id?: string | null
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
          scheduled_live_id?: string | null
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
          {
            foreignKeyName: "community_messages_scheduled_live_id_fkey"
            columns: ["scheduled_live_id"]
            isOneToOne: false
            referencedRelation: "scheduled_lives"
            referencedColumns: ["id"]
          },
        ]
      }
      company_branding: {
        Row: {
          accent_color: string | null
          background_color: string | null
          background_image_url: string | null
          company_logo_url: string | null
          company_name: string | null
          company_slogan: string | null
          created_at: string | null
          enabled: boolean | null
          font_family: string | null
          id: string
          overlay_style: string | null
          primary_color: string | null
          secondary_color: string | null
          text_color: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          background_color?: string | null
          background_image_url?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_slogan?: string | null
          created_at?: string | null
          enabled?: boolean | null
          font_family?: string | null
          id?: string
          overlay_style?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          text_color?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accent_color?: string | null
          background_color?: string | null
          background_image_url?: string | null
          company_logo_url?: string | null
          company_name?: string | null
          company_slogan?: string | null
          created_at?: string | null
          enabled?: boolean | null
          font_family?: string | null
          id?: string
          overlay_style?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          text_color?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      game_sessions: {
        Row: {
          business_user_id: string | null
          created_at: string | null
          duration_seconds: number | null
          game_id: string | null
          game_name: string
          game_type: string
          id: string
          is_winner: boolean | null
          live_code: string | null
          metadata: Json | null
          player_count: number | null
          player_name: string | null
          prize: string | null
          prize_value: number | null
          score: number | null
        }
        Insert: {
          business_user_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          game_id?: string | null
          game_name: string
          game_type: string
          id?: string
          is_winner?: boolean | null
          live_code?: string | null
          metadata?: Json | null
          player_count?: number | null
          player_name?: string | null
          prize?: string | null
          prize_value?: number | null
          score?: number | null
        }
        Update: {
          business_user_id?: string | null
          created_at?: string | null
          duration_seconds?: number | null
          game_id?: string | null
          game_name?: string
          game_type?: string
          id?: string
          is_winner?: boolean | null
          live_code?: string | null
          metadata?: Json | null
          player_count?: number | null
          player_name?: string | null
          prize?: string | null
          prize_value?: number | null
          score?: number | null
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
      live_announcements: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string
          scheduled_live_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          message: string
          scheduled_live_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string
          scheduled_live_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_announcements_scheduled_live_id_fkey"
            columns: ["scheduled_live_id"]
            isOneToOne: false
            referencedRelation: "scheduled_lives"
            referencedColumns: ["id"]
          },
        ]
      }
      live_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          poll_id: string
          user_id: string | null
          voter_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          poll_id: string
          user_id?: string | null
          voter_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          poll_id?: string
          user_id?: string | null
          voter_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "live_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      live_polls: {
        Row: {
          closed_at: string | null
          created_at: string
          id: string
          is_open: boolean
          options: Json
          question: string
          scheduled_live_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          id?: string
          is_open?: boolean
          options?: Json
          question: string
          scheduled_live_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          id?: string
          is_open?: boolean
          options?: Json
          question?: string
          scheduled_live_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_polls_scheduled_live_id_fkey"
            columns: ["scheduled_live_id"]
            isOneToOne: false
            referencedRelation: "scheduled_lives"
            referencedColumns: ["id"]
          },
        ]
      }
      live_studio_checklist: {
        Row: {
          done: boolean
          id: string
          item_key: string
          scheduled_live_id: string
          updated_at: string
        }
        Insert: {
          done?: boolean
          id?: string
          item_key: string
          scheduled_live_id: string
          updated_at?: string
        }
        Update: {
          done?: boolean
          id?: string
          item_key?: string
          scheduled_live_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_studio_checklist_scheduled_live_id_fkey"
            columns: ["scheduled_live_id"]
            isOneToOne: false
            referencedRelation: "scheduled_lives"
            referencedColumns: ["id"]
          },
        ]
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
      millionaire_games: {
        Row: {
          background_color: string | null
          background_image_url: string | null
          business_user_id: string | null
          company_logo_url: string | null
          company_slogan: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_published: boolean | null
          lifelines: Json | null
          name: string
          primary_color: string | null
          prize_structure: Json | null
          region_id: string
          time_per_question: number | null
          total_questions: number | null
          updated_at: string | null
        }
        Insert: {
          background_color?: string | null
          background_image_url?: string | null
          business_user_id?: string | null
          company_logo_url?: string | null
          company_slogan?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_published?: boolean | null
          lifelines?: Json | null
          name: string
          primary_color?: string | null
          prize_structure?: Json | null
          region_id: string
          time_per_question?: number | null
          total_questions?: number | null
          updated_at?: string | null
        }
        Update: {
          background_color?: string | null
          background_image_url?: string | null
          business_user_id?: string | null
          company_logo_url?: string | null
          company_slogan?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_published?: boolean | null
          lifelines?: Json | null
          name?: string
          primary_color?: string | null
          prize_structure?: Json | null
          region_id?: string
          time_per_question?: number | null
          total_questions?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "millionaire_games_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      millionaire_questions: {
        Row: {
          correct_answer: string
          created_at: string | null
          difficulty: string | null
          explanation: string | null
          game_id: string | null
          id: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          points: number | null
          question_number: number
          question_text: string
        }
        Insert: {
          correct_answer: string
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          game_id?: string | null
          id?: string
          option_a: string
          option_b: string
          option_c: string
          option_d: string
          points?: number | null
          question_number: number
          question_text: string
        }
        Update: {
          correct_answer?: string
          created_at?: string | null
          difficulty?: string | null
          explanation?: string | null
          game_id?: string | null
          id?: string
          option_a?: string
          option_b?: string
          option_c?: string
          option_d?: string
          points?: number | null
          question_number?: number
          question_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "millionaire_questions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "millionaire_games"
            referencedColumns: ["id"]
          },
        ]
      }
      millionaire_sessions: {
        Row: {
          created_at: string | null
          current_level: number | null
          game_id: string | null
          id: string
          prize_won: number | null
          region_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_level?: number | null
          game_id?: string | null
          id?: string
          prize_won?: number | null
          region_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_level?: number | null
          game_id?: string | null
          id?: string
          prize_won?: number | null
          region_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "millionaire_sessions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "millionaire_games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "millionaire_sessions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_signups: {
        Row: {
          country: string | null
          created_at: string
          email: string
          id: string
          source: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          email: string
          id?: string
          source?: string
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string
          id?: string
          source?: string
        }
        Relationships: []
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
      overlay_configs: {
        Row: {
          animation_intensity: string | null
          border_radius: number | null
          created_at: string | null
          custom_css: string | null
          id: string
          is_default: boolean | null
          layout: string | null
          name: string | null
          opacity: number | null
          position: string | null
          show_branding: boolean | null
          show_confetti: boolean | null
          show_player_count: boolean | null
          show_score: boolean | null
          show_sound_effects: boolean | null
          show_timer: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          animation_intensity?: string | null
          border_radius?: number | null
          created_at?: string | null
          custom_css?: string | null
          id?: string
          is_default?: boolean | null
          layout?: string | null
          name?: string | null
          opacity?: number | null
          position?: string | null
          show_branding?: boolean | null
          show_confetti?: boolean | null
          show_player_count?: boolean | null
          show_score?: boolean | null
          show_sound_effects?: boolean | null
          show_timer?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          animation_intensity?: string | null
          border_radius?: number | null
          created_at?: string | null
          custom_css?: string | null
          id?: string
          is_default?: boolean | null
          layout?: string | null
          name?: string | null
          opacity?: number | null
          position?: string | null
          show_branding?: boolean | null
          show_confetti?: boolean | null
          show_player_count?: boolean | null
          show_score?: boolean | null
          show_sound_effects?: boolean | null
          show_timer?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      participants: {
        Row: {
          created_at: string
          currency: string
          id: string
          payment_method: string | null
          payment_status: string
          paypal_capture_id: string | null
          paypal_order_id: string | null
          raffle_id: string
          receipt_url: string | null
          status: string
          ticket_number: number
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string | null
          payment_status?: string
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
          raffle_id: string
          receipt_url?: string | null
          status?: string
          ticket_number: number
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          payment_method?: string | null
          payment_status?: string
          paypal_capture_id?: string | null
          paypal_order_id?: string | null
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
          {
            foreignKeyName: "prestacao_product_leads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "prestacao_products_public"
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
          currency: string
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
          currency?: string
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
          currency?: string
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
          slug: string | null
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
          slug?: string | null
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
          slug?: string | null
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
          country: string
          created_at: string
          currency: string
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
          country?: string
          created_at?: string
          currency?: string
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
          country?: string
          created_at?: string
          currency?: string
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
          first_purchase_bonus_at: string | null
          first_purchase_bonus_points: number
          id: string
          points_awarded: number
          referral_code: string
          referred_id: string
          referrer_id: string
          status: string
        }
        Insert: {
          created_at?: string
          first_purchase_bonus_at?: string | null
          first_purchase_bonus_points?: number
          id?: string
          points_awarded?: number
          referral_code: string
          referred_id: string
          referrer_id: string
          status?: string
        }
        Update: {
          created_at?: string
          first_purchase_bonus_at?: string | null
          first_purchase_bonus_points?: number
          id?: string
          points_awarded?: number
          referral_code?: string
          referred_id?: string
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      regional_commissions: {
        Row: {
          commission_percentage: number
          country_code: string
          created_at: string
          id: string
          notes: string | null
          updated_at: string
          updated_by: string | null
          user_id: string
        }
        Insert: {
          commission_percentage?: number
          country_code: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id: string
        }
        Update: {
          commission_percentage?: number
          country_code?: string
          created_at?: string
          id?: string
          notes?: string | null
          updated_at?: string
          updated_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "regional_commissions_country_code_fkey"
            columns: ["country_code"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["country_code"]
          },
        ]
      }
      regions: {
        Row: {
          accent_color: string | null
          banner_url: string | null
          country_code: string
          created_at: string
          currency: string
          custom_css: string | null
          default_language: string | null
          flag: string | null
          id: string
          is_active: boolean
          label: string
          logo_url: string | null
          name: string | null
          primary_color: string | null
          secondary_color: string | null
          tagline: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          banner_url?: string | null
          country_code: string
          created_at?: string
          currency?: string
          custom_css?: string | null
          default_language?: string | null
          flag?: string | null
          id?: string
          is_active?: boolean
          label: string
          logo_url?: string | null
          name?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          banner_url?: string | null
          country_code?: string
          created_at?: string
          currency?: string
          custom_css?: string | null
          default_language?: string | null
          flag?: string | null
          id?: string
          is_active?: boolean
          label?: string
          logo_url?: string | null
          name?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          tagline?: string | null
          updated_at?: string
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
      scheduled_live_links: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          label: string | null
          platform: string
          scheduled_live_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          platform: string
          scheduled_live_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          label?: string | null
          platform?: string
          scheduled_live_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_live_links_scheduled_live_id_fkey"
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
      spin_wheel_games: {
        Row: {
          background_color: string | null
          background_image_url: string | null
          business_user_id: string | null
          company_logo_url: string | null
          company_slogan: string | null
          created_at: string | null
          created_by: string | null
          default_effect: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_published: boolean | null
          name: string
          particle_effects: boolean | null
          region_id: string
          rotation_duration: number | null
          segment_count: number | null
          sound_enabled: boolean | null
          spin_cost: number | null
          updated_at: string | null
          wheel_background_color: string | null
          wheel_border_color: string | null
        }
        Insert: {
          background_color?: string | null
          background_image_url?: string | null
          business_user_id?: string | null
          company_logo_url?: string | null
          company_slogan?: string | null
          created_at?: string | null
          created_by?: string | null
          default_effect?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_published?: boolean | null
          name: string
          particle_effects?: boolean | null
          region_id: string
          rotation_duration?: number | null
          segment_count?: number | null
          sound_enabled?: boolean | null
          spin_cost?: number | null
          updated_at?: string | null
          wheel_background_color?: string | null
          wheel_border_color?: string | null
        }
        Update: {
          background_color?: string | null
          background_image_url?: string | null
          business_user_id?: string | null
          company_logo_url?: string | null
          company_slogan?: string | null
          created_at?: string | null
          created_by?: string | null
          default_effect?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_published?: boolean | null
          name?: string
          particle_effects?: boolean | null
          region_id?: string
          rotation_duration?: number | null
          segment_count?: number | null
          sound_enabled?: boolean | null
          spin_cost?: number | null
          updated_at?: string | null
          wheel_background_color?: string | null
          wheel_border_color?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spin_wheel_games_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      spin_wheel_segments: {
        Row: {
          background_color: string
          created_at: string | null
          current_wins_today: number | null
          current_wins_total: number | null
          description: string | null
          effect_type: string | null
          id: string
          label: string
          max_wins_per_day: number | null
          max_wins_total: number | null
          reward_image_url: string | null
          reward_type: string | null
          reward_value: string
          segment_number: number
          text_color: string | null
          weight: number | null
          wheel_id: string | null
        }
        Insert: {
          background_color: string
          created_at?: string | null
          current_wins_today?: number | null
          current_wins_total?: number | null
          description?: string | null
          effect_type?: string | null
          id?: string
          label: string
          max_wins_per_day?: number | null
          max_wins_total?: number | null
          reward_image_url?: string | null
          reward_type?: string | null
          reward_value: string
          segment_number: number
          text_color?: string | null
          weight?: number | null
          wheel_id?: string | null
        }
        Update: {
          background_color?: string
          created_at?: string | null
          current_wins_today?: number | null
          current_wins_total?: number | null
          description?: string | null
          effect_type?: string | null
          id?: string
          label?: string
          max_wins_per_day?: number | null
          max_wins_total?: number | null
          reward_image_url?: string | null
          reward_type?: string | null
          reward_value?: string
          segment_number?: number
          text_color?: string | null
          weight?: number | null
          wheel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spin_wheel_segments_wheel_id_fkey"
            columns: ["wheel_id"]
            isOneToOne: false
            referencedRelation: "spin_wheel_games"
            referencedColumns: ["id"]
          },
        ]
      }
      spin_wheel_sessions: {
        Row: {
          created_at: string | null
          id: string
          region_id: string | null
          reward_type: string | null
          reward_value: string | null
          segment_id: string | null
          status: string | null
          user_id: string | null
          wheel_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          region_id?: string | null
          reward_type?: string | null
          reward_value?: string | null
          segment_id?: string | null
          status?: string | null
          user_id?: string | null
          wheel_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          region_id?: string | null
          reward_type?: string | null
          reward_value?: string | null
          segment_id?: string | null
          status?: string | null
          user_id?: string | null
          wheel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spin_wheel_sessions_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spin_wheel_sessions_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "spin_wheel_segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spin_wheel_sessions_wheel_id_fkey"
            columns: ["wheel_id"]
            isOneToOne: false
            referencedRelation: "spin_wheel_games"
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
      translations: {
        Row: {
          created_at: string
          id: string
          key: string
          language_code: string
          region_id: string | null
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          language_code: string
          region_id?: string | null
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          language_code?: string
          region_id?: string | null
          updated_at?: string
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "translations_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
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
      world_cup_matches: {
        Row: {
          away_score: number | null
          away_team_id: string | null
          home_score: number | null
          home_team_id: string | null
          id: string
          match_date: string
          stadium: string | null
          status: string | null
        }
        Insert: {
          away_score?: number | null
          away_team_id?: string | null
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          match_date: string
          stadium?: string | null
          status?: string | null
        }
        Update: {
          away_score?: number | null
          away_team_id?: string | null
          home_score?: number | null
          home_team_id?: string | null
          id?: string
          match_date?: string
          stadium?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "world_cup_matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "world_cup_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "world_cup_matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "world_cup_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      world_cup_predictions: {
        Row: {
          away_score: number
          created_at: string | null
          home_score: number
          id: string
          match_id: string | null
          points_earned: number | null
          user_id: string | null
        }
        Insert: {
          away_score: number
          created_at?: string | null
          home_score: number
          id?: string
          match_id?: string | null
          points_earned?: number | null
          user_id?: string | null
        }
        Update: {
          away_score?: number
          created_at?: string | null
          home_score?: number
          id?: string
          match_id?: string | null
          points_earned?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "world_cup_predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "world_cup_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      world_cup_teams: {
        Row: {
          code: string
          flag_url: string | null
          group_name: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          flag_url?: string | null
          group_name?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          flag_url?: string | null
          group_name?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      live_ambassador_prizes_public: {
        Row: {
          awarded_at: string | null
          business_user_id: string | null
          created_at: string | null
          description: string | null
          id: string | null
          is_awarded: boolean | null
          live_code: string | null
          position: number | null
          scheduled_live_id: string | null
          scope: string | null
          title: string | null
        }
        Insert: {
          awarded_at?: string | null
          business_user_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_awarded?: never
          live_code?: string | null
          position?: number | null
          scheduled_live_id?: string | null
          scope?: string | null
          title?: string | null
        }
        Update: {
          awarded_at?: string | null
          business_user_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          is_awarded?: never
          live_code?: string | null
          position?: number | null
          scheduled_live_id?: string | null
          scope?: string | null
          title?: string | null
        }
        Relationships: []
      }
      platform_settings_public: {
        Row: {
          key: string | null
          updated_at: string | null
          value: Json | null
        }
        Insert: {
          key?: string | null
          updated_at?: string | null
          value?: Json | null
        }
        Update: {
          key?: string | null
          updated_at?: string | null
          value?: Json | null
        }
        Relationships: []
      }
      prestacao_products_public: {
        Row: {
          annual_rate: number | null
          brand: string | null
          business_user_id: string | null
          category: string | null
          city: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          featured: boolean | null
          id: string | null
          images: Json | null
          max_months: number | null
          min_down_payment: number | null
          model: string | null
          province: string | null
          status: string | null
          stock: number | null
          title: string | null
          total_price: number | null
          updated_at: string | null
          views_count: number | null
          year: number | null
        }
        Insert: {
          annual_rate?: number | null
          brand?: string | null
          business_user_id?: string | null
          category?: string | null
          city?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string | null
          images?: Json | null
          max_months?: number | null
          min_down_payment?: number | null
          model?: string | null
          province?: string | null
          status?: string | null
          stock?: number | null
          title?: string | null
          total_price?: number | null
          updated_at?: string | null
          views_count?: number | null
          year?: number | null
        }
        Update: {
          annual_rate?: number | null
          brand?: string | null
          business_user_id?: string | null
          category?: string | null
          city?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          featured?: boolean | null
          id?: string | null
          images?: Json | null
          max_months?: number | null
          min_down_payment?: number | null
          model?: string | null
          province?: string | null
          status?: string | null
          stock?: number | null
          title?: string | null
          total_price?: number | null
          updated_at?: string | null
          views_count?: number | null
          year?: number | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string | null
          display_name: string | null
          is_verified: boolean | null
          slug: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          display_name?: string | null
          is_verified?: boolean | null
          slug?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          display_name?: string | null
          is_verified?: boolean | null
          slug?: string | null
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
      admin_country: { Args: { _user_id: string }; Returns: string }
      award_ambassador_prize:
        | { Args: { p_prize_id: string }; Returns: Json }
        | { Args: { p_mode?: string; p_prize_id: string }; Returns: Json }
      can_admin_country: {
        Args: { _country: string; _user_id: string }
        Returns: boolean
      }
      cast_live_poll_vote: {
        Args: {
          p_option_index: number
          p_poll_id: string
          p_voter_hash: string
        }
        Returns: Json
      }
      confirm_live_attendance: { Args: { p_visit_id: string }; Returns: Json }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_business_directory: {
        Args: never
        Returns: {
          avatar_url: string
          city: string
          company_name: string
          country: string
          display_name: string
          is_verified: boolean
          province: string
          slug: string
          user_id: string
        }[]
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
      get_live_studio_summary: {
        Args: { p_scheduled_live_id: string }
        Returns: Json
      }
      get_prestacao_whatsapp: {
        Args: { p_product_id: string }
        Returns: string
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
      get_trending_posts: {
        Args: { limit_count?: number }
        Returns: {
          author_id: string | null
          author_name: string | null
          category_id: string | null
          content: string
          created_at: string
          id: string
          image_url: string | null
          is_featured: boolean | null
          is_trending: boolean | null
          like_count: number | null
          published: boolean | null
          published_at: string | null
          reading_time_min: number | null
          region_id: string | null
          seo_description: string | null
          seo_keywords: string[] | null
          seo_title: string | null
          share_count: number | null
          slug: string
          source_url: string | null
          summary: string | null
          title: string
          trending_score: number | null
          updated_at: string
          view_count: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "blog_posts"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_blog_view: { Args: { post_slug: string }; Returns: undefined }
      increment_prestacao_product_views: {
        Args: { _product_id: string }
        Returns: undefined
      }
      is_superadmin: { Args: { _user_id: string }; Returns: boolean }
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
      refresh_daily_analytics: {
        Args: { p_date?: string; p_user_id: string }
        Returns: undefined
      }
      resolve_referral_code: { Args: { _code: string }; Returns: string }
      toggle_blog_like: { Args: { post_slug: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "business" | "user" | "superadmin"
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
      app_role: ["admin", "business", "user", "superadmin"],
    },
  },
} as const
