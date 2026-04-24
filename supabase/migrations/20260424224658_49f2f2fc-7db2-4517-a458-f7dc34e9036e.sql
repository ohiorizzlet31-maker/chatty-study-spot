-- HTML games table: posts gated to Hallo_e99 and Aiden, anyone can play
CREATE TABLE public.html_games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author text NOT NULL,
  title text NOT NULL,
  description text,
  image_url text,
  code text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.html_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read html games"
ON public.html_games FOR SELECT
USING (true);

CREATE POLICY "Only authorized authors can post html games"
ON public.html_games FOR INSERT
WITH CHECK (
  author = ANY (ARRAY['Hallo_e99'::text, 'Aiden'::text])
  AND length(title) > 0
  AND length(code) > 0
);
