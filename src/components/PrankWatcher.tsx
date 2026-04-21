import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const YT_API_KEY = "AIzaSyBQpYqy6P7hBtUCoTPJCEVjZKx5BzB-ItU";
const FALLBACK_URL = "https://www.google.com";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve();
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
}

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

function openTabsForcefully(count: number, url: string) {
  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      try {
        window.open(url || FALLBACK_URL, "_blank", "noopener");
      } catch {}
    }, i * 120);
  }
}

export function PrankWatcher({ name }: { name: string }) {
  const [active, setActive] = useState<{ videoId: string | null; secondsLeft: number; tabCount: number; tabUrl: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const seenRef = useRef<Set<string>>(new Set());
  const playerRef = useRef<any>(null);
  const playerHostRef = useRef<HTMLDivElement>(null);
  const endTimerRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (supabase as any)
      .from("prank_events")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(200)
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

        const videoId = await findYouTubeVideoId(ev.song_query || "Mario Tomato Crazy Funny Songs");
        const dur = Math.max(5, Number(ev.duration_seconds) || 60);
        const tabs = Math.max(0, Number(ev.tab_count) || 0);
        const tabUrl = ev.tab_url || FALLBACK_URL;
        setLoading(true);
        setActive({ videoId, secondsLeft: dur, tabCount: tabs, tabUrl });
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [name]);

  // Mount the YouTube player when active
  useEffect(() => {
    if (!active?.videoId || !playerHostRef.current) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      await loadYouTubeAPI();
      if (cancelled || !playerHostRef.current) return;

      const startMuted = () => {
        try {
          playerRef.current = new window.YT.Player(playerHostRef.current, {
            height: "100%",
            width: "100%",
            videoId: active.videoId,
            playerVars: {
              autoplay: 1,
              controls: 0,
              disablekb: 1,
              fs: 0,
              modestbranding: 1,
              playsinline: 1,
              rel: 0,
              mute: 1, // start muted to satisfy autoplay policy
            },
            events: {
              onReady: (e: any) => {
                try {
                  e.target.playVideo();
                  const tryUnmute = (attempt: number) => {
                    try {
                      e.target.unMute();
                      e.target.setVolume(100);
                      e.target.playVideo();
                    } catch {}
                    if (attempt < 20) {
                      setTimeout(() => tryUnmute(attempt + 1), 250);
                    }
                  };
                  tryUnmute(0);
                } catch {}
              },
              onStateChange: (e: any) => {
                if (e.data === 1) {
                  // Playing – open tabs on first play, hide loading
                  if (!cancelled) {
                    openTabsForcefully(active.tabCount, active.tabUrl);
                    setLoading(false);
                  }
                  try {
                    e.target.unMute();
                    e.target.setVolume(100);
                  } catch {}
                }
              },
            },
          });
        } catch {}
      };
      startMuted();
    })();

    // Auto-stop after duration
    if (endTimerRef.current) window.clearTimeout(endTimerRef.current);
    endTimerRef.current = window.setTimeout(() => {
      try { playerRef.current?.destroy?.(); } catch {}
      playerRef.current = null;
      setActive(null);
    }, active.secondsLeft * 1000);

    return () => {
      cancelled = true;
      if (endTimerRef.current) window.clearTimeout(endTimerRef.current);
      try { playerRef.current?.destroy?.(); } catch {}
      playerRef.current = null;
    };
  }, [active?.videoId]);

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-[2147483647] bg-black flex items-center justify-center"
      style={{ pointerEvents: "auto" }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Hidden player – must stay in DOM */}
      <div className="absolute inset-0 opacity-0 pointer-events-none">
        <div ref={playerHostRef} className="w-full h-full" style={{ width: "100%", height: "100%" }} />
      </div>
      {loading ? (
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          <p className="text-white text-lg font-medium">Loading…</p>
        </div>
      ) : (
        <div className="relative z-10 text-center px-6">
          <p className="text-5xl md:text-7xl font-black text-red-500 drop-shadow-2xl animate-pulse">
            🚨 YOU'VE BEEN PRANKED 🚨
          </p>
          <p className="mt-4 text-white/80 text-lg">Enjoy the show.</p>
        </div>
      )}
    </div>
  );
}
