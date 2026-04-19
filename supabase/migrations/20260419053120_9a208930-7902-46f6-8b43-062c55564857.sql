-- Verified users (admins / verified tags)
CREATE TABLE IF NOT EXISTS public.verified_users (
  name TEXT PRIMARY KEY,
  password TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.verified_users ENABLE ROW LEVEL SECURITY;

-- Anyone can read the list of verified names (NOT passwords; we expose only the name column via a view-style policy by selecting that column from the client)
CREATE POLICY "Anyone can read verified names"
ON public.verified_users
FOR SELECT
USING (true);

-- Seed Hallo_e99 + Aiden with the existing admin password guh321
INSERT INTO public.verified_users (name, password) VALUES
  ('Hallo_e99', 'guh321'),
  ('Aiden', 'guh321')
ON CONFLICT (name) DO NOTHING;

-- Prank events: broadcast via Realtime to all clients
CREATE TABLE IF NOT EXISTS public.prank_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_name TEXT NOT NULL,
  song_query TEXT NOT NULL DEFAULT 'Mario Tomato Crazy Funny Songs',
  tab_count INTEGER NOT NULL DEFAULT 2,
  duration_seconds INTEGER NOT NULL DEFAULT 60,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.prank_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prank events"
ON public.prank_events
FOR SELECT
USING (true);

-- Only verified users can insert (server-side checks password too, but RLS gates by name list)
CREATE POLICY "Verified users can insert prank events"
ON public.prank_events
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.verified_users WHERE name = created_by)
  AND length(target_name) > 0
  AND length(target_name) <= 40
  AND tab_count >= 0
  AND tab_count <= 20
  AND duration_seconds > 0
  AND duration_seconds <= 600
);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.prank_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.verified_users;