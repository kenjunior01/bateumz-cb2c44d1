
CREATE POLICY "Regional assets are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'regional-assets');

CREATE POLICY "Regional admins can upload regional assets"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'regional-assets'
    AND (
      public.is_superadmin(auth.uid())
      OR public.can_admin_country(auth.uid(), upper((storage.foldername(name))[1]))
    )
  );

CREATE POLICY "Regional admins can update regional assets"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'regional-assets'
    AND (
      public.is_superadmin(auth.uid())
      OR public.can_admin_country(auth.uid(), upper((storage.foldername(name))[1]))
    )
  );

CREATE POLICY "Regional admins can delete regional assets"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'regional-assets'
    AND (
      public.is_superadmin(auth.uid())
      OR public.can_admin_country(auth.uid(), upper((storage.foldername(name))[1]))
    )
  );
