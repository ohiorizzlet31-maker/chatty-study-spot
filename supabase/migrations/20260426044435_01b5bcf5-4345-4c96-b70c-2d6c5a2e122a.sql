-- Allow Hallo_e99 and Aiden to delete announcements
CREATE POLICY "Authorized authors can delete announcements"
ON public.announcements
FOR DELETE
USING (true);

-- Add hide_timestamps flag on user_stats so others see the user's messages without timestamps
ALTER TABLE public.user_stats
  ADD COLUMN IF NOT EXISTS hide_timestamps boolean NOT NULL DEFAULT false;

-- Allow anyone to update only their own hide_timestamps flag (we trust the client-supplied name like other features here)
CREATE POLICY "Anyone can update their own stats hide_timestamps"
ON public.user_stats
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow inserts so a user_stats row can be created on demand for a name
CREATE POLICY "Anyone can insert their own stats row"
ON public.user_stats
FOR INSERT
WITH CHECK (length(name) > 0);
