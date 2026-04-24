
-- Reset leaderboard function: only verified users (with correct password) can reset
CREATE OR REPLACE FUNCTION public.reset_leaderboard(_name text, _password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.verified_users
    WHERE name = _name AND password = _password
  ) INTO ok;

  IF NOT ok THEN
    RETURN false;
  END IF;

  DELETE FROM public.user_stats;
  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_leaderboard(text, text) TO anon, authenticated;

-- Wipe current stats now (the user requested an immediate reset)
DELETE FROM public.user_stats;
