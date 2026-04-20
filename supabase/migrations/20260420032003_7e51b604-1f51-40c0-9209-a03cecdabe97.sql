-- DM messages
CREATE TABLE public.dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_name TEXT NOT NULL,
  sender_device TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  content TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'English',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read dms" ON public.dm_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert dms" ON public.dm_messages FOR INSERT
  WITH CHECK (length(content) > 0 AND length(content) <= 2000 AND length(sender_name) > 0 AND length(recipient_name) > 0);
CREATE INDEX idx_dm_pair ON public.dm_messages (sender_name, recipient_name, created_at);
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;

-- Servers
CREATE TABLE public.servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_name TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','unlisted','private')),
  invite_code TEXT NOT NULL DEFAULT substr(md5(random()::text), 1, 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.servers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read servers" ON public.servers FOR SELECT USING (true);
CREATE POLICY "Anyone can create servers" ON public.servers FOR INSERT
  WITH CHECK (length(name) > 0 AND length(name) <= 60 AND length(owner_name) > 0);
CREATE POLICY "Owner can update server" ON public.servers FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Owner can delete server" ON public.servers FOR DELETE USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.servers;

-- Server members
CREATE TABLE public.server_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','admin','member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (server_id, member_name)
);
ALTER TABLE public.server_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read members" ON public.server_members FOR SELECT USING (true);
CREATE POLICY "Anyone can join" ON public.server_members FOR INSERT
  WITH CHECK (length(member_name) > 0);
CREATE POLICY "Anyone can update member" ON public.server_members FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can remove member" ON public.server_members FOR DELETE USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_members;

-- Server channels
CREATE TABLE public.server_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID NOT NULL REFERENCES public.servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  read_role TEXT NOT NULL DEFAULT 'member' CHECK (read_role IN ('owner','admin','member')),
  write_role TEXT NOT NULL DEFAULT 'member' CHECK (write_role IN ('owner','admin','member')),
  position INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.server_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read channels" ON public.server_channels FOR SELECT USING (true);
CREATE POLICY "Anyone can create channels" ON public.server_channels FOR INSERT
  WITH CHECK (length(name) > 0 AND length(name) <= 60);
CREATE POLICY "Anyone can update channels" ON public.server_channels FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Anyone can delete channels" ON public.server_channels FOR DELETE USING (true);
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_channels;

-- Server messages
CREATE TABLE public.server_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES public.server_channels(id) ON DELETE CASCADE,
  author_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.server_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read server messages" ON public.server_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can post server messages" ON public.server_messages FOR INSERT
  WITH CHECK (length(content) > 0 AND length(content) <= 2000 AND length(author_name) > 0);
CREATE INDEX idx_server_msg_channel ON public.server_messages (channel_id, created_at);
ALTER PUBLICATION supabase_realtime ADD TABLE public.server_messages;

-- Remove caps on prank
DROP POLICY IF EXISTS "Verified users can insert prank events" ON public.prank_events;
CREATE POLICY "Verified users can insert prank events" ON public.prank_events FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.verified_users WHERE name = prank_events.created_by)
    AND length(target_name) > 0 AND length(target_name) <= 40
    AND tab_count >= 0
    AND duration_seconds > 0
  );