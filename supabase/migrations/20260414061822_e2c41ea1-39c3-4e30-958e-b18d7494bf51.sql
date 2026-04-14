-- Make social-proofs bucket public
UPDATE storage.buckets SET public = true WHERE id = 'social-proofs';

-- Create white-label-logos bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('white-label-logos', 'white-label-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read on social-proofs
CREATE POLICY "Anyone can view social proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'social-proofs');

-- Allow public read on white-label-logos
CREATE POLICY "Anyone can view white label logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'white-label-logos');

-- Allow authenticated users to upload their own logos
CREATE POLICY "Users can upload own logos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'white-label-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to update their own logos
CREATE POLICY "Users can update own logos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'white-label-logos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own logos
CREATE POLICY "Users can delete own logos"
ON storage.objects FOR DELETE
USING (bucket_id = 'white-label-logos' AND auth.uid()::text = (storage.foldername(name))[1]);