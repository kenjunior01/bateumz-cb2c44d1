
DROP POLICY "Authenticated can insert notifications" ON public.notifications;

CREATE POLICY "Business owners and system can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.raffles
    WHERE raffles.id = notifications.raffle_id
    AND raffles.business_user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin')
);
