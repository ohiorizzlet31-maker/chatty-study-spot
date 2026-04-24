import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Lock, Megaphone, Zap, FileText, Trophy } from "lucide-react";
import { checkVerifiedPassword } from "@/lib/verified";
import { getSettings, saveSettings } from "@/lib/settings";

type PrankRow = {
  id: string;
  target_name: string;
  song_query: string;
  tab_count: number;
  duration_seconds: number;
  created_by: string;
  created_at: string;
};

export function LogsPanel({ name, onClose }: { name: string; onClose: () => void }) {
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [checking, setChecking] = useState(false);
  const [tab, setTab] = useState<"events" | "prank">("events");
  const [events, setEvents] = useState<PrankRow[]>([]);
  const [target, setTarget] = useState("");
  const [songQuery, setSongQuery] = useState("Mario Tomato Crazy Funny Songs");
  const [duration, setDuration] = useState(60);
  const [tabCount, setTabCount] = useState(getSettings().prankTabCount);
  const [tabUrl, setTabUrl] = useState("");
  const [posting, setPosting] = useState(false);
  const [postErr, setPostErr] = useState("");
  const [unlockPw, setUnlockPw] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!unlocked) return;
    let active = true;
    (supabase as any)
      .from("prank_events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }: { data: PrankRow[] | null }) => {
        if (active && data) setEvents(data);
      });
    const channel = supabase
      .channel("logs:prank_events")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "prank_events" }, (payload) => {
        setEvents((p) => [payload.new as PrankRow, ...p]);
      })
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [unlocked]);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    const ok = await checkVerifiedPassword(name, pw);
    setChecking(false);
    if (ok) {
      setUnlocked(true);
      setUnlockPw(pw);
      setPwErr("");
    } else {
      setPwErr("Wrong password.");
    }
  }

  async function fire(e: React.FormEvent) {
    e.preventDefault();
    if (!target.trim()) return;
    setPosting(true);
    setPostErr("");
    // persist preferred tab count
    const s = getSettings();
    saveSettings({ ...s, prankTabCount: tabCount });
    const { error } = await (supabase as any).from("prank_events").insert({
      target_name: target.trim(),
      song_query: songQuery.trim() || "Mario Tomato Crazy Funny Songs",
      tab_count: Math.max(0, tabCount),
      duration_seconds: Math.max(5, duration),
      created_by: name,
      tab_url: tabUrl.trim() || "https://www.google.com",
    });
    setPosting(false);
    if (error) {
      setPostErr(error.message);
    } else {
      setTarget("");
    }
  }

  async function resetLeaderboard() {
    if (!confirm("Wipe ALL leaderboard stats? This cannot be undone.")) return;
    setResetting(true);
    setResetMsg(null);
    try {
      const { data, error } = await (supabase as any).rpc("reset_leaderboard", {
        _name: name,
        _password: unlockPw,
      });
      if (error) {
        setResetMsg(error.message);
      } else if (data === true) {
        setResetMsg("✅ Leaderboard wiped.");
      } else {
        setResetMsg("❌ Reset rejected (verification failed).");
      }
    } catch (err: any) {
      setResetMsg(err?.message || "Reset failed.");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-md p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-2xl shadow-[var(--shadow-soft)] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2"><FileText className="w-6 h-6 text-primary" /> Logs</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>

        {!unlocked ? (
          <form onSubmit={unlock} className="p-4 rounded-xl border border-border bg-muted/30">
            <p className="text-sm font-medium mb-2 flex items-center gap-1"><Lock className="w-3 h-3" /> Verify {name}</p>
            <div className="flex gap-2">
              <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Verification password" />
              <Button type="submit" size="sm" disabled={checking}>{checking ? "…" : "Unlock"}</Button>
            </div>
            {pwErr && <p className="text-xs text-destructive mt-1">{pwErr}</p>}
          </form>
        ) : (
          <>
            <div className="flex gap-1 mb-4 border-b border-border">
              <button
                onClick={() => setTab("events")}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === "events" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
              >
                <Megaphone className="w-4 h-4 inline mr-1" /> Events
              </button>
              <button
                onClick={() => setTab("prank")}
                className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${tab === "prank" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
              >
                <Zap className="w-4 h-4 inline mr-1" /> Prank
              </button>
            </div>

            {tab === "events" && (
              <div className="space-y-2">
                <div className="p-3 rounded-xl border border-destructive/30 bg-destructive/5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold flex items-center gap-1"><Trophy className="w-4 h-4" /> Leaderboard</p>
                    <p className="text-xs text-muted-foreground">Wipe all messages_sent / level stats. DM &amp; server chats already don't count.</p>
                    {resetMsg && <p className="text-xs mt-1">{resetMsg}</p>}
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={resetLeaderboard}
                    disabled={resetting}
                  >
                    {resetting ? "Resetting…" : "Reset"}
                  </Button>
                </div>
                {events.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No events yet.</p>}
                {events.map((e) => (
                  <div key={e.id} className="p-3 rounded-xl border border-border bg-muted/20 text-sm">
                    <div className="flex justify-between">
                      <p><span className="font-semibold text-primary">{e.created_by}</span> pranked <span className="font-semibold">{e.target_name}</span></p>
                      <span className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      🎵 "{e.song_query}" · {e.tab_count} tabs · {e.duration_seconds}s
                    </p>
                  </div>
                ))}
              </div>
            )}

            {tab === "prank" && (
              <form onSubmit={fire} className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Plays a song & opens Google tabs on the target's screen if they're online. Use responsibly.
                </p>
                <div>
                  <label className="text-xs font-medium">Target username</label>
                  <Input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="exact name" maxLength={40} />
                </div>
                <div>
                  <label className="text-xs font-medium">Song search query</label>
                  <Input value={songQuery} onChange={(e) => setSongQuery(e.target.value)} maxLength={120} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium">Google tabs to open</label>
                    <Input
                      type="number"
                      min={0}
                      value={tabCount}
                      onChange={(e) => setTabCount(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Duration (seconds)</label>
                    <Input
                      type="number"
                      min={5}
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium">Tab URL (leave blank for google.com)</label>
                  <Input value={tabUrl} onChange={(e) => setTabUrl(e.target.value)} placeholder="https://www.google.com" maxLength={500} />
                </div>
                {postErr && <p className="text-xs text-destructive">{postErr}</p>}
                <Button type="submit" disabled={posting || !target.trim()} className="w-full">
                  {posting ? "Firing…" : "🚨 Fire prank"}
                </Button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
