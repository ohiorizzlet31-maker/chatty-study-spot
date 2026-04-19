-- messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  language TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert messages" ON public.messages FOR INSERT WITH CHECK (
  length(content) > 0 AND length(content) <= 1000 AND length(name) > 0 AND length(name) <= 40
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

-- user_stats table
CREATE TABLE IF NOT EXISTS public.user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  messages_sent INT NOT NULL DEFAULT 0,
  level INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read stats" ON public.user_stats FOR SELECT USING (true);
CREATE POLICY "Anyone can insert stats" ON public.user_stats FOR INSERT WITH CHECK (length(name) > 0 AND length(name) <= 40);
CREATE POLICY "Anyone can update stats" ON public.user_stats FOR UPDATE USING (true) WITH CHECK (true);

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_stats;
ALTER TABLE public.user_stats REPLICA IDENTITY FULL;

-- announcements table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read announcements" ON public.announcements FOR SELECT USING (true);
CREATE POLICY "Only authorized authors can post" ON public.announcements FOR INSERT WITH CHECK (
  author IN ('Hallo_e99', 'Aiden') AND length(content) > 0 AND length(content) <= 2000
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER TABLE public.announcements REPLICA IDENTITY FULL;

-- Trigger to auto-bump level on message insert
CREATE OR REPLACE FUNCTION public.bump_user_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_stats (name, messages_sent, level, updated_at)
  VALUES (NEW.name, 1, 0, now())
  ON CONFLICT (name) DO UPDATE SET
    messages_sent = public.user_stats.messages_sent + 1,
    level = (public.user_stats.messages_sent + 1) / 50,
    updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_message_insert
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.bump_user_stats();