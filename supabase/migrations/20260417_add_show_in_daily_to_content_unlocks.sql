-- =============================================
-- Migration: Add show_in_daily to content_unlocks
-- Description: Adds a flag to determine which content unlocks appear in the Daily Check Up module.
-- =============================================

ALTER TABLE public.content_unlocks ADD COLUMN IF NOT EXISTS show_in_daily BOOLEAN DEFAULT FALSE;

-- Ensure RLS allows updates if enabled
-- ALTER POLICY "Allow individual updates" ON public.content_unlocks FOR UPDATE USING (true) WITH CHECK (true);
