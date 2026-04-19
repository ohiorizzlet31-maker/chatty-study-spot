import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const YT_API_KEY = "AIzaSyBQpYqy6P7hBtUCoTPJCEVjZKx5BzB-ItU";

async function findYouTubeVideoId(query: string): Promise<string | null> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&videoEmbeddable=true&q=${encodeURIComponent(query)}&key=${YT_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return data.items?.[0]?.id?.videoId ?? null;
  } catch {
    return null;
  }
}

export function PrankWatcher({ name }: { name: string }) {
  const [active, setActive] = useState<{ videoId: string | null; secondsLeft: number } | null>(null);
  const startedAtRef = useRef<number>(0);
  const seenRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    // Mark existing events on join so we don't re-trigger old pranks
    (supabase as any)
      .from("prank_events")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }: { data: Array<{ id: string }> | null }) => {
        data?.forEach((e) => seenRef.current.add(e.id));
      });

    const channel = supabase
      .channel("prank:watch")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "prank_events" }, async (payload) => {
        if (!mounted) return;
        const ev = payload.new as any;
        if (seenRef.current.has(ev.id)) return;
        seenRef.current.add(ev.id);
        if (ev.target_name?.toLowerCase() !== name.toLowerCase()) return;

        // Open google tabs
        const tabs = Math.max(0, Math.min(20, Number(ev.tab_count) || 0));
        for (let i = 0; i < tabs; i++) {
          window.open("https://www.google.com", "_blank");
        }
        const videoId = await findYouTubeVideoId(ev.song_query || "Mario Tomato Crazy Funny Songs");
        startedAtRef.current = Date.now();
        const dur = Math.max(5, Math.min(600, Number(ev.duration_seconds) || 60));
        setActive({ videoId, secondsLeft: dur });
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [name]);

  // Auto-stop after duration
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setActive(null), active.secondsLeft * 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.videoId]);

  if (!active || !active.videoId) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[100] bg-card border-2 border-destructive rounded-2xl shadow-2xl p-3 w-72 animate-in slide-in-from-bottom">
      <p className="text-xs font-bold text-destructive mb-2">🚨 You've been pranked</p>
      <iframe
        title="prank"
        width="100%"
        height="160"
        src={`https://www.youtube.com/embed/${active.videoId}?autoplay=1&controls=0`}
        allow="autoplay; encrypted-media"
      />
      <button
        onClick={() => setActive(null)}
        className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground"
      >
        Dismiss
      </button>
    </div>
  );
}
