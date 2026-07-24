-- Fix game creation ("Erro ao criar jogo") and image upload ("Erro ao carregar imagem")
-- for the Millionaire and Spin Wheel managers.
--
-- Root causes:
--   1. The admin managers insert `company_logo_url` and `company_slogan` into
--      `millionaire_games` / `spin_wheel_games`, but those columns were never
--      created, so the INSERT/UPDATE fails.
--   2. The ImageUpload component uploads to the `game-images` storage bucket,
--      which does not exist and has no policies, so uploads fail.

-- ============================================================================
-- 1. Add missing company branding columns to the game tables
-- ============================================================================
ALTER TABLE public.millionaire_games
  ADD COLUMN IF NOT EXISTS company_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS company_slogan TEXT;

ALTER TABLE public.spin_wheel_games
  ADD COLUMN IF NOT EXISTS company_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS company_slogan TEXT;

-- ============================================================================
-- 2. Create the `game-images` storage bucket used by ImageUpload
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('game-images', 'game-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Public can view game images
DROP POLICY IF EXISTS "Public view for game-images" ON storage.objects;
CREATE POLICY "Public view for game-images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'game-images');

-- Authenticated users can upload game images
DROP POLICY IF EXISTS "Allow authenticated uploads to game-images" ON storage.objects;
CREATE POLICY "Allow authenticated uploads to game-images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'game-images');

-- Authenticated users can update game images
DROP POLICY IF EXISTS "Allow authenticated updates to game-images" ON storage.objects;
CREATE POLICY "Allow authenticated updates to game-images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'game-images');

-- Authenticated users can delete game images
DROP POLICY IF EXISTS "Allow authenticated deletes to game-images" ON storage.objects;
CREATE POLICY "Allow authenticated deletes to game-images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'game-images');
