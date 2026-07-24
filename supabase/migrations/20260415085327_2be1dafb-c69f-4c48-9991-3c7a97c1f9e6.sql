
-- Allow business users to create their own contests
CREATE POLICY "Business users can create contests"
ON public.contests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Allow business users to update their own contests
CREATE POLICY "Business users can update own contests"
ON public.contests
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);

-- Allow business users to delete their own contests
CREATE POLICY "Business users can delete own contests"
ON public.contests
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Allow business users to view their own contests (draft included)
CREATE POLICY "Business users can view own contests"
ON public.contests
FOR SELECT
TO authenticated
USING (auth.uid() = created_by);

-- Allow business users to manage submissions in their contests
CREATE POLICY "Business owners can manage contest submissions"
ON public.contest_submissions
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM contests WHERE contests.id = contest_submissions.contest_id AND contests.created_by = auth.uid()
));

-- Allow business users to view submissions in their contests
CREATE POLICY "Business owners can view contest submissions"
ON public.contest_submissions
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM contests WHERE contests.id = contest_submissions.contest_id AND contests.created_by = auth.uid()
));
