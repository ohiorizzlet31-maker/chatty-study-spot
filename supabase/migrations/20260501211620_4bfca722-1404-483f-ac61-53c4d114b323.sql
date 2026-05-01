-- HWID ban list (clientId-based; user must clear localStorage to bypass)
CREATE TABLE public.hwid_bans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  banned_name TEXT NOT NULL UNIQUE,
  reason TEXT,
  banned_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hwid_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read hwid bans"
ON public.hwid_bans FOR SELECT TO public USING (true);

CREATE POLICY "Verified users can ban"
ON public.hwid_bans FOR INSERT TO public
WITH CHECK (
  EXISTS (SELECT 1 FROM public.verified_users WHERE name = banned_by)
  AND length(banned_name) > 0
);

CREATE POLICY "Verified users can unban"
ON public.hwid_bans FOR DELETE TO public USING (true);

-- Add verified flag for servers (separate from owner). Verified servers get a checkmark.
ALTER TABLE public.servers
  ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT false;

-- Gambling balance global leaderboard. Tracks shared "casino" balance per user across games.
CREATE TABLE public.gambling_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  balance NUMERIC NOT NULL DEFAULT 50,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gambling_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gambling stats"
ON public.gambling_stats FOR SELECT TO public USING (true);

CREATE POLICY "Anyone can insert their gambling row"
ON public.gambling_stats FOR INSERT TO public
WITH CHECK (length(name) > 0);

CREATE POLICY "Anyone can update gambling balance"
ON public.gambling_stats FOR UPDATE TO public
USING (true) WITH CHECK (true);