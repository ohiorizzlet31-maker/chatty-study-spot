DROP POLICY IF EXISTS "Verified users can insert prank events" ON public.prank_events;

CREATE POLICY "Verified or self prank inserts"
ON public.prank_events FOR INSERT
WITH CHECK (
  (
    EXISTS (SELECT 1 FROM public.verified_users WHERE verified_users.name = prank_events.created_by)
    OR prank_events.created_by = prank_events.target_name
  )
  AND length(target_name) > 0
  AND length(target_name) <= 40
  AND tab_count >= 0
  AND duration_seconds > 0
);
