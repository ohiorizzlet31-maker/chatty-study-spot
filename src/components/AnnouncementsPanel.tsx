import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Megaphone, Lock, BadgeCheck } from "lucide-react";
import { isVerifiedName, checkVerifiedPassword } from "@/lib/verified";

type Announcement = { id: string; author: string; content: string; created_at: string };

export function AnnouncementsPanel({ name, onClose }: { name: string; onClose: () => void }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [content, setContent] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [canTry, setCanTry] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    isVerifiedName(name).then(setCanTry);
  }, [name]);

  useEffect(() => {
    let active = true;
    (supabase as any)
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }: { data: Announcement[] | null }) => {
        if (active && data) setItems(data);
      });

    const channel = supabase
      .channel("public:announcements")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "announcements" }, (payload) => {
        setItems((prev) => [payload.new as Announcement, ...prev]);
      })
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    const ok = await checkVerifiedPassword(name, pw);
    setChecking(false);
    if (ok) {
      setUnlocked(true);
      setPwError("");
    } else {
      setPwError("Wrong password.");
    }
  }

  async function post(e: React.FormEvent) {
    e.preventDefault();
    const c = content.trim();
    if (!c) return;
    setContent("");
    const { error } = await (supabase as any).from("announcements").insert({ author: name, content: c });
    if (error) console.error(error);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-md p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-lg shadow-[var(--shadow-soft)] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="w-6 h-6 text-primary" /> Announcements</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>

        {canTry && !unlocked && (
          <form onSubmit={handleUnlock} className="mb-4 p-3 rounded-xl border border-border bg-muted/30">
            <p className="text-sm font-medium mb-2 flex items-center gap-1"><Lock className="w-3 h-3" /> Verify to post</p>
            <div className="flex gap-2">
              <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" />
              <Button type="submit" size="sm" disabled={checking}>{checking ? "…" : "Unlock"}</Button>
            </div>
            {pwError && <p className="text-xs text-destructive mt-1">{pwError}</p>}
          </form>
        )}

        {canTry && unlocked && (
          <form onSubmit={post} className="mb-4">
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write an announcement…"
              maxLength={2000}
              className="mb-2"
              rows={3}
            />
            <Button type="submit" disabled={!content.trim()} className="w-full">Post announcement</Button>
          </form>
        )}

        <div className="space-y-3">
          {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No announcements yet.</p>}
          {items.map((a) => (
            <div key={a.id} className="p-4 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-transparent">
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-sm flex items-center gap-1">
                  {a.author}
                  <BadgeCheck className="w-4 h-4 text-primary" />
                </p>
                <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm">{a.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
