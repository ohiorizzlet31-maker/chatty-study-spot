import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { X, Trophy } from "lucide-react";

type Stat = { name: string; messages_sent: number; level: number };

export function LeaderboardPanel({ name, onClose }: { name: string; onClose: () => void }) {
  const [stats, setStats] = useState<Stat[]>([]);
  const me = stats.find((s) => s.name === name);

  useEffect(() => {
    let active = true;
    const load = () => {
      (supabase as any)
        .from("user_stats")
        .select("name, messages_sent, level")
        .order("messages_sent", { ascending: false })
        .limit(50)
        .then(({ data }: { data: Stat[] | null }) => {
          if (active && data) setStats(data);
        });
    };
    load();
    const channel = supabase
      .channel("public:user_stats")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_stats" }, load)
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const sent = me?.messages_sent ?? 0;
  const level = me?.level ?? 0;
  const left = 50 - (sent % 50);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-md p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-md shadow-[var(--shadow-soft)] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2"><Trophy className="w-6 h-6 text-primary" /> Leaderboard</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>

        <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-2xl p-4 mb-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Your Stats</p>
          <p className="text-3xl font-bold mb-1">Level {level}</p>
          <p className="text-sm text-muted-foreground">{sent} messages</p>
          <div className="mt-3 pt-3 border-t border-primary/20">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Next level</p>
            <p className="text-lg font-semibold">{left} messages left</p>
          </div>
          <p className="text-xs text-muted-foreground mt-3 italic">Every 50 messages = 1 level. Keep chatting to level up!</p>
        </div>

        <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-muted-foreground">Top chatters</h3>
        <ol className="space-y-1">
          {stats.length === 0 && <p className="text-sm text-muted-foreground py-4">No one has chatted yet.</p>}
          {stats.map((s, i) => (
            <li
              key={s.name}
              className={`flex items-center justify-between p-3 rounded-xl ${
                s.name === name ? "bg-primary/10 border border-primary/30" : "bg-muted/40"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="font-mono text-sm w-6 text-muted-foreground">{i + 1}</span>
                <span className="font-medium truncate">{s.name}</span>
              </div>
              <div className="flex items-center gap-3 text-sm shrink-0">
                <span className="text-muted-foreground">{s.messages_sent} msg</span>
                <span className="font-bold text-primary">Lv {s.level}</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
