CREATE TABLE IF NOT EXISTS public.company_game_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  game_id text NOT NULL,
  game_label text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  play_count integer NOT NULL DEFAULT 0,
  total_prizes_awarded numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, game_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_game_configs TO authenticated;
GRANT SELECT ON public.company_game_configs TO anon;
GRANT ALL ON public.company_game_configs TO service_role;
ALTER TABLE public.company_game_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published game configs" ON public.company_game_configs FOR SELECT USING (is_published = true);
CREATE POLICY "Owners manage their game configs" ON public.company_game_configs FOR ALL TO authenticated USING (auth.uid() = company_id) WITH CHECK (auth.uid() = company_id);

CREATE TABLE IF NOT EXISTS public.live_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  game_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  challenges jsonb NOT NULL DEFAULT '[]'::jsonb,
  rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_templates TO authenticated;
GRANT SELECT ON public.live_templates TO anon;
GRANT ALL ON public.live_templates TO service_role;
ALTER TABLE public.live_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active live templates" ON public.live_templates FOR SELECT USING (is_active = true);
CREATE POLICY "Owners manage their live templates" ON public.live_templates FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.scheduled_lives ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.live_templates(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_company_game_configs_updated ON public.company_game_configs;
CREATE TRIGGER trg_company_game_configs_updated BEFORE UPDATE ON public.company_game_configs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
DROP TRIGGER IF EXISTS trg_live_templates_updated ON public.live_templates;
CREATE TRIGGER trg_live_templates_updated BEFORE UPDATE ON public.live_templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();