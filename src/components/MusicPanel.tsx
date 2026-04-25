import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, Search, X, SkipForward } from "lucide-react";

type Track = {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string;
};

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YT_API_KEY = "AIzaSyBQpYqy6P7hBtUCoTPJCEVjZKx5BzB-ItU";

function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve();
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.();
      resolve();
    };
    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
  });
}

async function findEmbeddableVideoIds(query: string, max = 5): Promise<string[]> {
  try {
    const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${max}&videoEmbeddable=true&videoSyndicated=true&q=${encodeURIComponent(query)}&key=${YT_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((i: any) => i.id?.videoId).filter(Boolean);
  } catch {
    return [];
  }
}

export function MusicPanel({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loadingPlay, setLoadingPlay] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState<"itunes" | "youtube">("itunes");
  const [fallbackIds, setFallbackIds] = useState<string[]>([]);
  const fallbackIdxRef = useRef(0);
  const playerRef = useRef<any>(null);
  const playerContainer = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      try {
        playerRef.current?.destroy?.();
      } catch {}
    };
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      if (source === "itunes") {
        const res = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=30`,
        );
        const data = await res.json();
        setResults(data.results || []);
      } else {
        // YouTube search
        const res = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=25&videoEmbeddable=true&q=${encodeURIComponent(query)}&key=${YT_API_KEY}`,
        );
        const data = await res.json();
        const items: Track[] = (data.items || []).map((it: any, idx: number) => ({
          trackId: idx, // unique within result set
          trackName: it.snippet.title,
          artistName: it.snippet.channelTitle,
          artworkUrl100: it.snippet.thumbnails?.medium?.url || it.snippet.thumbnails?.default?.url || "",
          previewUrl: "",
          // stash videoId via custom prop
          ...({ youtubeId: it.id.videoId } as any),
        }));
        setResults(items);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function playFull(track: Track) {
    setError("");
    setLoadingPlay(true);
    setNow(track);
    try {
      // Build a fallback list so if the chosen video is embed-blocked
      // ("Video unavailable" / org block), we auto-skip to the next.
      const ytId = (track as any).youtubeId as string | undefined;
      const candidates = await findEmbeddableVideoIds(
        `${track.trackName} ${track.artistName}`,
        5,
      );
      const queue = ytId ? [ytId, ...candidates.filter((id) => id !== ytId)] : candidates;
      if (queue.length === 0) {
        setError("Couldn't find a playable YouTube version. Try another track.");
        setLoadingPlay(false);
        return;
      }
      setFallbackIds(queue);
      fallbackIdxRef.current = 0;
      const videoId = queue[0];
      await loadYouTubeAPI();
      if (playerRef.current) {
        playerRef.current.loadVideoById(videoId);
        playerRef.current.playVideo();
      } else {
        playerRef.current = new window.YT.Player(playerContainer.current, {
          height: "100%",
          width: "100%",
          videoId,
          playerVars: { autoplay: 1, rel: 0, modestbranding: 1 },
          events: {
            onReady: () => setPlaying(true),
            onStateChange: (e: any) => {
              // 1 playing, 2 paused, 0 ended
              if (e.data === 1) setPlaying(true);
              if (e.data === 2) setPlaying(false);
              if (e.data === 0) setPlaying(false);
            },
            onError: (e: any) => {
              // 2: invalid id, 5: HTML5 player error, 100: not found,
              // 101/150: embedding disabled by owner / blocked
              const code = e?.data;
              const next = fallbackIdxRef.current + 1;
              if (next < fallbackIds.length) {
                fallbackIdxRef.current = next;
                playerRef.current.loadVideoById(fallbackIds[next]);
                playerRef.current.playVideo();
              } else {
                setError(
                  code === 101 || code === 150
                    ? "Embedding blocked for every match. Open on YouTube directly."
                    : `Playback error (code ${code}).`,
                );
                setPlaying(false);
              }
            },
          },
        });
      }
    } catch (err) {
      console.error(err);
      setError("Playback failed.");
    } finally {
      setLoadingPlay(false);
    }
  }

  function togglePlay() {
    if (!playerRef.current) return;
    if (playing) playerRef.current.pauseVideo();
    else playerRef.current.playVideo();
  }

  return (
    <aside className="fixed inset-0 bg-card z-30 flex flex-col animate-in fade-in duration-200">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">🎵 Music</h2>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
      </div>

      <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">
        {/* Player side */}
        <div className="lg:w-[55%] flex flex-col bg-black">
          <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
            <div ref={playerContainer} className="absolute inset-0" />
            {!now && (
              <div className="absolute inset-0 flex items-center justify-center text-white/60 text-sm">
                Search a song and press play to start.
              </div>
            )}
          </div>
          {now && (
            <div className="p-4 flex items-center gap-3 bg-background/95 border-t border-border">
              <img src={now.artworkUrl100} alt="" className="w-14 h-14 rounded" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold truncate">{now.trackName}</p>
                <p className="text-sm text-muted-foreground truncate">{now.artistName}</p>
              </div>
              <Button size="icon" onClick={togglePlay} disabled={loadingPlay}>
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </Button>
            </div>
          )}
          {error && (
            <div className="p-3 bg-background flex items-center justify-between gap-3">
              <p className="text-sm text-destructive flex-1">{error}</p>
              {now && (
                <a
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(now.trackName + " " + now.artistName)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline whitespace-nowrap"
                >
                  Open on YouTube
                </a>
              )}
            </div>
          )}
        </div>

        {/* Search side */}
        <div className="flex-1 flex flex-col border-t lg:border-t-0 lg:border-l border-border min-h-0">
          <div className="p-4 border-b border-border space-y-2">
            <div className="flex gap-1 text-xs">
              <button
                type="button"
                onClick={() => setSource("itunes")}
                className={`px-3 py-1 rounded-md font-medium border ${source === "itunes" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}
              >
                🎵 iTunes
              </button>
              <button
                type="button"
                onClick={() => setSource("youtube")}
                className={`px-3 py-1 rounded-md font-medium border ${source === "youtube" ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary/50"}`}
              >
                ▶️ YouTube
              </button>
            </div>
            <form onSubmit={search} className="flex gap-2">
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={source === "itunes" ? "Search songs, artists…" : "Search YouTube…"} />
              <Button type="submit" disabled={loading}><Search className="w-4 h-4" /></Button>
            </form>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
            {loading && <p className="text-center text-sm text-muted-foreground py-8">Searching…</p>}
            {!loading && results.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8 px-4">
                {source === "itunes" ? "Search powered by iTunes. Full songs play via YouTube." : "Search YouTube directly. Plays via YouTube IFrame."}
              </p>
            )}
            {results.map((t) => {
              const isNow = now?.trackId === t.trackId;
              return (
                <button
                  key={t.trackId}
                  onClick={() => playFull(t)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted text-left transition-colors ${isNow ? "bg-muted" : ""}`}
                >
                  <img src={t.artworkUrl100} alt="" className="w-12 h-12 rounded shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{t.trackName}</p>
                    <p className="text-xs text-muted-foreground truncate">{t.artistName}</p>
                  </div>
                  {isNow ? (
                    playing ? <Pause className="w-4 h-4 text-primary" /> : <SkipForward className="w-4 h-4 text-primary" />
                  ) : (
                    <Play className="w-4 h-4 opacity-50" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </aside>
  );
}
