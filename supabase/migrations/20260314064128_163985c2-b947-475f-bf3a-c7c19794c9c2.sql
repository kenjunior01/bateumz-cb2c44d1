
-- Attach the slug generation trigger to raffles table
CREATE TRIGGER generate_raffle_slug_trigger
  BEFORE INSERT OR UPDATE OF title ON public.raffles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_raffle_slug();

-- Update existing raffles that have null slugs
UPDATE public.raffles SET slug = lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) WHERE slug IS NULL;

-- Create storage bucket for raffle images
INSERT INTO storage.buckets (id, name, public) VALUES ('raffle-images', 'raffle-images', true);

-- Storage policies for raffle images
CREATE POLICY "Anyone can view raffle images" ON storage.objects FOR SELECT USING (bucket_id = 'raffle-images');
CREATE POLICY "Authenticated users can upload raffle images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'raffle-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their own raffle images" ON storage.objects FOR UPDATE USING (bucket_id = 'raffle-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can delete their own raffle images" ON storage.objects FOR DELETE USING (bucket_id = 'raffle-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admin RLS: allow admins to read all data
CREATE POLICY "Admins can view all raffles" ON public.raffles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all user_roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all participants" ON public.participants FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update raffles" ON public.raffles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete raffles" ON public.raffles FOR DELETE USING (public.has_role(auth.uid(), 'admin'));
