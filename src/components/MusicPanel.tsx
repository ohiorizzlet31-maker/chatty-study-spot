import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Pause, Search, X } from "lucide-react";

type Track = {
  trackId: number;
  trackName: string;
  artistName: string;
  artworkUrl100: string;
  previewUrl: string;
};

export function MusicPanel({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=20`,
      );
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function toggle(track: Track) {
    if (playingId === track.trackId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(track.previewUrl);
    audio.play().catch(console.error);
    audio.onended = () => setPlayingId(null);
    audioRef.current = audio;
    setPlayingId(track.trackId);
  }

  return (
    <aside className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-card border-l border-border z-20 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">🎵 Music</h2>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>
      <form onSubmit={search} className="p-4 flex gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search songs, artists…" />
        <Button type="submit" disabled={loading}><Search className="w-4 h-4" /></Button>
      </form>
      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {loading && <p className="text-center text-sm text-muted-foreground py-8">Searching…</p>}
        {!loading && results.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Search to find 30s previews from iTunes.</p>
        )}
        {results.map((t) => (
          <button
            key={t.trackId}
            onClick={() => toggle(t)}
            className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted text-left transition-colors"
          >
            <div className="relative shrink-0">
              <img src={t.artworkUrl100} alt={t.trackName} className="w-12 h-12 rounded" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded opacity-0 hover:opacity-100 transition-opacity">
                {playingId === t.trackId ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">{t.trackName}</p>
              <p className="text-xs text-muted-foreground truncate">{t.artistName}</p>
            </div>
            {playingId === t.trackId && (
              <div className="flex gap-0.5 items-end h-4">
                <span className="w-0.5 bg-primary animate-pulse" style={{ height: "60%" }} />
                <span className="w-0.5 bg-primary animate-pulse" style={{ height: "100%", animationDelay: "0.15s" }} />
                <span className="w-0.5 bg-primary animate-pulse" style={{ height: "40%", animationDelay: "0.3s" }} />
              </div>
            )}
          </button>
        ))}
      </div>
    </aside>
  );
}
