
-- Community messages table
CREATE TABLE public.community_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'general',
  raffle_id uuid REFERENCES public.raffles(id) ON DELETE SET NULL,
  parent_id uuid REFERENCES public.community_messages(id) ON DELETE CASCADE,
  likes_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view messages" ON public.community_messages FOR SELECT TO public USING (true);
CREATE POLICY "Authenticated users can insert messages" ON public.community_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own messages" ON public.community_messages FOR DELETE TO public USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Message likes
CREATE TABLE public.message_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.community_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.message_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view likes" ON public.message_likes FOR SELECT TO public USING (true);
CREATE POLICY "Auth users can like" ON public.message_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.message_likes FOR DELETE TO public USING (auth.uid() = user_id);

-- Enable realtime for community messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;

-- White label configs
CREATE TABLE public.white_label_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_user_id uuid NOT NULL,
  brand_name text NOT NULL,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#22c55e',
  secondary_color text NOT NULL DEFAULT '#eab308',
  custom_domain text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.white_label_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active configs" ON public.white_label_configs FOR SELECT TO public USING (is_active = true OR auth.uid() = business_user_id);
CREATE POLICY "Business users can insert configs" ON public.white_label_configs FOR INSERT TO authenticated WITH CHECK (auth.uid() = business_user_id);
CREATE POLICY "Business users can update own configs" ON public.white_label_configs FOR UPDATE TO public USING (auth.uid() = business_user_id);
CREATE POLICY "Admins can manage configs" ON public.white_label_configs FOR ALL TO public USING (has_role(auth.uid(), 'admin'));

-- Add province/city to raffles for geo-filtering
ALTER TABLE public.raffles ADD COLUMN IF NOT EXISTS province text;
ALTER TABLE public.raffles ADD COLUMN IF NOT EXISTS city text;
