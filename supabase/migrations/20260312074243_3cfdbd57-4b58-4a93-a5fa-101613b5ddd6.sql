
-- Bolões (Group Pools) table
CREATE TABLE public.boloes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  raffle_id UUID REFERENCES public.raffles(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Meu Bolão',
  invite_code TEXT NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  max_members INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'open',
  UNIQUE(invite_code)
);

-- Bolão members
CREATE TABLE public.bolao_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bolao_id UUID REFERENCES public.boloes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  tickets_contributed INTEGER NOT NULL DEFAULT 0,
  UNIQUE(bolao_id, user_id)
);

-- Enable RLS
ALTER TABLE public.boloes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bolao_members ENABLE ROW LEVEL SECURITY;

-- Bolões policies
CREATE POLICY "Anyone can view open boloes" ON public.boloes FOR SELECT USING (status = 'open' OR creator_id = auth.uid());
CREATE POLICY "Authenticated users can create boloes" ON public.boloes FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update their boloes" ON public.boloes FOR UPDATE USING (auth.uid() = creator_id);

-- Bolão members policies
CREATE POLICY "Members can view bolao members" ON public.bolao_members FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.boloes WHERE id = bolao_id AND (creator_id = auth.uid() OR status = 'open'))
  OR user_id = auth.uid()
);
CREATE POLICY "Authenticated users can join boloes" ON public.bolao_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.boloes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bolao_members;
