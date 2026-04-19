import { supabase } from "@/integrations/supabase/client";

export type VerifiedRow = { name: string; password: string };

let cache: VerifiedRow[] | null = null;
let cachePromise: Promise<VerifiedRow[]> | null = null;

export async function loadVerified(force = false): Promise<VerifiedRow[]> {
  if (!force && cache) return cache;
  if (cachePromise && !force) return cachePromise;
  cachePromise = (async () => {
    const { data, error } = await (supabase as any)
      .from("verified_users")
      .select("name,password");
    if (error) {
      console.error(error);
      return [];
    }
    cache = (data ?? []) as VerifiedRow[];
    return cache;
  })();
  return cachePromise;
}

export async function isVerifiedName(name: string): Promise<boolean> {
  const list = await loadVerified();
  return list.some((r) => r.name.toLowerCase() === name.toLowerCase());
}

export async function checkVerifiedPassword(name: string, password: string): Promise<boolean> {
  const list = await loadVerified(true);
  return list.some((r) => r.name === name && r.password === password);
}
