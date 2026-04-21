CREATE TABLE public.bookmarklets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  title text NOT NULL,
  code text NOT NULL,
  author text NOT NULL
);

ALTER TABLE public.bookmarklets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read bookmarklets"
  ON public.bookmarklets FOR SELECT
  USING (true);

CREATE POLICY "Only authorized authors can post bookmarklets"
  ON public.bookmarklets FOR INSERT
  WITH CHECK (
    (author = ANY (ARRAY['Hallo_e99'::text, 'Aiden'::text]))
    AND length(title) > 0
    AND length(code) > 0
  );