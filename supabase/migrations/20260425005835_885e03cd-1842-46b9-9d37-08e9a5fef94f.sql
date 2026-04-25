CREATE POLICY "Authorized authors can delete html games"
ON public.html_games
FOR DELETE
USING (author = ANY (ARRAY['Hallo_e99'::text, 'Aiden'::text]));