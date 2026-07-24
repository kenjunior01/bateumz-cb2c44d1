
-- Add payment numbers to white_label_configs
ALTER TABLE public.white_label_configs 
ADD COLUMN mpesa_number text DEFAULT NULL,
ADD COLUMN emola_number text DEFAULT NULL;

-- Add receipt tracking to participants
ALTER TABLE public.participants
ADD COLUMN receipt_url text DEFAULT NULL,
ADD COLUMN payment_method text DEFAULT 'mpesa';

-- Create storage bucket for payment receipts
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-receipts', 'payment-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Policy: users can upload their own receipts
CREATE POLICY "Users can upload receipts"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'payment-receipts' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Policy: business users and admins can view receipts
CREATE POLICY "Business and admin can view receipts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-receipts' AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'business'::app_role)
  )
);
